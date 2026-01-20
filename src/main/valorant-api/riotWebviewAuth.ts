import { BrowserWindow } from "electron";
import crypto from "crypto";
import { devLog, devError } from "../logger";

export interface RiotAuthSession {
    accessToken: string;
    entitlementsToken: string;
    puuid: string;
    gameName?: string;
    tagLine?: string;
    accountLevel?: number;
    competitiveTier?: number;
    playerCardId?: string;
    region?: string;
    clientVersion?: string;
}

export class RiotWebviewAuth {
    private static async getClientVersion() {
        try {
            const response = await fetch("https://valorant-api.com/v1/version");
            const data = await response.json();
            return data.data.riotClientVersion;
        } catch (e) {
            devError("[RiotAuth] Failed to fetch client version", e);
            return "release-09.11-shipping-43-3069153"; // Fallback safe
        }
    }

    private static getAuthUrl(forceNew: boolean = false) {
        const nonce = crypto.randomBytes(16).toString("hex");
        let url = `https://auth.riotgames.com/authorize?client_id=riot-client&redirect_uri=http://localhost/redirect&response_type=token%20id_token&scope=openid%20link%20ban%20lol_region&nonce=${nonce}`;
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

            // Timeout pour le mode silencieux (si Riot ne redirige pas direct)
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

            // Injection de styles pour personnaliser la page Riot
            loginWin.webContents.on("did-finish-load", async () => {
                if (loginWin.webContents.getURL().includes("auth.riotgames.com")) {
                    try {
                        await loginWin.webContents.insertCSS(`
                            body {
                                background-color: #111 !important;
                            }
                            .auth-card {
                                background: transparent !important;
                                box-shadow: none !important;
                            }
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
                        this.finishAuth(accessToken, idToken || undefined).then(safeResolve).catch((error) => {
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

    private static async finishAuth(accessToken: string, idToken?: string): Promise<RiotAuthSession | null> {
        try {
            // 1. Get Entitlements Token
            devLog("[RiotAuth] Getting Entitlements...");
            let entitlementsToken = "";
            try {
                const entResponse = await fetch("https://entitlements.auth.riotgames.com/api/token/v1", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${accessToken}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({})
                });
                const entData = await entResponse.json();
                entitlementsToken = entData.entitlements_token;
            } catch (_) {
                devError("[RiotAuth] Failed to get Entitlements", _);
                return null; // Sans ça on ne peut rien faire
            }

            // 2. Get User Info (PUUID & Name)
            devLog("[RiotAuth] Getting UserInfo...");
            let puuid = "", gameName = "", tagLine = "";
            try {
                const userResponse = await fetch("https://auth.riotgames.com/userinfo", {
                    method: "GET",
                    headers: { "Authorization": `Bearer ${accessToken}` }
                });
                const userData = await userResponse.json();
                puuid = userData.sub;
                gameName = userData.acct?.game_name;
                tagLine = userData.acct?.tag_line;
            } catch {
                devError("[RiotAuth] Failed to get UserInfo");
            }

            // 3. Get Region (Riot Geo)
            devLog("[RiotAuth] Getting Region...");
            let region = "eu";
            if (idToken) {
                try {
                    const geoResponse = await fetch("https://riot-geo.pas.si.riotgames.com/pas/v1/product/valorant", {
                        method: "PUT",
                        headers: {
                            "Authorization": `Bearer ${accessToken}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ id_token: idToken })
                    });
                    const geoData = await geoResponse.json();
                    region = geoData.affinities?.live || "eu";
                } catch {
                    devLog("[RiotAuth] Region detection failed, falling back to 'eu'");
                }
            }

            const shard = region;
            const clientVersion = await this.getClientVersion();
            devLog("[RiotAuth] Using Client Version:", clientVersion);

            const pvpHeaders = {
                "Authorization": `Bearer ${accessToken}`,
                "X-Riot-Entitlements-JWT": entitlementsToken,
                "X-Riot-ClientVersion": clientVersion,
                "X-Riot-ClientPlatform": "ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIndpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9"
            };

            // 4. Get Account XP (Level)
            let accountLevel = 1;
            try {
                devLog("[RiotAuth] Getting Account XP...");
                const xpResponse = await fetch(`https://pd.${shard}.a.pvp.net/account-xp/v1/players/${puuid}`, {
                    headers: pvpHeaders
                });
                const xpData = await xpResponse.json();
                devLog("[RiotAuth] XP Data received:", JSON.stringify(xpData));
                accountLevel = xpData.Progress?.Level || xpData.Progress?.AccountLevel || 1;
            } catch {
                devError("[RiotAuth] Failed to get XP");
            }

            // 5. Get Player MMR (Rank)
            let competitiveTier = 0;
            try {
                devLog("[RiotAuth] Getting MMR...");
                const mmrResponse = await fetch(`https://pd.${shard}.a.pvp.net/mmr/v1/players/${puuid}`, {
                    headers: pvpHeaders
                });
                const mmrData = await mmrResponse.json();
                devLog("[RiotAuth] MMR Data received:", JSON.stringify(mmrData));
                competitiveTier = mmrData.LatestCompetitiveUpdate?.TierAfterUpdate || 0;
                // Fallback si pas de LatestCompetitiveUpdate
                if (competitiveTier === 0 && mmrData.QueueSkills?.competitive?.SeasonalInfoBySeasonID) {
                    const seasons = Object.values(mmrData.QueueSkills.competitive.SeasonalInfoBySeasonID);
                    if (seasons.length > 0) {
                        competitiveTier = (seasons[seasons.length - 1] as any).CompetitiveTier || 0;
                    }
                }
            } catch {
                devLog("[RiotAuth] Failed to get MMR (Player might be unranked)");
            }

            // 6. Get Player Loadout (CardID)
            let playerCardId = "";
            try {
                devLog("[RiotAuth] Getting Loadout...");
                const loadoutResponse = await fetch(`https://pd.${shard}.a.pvp.net/personalization/v2/players/${puuid}/playerloadout`, {
                    headers: pvpHeaders
                });
                const loadoutData = await loadoutResponse.json();
                devLog("[RiotAuth] Loadout Data received:", JSON.stringify(loadoutData));
                playerCardId = loadoutData.Identity?.PlayerCardID;
            } catch {
                devError("[RiotAuth] Failed to get Loadout");
            }

            return {
                accessToken,
                entitlementsToken,
                puuid,
                gameName,
                tagLine,
                accountLevel,
                competitiveTier,
                playerCardId,
                region,
                clientVersion
            };
        } catch (error) {
            devError("[RiotAuth] Fatal error during finishAuth:", error);
            return null;
        }
    }
}
