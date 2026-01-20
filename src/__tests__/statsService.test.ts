import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchAccountStats } from "../main/statsService";
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockHttpsResponse = (statusCode: number, body: string, error?: Error) => {
    const req = new EventEmitter();
    (https.get as any).mockImplementation((url: string, options: any, callback: any) => {
      if (error) {
        // Simulation erreur réseau immédiate (avant callback)
        // Mais https.get retourne req, on doit émettre 'error' sur req
        const reqObj = new EventEmitter();
        setTimeout(() => reqObj.emit("error", error), 0);
        return reqObj;
      }

      const res = new EventEmitter();
      (res as any).statusCode = statusCode;
      
      callback(res);
      
      // Emit data
      res.emit("data", body);
      res.emit("end");
      
      return req;
    });
  };

  it("doit récupérer les stats Valorant avec succès", async () => {
    const mockResponse = {
      data: {
        segments: [
          {
            attributes: { playlist: "competitive" },
            stats: {
              tier: {
                metadata: { tierName: "Gold 1", iconUrl: "http://icon" }
              }
            }
          }
        ]
      }
    };
    
    mockHttpsResponse(200, JSON.stringify(mockResponse));
    
    const stats = await fetchAccountStats("Player#TAG", "valorant");
    
    expect(stats).toEqual({
      rank: "Gold 1",
      rankIcon: "http://icon",
      lastUpdate: expect.any(Number)
    });
    
    expect(https.get).toHaveBeenCalledWith(
      expect.stringContaining("valorant/standard/profile/riot/Player%23TAG"),
      expect.anything(),
      expect.anything()
    );
  });

  it("doit récupérer les stats League avec succès", async () => {
    const mockResponse = {
      data: {
        segments: [
          {
            attributes: { playlist: "ranked_solo_5x5" },
            stats: {
              tier: {
                metadata: { tierName: "Silver 4", iconUrl: "http://icon-lol" }
              }
            }
          }
        ]
      }
    };
    
    mockHttpsResponse(200, JSON.stringify(mockResponse));
    
    const stats = await fetchAccountStats("Player#TAG", "league");
    
    expect(stats).toEqual({
      rank: "Silver 4",
      rankIcon: "http://icon-lol",
      lastUpdate: expect.any(Number)
    });
    
    expect(https.get).toHaveBeenCalledWith(
      expect.stringContaining("lol/standard/profile/riot/Player%23TAG"),
      expect.anything(),
      expect.anything()
    );
  });

  it("doit gérer le format Riot ID invalide", async () => {
    // parseRiotId jette une erreur synchrone avant l'appel réseau
    // Mais fetch... catche tout.
    const stats = await fetchAccountStats("InvalidID", "valorant");
    expect(stats).toBeNull();
  });

  it("doit gérer une réponse API 404 (Log spécial)", async () => {
    mockHttpsResponse(404, "Not Found");
    const stats = await fetchAccountStats("Player#TAG", "valorant");
    expect(stats).toBeNull();
    // On pourrait vérifier que devLog a été appelé avec "Stats not found" au lieu de devError
  });

  it("doit gérer une erreur réseau", async () => {
    mockHttpsResponse(0, "", new Error("Network Error"));
    const stats = await fetchAccountStats("Player#TAG", "valorant");
    expect(stats).toBeNull();
  });

  it("doit gérer une réponse JSON invalide", async () => {
    mockHttpsResponse(200, "{ invalid json");
    const stats = await fetchAccountStats("Player#TAG", "valorant");
    expect(stats).toBeNull();
  });

  it("doit gérer une réponse API valide mais sans segments (structure inattendue)", async () => {
    mockHttpsResponse(200, JSON.stringify({ data: {} }));
    const stats = await fetchAccountStats("Player#TAG", "valorant");
    expect(stats).toBeNull();
  });
  
  it("doit utiliser un fallback si la playlist préférée n'est pas trouvée", async () => {
     const mockResponse = {
      data: {
        segments: [
          {
            attributes: { playlist: "deathmatch" }, // Pas dans la liste préférée
            stats: {
              tier: { metadata: { tierName: "Unranked" } }
            }
          }
        ]
      }
    };
    mockHttpsResponse(200, JSON.stringify(mockResponse));
    const stats = await fetchAccountStats("Player#TAG", "valorant");
    expect(stats?.rank).toBe("Unranked");
  });
});
