import { describe, it, expect, vi, beforeEach } from "vitest";
import { StatsService } from "../main/services/StatsService";
import https from "https";
import { EventEmitter } from "events";

vi.mock("../main/logger", () => ({ devLog: vi.fn(), devError: vi.fn() }));
vi.mock("https", () => ({ get: vi.fn(), default: { get: vi.fn() } }));

describe("StatsService", () => {
  let service: StatsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StatsService();
  });

  const mockResp = (code: number, body: string, err?: Error) => {
    const req = new EventEmitter();
    (https.get as any).mockImplementation((url: string, opts: any, cb: any) => {
      if (err) {
        setTimeout(() => req.emit("error", err), 0);
        return req;
      }
      const res = new EventEmitter();
      (res as any).statusCode = code;
      const callback = typeof opts === "function" ? opts : cb;
      callback(res);
      res.emit("data", body);
      res.emit("end");
      return req;
    });
  };

  it("fetchAccountStats Valorant success", async () => {
    mockResp(
      200,
      JSON.stringify({
        data: {
          segments: [
            {
              attributes: { playlist: "competitive" },
              stats: { tier: { metadata: { rankName: "G", iconUrl: "i" } } },
            },
          ],
        },
      }),
    );
    const s = await service.fetchAccountStats("u#t", "valorant");
    expect(s?.rank).toBe("G");
  });

  it("fetchAccountStats League success", async () => {
    mockResp(
      200,
      JSON.stringify({
        data: {
          segments: [
            {
              attributes: { playlist: "ranked_solo_5x5" },
              stats: { tier: { metadata: { rankName: "P", iconUrl: "i" } } },
            },
          ],
        },
      }),
    );
    const s = await service.fetchAccountStats("u#t", "league");
    expect(s?.rank).toBe("P");
  });

  it("handles errors (Line 62, 85, 104, 152, 169)", async () => {
    mockResp(404, "404");
    expect(await service.fetchAccountStats("u#t", "valorant")).toBeNull();

    mockResp(500, "500");
    expect(await service.fetchAccountStats("u#t", "league")).toBeNull();

    mockResp(200, "invalid-json");
    expect(await service.fetchAccountStats("u#t", "valorant")).toBeNull();

    mockResp(200, "", new Error());
    expect(await service.fetchAccountStats("u#t", "valorant")).toBeNull();

    expect(await service.fetchAccountStats("invalid", "valorant")).toBeNull();
  });

  it("fetchLeagueStats handles 404 specially", async () => {
    mockResp(404, "Not Found");
    expect(await service.fetchAccountStats("u#t", "league")).toBeNull();
  });

  it("findBestSegment fallbacks (Line 195, 198)", async () => {
    mockResp(
      200,
      JSON.stringify({
        data: {
          segments: [{ stats: { tier: { metadata: { rankName: "X" } } } }],
        },
      }),
    );
    const s = await service.fetchAccountStats("u#t", "valorant");
    expect(s?.rank).toBe("X");
  });

  it("extractRankInfo fallbacks (Line 207-210)", async () => {
    mockResp(200, JSON.stringify({ data: { segments: [{ stats: {} }] } }));
    const s = await service.fetchAccountStats("u#t", "valorant");
    expect(s?.rank).toBe("Unranked");
    expect(s?.rankIcon).toContain("tiers/0.png");
  });
});
