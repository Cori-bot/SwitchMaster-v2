import https from "https";
import { devLog, devError } from "../logger";
import { GlzServerInfo, CLIENT_PLATFORM, parseGlzServerInfo, parseClientVersion } from "./logParser";
import { ValorantApi } from "./api";

export interface EntitlementsData {
    accessToken: string;
    entitlementsToken: string;
    subject: string; // PUUID
}

export interface MatchPlayer {
    Subject: string;
    TeamID: string;
    CharacterID: string;
    PlayerIdentity: {
        Subject: string;
        PlayerCardID: string;
        PlayerTitleID: string;
        AccountLevel: number;
        Incognito: boolean;
        HideAccountLevel: boolean;
    };
    SeasonalBadgeInfo: {
        Rank: number;
        LeaderboardRank: number;
    };
}

export interface CoreGameMatch {
    MatchID: string;
    MapID: string;
    ModeID: string;
    ProvisioningFlow: string;
    Players: MatchPlayer[];
}

export interface PregameMatch {
    ID: string;
    MapID: string;
    Mode: string;
    ProvisioningFlowID: string;
    AllyTeam: {
        Players: {
            Subject: string;
            CharacterID: string;
            CharacterSelectionState: string;
            CompetitiveTier: number;
            PlayerIdentity: {
                Subject: string;
                PlayerCardID: string;
                PlayerTitleID: string;
                AccountLevel: number;
            };
        }[];
    };
}

export class GlzApi {
    private agent: https.Agent;
    private serverInfo: GlzServerInfo | null = null;
    private entitlements: EntitlementsData | null = null;
    private clientVersion: string | null = null;
    private localApi: ValorantApi;

    constructor(localApi: ValorantApi) {
        this.localApi = localApi;
        this.agent = new https.Agent({
            rejectUnauthorized: false,
        });
    }

    // Initialize the GLZ API with required data
    public async initialize(): Promise<boolean> {
        try {
            // 1. Parse region/shard from ShooterGame.log
            this.serverInfo = parseGlzServerInfo();
            if (!this.serverInfo) {
                devLog("[GLZ-API] Could not find server info in log");
                return false;
            }

            // 2. Get client version from log or local API
            this.clientVersion = parseClientVersion();
            if (!this.clientVersion) {
                // Fallback: try to get from sessions endpoint
                const sessions = await this.localApi.get<any>("/product-session/v1/external-sessions");
                if (sessions) {
                    for (const key of Object.keys(sessions)) {
                        const session = sessions[key];
                        if (session.productId === "valorant") {
                            const args = session.launchConfiguration?.arguments || [];
                            const versionArg = args.find((a: string) => a.includes("release-"));
                            if (versionArg) {
                                this.clientVersion = versionArg.replace(/.*?(release-[\w-]+).*/, "$1");
                                break;
                            }
                        }
                    }
                }
            }

            // 3. Get entitlements from local API
            const entitlements = await this.localApi.get<any>("/entitlements/v1/token");
            if (!entitlements) {
                devLog("[GLZ-API] Could not get entitlements");
                return false;
            }

            this.entitlements = {
                accessToken: entitlements.accessToken,
                entitlementsToken: entitlements.token,
                subject: entitlements.subject,
            };

            devLog(`[GLZ-API] Initialized: region=${this.serverInfo.region}, version=${this.clientVersion}`);
            return true;
        } catch (err) {
            devError("[GLZ-API] Initialization failed:", err);
            return false;
        }
    }

    public get isReady(): boolean {
        return !!(this.serverInfo && this.entitlements);
    }

    public get puuid(): string | null {
        return this.entitlements?.subject || null;
    }

    // Get current game match data (INGAME)
    public async getCoreGameMatch(matchId: string): Promise<CoreGameMatch | null> {
        return this.request<CoreGameMatch>("GET", `/core-game/v1/matches/${matchId}`);
    }

    // Get current game player info (to get matchId when INGAME)
    public async getCoreGamePlayer(puuid: string): Promise<{ MatchID: string } | null> {
        return this.request<{ MatchID: string }>("GET", `/core-game/v1/players/${puuid}`);
    }

    // Get pregame match data (PREGAME/Agent Select)
    public async getPregameMatch(matchId: string): Promise<PregameMatch | null> {
        return this.request<PregameMatch>("GET", `/pregame/v1/matches/${matchId}`);
    }

    // Get pregame player info (to get matchId when in agent select)
    public async getPregamePlayer(puuid: string): Promise<{ MatchID: string } | null> {
        return this.request<{ MatchID: string }>("GET", `/pregame/v1/players/${puuid}`);
    }

    // Select an agent (hover)
    public async selectAgent(matchId: string, agentId: string): Promise<any> {
        return this.request<any>("POST", `/pregame/v1/matches/${matchId}/select/${agentId}`);
    }

    // Lock an agent
    public async lockAgent(matchId: string, agentId: string): Promise<any> {
        return this.request<any>("POST", `/pregame/v1/matches/${matchId}/lock/${agentId}`);
    }

    // Get player MMR (competitive rank) from PD server
    // Note: This only works for your OWN PUUID, not other players
    public async getPlayerMMR(puuid: string): Promise<number> {
        if (!this.serverInfo || !this.entitlements) return 0;

        try {
            const url = `https://pd.${this.serverInfo.shard}.a.pvp.net/mmr/v1/players/${puuid}`;
            const result = await this.pdRequest<any>(url);

            if (result?.LatestCompetitiveUpdate?.TierAfterUpdate) {
                return result.LatestCompetitiveUpdate.TierAfterUpdate;
            }

            // Fallback: check QueueSkills.competitive for current season
            if (result?.QueueSkills?.competitive?.SeasonalInfoBySeasonID) {
                const seasons = result.QueueSkills.competitive.SeasonalInfoBySeasonID;
                const seasonKeys = Object.keys(seasons);
                if (seasonKeys.length > 0) {
                    const latestSeason = seasons[seasonKeys[seasonKeys.length - 1]];
                    return latestSeason?.CompetitiveTier || 0;
                }
            }

            return 0;
        } catch {
            return 0;
        }
    }

    // Request to PD server (different from GLZ)
    private async pdRequest<T>(url: string): Promise<T | null> {
        if (!this.entitlements) return null;

        const headers: Record<string, string> = {
            "Authorization": `Bearer ${this.entitlements.accessToken}`,
            "X-Riot-Entitlements-JWT": this.entitlements.entitlementsToken,
            "X-Riot-ClientPlatform": CLIENT_PLATFORM,
            "Content-Type": "application/json",
        };

        if (this.clientVersion) {
            headers["X-Riot-ClientVersion"] = this.clientVersion;
        }

        return new Promise((resolve) => {
            const options: https.RequestOptions = {
                method: "GET",
                headers,
                agent: this.agent,
            };

            const req = https.request(url, options, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        } catch {
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                });
            });

            req.on("error", () => resolve(null));
            req.end();
        });
    }

    private async request<T>(method: string, endpoint: string, body?: any): Promise<T | null> {
        if (!this.serverInfo || !this.entitlements) {
            devLog("[GLZ-API] Not initialized for request");
            return null;
        }

        const url = `https://glz-${this.serverInfo.region}-1.${this.serverInfo.shard}.a.pvp.net${endpoint}`;

        const headers: Record<string, string> = {
            "Authorization": `Bearer ${this.entitlements.accessToken}`,
            "X-Riot-Entitlements-JWT": this.entitlements.entitlementsToken,
            "X-Riot-ClientPlatform": CLIENT_PLATFORM,
            "Content-Type": "application/json",
        };

        if (this.clientVersion) {
            headers["X-Riot-ClientVersion"] = this.clientVersion;
        }

        return new Promise((resolve) => {
            const options: https.RequestOptions = {
                method,
                headers,
                agent: this.agent,
            };

            const req = https.request(url, options, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            if (!data || data.trim() === "") {
                                resolve({} as T);
                                return;
                            }
                            const json = JSON.parse(data);
                            resolve(json);
                        } catch {
                            devError(`[GLZ-API] Parse error for ${endpoint}`);
                            resolve(null);
                        }
                    } else {
                        if (res.statusCode === 404) {
                            // 404 = not in game/pregame, expected behavior
                            resolve(null);
                            return;
                        }
                        devError(`[GLZ-API] Error ${res.statusCode} for ${endpoint}: ${data}`);
                        resolve(null);
                    }
                });
            });

            req.on("error", (err) => {
                devError(`[GLZ-API] Network error for ${endpoint}:`, err);
                resolve(null);
            });

            if (body && method === "POST") {
                req.write(JSON.stringify(body));
            }
            req.end();
        });
    }
}
