import { BrowserWindow, ipcMain } from "electron";
import { LockfileWatcher } from "./lockfileWatcher";
import { ValorantApi } from "./api";
import { GlzApi } from "./remoteApi";
import { ValorantGameState, LockfileData } from "./types";
import { devLog } from "../logger";


export class ValorantService {
    private watcher: LockfileWatcher;
    private api: ValorantApi;
    private glzApi: GlzApi;
    private stateCheckInterval: NodeJS.Timeout | null = null;
    private currentState: ValorantGameState = "UNKNOWN";
    private currentMatchId: string | null = null;
    private targetAgentId: string | null = null;
    private isLocked: boolean = false;
    private glzInitialized: boolean = false;
    private getMainWindow: () => BrowserWindow | null;

    constructor(getMainWindow: () => BrowserWindow | null) {
        this.getMainWindow = getMainWindow;
        this.api = new ValorantApi();
        this.glzApi = new GlzApi(this.api);
        this.watcher = new LockfileWatcher(
            this.handleConnect.bind(this),
            this.handleDisconnect.bind(this)
        );
        this.setupIpc();
    }

    private setupIpc() {
        ipcMain.handle("valorant-set-auto-lock", (_e, agentId: string | null) => {
            this.targetAgentId = agentId;
            devLog(`[VALORANT-SERVICE] Target agent set to: ${agentId}`);
            return { success: true };
        });
    }

    public start() {
        this.watcher.start();
    }

    public stop() {
        this.watcher.stop();
        this.stopStatePolling();
    }

    private async handleConnect(data: LockfileData) {
        if (!this.api.isReady) {
            devLog("[VALORANT-SERVICE] Connected to Riot Client");
            this.api.setCredentials(data);
            this.startStatePolling();
            this.notifyRenderer("valorant-connected", true);

            // Initialize GLZ API in background
            this.initializeGlzApi();
        }
    }

    private async initializeGlzApi() {
        // Wait a bit for Valorant to be fully loaded
        setTimeout(async () => {
            const success = await this.glzApi.initialize();
            this.glzInitialized = success;
            if (success) {
                devLog("[VALORANT-SERVICE] GLZ API initialized successfully");
            }
        }, 2000);
    }

    private handleDisconnect() {
        if (this.api.isReady) {
            devLog("[VALORANT-SERVICE] Disconnected from Riot Client");
            this.api.clearCredentials();
            this.stopStatePolling();
            this.glzInitialized = false;
            this.updateState("UNKNOWN");
            this.notifyRenderer("valorant-connected", false);
        }
    }

    private startStatePolling() {
        if (this.stateCheckInterval) return;
        this.stateCheckInterval = setInterval(() => this.checkGameState(), 1000);
    }

    private stopStatePolling() {
        if (this.stateCheckInterval) {
            clearInterval(this.stateCheckInterval);
            this.stateCheckInterval = null;
        }
    }

    private async checkGameState() {
        if (!this.api.isReady) return;

        try {
            // 1. Get PUUID from session
            const session = await this.api.get<any>("/chat/v1/session");
            if (!session || !session.puuid) return;

            const puuid = session.puuid;

            // 2. Fetch Presences to find our own state
            const presences = await this.api.get<any>("/chat/v4/presences");
            if (!presences || !presences.presences) return;

            // Filter for Valorant presence specifically
            const myPresence = presences.presences.find(
                (p: any) => p.puuid === puuid && p.product === "valorant"
            );

            if (!myPresence || !myPresence.private) return;

            // 3. Decode Private Presence Data (Base64 JSON)
            try {
                const privateDataStr = Buffer.from(myPresence.private, 'base64').toString('utf-8');
                const privateData = JSON.parse(privateDataStr);

                // sessionLoopState can be in matchPresenceData or directly in privateData
                const matchData = privateData.matchPresenceData || {};
                let loopState = matchData.sessionLoopState || privateData.sessionLoopState;
                const mapId = matchData.matchMap || privateData.matchMap || privateData.partyOwnerMatchMap;

                if (!loopState) loopState = "MENUS";

                if (loopState !== this.currentState) {
                    devLog(`[VALORANT-SERVICE] State: ${this.currentState} -> ${loopState}`);
                }

                await this.handleStateChange(loopState, mapId, privateData, puuid);
            } catch {
                // Silently ignore presence parse errors
            }
        } catch {
            // API might return 404 if not found, just ignore
        }
    }

    private async handleStateChange(
        loopState: string,
        mapId: string | undefined,
        privateData: any,
        puuid: string
    ) {
        if (loopState === "INGAME") {
            await this.handleIngameState(mapId, privateData, puuid);
        } else if (loopState === "PREGAME") {
            await this.handlePregameState(mapId, privateData, puuid);
        } else {
            // MENUS state
            if (this.currentState !== "MENUS") {
                this.currentMatchId = null;
                this.isLocked = false;
                this.updateState("MENUS");
            }
        }
    }
    private lastMmrPlayers: any[] = [];

    private async handleIngameState(mapId: string | undefined, privateData: any, puuid: string) {
        // Only fetch new data if this is a new game (different matchId)
        let players: any[] = [];
        let realMatchId = privateData.partyId || "unknown";

        // Try to get real match data from GLZ API
        if (this.glzInitialized && this.glzApi.isReady) {
            try {
                const playerInfo = await this.glzApi.getCoreGamePlayer(puuid);
                if (playerInfo?.MatchID) {
                    realMatchId = playerInfo.MatchID;

                    // Only fetch full data if this is a NEW match
                    const isNewMatch = this.currentMatchId !== realMatchId;

                    if (isNewMatch) {
                        devLog(`[VALORANT-SERVICE] New match detected: ${realMatchId.substring(0, 8)}...`);

                        const matchData = await this.glzApi.getCoreGameMatch(realMatchId);
                        if (matchData?.Players) {
                            players = matchData.Players;
                            devLog(`[VALORANT-SERVICE] Got ${players.length} players`);
                            // Note: MMR API only works for own PUUID, not other players
                            // Ranks will show from SeasonalBadgeInfo.Rank when available
                            this.lastMmrPlayers = players;
                        }
                    } else {
                        // Reuse cached data for same match
                        players = this.lastMmrPlayers;
                    }
                }
            } catch (err) {
                devLog("[VALORANT-SERVICE] GLZ API call failed, using local data");
            }
        }

        this.currentMatchId = realMatchId;
        this.updateState("INGAME", {
            matchId: realMatchId,
            mapId,
            queueId: privateData.queueId,
            players,
            data: privateData
        });
    }

    private async handlePregameState(mapId: string | undefined, privateData: any, puuid: string) {
        const matchId = privateData.partyId || "pregame";
        const isNewPregame = this.currentState !== "PREGAME" || this.currentMatchId !== matchId;

        if (isNewPregame) {
            this.currentMatchId = matchId;
            this.isLocked = false;
        }

        let players: any[] = [];
        let realMatchId = matchId;

        // Try to get real match data from GLZ API
        if (this.glzInitialized && this.glzApi.isReady) {
            try {
                const playerInfo = await this.glzApi.getPregamePlayer(puuid);
                if (playerInfo?.MatchID) {
                    realMatchId = playerInfo.MatchID;
                    const pregameData = await this.glzApi.getPregameMatch(realMatchId);
                    if (pregameData?.AllyTeam?.Players) {
                        players = pregameData.AllyTeam.Players;
                        devLog(`[VALORANT-SERVICE] Got ${players.length} pregame players`);
                    }
                }
            } catch {
                devLog("[VALORANT-SERVICE] GLZ pregame API call failed");
            }
        }

        if (isNewPregame) {
            this.updateState("PREGAME", {
                matchId: realMatchId,
                mapId,
                queueId: privateData.queueId,
                players,
                data: privateData
            });
        }

        // AUTO-LOCK LOGIC
        await this.tryAutoLock(realMatchId);
    }

    private async tryAutoLock(matchId: string) {
        if (!this.targetAgentId || this.isLocked) return;

        if (this.glzInitialized && this.glzApi.isReady) {
            try {
                devLog(`[VALORANT-LOCK] Attempting to lock agent: ${this.targetAgentId}`);

                // Select first
                await this.glzApi.selectAgent(matchId, this.targetAgentId);

                // Then lock
                const result = await this.glzApi.lockAgent(matchId, this.targetAgentId);

                if (result) {
                    this.isLocked = true;
                    devLog(`[VALORANT-LOCK] Successfully locked ${this.targetAgentId}`);
                    this.notifyRenderer("valorant-lock-success", { agentId: this.targetAgentId });
                }
            } catch (err) {
                devLog(`[VALORANT-LOCK] Lock failed: ${err}`);
            }
        } else {
            devLog(`[VALORANT-LOCK] GLZ API not ready, cannot lock`);
            this.isLocked = true; // Mark as "attempted" to avoid spam
        }
    }

    private updateState(newState: ValorantGameState, data?: any) {
        this.currentState = newState;
        devLog(`[VALORANT-STATE] Change: ${newState}`, data ? `Players: ${data.players?.length || 0}` : "");
        this.notifyRenderer("valorant-state", { state: newState, ...data });
    }

    private notifyRenderer(channel: string, payload: any) {
        const win = this.getMainWindow();
        if (win && !win.isDestroyed()) {
            win.webContents.send(channel, payload);
        }
    }
}
