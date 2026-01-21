import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchAccountStats } from "../main/statsService";
import https from "https";
import { IncomingMessage } from "http";
import EventEmitter from "events";

// Mock https
vi.mock("https", () => ({
    default: {
        get: vi.fn(),
    },
}));

describe("StatsService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockHttpsRequest = (statusCode: number, body: string | object) => {
        const response = new EventEmitter() as any;
        response.statusCode = statusCode;

        (https.get as any).mockImplementation((url: string, options: any, cb: any) => {
            // Handle optional options argument
            const callback = typeof options === 'function' ? options : cb;
            if (callback) callback(response);

            const responseString = typeof body === "string" ? body : JSON.stringify(body);
            response.emit("data", responseString);
            response.emit("end");
            return { on: vi.fn() };
        });
    };

    const mockHttpsError = (errorMsg: string) => {
        (https.get as any).mockImplementation((url: string, options: any, cb: any) => {
            const req = new EventEmitter();
            setTimeout(() => req.emit("error", new Error(errorMsg)), 0);
            return req;
        });
    };

    describe("Validation", () => {
        it("doit rejeter un RiotID invalide", async () => {
            await expect(fetchAccountStats("InvalidID", "valorant")).resolves.toBeNull();
        });
    });

    describe("Valorant Stats", () => {
        it("doit parser correctement les stats Valorant", async () => {
            const mockResponse = {
                data: {
                    segments: [
                        {
                            attributes: { playlist: "competitive" },
                            stats: {
                                tier: {
                                    metadata: {
                                        tierName: "Diamond 1",
                                        iconUrl: "http://icon.png"
                                    }
                                }
                            }
                        }
                    ]
                }
            };

            mockHttpsRequest(200, mockResponse);

            const stats = await fetchAccountStats("Player#TAG", "valorant");
            expect(stats).toEqual({
                rank: "Diamond 1",
                rankIcon: "http://icon.png",
                lastUpdate: expect.any(Number)
            });
        });

        it("doit gérer une erreur 404 (compte privé/introuvable)", async () => {
            mockHttpsRequest(404, "Not Found");
            const stats = await fetchAccountStats("Player#TAG", "valorant");
            expect(stats).toBeNull();
        });

        it("doit gérer une réponse invalide", async () => {
            mockHttpsRequest(200, { data: {} }); // Pas de segments
            const stats = await fetchAccountStats("Player#TAG", "valorant");
            expect(stats).toBeNull();
        });
    });

    describe("League Stats", () => {
        it("doit parser correctement les stats League", async () => {
            const mockResponse = {
                data: {
                    segments: [
                        {
                            attributes: { playlist: "ranked_solo_5x5" },
                            stats: {
                                tier: {
                                    metadata: {
                                        tierName: "Gold IV",
                                        iconUrl: "http://icon.png"
                                    }
                                }
                            }
                        }
                    ]
                }
            };

            mockHttpsRequest(200, mockResponse);

            const stats = await fetchAccountStats("Player#TAG", "league");
            expect(stats).toEqual({
                rank: "Gold IV",
                rankIcon: "http://icon.png",
                lastUpdate: expect.any(Number)
            });
        });

        it("doit utiliser le fallback si segment pas trouvé", async () => {
            const mockResponse = {
                data: {
                    segments: [
                        {
                            attributes: { playlist: "other" },
                            stats: {}
                        }
                    ]
                }
            };
            mockHttpsRequest(200, mockResponse);
            const stats = await fetchAccountStats("Player#TAG", "league");
            expect(stats).toEqual({
                rank: "Unranked", // Default value
                rankIcon: expect.stringContaining("unranked.svg"),
                lastUpdate: expect.any(Number)
            });
        });
        it("doit gérer une erreur 404 pour League (compte privé/introuvable)", async () => {
            mockHttpsRequest(404, "Not Found");
            const stats = await fetchAccountStats("Player#TAG", "league");
            expect(stats).toBeNull();
        });

        it("doit gérer une erreur générique pour League (ex: 500)", async () => {
            mockHttpsRequest(500, "Server Error");
            const stats = await fetchAccountStats("Player#TAG", "league");
            expect(stats).toBeNull();
        });
    });

    describe("Network Errors", () => {
        it("doit gérer les erreurs réseau", async () => {
            mockHttpsError("Network error");
            const stats = await fetchAccountStats("Player#TAG", "valorant");
            expect(stats).toBeNull();
        });

        it("doit gérer le JSON malformé", async () => {
            mockHttpsRequest(200, "{ invalid json");
            const stats = await fetchAccountStats("Player#TAG", "valorant");
            expect(stats).toBeNull();
        });
    });
});
