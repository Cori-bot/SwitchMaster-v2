import https from "https";
import { IncomingMessage } from "http";
import { devLog, devError } from "../logger";

interface TrackerSegment {
  attributes?: {
    playlist?: string;
  };
  stats?: Record<
    string,
    {
      value?: number;
      displayValue?: string;
      metadata?: {
        tierName?: string;
        rankName?: string;
        iconUrl?: string;
      };
    }
  >;
}

interface TrackerResponse {
  data?: {
    segments?: TrackerSegment[];
  };
}

export class StatsService {
  private readonly HEADERS = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.5",
    Origin: "https://tracker.gg",
    Referer: "https://tracker.gg/",
  };

  constructor() {}

  public async fetchAccountStats(
    riotId: string,
    gameType: "league" | "valorant",
  ) {
    devLog(`StatsService: Fetching ${gameType} stats for ${riotId}...`);
    if (gameType === "league") {
      return await this.fetchLeagueStats(riotId);
    } else {
      return await this.fetchValorantStats(riotId);
    }
  }

  private async fetchValorantStats(riotId: string) {
    try {
      const { name, tag } = this.parseRiotId(riotId);
      const url = `https://api.tracker.gg/api/v2/valorant/standard/profile/riot/${name}%23${tag}?source=web`;

      const apiResponse = await this.httpsGet<TrackerResponse>(
        url,
        this.HEADERS,
      );
      if (!apiResponse.data?.segments) throw new Error("Invalid response");

      const VALORANT_PLAYLISTS = [
        "competitive",
        "comp",
        "ranked_solo_5x5",
        "ranked-solo-5x5",
      ];
      const segment = this.findBestSegment(
        apiResponse.data.segments,
        VALORANT_PLAYLISTS,
      );
      const { rank, icon } = this.extractRankInfo(
        segment,
        "https://trackercdn.com/cdn/tracker.gg/valorant/icons/tiers/0.png",
      );

      devLog(`[DEV-STATS] VALORANT - ${riotId}: { rank: '${rank}' }`);

      return { rank, rankIcon: icon, lastUpdate: Date.now() };
    } catch (err) {
      const errorMsg = (err as Error).message;
      if (errorMsg.includes("HTTP 404")) {
        devLog(
          `Stats not found for ${riotId} (404) - Account may be private or not found.`,
        );
      } else {
        devError(`Error Valorant stats ${riotId}:`, errorMsg);
      }
      return null;
    }
  }

  private async fetchLeagueStats(riotId: string) {
    try {
      const { name, tag } = this.parseRiotId(riotId);
      const url = `https://api.tracker.gg/api/v2/lol/standard/profile/riot/${name}%23${tag}`;

      const apiResponse = await this.httpsGet<TrackerResponse>(
        url,
        this.HEADERS,
      );
      if (!apiResponse.data?.segments) throw new Error("Invalid response");

      const LEAGUE_PLAYLISTS = [
        "ranked_solo_5x5",
        "ranked-solo-5x5",
        "ranked-solo",
        "rank-solo",
      ];
      const segment = this.findBestSegment(
        apiResponse.data.segments,
        LEAGUE_PLAYLISTS,
      );
      const { rank, icon } = this.extractRankInfo(
        segment,
        "https://trackercdn.com/cdn/tracker.gg/lol/ranks/2023/icons/unranked.svg",
      );

      devLog(`[DEV-STATS] LEAGUE - ${riotId}: { rank: '${rank}' }`);

      return { rank, rankIcon: icon, lastUpdate: Date.now() };
    } catch (err) {
      const errorMsg = (err as Error).message;
      if (errorMsg.includes("HTTP 404")) {
        devLog(
          `Stats not found for ${riotId} (404) - Account may be private or not found.`,
        );
      } else {
        devError(`Error League stats ${riotId}:`, errorMsg);
      }
      return null;
    }
  }

  private httpsGet<T>(
    url: string,
    headers: Record<string, string>,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      https
        .get(url, { headers }, (res) => {
          let responseBody = "";
          res.on("data", (chunk) => {
            responseBody += chunk;
          });
          res.on("end", () =>
            this.handleResponse(res, responseBody, resolve, reject),
          );
        })
        .on("error", (err) => reject(err));
    });
  }

  private handleResponse<T>(
    res: IncomingMessage,
    responseBody: string,
    resolve: (val: T) => void,
    reject: (err: Error) => void,
  ) {
    if (res.statusCode !== 200) {
      return reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
    }

    try {
      resolve(JSON.parse(responseBody) as T);
    } catch (e) {
      reject(new Error("Failed to parse JSON response"));
    }
  }

  private parseRiotId(riotId: string) {
    const parts = riotId.split("#");
    if (parts.length !== 2) {
      throw new Error("Invalid Riot ID format. Expected: Username#TAG");
    }
    return {
      name: encodeURIComponent(parts[0]),
      tag: encodeURIComponent(parts[1]),
    };
  }

  private findBestSegment(
    segments: TrackerSegment[],
    preferredPlaylists: string[],
  ) {
    let segment = segments.find(
      (s) =>
        s.attributes?.playlist &&
        preferredPlaylists.includes(s.attributes.playlist.toLowerCase()),
    );

    if (!segment) {
      segment = segments.find((s) => s.stats && (s.stats.tier || s.stats.rank));
    }

    return segment || segments[0];
  }

  private extractRankInfo(segment: TrackerSegment, defaultIcon: string) {
    const stats = segment.stats || {};
    const rankStat = stats.tier || stats.rank || {};

    const rank =
      (rankStat.metadata &&
        (rankStat.metadata.rankName || rankStat.metadata.tierName)) ||
      "Unranked";
    const icon =
      (rankStat.metadata && rankStat.metadata.iconUrl) || defaultIcon;

    return { rank, icon };
  }
}
