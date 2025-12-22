import https from "https";
import { IncomingMessage } from "http";

// Service for fetching account statistics from tracker.gg

import { devLog, devError } from "./logger";

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

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.5",
  Origin: "https://tracker.gg",
  Referer: "https://tracker.gg/",
};

// Make HTTPS GET request
function httpsGet<T>(url: string, headers: Record<string, string>): Promise<T> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers }, (res) => {
        let responseBody = "";
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => handleResponse(res, responseBody, resolve, reject));
      })
      .on("error", (err) => reject(err));
  });
}

function handleResponse<T>(
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

// Parse Riot ID (Username#TAG)
function parseRiotId(riotId: string) {
  const parts = riotId.split("#");
  if (parts.length !== 2) {
    throw new Error("Invalid Riot ID format. Expected: Username#TAG");
  }
  return {
    name: encodeURIComponent(parts[0]),
    tag: encodeURIComponent(parts[1]),
  };
}

//Fetch Valorant account statistics
async function fetchValorantStats(riotId: string) {
  const { name, tag } = parseRiotId(riotId);
  const baseUrl = `https://api.tracker.gg/api/v2/valorant/standard/profile/riot/${name}%23${tag}`;
  const urlObj = new URL(baseUrl);
  urlObj.searchParams.set("source", "web");
  const url = urlObj.toString();

  try {
    const apiResponse = await httpsGet<TrackerResponse>(url, HEADERS);

    if (!apiResponse.data || !apiResponse.data.segments) {
      throw new Error("Invalid response structure from API");
    }

    const segments = apiResponse.data.segments;

    // Find competitive segment
    const VALORANT_PLAYLISTS = [
      "competitive",
      "comp",
      "ranked_solo_5x5",
      "ranked-solo-5x5",
    ];
    let competitiveSegment = segments.find(
      (s) =>
        s.attributes?.playlist &&
        VALORANT_PLAYLISTS.includes(s.attributes.playlist.toLowerCase()),
    );

    // Fallback: search for any segment that has rank/tier info
    if (!competitiveSegment) {
      competitiveSegment = segments.find(
        (s) => s.stats && (s.stats.tier || s.stats.rank),
      );
    }

    if (!competitiveSegment) {
      competitiveSegment = segments[0];
    }

    const stats = competitiveSegment.stats || {};

    // Extraction sécurisée des métadonnées
    const rankStat = stats.tier || stats.rank || {};
    const rankTierName =
      (rankStat.metadata &&
        (rankStat.metadata.rankName || rankStat.metadata.tierName)) ||
      "Unranked";
    const rankIconUrl =
      (rankStat.metadata && rankStat.metadata.iconUrl) ||
      "https://trackercdn.com/cdn/tracker.gg/valorant/icons/tiers/0.png";

    devLog(`[DEV-STATS] VALORANT - ${riotId}:`, {
      rank: rankTierName,
    });

    return {
      rank: rankTierName,
      rankIcon: rankIconUrl,
      lastUpdate: Date.now(),
    };
  } catch (err) {
    const error = err as Error;
    devError(`Error fetching Valorant stats for ${riotId}:`, error.message);
    return null;
  }
}

// Fetch League of Legends account statistics
async function fetchLeagueStats(riotId: string) {
  const { name, tag } = parseRiotId(riotId);
  const url = `https://api.tracker.gg/api/v2/lol/standard/profile/riot/${name}%23${tag}`;

  try {
    const apiResponse = await httpsGet<TrackerResponse>(url, HEADERS);

    if (!apiResponse.data || !apiResponse.data.segments) {
      throw new Error("Invalid response structure from API");
    }

    const segments = apiResponse.data.segments;

    // Find ranked-solo-5x5 segment
    const LEAGUE_PLAYLISTS = [
      "ranked_solo_5x5",
      "ranked-solo-5x5",
      "ranked-solo",
      "rank-solo",
    ];
    let rankedSegment = segments.find(
      (s) =>
        s.attributes?.playlist &&
        LEAGUE_PLAYLISTS.includes(s.attributes.playlist.toLowerCase()),
    );

    // Fallback: search for any segment that has rank/tier info
    if (!rankedSegment) {
      rankedSegment = segments.find(
        (s) => s.stats && (s.stats.tier || s.stats.rank),
      );
    }

    if (!rankedSegment) {
      rankedSegment = segments[0];
    }

    const stats = rankedSegment.stats || {};

    // Extraction sécurisée des métadonnées
    const rankStat = stats.tier || stats.rank || {};
    const rankTierName =
      (rankStat.metadata &&
        (rankStat.metadata.rankName || rankStat.metadata.tierName)) ||
      "Unranked";
    const rankIconUrl =
      (rankStat.metadata && rankStat.metadata.iconUrl) ||
      "https://trackercdn.com/cdn/tracker.gg/lol/ranks/2023/icons/unranked.svg";

    devLog(`[DEV-STATS] LEAGUE - ${riotId}:`, {
      rank: rankTierName,
    });

    return {
      rank: rankTierName,
      rankIcon: rankIconUrl,
      lastUpdate: Date.now(),
    };
  } catch (err) {
    const error = err as Error;
    devError(`Error fetching League stats for ${riotId}:`, error.message);
    return null;
  }
}

export async function fetchAccountStats(
  riotId: string,
  gameType: "league" | "valorant",
) {
  devLog(`Fetching ${gameType} stats for ${riotId}...`);
  if (gameType === "league") {
    return await fetchLeagueStats(riotId);
  } else {
    return await fetchValorantStats(riotId);
  }
}
