import { BrowserWindow } from "electron";
import crypto from "crypto";
import { devLog, devError } from "../logger";
import { RiotAuthService, RiotAuthSession } from "./riotAuthService";

export type { RiotAuthSession };

export class RiotWebviewAuth {
    private static getAuthUrl(forceNew: boolean = false) {
        const nonce = crypto.randomBytes(16).toString("hex");
        let url = `https://auth.riotgames.com/authorize?client_id=riot-client&redirect_uri=http://localhost/redirect&response_type=token%20id_token&nonce=${nonce}`;
        if (forceNew) {
            url += "&prompt=login";
        }
        return url;
    }

    static async login(parentWindow: BrowserWindow | null = null, silent: boolean = false, forceNew: boolean = false): Promise<RiotAuthSession | null> {
        return new Promise((resolve) => {
            devLog(`[RiotAuth] Creating login window (silent: ${silent}, forceNew: ${forceNew})...`);
            const loginWin = new BrowserWindow({
                width: 450,
                height: 650,
                parent: parentWindow || undefined,
                modal: !!parentWindow && !silent,
                show: false,
                autoHideMenuBar: true,
                title: "Connexion Riot Games",
                backgroundColor: "#111111",
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    partition: "persist:riot",
                }
            });

            let resolved = false;
            const safeResolve = (val: RiotAuthSession | null) => {
                if (resolved) return;
                resolved = true;
                resolve(val);
                if (!loginWin.isDestroyed()) loginWin.close();
            };

            let silentTimeout: NodeJS.Timeout | null = null;
            if (silent) {
                silentTimeout = setTimeout(() => {
                    devLog("[RiotAuth] Silent login timeout reached.");
                    safeResolve(null);
                }, 10000);
            }

            devLog("[RiotAuth] Loading URL via getAuthUrl()");
            loginWin.loadURL(this.getAuthUrl(forceNew));

            loginWin.once("ready-to-show", () => {
                if (!silent) {
                    devLog("[RiotAuth] Window ready-to-show");
                    loginWin.show();
                }
            });

            loginWin.webContents.on("did-finish-load", async () => {
                if (loginWin.webContents.getURL().includes("auth.riotgames.com")) {
                    try {
                        await loginWin.webContents.insertCSS(`
                            body { background-color: #111 !important; }
                            .auth-card { background: transparent !important; box-shadow: none !important; }
                        `);
                    } catch (e) {
                        devError("[RiotAuth] Failed to inject custom styles", e);
                    }
                }
            });

            const handleNavigation = (url: string) => {
                devLog("[RiotAuth] Probing URL:", url);
                if (url.includes("access_token=")) {
                    devLog("[RiotAuth] Token pattern detected in URL");
                    const fragment = url.includes("#") ? url.split("#")[1] : url.split("?")[1];
                    const params = new URLSearchParams(fragment);
                    const accessToken = params.get("access_token");
                    const idToken = params.get("id_token");

                    if (accessToken) {
                        devLog("[RiotAuth] Tokens captured. Finalizing...");
                        if (silentTimeout) clearTimeout(silentTimeout);
                        RiotAuthService.finishAuth(accessToken, idToken || undefined)
                            .then(safeResolve)
                            .catch((error) => {
                                devError("[RiotAuth] Auth completion failed:", error);
                                safeResolve(null);
                            });
                        return true;
                    }
                }
                return false;
            };

            loginWin.webContents.on("will-redirect", (event, url) => {
                if (handleNavigation(url)) event.preventDefault();
            });

            loginWin.webContents.on("will-navigate", (event, url) => {
                if (handleNavigation(url)) event.preventDefault();
            });

            loginWin.webContents.on("did-navigate", (_, url) => {
                handleNavigation(url);
            });

            loginWin.webContents.on("did-fail-load", (_e, errorCode, errorDescription, validatedURL) => {
                devError(`[RiotAuth] Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
                if (silent && !resolved) safeResolve(null);
            });

            loginWin.on("closed", () => {
                devLog("[RiotAuth] Window closed");
                if (silentTimeout) clearTimeout(silentTimeout);
                safeResolve(null);
            });
        });
    }
}
