import { BrowserWindow, app } from "electron";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { devLog, devError } from "../logger";

export interface VisperAuthSession {
  accessToken: string;
  entitlementsToken: string;
  puuid: string;
  gameName?: string;
  tagLine?: string;
  accountLevel?: number;
  competitiveTier?: number;
  playerCardId?: string;
  region?: string;
}

export class RiotWebviewAuth {
  private static async getClientVersion() {
    try {
      const response = await fetch("https://valorant-api.com/v1/version");
      const data = await response.json();
      return data.data.riotClientVersion;
    } catch (e) {
      devError("[VisperAuth] Failed to fetch client version", e);
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

  static async login(
    parentWindow: BrowserWindow | null = null,
    silent: boolean = false,
    forceNew: boolean = false,
  ): Promise<VisperAuthSession | null> {
    return new Promise((resolve) => {
      devLog(
        `[VisperAuth] Creating login window (silent: ${silent}, forceNew: ${forceNew})...`,
      );
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
          partition: "persist:visper",
        },
      });

      let resolved = false;
      const safeResolve = (val: VisperAuthSession | null) => {
        if (resolved) return;
        resolved = true;
        resolve(val);
        if (!loginWin.isDestroyed()) loginWin.close();
      };

      // Timeout pour le mode silencieux (si Riot ne redirige pas direct)
      let silentTimeout: NodeJS.Timeout | null = null;
      if (silent) {
        silentTimeout = setTimeout(() => {
          devLog("[VisperAuth] Silent login timeout reached.");
          safeResolve(null);
        }, 10000);
      }

      devLog("[VisperAuth] Loading URL via getAuthUrl()");
      loginWin.loadURL(this.getAuthUrl(forceNew));

      loginWin.once("ready-to-show", () => {
        if (!silent) {
          devLog("[VisperAuth] Window ready-to-show");
          loginWin.show();
        }
      });

      // Injection du Logo Visper
      loginWin.webContents.on("did-finish-load", async () => {
        if (loginWin.webContents.getURL().includes("auth.riotgames.com")) {
          try {
            const logoPath = app.isPackaged
              ? path.join(process.resourcesPath, "assets", "visper_logo.png")
              : path.join(process.cwd(), "src", "assets", "visper_logo.png");

            if (fs.existsSync(logoPath)) {
              const logoBase64 = fs.readFileSync(logoPath).toString("base64");
              const logoDataUri = `data:image/png;base64,${logoBase64}`;

              await loginWin.webContents.insertCSS(`
                                .visper-header {
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                    padding: 30px 0 10px 0;
                                    background: #111;
                                    width: 100%;
                                    box-sizing: border-box;
                                }
                                .visper-logo {
                                    height: 80px;
                                    width: 80px;
                                    object-contain: contain;
                                    filter: drop-shadow(0 0 15px rgba(37, 99, 235, 0.4));
                                    margin-bottom: 10px;
                                }
                                .visper-title {
                                    color: white;
                                    font-family: sans-serif;
                                    font-weight: 900;
                                    text-transform: uppercase;
                                    letter-spacing: 4px;
                                    font-size: 14px;
                                    margin: 0;
                                    font-style: italic;
                                }
                                .visper-subtitle {
                                    color: #2563eb;
                                    font-family: sans-serif;
                                    font-weight: bold;
                                    text-transform: uppercase;
                                    letter-spacing: 3px;
                                    font-size: 8px;
                                    margin-top: 4px;
                                    opacity: 0.8;
                                }
                                /* Cacher les éléments Riot redondants ou inutiles */
                                [data-testid="riot-logo"], .auth-card-header {
                                    display: none !important;
                                }
                                body {
                                    background-color: #111 !important;
                                }
                                .auth-card {
                                    background: transparent !important;
                                    box-shadow: none !important;
                                }
                            `);

              await loginWin.webContents.executeJavaScript(`
                                (function() {
                                    if (document.getElementById('visper-injected-header')) return;
                                    const header = document.createElement('div');
                                    header.id = 'visper-injected-header';
                                    header.className = 'visper-header';
                                    header.innerHTML = \`
                                        <img src="${logoDataUri}" class="visper-logo" />
                                        <h1 class="visper-title">Visper</h1>
                                        <p class="visper-subtitle">Intelligence Layer</p>
                                    \`;
                                    document.body.prepend(header);
                                })();
                            `);
            }
          } catch (e) {
            devError("[VisperAuth] Failed to inject Visper logo", e);
          }
        }
      });

      const handleNavigation = (url: string) => {
        devLog("[VisperAuth] Probing URL:", url);
        if (url.includes("access_token=")) {
          devLog("[VisperAuth] Token pattern detected in URL");
          const fragment = url.includes("#")
            ? url.split("#")[1]
            : url.split("?")[1];
          const params = new URLSearchParams(fragment);
          const accessToken = params.get("access_token");
          const idToken = params.get("id_token");

          if (accessToken) {
            devLog("[VisperAuth] Tokens captured. Finalizing...");
            if (silentTimeout) clearTimeout(silentTimeout);
            this.finishAuth(accessToken, idToken || undefined)
              .then(safeResolve)
              .catch((error) => {
                devError("[VisperAuth] Auth completion failed:", error);
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

      loginWin.webContents.on(
        "did-fail-load",
        (_e, errorCode, errorDescription, validatedURL) => {
          devError(
            `[VisperAuth] Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`,
          );
          if (silent && !resolved) safeResolve(null);
        },
      );

      loginWin.on("closed", () => {
        devLog("[VisperAuth] Window closed");
        if (silentTimeout) clearTimeout(silentTimeout);
        safeResolve(null);
      });
    });
  }

  private static async finishAuth(
    accessToken: string,
    idToken?: string,
  ): Promise<VisperAuthSession | null> {
    try {
      // 1. Get Entitlements Token
      devLog("[VisperAuth] Getting Entitlements...");
      let entitlementsToken = "";
      try {
        const entResponse = await fetch(
          "https://entitlements.auth.riotgames.com/api/token/v1",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          },
        );
        const entData = await entResponse.json();
        entitlementsToken = entData.entitlements_token;
      } catch (_) {
        devError("[VisperAuth] Failed to get Entitlements", _);
        return null; // Sans ça on ne peut rien faire
      }

      // 2. Get User Info (PUUID & Name)
      devLog("[VisperAuth] Getting UserInfo...");
      let puuid = "",
        gameName = "",
        tagLine = "";
      try {
        const userResponse = await fetch(
          "https://auth.riotgames.com/userinfo",
          {
            method: "GET",
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );
        const userData = await userResponse.json();
        puuid = userData.sub;
        gameName = userData.acct?.game_name;
        tagLine = userData.acct?.tag_line;
      } catch {
        devError("[VisperAuth] Failed to get UserInfo");
      }

      // 3. Get Region (Riot Geo)
      devLog("[VisperAuth] Getting Region...");
      let region = "eu";
      if (idToken) {
        try {
          const geoResponse = await fetch(
            "https://riot-geo.pas.si.riotgames.com/pas/v1/product/valorant",
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ id_token: idToken }),
            },
          );
          const geoData = await geoResponse.json();
          region = geoData.affinities?.live || "eu";
        } catch {
          devLog("[VisperAuth] Region detection failed, falling back to 'eu'");
        }
      }

      const shard = region;
      const clientVersion = await this.getClientVersion();
      devLog("[VisperAuth] Using Client Version:", clientVersion);

      const pvpHeaders = {
        Authorization: `Bearer ${accessToken}`,
        "X-Riot-Entitlements-JWT": entitlementsToken,
        "X-Riot-ClientVersion": clientVersion,
        "X-Riot-ClientPlatform":
          "ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIndpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9",
      };

      // 4. Get Account XP (Level)
      let accountLevel = 1;
      try {
        devLog("[VisperAuth] Getting Account XP...");
        const xpResponse = await fetch(
          `https://pd.${shard}.a.pvp.net/account-xp/v1/players/${puuid}`,
          {
            headers: pvpHeaders,
          },
        );
        const xpData = await xpResponse.json();
        devLog("[VisperAuth] XP Data received:", JSON.stringify(xpData));
        accountLevel =
          xpData.Progress?.Level || xpData.Progress?.AccountLevel || 1;
      } catch {
        devError("[VisperAuth] Failed to get XP");
      }

      // 5. Get Player MMR (Rank)
      let competitiveTier = 0;
      try {
        devLog("[VisperAuth] Getting MMR...");
        const mmrResponse = await fetch(
          `https://pd.${shard}.a.pvp.net/mmr/v1/players/${puuid}`,
          {
            headers: pvpHeaders,
          },
        );
        const mmrData = await mmrResponse.json();
        devLog("[VisperAuth] MMR Data received:", JSON.stringify(mmrData));
        competitiveTier = mmrData.LatestCompetitiveUpdate?.TierAfterUpdate || 0;
        // Fallback si pas de LatestCompetitiveUpdate
        if (
          competitiveTier === 0 &&
          mmrData.QueueSkills?.competitive?.SeasonalInfoBySeasonID
        ) {
          const seasons = Object.values(
            mmrData.QueueSkills.competitive.SeasonalInfoBySeasonID,
          );
          if (seasons.length > 0) {
            competitiveTier =
              (seasons[seasons.length - 1] as any).CompetitiveTier || 0;
          }
        }
      } catch {
        devLog("[VisperAuth] Failed to get MMR (Player might be unranked)");
      }

      // 6. Get Player Loadout (CardID)
      let playerCardId = "";
      try {
        devLog("[VisperAuth] Getting Loadout...");
        const loadoutResponse = await fetch(
          `https://pd.${shard}.a.pvp.net/personalization/v2/players/${puuid}/playerloadout`,
          {
            headers: pvpHeaders,
          },
        );
        const loadoutData = await loadoutResponse.json();
        devLog(
          "[VisperAuth] Loadout Data received:",
          JSON.stringify(loadoutData),
        );
        playerCardId = loadoutData.Identity?.PlayerCardID;
      } catch {
        devError("[VisperAuth] Failed to get Loadout");
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
      };
    } catch (error) {
      devError("[VisperAuth] Fatal error during finishAuth:", error);
      return null;
    }
  }
}
