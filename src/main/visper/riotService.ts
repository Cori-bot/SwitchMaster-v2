import { VisperAuthSession } from "../valorant-api/riotWebviewAuth";
import { devLog, devError } from "../logger";
import { PartyData, PartyState, Friend } from "../../shared/visper-types";

// Headers standards pour l'API Riot
const getHeaders = (session: VisperAuthSession) => ({
  Authorization: `Bearer ${session.accessToken}`,
  "X-Riot-Entitlements-JWT": session.entitlementsToken,
  "X-Riot-ClientVersion": "release-11.11-shipping-9-4026545",
  "X-Riot-ClientPlatform":
    "ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIndpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9",
  "Content-Type": "application/json",
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

// Construction de l'URL Chat
const getChatUrl = (region: string, path: string) => {
  const shard = region === "latam" || region === "br" ? "na" : region;
  return `https://chat.${shard}.a.pvp.net${path}`;
};

export class RiotService {
  /**
   * Récupère l'ID du groupe actuel du joueur
   */
  static async getPlayerPartyId(
    session: VisperAuthSession,
  ): Promise<string | null> {
    try {
      const url = getGlzUrl(
        session.region || "eu",
        `/parties/v1/players/${session.puuid}`,
      );
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
  static async getPartyDetails(
    session: VisperAuthSession,
    partyId: string,
  ): Promise<PartyData | null> {
    try {
      const url = getGlzUrl(
        session.region || "eu",
        `/parties/v1/parties/${partyId}`,
      );
      const res = await fetch(url, { headers: getHeaders(session) });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      return await res.json();
    } catch (e) {
      devError("[RiotService] Failed to get party details", e);
      return null;
    }
  }

  /**
   * Récupère les noms des joueurs (Name Service)
   */
  static async getPlayerNames(
    session: VisperAuthSession,
    puuids: string[],
  ): Promise<Record<string, { GameName: string; TagLine: string }>> {
    try {
      const url = getPdUrl(session.region || "eu", `/name-service/v2/players`);
      const res = await fetch(url, {
        method: "PUT",
        headers: getHeaders(session),
        body: JSON.stringify(puuids),
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
  static async getPartyState(
    session: VisperAuthSession,
  ): Promise<PartyState | null> {
    const partyId = await this.getPlayerPartyId(session);
    if (!partyId) return null;

    const party = await this.getPartyDetails(session, partyId);
    if (!party) return null;

    // Récupération des noms manquants
    const puuids = party.Members.map((m) => m.Subject);
    const names = await this.getPlayerNames(session, puuids);

    // Transformation pour le frontend
    return {
      partyId: party.ID,
      state: party.State,
      queueId: party.MatchmakingData.QueueID,
      accessibility: party.Accessibility,
      inviteCode: party.InviteCode,
      preferredPods: party.MatchmakingData.PreferredPodIDs || [],
      members: party.Members.map((m, index) => {
        // Mapping des Pings
        const pings: Record<string, number> = {};
        if (Array.isArray(m.Pings)) {
          m.Pings.forEach((p) => {
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
          isLeader: index === 0, // Convention: Le premier membre est le leader
          pings,
        };
      }),
    };
  }

  // --- CHAT & FRIENDS ---

  static async getPasToken(session: VisperAuthSession): Promise<string | null> {
    try {
      const url = `https://riot-geo.pas.si.riotgames.com/pas/v1/service/chat`;
      const res = await fetch(url, { headers: getHeaders(session) });
      const data = await res.json();
      return data;
    } catch (e) {
      // devError("[RiotService] Failed to get PAS token", e); // Silence verbose error
      return null;
    }
  }

  static async getFriends(session: VisperAuthSession): Promise<Friend[]> {
    try {
      const pasToken = await this.getPasToken(session);
      if (!pasToken) return [];

      const url = getChatUrl(session.region || "eu", `/chat/v4/friends`);
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${pasToken}`,
          "X-Riot-Entitlements-JWT": session.entitlementsToken,
        },
      });

      if (!res.ok) return [];

      const data = await res.json();
      const friends = data.friends || [];

      // Récupération des présences pour le statut
      const presencesRes = await fetch(
        getChatUrl(session.region || "eu", `/chat/v4/presences`),
        {
          headers: {
            Authorization: `Bearer ${pasToken}`,
            "X-Riot-Entitlements-JWT": session.entitlementsToken,
          },
        },
      );

      const presences = await presencesRes.json();
      const presencesMap: Record<string, any> = {};
      presences.presences?.forEach((p: any) => {
        presencesMap[p.puuid] = p;
      });

      return friends.map((f: any) => {
        const presence = presencesMap[f.puuid];
        let status: Friend["status"] = "offline";
        let otherGame = false;
        let note = f.note;

        if (presence) {
          if (presence.product === "valorant") {
            status = "chat";
          } else if (presence.product === "league_of_legends") {
            status = "chat";
            otherGame = true;
          } else {
            status = "chat";
          }
        }

        return {
          puuid: f.puuid,
          gameName: f.game_name,
          tagLine: f.game_tag,
          status,
          otherGame,
          note,
        };
      });
    } catch (e) {
      // devError("[RiotService] Failed to get friends", e);
      return [];
    }
  }

  // --- ACTIONS ---

  static async setReady(
    session: VisperAuthSession,
    partyId: string,
    isReady: boolean,
  ) {
    const url = getGlzUrl(
      session.region || "eu",
      `/parties/v1/parties/${partyId}/members/${session.puuid}/setReady`,
    );
    await fetch(url, {
      method: "POST",
      headers: getHeaders(session),
      body: JSON.stringify({ ready: isReady }),
    });
  }

  static async changeQueue(
    session: VisperAuthSession,
    partyId: string,
    queueId: string,
  ) {
    const url = getGlzUrl(
      session.region || "eu",
      `/parties/v1/parties/${partyId}/queue`,
    );
    await fetch(url, {
      method: "POST",
      headers: getHeaders(session),
      body: JSON.stringify({ queueID: queueId }),
    });
  }

  static async setPreferredPods(
    session: VisperAuthSession,
    partyId: string,
    podIds: string[],
  ) {
    const url = getGlzUrl(
      session.region || "eu",
      `/parties/v1/parties/${partyId}/matchmaking/pods`,
    );
    await fetch(url, {
      method: "POST",
      headers: getHeaders(session),
      body: JSON.stringify({ preferredPodIDs: podIds }),
    });
  }

  static async setAccessibility(
    session: VisperAuthSession,
    partyId: string,
    open: boolean,
  ) {
    const url = getGlzUrl(
      session.region || "eu",
      `/parties/v1/parties/${partyId}/accessibility`,
    );
    await fetch(url, {
      method: "POST",
      headers: getHeaders(session),
      body: JSON.stringify({ accessibility: open ? "OPEN" : "CLOSED" }),
    });
  }

  static async startMatchmaking(session: VisperAuthSession, partyId: string) {
    const url = getGlzUrl(
      session.region || "eu",
      `/parties/v1/parties/${partyId}/matchmaking/join`,
    );
    await fetch(url, {
      method: "POST",
      headers: getHeaders(session),
      body: JSON.stringify({}),
    });
  }

  static async stopMatchmaking(session: VisperAuthSession, partyId: string) {
    const url = getGlzUrl(
      session.region || "eu",
      `/parties/v1/parties/${partyId}/matchmaking/leave`,
    );
    await fetch(url, {
      method: "POST",
      headers: getHeaders(session),
      body: JSON.stringify({}),
    });
  }

  static async leaveParty(session: VisperAuthSession, partyId: string) {
    const url = getGlzUrl(
      session.region || "eu",
      `/parties/v1/players/${session.puuid}`,
    );
    await fetch(url, {
      method: "DELETE",
      headers: getHeaders(session),
    });
  }

  static async generatePartyCode(session: VisperAuthSession, partyId: string) {
    const url = getGlzUrl(
      session.region || "eu",
      `/parties/v1/parties/${partyId}/make-code`,
    );
    await fetch(url, {
      method: "POST",
      headers: getHeaders(session),
    });
  }

  static async removePartyCode(session: VisperAuthSession, partyId: string) {
    const url = getGlzUrl(
      session.region || "eu",
      `/parties/v1/parties/${partyId}/remove-code`,
    );
    await fetch(url, {
      method: "DELETE",
      headers: getHeaders(session),
    });
  }

  static async joinPartyByCode(session: VisperAuthSession, code: string) {
    const url = getGlzUrl(
      session.region || "eu",
      `/parties/v1/players/${session.puuid}/joinbycode/${code}`,
    );
    await fetch(url, {
      method: "POST",
      headers: getHeaders(session),
    });
  }

  static async inviteByDisplayName(
    session: VisperAuthSession,
    partyId: string,
    name: string,
    tag: string,
  ) {
    const url = getGlzUrl(
      session.region || "eu",
      `/parties/v1/parties/${partyId}/invites/name/${encodeURIComponent(name)}/tag/${encodeURIComponent(tag)}`,
    );
    await fetch(url, {
      method: "POST",
      headers: getHeaders(session),
    });
  }
}
