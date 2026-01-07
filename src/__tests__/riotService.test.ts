import { describe, it, expect, vi, beforeEach } from "vitest";
import { RiotService } from "../main/visper/riotService";
import { VisperAuthSession } from "../main/valorant-api/riotWebviewAuth";

global.fetch = vi.fn();

describe("RiotService - Agent Selection", () => {
    const mockSession: VisperAuthSession = {
        accessToken: "mock_access_token",
        entitlementsToken: "mock_entitlements_token",
        puuid: "mock_puuid",
        region: "eu",
        clientVersion: "mock_version"
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("selectAgent", () => {
        it("should return true when selection is successful", async () => {
            (fetch as any).mockResolvedValue({
                ok: true
            });

            // Note: selectAgent n'est pas encore implémenté, ce test doit échouer à la compilation ou à l'exécution
            const success = await RiotService.selectAgent(mockSession, "match_123", "agent_456");
            expect(success).toBe(true);
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining("/pregame/v1/matches/match_123/select/agent_456"),
                expect.objectContaining({ method: "POST" })
            );
        });

        it("should return false when selection fails", async () => {
             (fetch as any).mockResolvedValue({
                ok: false
            });

            const success = await RiotService.selectAgent(mockSession, "match_123", "agent_456");
            expect(success).toBe(false);
        });
    });

    describe("lockAgent", () => {
        it("should return true when lock is successful", async () => {
            (fetch as any).mockResolvedValue({
                ok: true
            });

            // Note: lockAgent n'est pas encore implémenté
            const success = await RiotService.lockAgent(mockSession, "match_123", "agent_456");
            expect(success).toBe(true);
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining("/pregame/v1/matches/match_123/lock/agent_456"),
                expect.objectContaining({ method: "POST" })
            );
        });

         it("should return false when lock fails", async () => {
             (fetch as any).mockResolvedValue({
                ok: false
            });

            const success = await RiotService.lockAgent(mockSession, "match_123", "agent_456");
            expect(success).toBe(false);
        });
    });
});
