import { RiotWebviewAuth } from "../valorant-api/riotWebviewAuth";
import { VisperSessionManager } from "../visper/sessionManager";
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
}
