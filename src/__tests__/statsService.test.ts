import { describe, it, expect, vi, beforeEach } from "vitest";
import { StatsService } from "../main/services/StatsService";
import https from "https";
import { EventEmitter } from "events";

// Mock Logger
vi.mock("../main/logger", () => ({
  devLog: vi.fn(),
  devError: vi.fn(),
}));

// Mock HTTPS
vi.mock("https", () => ({
  default: {
    get: vi.fn(),
  },
}));

describe("Stats Service", () => {
  let statsService: StatsService;

  beforeEach(() => {
    vi.clearAllMocks();
    statsService = new StatsService();
  });

  const mockHttpsResponse = (
    statusCode: number,
    body: string,
    error?: Error,
  ) => {
    const req = new EventEmitter();
    (https.get as any).mockImplementation(
      (url: string, options: any, callback: any) => {
        if (error) {
          const reqObj = new EventEmitter();
          setTimeout(() => reqObj.emit("error", error), 0);
          return reqObj;
        }

        const res = new EventEmitter();
        (res as any).statusCode = statusCode;

        callback(res);

        res.emit("data", body);
        res.emit("end");

        return req;
      },
    );
  };

  it("doit récupérer les stats Valorant avec succès", async () => {
    const mockResponse = {
      data: {
        segments: [
          {
            attributes: { playlist: "competitive" },
            stats: {
              tier: {
                metadata: { tierName: "Gold 1", iconUrl: "http://icon" },
              },
            },
          },
        ],
      },
    };

    mockHttpsResponse(200, JSON.stringify(mockResponse));

    const stats = await statsService.fetchAccountStats(
      "Player#TAG",
      "valorant",
    );

    expect(stats).toEqual({
      rank: "Gold 1",
      rankIcon: "http://icon",
      lastUpdate: expect.any(Number),
    });
  });

  it("doit récupérer les stats League avec succès", async () => {
    const mockResponse = {
      data: {
        segments: [
          {
            attributes: { playlist: "ranked_solo_5x5" },
            stats: {
              tier: {
                metadata: { tierName: "Silver 4", iconUrl: "http://icon-lol" },
              },
            },
          },
        ],
      },
    };

    mockHttpsResponse(200, JSON.stringify(mockResponse));

    const stats = await statsService.fetchAccountStats("Player#TAG", "league");

    expect(stats).toEqual({
      rank: "Silver 4",
      rankIcon: "http://icon-lol",
      lastUpdate: expect.any(Number),
    });
  });

  it("doit gérer le format Riot ID invalide", async () => {
    const stats = await statsService.fetchAccountStats("InvalidID", "valorant");
    expect(stats).toBeNull();
  });

  it("doit gérer une réponse API 404 (Log spécial)", async () => {
    mockHttpsResponse(404, "Not Found");
    const stats = await statsService.fetchAccountStats(
      "Player#TAG",
      "valorant",
    );
    expect(stats).toBeNull();
  });
});
