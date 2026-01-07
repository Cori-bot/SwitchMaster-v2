import { VisperAuthSession } from "../valorant-api/riotWebviewAuth";
import { devLog, devError } from "../logger";
import { PartyData, PartyState, Friend } from "../../shared/visper-types";

// Headers standards pour l'API Riot
const getHeaders = (session: VisperAuthSession) => ({
    "Authorization": `Bearer ${session.accessToken}`,
    "X-Riot-Entitlements-JWT": session.entitlementsToken,
    "X-Riot-ClientVersion": session.clientVersion || "release-11.11-shipping-9-4026545",
    "X-Riot-ClientPlatform": "ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIndpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9",
    "Content-Type": "application/json"
});

// Construction de l'URL GLZ (Party)
const getGlzUrl = (region: string, path: string) => {
    const shard = region === "latam" || region === "br" ? "na" : region;
    const glzRegion = region === "na" ? "glz-na-1" : `glz-${region}-1`;
    return `https://${glzRegion}.${shard}.a.pvp.net${path}`;
};

// Construction de l'URL PD (Match/MMR/Name)
const getPdUrl = (region: string, path: string) => {
    const shard = region === "latam" || region === "br" ? "na" : region;
    return `https://pd.${shard}.a.pvp.net${path}`;
};


export class RiotService {
    /**
     * Récupère l'ID du groupe actuel du joueur
     */
    static async getPlayerPartyId(session: VisperAuthSession): Promise<string | null> {
        try {
            const url = getGlzUrl(session.region || "eu", `/parties/v1/players/${session.puuid}`);
            const res = await fetch(url, { headers: getHeaders(session) });
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            return data.CurrentPartyID;
        } catch (e) {
            devError("[RiotService] Failed to get player party ID", e);
            return null;
        }
    }

    /**
     * Récupère les détails complets du groupe
     */
    static async getPartyDetails(session: VisperAuthSession, partyId: string): Promise<PartyData | null> {
        try {
            const url = getGlzUrl(session.region || "eu", `/parties/v1/parties/${partyId}`);
            const res = await fetch(url, { headers: getHeaders(session) });
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            return data;
        } catch (e) {
            devError("[RiotService] Failed to get party details", e);
            return null;
        }
    }

    /**
     * Récupère les noms des joueurs (Name Service)
     */
    static async getPlayerNames(session: VisperAuthSession, puuids: string[]): Promise<Record<string, { GameName: string; TagLine: string }>> {
        try {
            const url = getPdUrl(session.region || "eu", `/name-service/v2/players`);
            const res = await fetch(url, {
                method: "PUT",
                headers: getHeaders(session),
                body: JSON.stringify(puuids)
            });
            const data = await res.json();
            const map: Record<string, any> = {};
            data.forEach((p: any) => {
                map[p.Subject] = { GameName: p.GameName, TagLine: p.TagLine };
            });
            return map;
        } catch (e) {
            devError("[RiotService] Failed to get player names", e);
            return {};
        }
    }

    /**
     * Récupère l'état complet du groupe formaté pour le frontend
     */
    static async getPartyState(session: VisperAuthSession): Promise<PartyState | null> {
        const partyId = await this.getPlayerPartyId(session);
        if (!partyId) return null;

        const party = await this.getPartyDetails(session, partyId);
        if (!party) return null;

        // Récupération des noms manquants
        const puuids = party.Members.map(m => m.Subject);
        const names = await this.getPlayerNames(session, puuids);

        // Transformation pour le frontend
        return {
            partyId: party.ID,
            state: party.State,
            queueId: party.MatchmakingData.QueueID,
            accessibility: party.Accessibility,
            inviteCode: party.InviteCode,
            preferredPods: party.MatchmakingData.PreferredPodIDs || [],
            members: party.Members.map(m => {
                // Mapping des Pings
                const pings: Record<string, number> = {};
                if (Array.isArray(m.Pings)) {
                    m.Pings.forEach(p => {
                        pings[p.GamePodID] = p.Ping;
                    });
                }

                return {
                    puuid: m.Subject,
                    name: names[m.Subject]?.GameName || "Unknown",
                    tag: names[m.Subject]?.TagLine || "",
                    cardId: m.PlayerIdentity.PlayerCardID,
                    level: m.PlayerIdentity.AccountLevel,
                    rank: m.CompetitiveTier,
                    isReady: m.IsReady,
                    isLeader: !!m.IsOwner, // Utilisation de la propriété explicite API
                    pings
                };
            })
        };
    }

    // --- CHAT & FRIENDS ---



    static async getFriends(_session: VisperAuthSession): Promise<Friend[]> {
        try {
            // L'API distante /chat/v4/friends n'existe PAS.
            // On doit passer par l'API locale du client Riot (si lancé).
            const { LockfileManager } = await import("./lockfileManager");
            const baseUrl = await LockfileManager.getBaseUrl();
            const headers = await LockfileManager.getLocalHeaders();

            if (!baseUrl || !headers) {
                // devLog("[RiotService] Local API not available (game closed?), cannot fetch friends.");
                return [];
            }

            // IMPORTANT: Le client Riot utilise un certificat auto-signé.
            // On doit ignorer les erreurs SSL pour cette requête locale.
            // C'est standard pour les outils LCU.
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

            // 1. Récupération des Amis (Local)
            const friendsRes = await fetch(`${baseUrl}/chat/v4/friends`, {
                headers: { ...headers } // Basic Auth auto-gérée par le helper si besoin, ou on l'ajoute ici
            });

            if (!friendsRes.ok) return [];
            const friendsData = await friendsRes.json();
            const friends = friendsData.friends || [];

            // 2. Récupération des Présences (Local)
            const presencesRes = await fetch(`${baseUrl}/chat/v4/presences`, { headers });
            const presencesData = await presencesRes.json();

            const presencesMap: Record<string, any> = {};
            presencesData.presences?.forEach((p: any) => {
                presencesMap[p.puuid] = p;
            });

            return friends.map((f: any) => {
                const presence = presencesMap[f.puuid];
                let status: Friend["status"] = "offline";
                let product: Friend["product"] = "unknown";
                let richPresence: Friend["richPresence"] = {};

                if (presence) {
                    // devLog(`[Presence] PUUID: ${f.puuid}, Product: ${presence.product}, Private: ${!!presence.private}`);

                    // Basic Status Mapping
                    // Note: 'valorant' product string might be case sensitive or different in some contexts
                    if (presence.product === "valorant" || presence.product === "Valorant") {
                        status = "chat";
                        product = "valorant";
                    } else if (presence.product === "league_of_legends") {
                        status = "chat";
                        product = "league_of_legends";
                    } else {
                        status = "chat";
                        product = "riot_client";
                    }

                    // Rich Presence Parsing (Base64 decoding)
                    if (presence.private) {
                        try {
                            const rawPrivate = Buffer.from(presence.private, 'base64').toString('utf-8');
                            // devLog(`[Presence] Decoded for ${f.game_name}:`, rawPrivate.substring(0, 100) + "..."); 
                            const data = JSON.parse(rawPrivate);

                            // AUTO-DETECT Product based on keys if generic riot_client was set
                            if (product === "riot_client" && data.sessionLoopState) {
                                product = "valorant";
                            }

                            // --- VALORANT PARSING ---
                            if (product === "valorant") {
                                // Game Flow State
                                if (data.sessionLoopState === "MENUS") richPresence.partyState = "MENUS";
                                else if (data.sessionLoopState === "PREGAME") richPresence.partyState = "PREGAME";
                                else if (data.sessionLoopState === "INGAME") richPresence.partyState = "INGAME";
                                else richPresence.partyState = "UNKNOWN";

                                // Party Info
                                richPresence.partySize = data.partySize;
                                richPresence.partyMaxSize = data.partyMaxSize;

                                // Map & Mode
                                richPresence.mapId = data.matchMap;
                                // Simple Map Name Mapping (Todo: Move to shared constant/helper if list grows)
                                const mapPaths: Record<string, string> = {
                                    "/Game/Maps/Ascent/Ascent": "Ascent",
                                    "/Game/Maps/Bonsai/Bonsai": "Split",
                                    "/Game/Maps/Duality/Duality": "Bind",
                                    "/Game/Maps/Port/Port": "Icebox",
                                    "/Game/Maps/Foxtrot/Foxtrot": "Breeze",
                                    "/Game/Maps/Canyon/Canyon": "Fracture",
                                    "/Game/Maps/Triad/Triad": "Haven",
                                    "/Game/Maps/Pitt/Pitt": "Pearl",
                                    "/Game/Maps/Jam/Jam": "Lotus",
                                    "/Game/Maps/Juliett/Juliett": "Sunset",
                                    "/Game/Maps/Hhurm/Hhurm": "Abyss", // Potentially
                                    // Range
                                    "/Game/Maps/Poveglia/Range": "Le Stand"
                                };
                                richPresence.mapName = mapPaths[data.matchMap] || "Carte Inconnue";

                                // Score Parsing (partyOwnerMatchScoreAllyTeam vs Enemy)
                                if (richPresence.partyState === "INGAME") {
                                    const ally = data.partyOwnerMatchScoreAllyTeam ?? 0;
                                    const enemy = data.partyOwnerMatchScoreEnemyTeam ?? 0;
                                    richPresence.matchScore = `${ally} - ${enemy}`;
                                }

                                // Queue / Mode
                                const queueId = data.matchmakingID || data.queueId;
                                const queues: Record<string, string> = {
                                    "competitive": "Compétition",
                                    "unrated": "Non Classé",
                                    "spikerush": "Spike Rush",
                                    "deathmatch": "Combat à Mort",
                                    "ggteam": "Escalade",
                                    "swiftplay": "Vélocité"
                                };
                                richPresence.gameMode = queues[queueId] || queueId || "Sur les menus";

                                // Player Card & Rank
                                richPresence.playerCardId = data.playerCardId;
                                richPresence.playerTitleId = data.playerTitleId;
                                richPresence.level = data.accountLevel;
                                richPresence.rank = data.competitiveTier;
                            }

                            // --- LEAGUE OF LEGENDS PARSING ---
                            else if (product === "league_of_legends") {
                                richPresence.gameMode = data.gameMode || "League";
                                if (data.gameStatus === "inGame") richPresence.partyState = "INGAME";
                                else if (data.gameStatus === "championSelect") richPresence.partyState = "PREGAME";
                                else richPresence.partyState = "MENUS";
                            }

                        } catch (e) {
                            devError(`[RiotService] Failed to parse private presence for ${f.game_name}`, e);
                        }
                    }
                }

                return {
                    puuid: f.puuid,
                    gameName: f.game_name,
                    tagLine: f.game_tag,
                    status,
                    otherGame: product === "league_of_legends",
                    note: f.note,
                    product,
                    richPresence
                };
            });

        } catch (e) {
            devError("[RiotService] Failed to get friends (Local API)", e);
            return [];
        }
    }

    // --- ACTIONS ---

    static async setReady(session: VisperAuthSession, partyId: string, isReady: boolean) {
        const url = getGlzUrl(session.region || "eu", `/parties/v1/parties/${partyId}/members/${session.puuid}/setReady`);
        await fetch(url, {
            method: "POST",
            headers: getHeaders(session),
            body: JSON.stringify({ ready: isReady })
        });
    }

    static async changeQueue(session: VisperAuthSession, partyId: string, queueId: string) {
        const url = getGlzUrl(session.region || "eu", `/parties/v1/parties/${partyId}/queue`);
        await fetch(url, {
            method: "POST",
            headers: getHeaders(session),
            body: JSON.stringify({ queueID: queueId })
        });
    }

    static async setPreferredPods(session: VisperAuthSession, partyId: string, podIds: string[]) {
        const url = getGlzUrl(session.region || "eu", `/parties/v1/parties/${partyId}/matchmaking/pods`);
        await fetch(url, {
            method: "POST",
            headers: getHeaders(session),
            body: JSON.stringify({ preferredPodIDs: podIds })
        });
    }

    static async refreshPings(session: VisperAuthSession, partyId: string) {
        try {
            const url = getGlzUrl(session.region || "eu", `/parties/v1/parties/${partyId}/members/${session.puuid}/refreshPings`);
            // devLog(`[RiotService] Refreshing pings...`);
            await fetch(url, {
                method: "POST",
                headers: getHeaders(session),
                body: JSON.stringify({})
            });
        } catch (e) {
            devError("[RiotService] Failed to refresh pings", e);
        }
    }

    static async setAccessibility(session: VisperAuthSession, partyId: string, open: boolean) {
        const url = getGlzUrl(session.region || "eu", `/parties/v1/parties/${partyId}/accessibility`);
        await fetch(url, {
            method: "POST",
            headers: getHeaders(session),
            body: JSON.stringify({ accessibility: open ? "OPEN" : "CLOSED" })
        });
    }

    static async startMatchmaking(session: VisperAuthSession, partyId: string) {
        const url = getGlzUrl(session.region || "eu", `/parties/v1/parties/${partyId}/matchmaking/join`);
        await fetch(url, {
            method: "POST",
            headers: getHeaders(session),
            body: JSON.stringify({})
        });
    }

    static async stopMatchmaking(session: VisperAuthSession, partyId: string) {
        const url = getGlzUrl(session.region || "eu", `/parties/v1/parties/${partyId}/matchmaking/leave`);
        await fetch(url, {
            method: "POST",
            headers: getHeaders(session),
            body: JSON.stringify({})
        });
    }

    static async leaveParty(session: VisperAuthSession, _partyId: string) {
        const url = getGlzUrl(session.region || "eu", `/parties/v1/players/${session.puuid}`);
        await fetch(url, {
            method: "DELETE",
            headers: getHeaders(session)
        });
    }

    static async generatePartyCode(session: VisperAuthSession, partyId: string) {
        try {
            const url = getGlzUrl(session.region || "eu", `/parties/v1/parties/${partyId}/invitecode`);
            devLog(`[RiotService] Generating Party Code for ${partyId} at ${url}`);

            const res = await fetch(url, {
                method: "POST",
                headers: getHeaders(session),
                body: JSON.stringify({})
            });

            if (!res.ok) {
                const text = await res.text();
                devError(`[RiotService] Failed to generate code: ${res.status} ${res.statusText} - ${text}`);
            } else {
                const data = await res.json();
                devLog(`[RiotService] Code generated successfully:`, JSON.stringify(data));
            }
        } catch (e) {
            devError("[RiotService] Exception in generatePartyCode", e);
        }
    }

    static async removePartyCode(session: VisperAuthSession, partyId: string) {
        const url = getGlzUrl(session.region || "eu", `/parties/v1/parties/${partyId}/invitecode`);
        await fetch(url, {
            method: "DELETE",
            headers: getHeaders(session)
        });
    }

    static async joinPartyByCode(session: VisperAuthSession, code: string) {
        try {
            const url = getGlzUrl(session.region || "eu", `/parties/v1/players/joinbycode/${code}`);
            devLog(`[RiotService] Joining Party with Code ${code} at ${url}`);

            const res = await fetch(url, {
                method: "POST",
                headers: getHeaders(session),
                body: JSON.stringify({})
            });

            if (!res.ok) {
                const text = await res.text();
                devError(`[RiotService] Failed to join by code: ${res.status} ${res.statusText} - ${text}`);
            } else {
                const data = await res.json();
                devLog(`[RiotService] Joined party successfully:`, JSON.stringify(data));
            }
        } catch (e) {
            devError("[RiotService] Exception in joinPartyByCode", e);
        }
    }

    static async inviteByDisplayName(session: VisperAuthSession, partyId: string, name: string, tag: string) {
        const url = getGlzUrl(session.region || "eu", `/parties/v1/parties/${partyId}/invites/name/${encodeURIComponent(name)}/tag/${encodeURIComponent(tag)}`);
        await fetch(url, {
            method: "POST",
            headers: getHeaders(session)
        });
    }

    // --- AGENT SELECTION ---

    /**
     * Récupère l'ID du match de pré-jeu actuel
     */
    static async getPregameMatchId(session: VisperAuthSession): Promise<string | null> {
        try {
            const url = getGlzUrl(session.region || "eu", `/pregame/v1/players/${session.puuid}`);
            const res = await fetch(url, { headers: getHeaders(session) });
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            return data.MatchID;
        } catch (e) {
            // C'est normal si le joueur n'est pas en phase de sélection
            return null;
        }
    }

    /**
     * Sélectionne un agent (sans verrouiller)
     */
    static async selectAgent(session: VisperAuthSession, matchId: string, agentId: string): Promise<boolean> {
        try {
            const url = getGlzUrl(session.region || "eu", `/pregame/v1/matches/${matchId}/select/${agentId}`);
            const res = await fetch(url, {
                method: "POST",
                headers: getHeaders(session)
            });
            return res.ok;
        } catch (e) {
            devError("[RiotService] Failed to select agent", e);
            return false;
        }
    }

    /**
     * Verrouille l'agent sélectionné
     */
    static async lockAgent(session: VisperAuthSession, matchId: string, agentId: string): Promise<boolean> {
        try {
            const url = getGlzUrl(session.region || "eu", `/pregame/v1/matches/${matchId}/lock/${agentId}`);
            const res = await fetch(url, {
                method: "POST",
                headers: getHeaders(session)
            });
            return res.ok;
        } catch (e) {
            devError("[RiotService] Failed to lock agent", e);
            return false;
        }
    }
}
