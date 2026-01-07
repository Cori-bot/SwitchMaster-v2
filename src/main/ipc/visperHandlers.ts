import { RiotWebviewAuth, VisperAuthSession } from "../valorant-api/riotWebviewAuth";
import { VisperSessionManager } from "../visper/sessionManager";
import { RiotService } from "../visper/riotService";
import { safeHandle } from "./utils";
import { BrowserWindow } from "electron";
import { devLog } from "../logger";

export function registerVisperHandlers(getWin: () => BrowserWindow | null) {
    safeHandle("start-visper-login", async (_event, silent: boolean = false, forceNew: boolean = false) => {
        devLog("[IPC] start-visper-login triggered, silent:", silent, "forceNew:", forceNew);
        const win = BrowserWindow.getFocusedWindow() || getWin();

        devLog("[VisperAuth] Starting login with parent win:", win ? "Found" : "None");
        const session = await RiotWebviewAuth.login(win || undefined, silent, forceNew);

        if (session) {
            // Sauvegarde automatique de la session réussie
            await VisperSessionManager.saveSession(session);
        }

        return session;
    });

    safeHandle("get-visper-sessions", async () => {
        return await VisperSessionManager.getSessions();
    });

    safeHandle("switch-visper-session", async (_event, puuid: string) => {
        devLog("[IPC] Switching to session:", puuid);
        const success = await VisperSessionManager.restoreSession(puuid);
        if (success) {
            // Après restauration des cookies, on tente un auto-login silencieux pour rafraîchir les tokens
            // On ne passe pas de fenêtre parente car c'est un refresh background
            const newSession = await RiotWebviewAuth.login(null, true);
            if (newSession) {
                await VisperSessionManager.saveSession(newSession);
            }
            return newSession;
        }
        return null;
    });

    safeHandle("remove-visper-session", async (_event, puuid: string) => {
        await VisperSessionManager.removeSession(puuid);
        return true;
    });

    // --- PARTY HANDLERS ---

    safeHandle("visper-get-party", async (_event, session: VisperAuthSession) => {
        return await RiotService.getPartyState(session);
    });

    safeHandle("visper-set-ready", async (_event, session: VisperAuthSession, partyId: string, isReady: boolean) => {
        await RiotService.setReady(session, partyId, isReady);
        return true;
    });

    safeHandle("visper-change-queue", async (_event, session: VisperAuthSession, partyId: string, queueId: string) => {
        await RiotService.changeQueue(session, partyId, queueId);
        return true;
    });

    safeHandle("visper-set-preferred-pods", async (_event, session: VisperAuthSession, partyId: string, podIds: string[]) => {
        await RiotService.setPreferredPods(session, partyId, podIds);
        return true;
    });

    safeHandle("visper-refresh-pings", async (_event, session: VisperAuthSession, partyId: string) => {
        await RiotService.refreshPings(session, partyId);
        return true;
    });

    safeHandle("visper-toggle-open", async (_event, session: VisperAuthSession, partyId: string, isOpen: boolean) => {
        await RiotService.setAccessibility(session, partyId, isOpen);
        return true;
    });

    safeHandle("visper-start-matchmaking", async (_event, session: VisperAuthSession, partyId: string) => {
        await RiotService.startMatchmaking(session, partyId);
        return true;
    });

    safeHandle("visper-stop-matchmaking", async (_event, session: VisperAuthSession, partyId: string) => {
        await RiotService.stopMatchmaking(session, partyId);
        return true;
    });

    safeHandle("visper-leave-party", async (_event, session: VisperAuthSession, partyId: string) => {
        await RiotService.leaveParty(session, partyId);
        return true;
    });

    safeHandle("visper-generate-code", async (_event, session: VisperAuthSession, partyId: string) => {
        devLog("[IPC] visper-generate-code called for party:", partyId);
        await RiotService.generatePartyCode(session, partyId);
        return true;
    });

    safeHandle("visper-remove-code", async (_event, session: VisperAuthSession, partyId: string) => {
        await RiotService.removePartyCode(session, partyId);
        return true;
    });

    safeHandle("visper-invite-by-name", async (_event, session: VisperAuthSession, partyId: string, name: string, tag: string) => {
        await RiotService.inviteByDisplayName(session, partyId, name, tag);
        return true;
    });

    safeHandle("visper-join-code", async (_event, session: VisperAuthSession, code: string) => {
        await RiotService.joinPartyByCode(session, code);
        return true;
    });

    safeHandle("visper-get-friends", async (_event, session: VisperAuthSession) => {
        return await RiotService.getFriends(session);
    });

    // --- AGENT SELECTION ---

    safeHandle("visper-get-pregame-match", async (_event, session: VisperAuthSession) => {
        return await RiotService.getPregameMatchId(session);
    });

    safeHandle("visper-select-agent", async (_event, session: VisperAuthSession, matchId: string, agentId: string) => {
        return await RiotService.selectAgent(session, matchId, agentId);
    });

    safeHandle("visper-lock-agent", async (_event, session: VisperAuthSession, matchId: string, agentId: string) => {
        return await RiotService.lockAgent(session, matchId, agentId);
    });
}
