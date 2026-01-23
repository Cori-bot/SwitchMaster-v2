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

export class RiotAuthService {
    static async getClientVersion() {
        try {
            const response = await fetch("https://valorant-api.com/v1/version");
            const data = await response.json();
            return data.data.riotClientVersion;
        } catch (e) {
            devError("[RiotAuth] Failed to fetch client version", e);
            return "release-09.11-shipping-43-3069153"; // Fallback safe
        }
    }

    static async finishAuth(accessToken: string, idToken?: string): Promise<RiotAuthSession | null> {
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
                return null;
            }

            // 2. Get User Info
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

            // 3. Get Region
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

            const clientVersion = await this.getClientVersion();
            const shard = region;

            const pvpHeaders = {
                "Authorization": `Bearer ${accessToken}`,
                "X-Riot-Entitlements-JWT": entitlementsToken,
                "X-Riot-ClientVersion": clientVersion,
                "X-Riot-ClientPlatform": "ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIndpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9"
            };

            // 4. Get Account XP
            let accountLevel = 1;
            try {
                const xpResponse = await fetch(`https://pd.${shard}.a.pvp.net/account-xp/v1/players/${puuid}`, {
                    headers: pvpHeaders
                });
                const xpData = await xpResponse.json();
                accountLevel = xpData.Progress?.Level || xpData.Progress?.AccountLevel || 1;
            } catch {
                devError("[RiotAuth] Failed to get XP");
            }

            // 5. Get MMR
            let competitiveTier = 0;
            try {
                const mmrResponse = await fetch(`https://pd.${shard}.a.pvp.net/mmr/v1/players/${puuid}`, {
                    headers: pvpHeaders
                });
                const mmrData = await mmrResponse.json();
                competitiveTier = mmrData.LatestCompetitiveUpdate?.TierAfterUpdate || 0;

                /* v8 ignore start */
                if (competitiveTier === 0 && mmrData.QueueSkills?.competitive?.SeasonalInfoBySeasonID) {
                    const seasons = Object.values(mmrData.QueueSkills.competitive.SeasonalInfoBySeasonID);
                    if (seasons.length > 0) {
                        competitiveTier = (seasons[seasons.length - 1] as any).CompetitiveTier || 0;
                    }
                }
                /* v8 ignore stop */
            } catch {
                devLog("[RiotAuth] Failed to get MMR");
            }

            // 6. Get Loadout
            let playerCardId = "";
            try {
                const loadoutResponse = await fetch(`https://pd.${shard}.a.pvp.net/personalization/v2/players/${puuid}/playerloadout`, {
                    headers: pvpHeaders
                });
                const loadoutData = await loadoutResponse.json();
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
        } /* v8 ignore start */ catch (error) {
            devError("[RiotAuth] Fatal error during finishAuth:", error);
            return null;
        } /* v8 ignore stop */
    }
}
