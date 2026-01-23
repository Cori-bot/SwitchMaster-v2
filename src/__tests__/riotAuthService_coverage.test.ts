
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RiotAuthService } from "../main/valorant-api/riotAuthService";

// Mock logger
vi.mock("../main/logger", () => ({
    devLog: vi.fn(),
    devError: vi.fn(),
    devDebug: vi.fn(),
}));

describe("RiotAuthService Coverage", () => {
    const originalFetch = global.fetch;
    const mockFetch = vi.fn();

    beforeEach(() => {
        global.fetch = mockFetch;
        vi.clearAllMocks();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    const mockAccessToken = "access_token";
    const mockIdToken = "id_token";

    it("getClientVersion defaults on error", async () => {
        mockFetch.mockRejectedValueOnce(new Error("Network error"));
        const version = await RiotAuthService.getClientVersion();
        expect(version).toBe("release-09.11-shipping-43-3069153");
    });

    it("finishAuth handles entitlements failure", async () => {
        // Entitlements fetch fails
        mockFetch.mockRejectedValueOnce(new Error("Entitlements failed"));

        const result = await RiotAuthService.finishAuth(mockAccessToken);
        expect(result).toBeNull();
    });

    it("finishAuth handles userinfo failure but continues", async () => {
        // 1. Entitlements success
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ entitlements_token: "ent_token" })
        });

        // 2. UserInfo fails
        mockFetch.mockRejectedValueOnce(new Error("UserInfo failed"));

        // 3. ClientVersion success (called internally)
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ data: { riotClientVersion: "v1.0" } })
        });

        // 4. XP success
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ Progress: { Level: 5 } })
        });

        // 5. MMR success
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ LatestCompetitiveUpdate: { TierAfterUpdate: 10 } })
        });

        // 6. Loadout success
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ Identity: { PlayerCardID: "card1" } })
        });

        const result = await RiotAuthService.finishAuth(mockAccessToken);

        expect(result).not.toBeNull();
        expect(result?.puuid).toBe(""); // Default
        expect(result?.entitlementsToken).toBe("ent_token");
    });

    it("finishAuth detects region when idToken provided", async () => {
        // 1. Entitlements
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ entitlements_token: "ent_token" })
        });

        // 2. UserInfo
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ sub: "puuid1", acct: { game_name: "G", tag_line: "T" } })
        });

        // 3. Region detection (since idToken is passed)
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ affinities: { live: "na" } })
        });

        // 4. Client Version
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ data: { riotClientVersion: "v1.0" } })
        });

        // 5. XP
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ Progress: { Level: 10 } })
        });

        // 6. MMR
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ LatestCompetitiveUpdate: { TierAfterUpdate: 20 } })
        });

        // 7. Loadout
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ Identity: { PlayerCardID: "card1" } })
        });

        const result = await RiotAuthService.finishAuth(mockAccessToken, mockIdToken);

        expect(result?.region).toBe("na");
    });

    it("finishAuth defaults region when detection fails", async () => {
        // 1. Entitlements
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ entitlements_token: "ent_token" })
        });

        // 2. UserInfo
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ sub: "puuid1" })
        });

        // 3. Region detection fails
        mockFetch.mockRejectedValueOnce(new Error("Geo failed"));

        // 4. Client Version
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ data: { riotClientVersion: "v1.0" } })
        });

        // 5. XP
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({})
        });

        // 6. MMR
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({})
        });

        // 7. Loadout
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({})
        });

        const result = await RiotAuthService.finishAuth(mockAccessToken, mockIdToken);

        expect(result?.region).toBe("eu"); // Default
    });

    it("finishAuth handles all optional fetches failing", async () => {
        // 1. Entitlements
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ entitlements_token: "ent_token" })
        });

        // 2. UserInfo
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ sub: "puuid1" })
        });

        // No region fetch because no idToken

        // 3. Client Version
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ data: { riotClientVersion: "v1.0" } })
        });

        // 4. XP fails
        mockFetch.mockRejectedValueOnce(new Error("XP failed"));

        // 5. MMR fails
        mockFetch.mockRejectedValueOnce(new Error("MMR failed"));

        // 6. Loadout fails
        mockFetch.mockRejectedValueOnce(new Error("Loadout failed"));

        const result = await RiotAuthService.finishAuth(mockAccessToken);

        expect(result?.accountLevel).toBe(1);
        expect(result?.competitiveTier).toBe(0);
        expect(result?.playerCardId).toBe("");
    });

    it("finishAuth defaults region to eu when geo data is missing affinities", async () => {
        // 1. Entitlements
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ entitlements_token: "ent_token" })
        });

        // 2. UserInfo
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ sub: "puuid1" })
        });

        // 3. Region detection success but empty data
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({}) // No affinities
        });

        // 4. Client Version
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({ data: { riotClientVersion: "v1.0" } })
        });

        // 5. XP
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({})
        });

        // 6. MMR
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({})
        });

        // 7. Loadout
        mockFetch.mockResolvedValueOnce({
            json: () => Promise.resolve({})
        });

        const result = await RiotAuthService.finishAuth(mockAccessToken, mockIdToken);

        expect(result?.region).toBe("eu");
    });
});
