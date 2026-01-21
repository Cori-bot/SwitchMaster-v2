
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchAccountStats } from "../main/statsService";
import https from "https";
import { EventEmitter } from "events";

// Mock helper for https.get
function mockHttpsGet(responseBody: any, statusCode: number = 200) {
    vi.spyOn(https, "get").mockImplementation((url: any, options: any, cb?: any) => {
        const callback = typeof options === 'function' ? options : cb;
        const resp = new EventEmitter() as any;
        resp.statusCode = statusCode;
        resp.setEncoding = vi.fn();
        setTimeout(() => {
            resp.emit("data", JSON.stringify(responseBody));
            resp.emit("end");
        }, 0);
        if (callback) callback(resp);
        return { on: vi.fn() } as any;
    });
}

vi.mock("https", () => ({
    default: { get: vi.fn() },
    get: vi.fn(),
}));

vi.mock("../main/logger");

describe("statsService.ts Gap Coverage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("extractRankInfo handles missing segment stats", async () => {
        mockHttpsGet({
            data: {
                segments: [
                    { attributes: { playlist: "competitive" }, stats: null }
                ]
            }
        });

        const stats = await fetchAccountStats("Player#123", "valorant");
        expect(stats?.rank).toBe("Unranked");
    });

    it("fetchLeagueStats handles invalid response format", async () => {
        mockHttpsGet({
            data: {}
        });

        const stats = await fetchAccountStats("Player#123", "league");
        expect(stats).toBeNull();
    });
});
