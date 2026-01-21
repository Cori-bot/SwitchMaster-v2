
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RiotWebviewAuth } from "../main/valorant-api/riotWebviewAuth";

// Mock global fetch
global.fetch = vi.fn();

vi.mock("../main/logger");

describe("riotWebviewAuth.ts Gap Coverage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Line 281: Top level catch in finishAuth
    it("finishAuth handles fatal errors gracefully", async () => {
        // Mock fetch to throw immediately before any sub-try/catch
        (global.fetch as any).mockRejectedValueOnce(new Error("Fatal Network Error"));

        // finishAuth is private static, access via any with correct params (accessToken, idToken)
        const result = await (RiotWebviewAuth as any).finishAuth("token", "id-token");
        expect(result).toBeNull();
    });
});
