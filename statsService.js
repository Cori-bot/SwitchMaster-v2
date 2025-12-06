const https = require('https');

/**
 * Service for fetching account statistics from tracker.gg
 */

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Origin': 'https://tracker.gg',
    'Referer': 'https://tracker.gg/',
};

/**
 * Make HTTPS GET request
 */
function httpsGet(url, headers) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers }, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Failed to parse JSON response'));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * Parse Riot ID (Username#TAG)
 */
function parseRiotId(riotId) {
    const parts = riotId.split('#');
    if (parts.length !== 2) {
        throw new Error('Invalid Riot ID format. Expected: Username#TAG');
    }
    return {
        name: encodeURIComponent(parts[0]),
        tag: encodeURIComponent(parts[1])
    };
}

/**
 * Fetch Valorant account statistics
 */
async function fetchValorantStats(riotId) {
    const { name, tag } = parseRiotId(riotId);
    const url = `https://api.tracker.gg/api/v2/valorant/standard/profile/riot/${name}%23${tag}?source=web`;

    try {
        const data = await httpsGet(url, HEADERS);

        if (!data.data || !data.data.segments) {
            throw new Error('Invalid response structure from API');
        }

        const segments = data.data.segments;

        // Find competitive segment
        let competitiveSegment = segments.find(s =>
            s.attributes && s.attributes.playlist === 'competitive'
        );

        // If no competitive data in main response, it might be unranked
        if (!competitiveSegment) {
            competitiveSegment = segments[0]; // Use first segment as fallback
        }

        const stats = competitiveSegment.stats || {};
        const metadata = data.data.metadata || {};

        return {
            game: 'valorant',
            riotId: riotId,
            level: metadata.accountLevel || 0,
            rank: stats.rank?.metadata?.tierName || 'Unranked',
            rankIcon: stats.rank?.metadata?.iconUrl || 'https://trackercdn.com/cdn/tracker.gg/valorant/icons/tiersv2/0.png',
            peakRank: stats.peakRank?.metadata?.tierName || 'Unranked',
            peakRankIcon: stats.peakRank?.metadata?.iconUrl || 'https://trackercdn.com/cdn/tracker.gg/valorant/icons/tiersv2/0.png',
            playtime: segments[0]?.stats?.timePlayed?.displayValue || '0h',
            banner: data.data.platformInfo?.avatarUrl || null,
            shard: metadata.activeShard || 'unknown'
        };
    } catch (error) {
        console.error('Error fetching Valorant stats:', error);
        throw new Error(`Failed to fetch Valorant stats: ${error.message}`);
    }
}

/**
 * Fetch League of Legends account statistics
 */
async function fetchLeagueStats(riotId) {
    const { name, tag } = parseRiotId(riotId);
    const url = `https://api.tracker.gg/api/v2/lol/standard/profile/riot/${name}%23${tag}?source=web`;

    try {
        const data = await httpsGet(url, HEADERS);

        if (!data.data || !data.data.segments) {
            throw new Error('Invalid response structure from API');
        }

        const segments = data.data.segments;
        const metadata = data.data.metadata || {};

        // Find ranked solo segment
        let rankedSegment = segments.find(s =>
            s.metadata && s.metadata.queueType === 'RANKED_SOLO_5x5'
        );

        if (!rankedSegment) {
            rankedSegment = segments[0]; // Fallback
        }

        const stats = rankedSegment?.stats || {};

        return {
            game: 'league',
            riotId: riotId,
            level: metadata.accountLevel || 0,
            rank: stats.tier?.metadata?.tierName || 'Unranked',
            rankIcon: stats.tier?.metadata?.iconUrl || 'https://trackercdn.com/cdn/tracker.gg/lol/ranks/s14/unranked.png',
            peakRank: stats.tier?.metadata?.tierName || 'Unranked', // League doesn't have peak rank in same way
            peakRankIcon: stats.tier?.metadata?.iconUrl || 'https://trackercdn.com/cdn/tracker.gg/lol/ranks/s14/unranked.png',
            playtime: stats.matchesPlayed?.displayValue || '0 games',
            banner: data.data.platformInfo?.avatarUrl || null,
            shard: metadata.platformSlug || 'unknown'
        };
    } catch (error) {
        console.error('Error fetching League stats:', error);
        throw new Error(`Failed to fetch League stats: ${error.message}`);
    }
}

/**
 * Main function to fetch stats based on game type
 */
async function fetchAccountStats(riotId, gameType) {
    if (!riotId || !riotId.includes('#')) {
        throw new Error('Invalid Riot ID format');
    }

    if (gameType === 'valorant') {
        return await fetchValorantStats(riotId);
    } else if (gameType === 'league') {
        return await fetchLeagueStats(riotId);
    } else {
        throw new Error('Invalid game type. Must be "valorant" or "league"');
    }
}

module.exports = {
    fetchAccountStats,
    fetchValorantStats,
    fetchLeagueStats
};
