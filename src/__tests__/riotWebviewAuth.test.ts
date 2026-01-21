import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Variable pour capturer les event listeners
const eventListeners: Record<string, Function[]> = {};
const webContentsListeners: Record<string, Function[]> = {};

const { mockLoginWin } = vi.hoisted(() => {
  const win = {
    loadURL: vi.fn(),
    close: vi.fn(),
    destroy: vi.fn(),
    show: vi.fn(),
    on: vi.fn((event: string, cb: Function) => {
      if (!eventListeners[event]) eventListeners[event] = [];
      eventListeners[event].push(cb);
    }),
    once: vi.fn((event: string, cb: Function) => {
      if (!eventListeners[event]) eventListeners[event] = [];
      eventListeners[event].push(cb);
    }),
    isDestroyed: vi.fn().mockReturnValue(false),
    webContents: {
      session: { cookies: { get: vi.fn().mockResolvedValue([]) } },
      on: vi.fn((event: string, cb: Function) => {
        if (!webContentsListeners[event]) webContentsListeners[event] = [];
        webContentsListeners[event].push(cb);
      }),
      insertCSS: vi.fn().mockResolvedValue(undefined),
      getURL: vi.fn().mockReturnValue("https://auth.riotgames.com")
    }
  };
  return { mockLoginWin: win };
});

vi.mock("electron", () => {
  function MockWin() {
    return mockLoginWin;
  }
  return {
    app: { isPackaged: true },
    BrowserWindow: MockWin
  };
});

vi.mock("../main/logger", () => ({
  devLog: vi.fn(),
  devError: vi.fn()
}));

import { RiotWebviewAuth } from "../main/valorant-api/riotWebviewAuth";

describe("RiotWebviewAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Clear event listeners
    Object.keys(eventListeners).forEach(key => delete eventListeners[key]);
    Object.keys(webContentsListeners).forEach(key => delete webContentsListeners[key]);
    mockLoginWin.isDestroyed.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("login - silent mode timeout", () => {
    it("doit retourner null après timeout en mode silencieux", async () => {
      const promise = RiotWebviewAuth.login(null, true, false);

      // Avancer le temps pour déclencher le timeout silencieux (10s)
      await vi.advanceTimersByTimeAsync(11000);

      const result = await promise;
      expect(result).toBeNull();
    });
  });

  describe("login - window closed", () => {
    it("doit retourner null quand la fenêtre est fermée", async () => {
      const promise = RiotWebviewAuth.login(null, false, false);

      // Simuler la fermeture de la fenêtre
      if (eventListeners["closed"] && eventListeners["closed"][0]) {
        eventListeners["closed"][0]();
      }

      const result = await promise;
      expect(result).toBeNull();
    });
  });

  describe("login - ready-to-show", () => {
    it("doit afficher la fenêtre en mode non-silencieux", async () => {
      RiotWebviewAuth.login(null, false, false);

      // Simuler ready-to-show
      if (eventListeners["ready-to-show"] && eventListeners["ready-to-show"][0]) {
        eventListeners["ready-to-show"][0]();
      }

      expect(mockLoginWin.show).toHaveBeenCalled();
    });

    it("ne doit pas afficher en mode silencieux", async () => {
      RiotWebviewAuth.login(null, true, false);

      if (eventListeners["ready-to-show"] && eventListeners["ready-to-show"][0]) {
        eventListeners["ready-to-show"][0]();
      }

      // La fenêtre ne devrait pas avoir été montrée avant ready-to-show
      expect(mockLoginWin.show).not.toHaveBeenCalled();
    });
  });

  describe("login - CSS injection", () => {
    it("doit injecter du CSS sur les pages auth.riotgames.com", async () => {
      RiotWebviewAuth.login(null, false, false);

      // Simuler did-finish-load
      if (webContentsListeners["did-finish-load"] && webContentsListeners["did-finish-load"][0]) {
        await webContentsListeners["did-finish-load"][0]();
      }

      expect(mockLoginWin.webContents.insertCSS).toHaveBeenCalled();
    });

    it("doit gérer les erreurs d'injection CSS", async () => {
      mockLoginWin.webContents.insertCSS.mockRejectedValueOnce(new Error("CSS error"));

      RiotWebviewAuth.login(null, false, false);

      if (webContentsListeners["did-finish-load"] && webContentsListeners["did-finish-load"][0]) {
        // Ne doit pas throw
        await expect(webContentsListeners["did-finish-load"][0]()).resolves.not.toThrow();
      }
    });
  });

  describe("login - token capture via navigation", () => {
    it("doit capturer le token lors de will-redirect", async () => {
      mockFetch
        .mockResolvedValueOnce({ json: () => Promise.resolve({ entitlements_token: "ent_token" }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ sub: "puuid123", acct: { game_name: "Player", tag_line: "TAG" } }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ affinities: { live: "eu" } }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ data: { riotClientVersion: "1.0.0" } }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ Progress: { Level: 50 } }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ LatestCompetitiveUpdate: { TierAfterUpdate: 15 } }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ Identity: { PlayerCardID: "card123" } }) });

      const promise = RiotWebviewAuth.login(null, false, false);

      // Simuler une redirection avec token
      const mockEvent = { preventDefault: vi.fn() };
      const tokenUrl = "http://localhost/redirect#access_token=test_token&id_token=id_token_test";

      if (webContentsListeners["will-redirect"] && webContentsListeners["will-redirect"][0]) {
        webContentsListeners["will-redirect"][0](mockEvent, tokenUrl);
      }

      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(result).not.toBeNull();
      if (result) {
        expect(result.accessToken).toBe("test_token");
      }
    });
  });

  describe("login - did-fail-load", () => {
    it("doit retourner null en mode silencieux après échec de chargement", async () => {
      const promise = RiotWebviewAuth.login(null, true, false);

      if (webContentsListeners["did-fail-load"] && webContentsListeners["did-fail-load"][0]) {
        webContentsListeners["did-fail-load"][0]({}, -1, "Error", "https://test.com");
      }

      const result = await promise;
      expect(result).toBeNull();
    });
  });

  describe("finishAuth - API calls", () => {
    it("doit gérer l'échec d'entitlements", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const promise = RiotWebviewAuth.login(null, false, false);

      const mockEvent = { preventDefault: vi.fn() };
      const tokenUrl = "http://localhost/redirect#access_token=test_token";

      if (webContentsListeners["will-redirect"] && webContentsListeners["will-redirect"][0]) {
        webContentsListeners["will-redirect"][0](mockEvent, tokenUrl);
      }

      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;

      expect(result).toBeNull();
    });

    it("doit utiliser le fallback si le fetch version échoue", async () => {
      mockFetch
        .mockResolvedValueOnce({ json: () => Promise.resolve({ entitlements_token: "ent_token" }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ sub: "puuid123" }) })
        .mockRejectedValueOnce(new Error("Region error"))
        .mockRejectedValueOnce(new Error("Version error"))
        .mockRejectedValueOnce(new Error("XP error"))
        .mockRejectedValueOnce(new Error("MMR error"))
        .mockRejectedValueOnce(new Error("Loadout error"));

      const promise = RiotWebviewAuth.login(null, false, false);

      const mockEvent = { preventDefault: vi.fn() };
      const tokenUrl = "http://localhost/redirect#access_token=test_token&id_token=id_test";

      if (webContentsListeners["will-redirect"] && webContentsListeners["will-redirect"][0]) {
        webContentsListeners["will-redirect"][0](mockEvent, tokenUrl);
      }

      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;

      // Doit quand même retourner un résultat partiel
      expect(result).not.toBeNull();
      if (result) {
        expect(result.region).toBe("eu"); // Fallback region
      }
    });

    it("doit extraire competitiveTier des QueueSkills si LatestCompetitiveUpdate absent", async () => {
      mockFetch
        .mockResolvedValueOnce({ json: () => Promise.resolve({ entitlements_token: "ent_token" }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ sub: "puuid123" }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ affinities: { live: "na" } }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ data: { riotClientVersion: "1.0.0" } }) })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ Progress: { Level: 25 } }) })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({
            QueueSkills: {
              competitive: {
                SeasonalInfoBySeasonID: {
                  season1: { CompetitiveTier: 12 }
                }
              }
            }
          })
        })
        .mockResolvedValueOnce({ json: () => Promise.resolve({ Identity: { PlayerCardID: "card456" } }) });

      const promise = RiotWebviewAuth.login(null, false, false);

      const mockEvent = { preventDefault: vi.fn() };
      const tokenUrl = "http://localhost/redirect#access_token=test_token&id_token=id_test";

      if (webContentsListeners["will-redirect"] && webContentsListeners["will-redirect"][0]) {
        webContentsListeners["will-redirect"][0](mockEvent, tokenUrl);
      }

      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;

      expect(result).not.toBeNull();
      if (result) {
        expect(result.competitiveTier).toBe(12);
      }
    });
  });


  describe("login - Additional Coverage", () => {
    it("doit utiliser forceNew=true dans l'URL", async () => {
      RiotWebviewAuth.login(null, false, true);
      expect(mockLoginWin.loadURL).toHaveBeenCalledWith(expect.stringContaining("prompt=login"));
    });

    it("doit ignorer la navigation vers des URLs sans token", () => {
      RiotWebviewAuth.login(null, false, false);
      const mockEvent = { preventDefault: vi.fn() };

      // Simuler une navigation sans token
      if (webContentsListeners["will-navigate"] && webContentsListeners["will-navigate"][0]) {
        webContentsListeners["will-navigate"][0](mockEvent, "https://google.com");
      }

      if (webContentsListeners["did-navigate"] && webContentsListeners["did-navigate"][0]) {
        webContentsListeners["did-navigate"][0]({}, "https://google.com");
      }

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });

    it("doit gérer le catch global de finishAuth via safeResolve error", async () => {
      mockLoginWin.close.mockImplementationOnce(() => {
        throw new Error("Close failed");
      });

      mockFetch
        .mockResolvedValueOnce({ json: () => Promise.resolve({ entitlements_token: "ent_token" }) })
        .mockResolvedValue({ json: () => Promise.resolve({}) });

      const promise = RiotWebviewAuth.login(null, false, false);
      const mockEvent = { preventDefault: vi.fn() };
      const tokenUrl = "http://localhost/redirect#access_token=test_token";

      if (webContentsListeners["will-redirect"] && webContentsListeners["will-redirect"][0]) {
        webContentsListeners["will-redirect"][0](mockEvent, tokenUrl);
      }

      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;
      expect(result).not.toBeNull();
    });

    it("doit gérer l'échec de UserInfo et continuer", async () => {
      mockFetch
        .mockResolvedValueOnce({ json: () => Promise.resolve({ entitlements_token: "ent_token" }) })
        .mockRejectedValueOnce(new Error("UserInfo Failed"));

      const promise = RiotWebviewAuth.login(null, false, false);
      const mockEvent = { preventDefault: vi.fn() };
      const tokenUrl = "http://localhost/redirect#access_token=test_token";

      if (webContentsListeners["will-redirect"] && webContentsListeners["will-redirect"][0]) {
        webContentsListeners["will-redirect"][0](mockEvent, tokenUrl);
      }

      await vi.advanceTimersByTimeAsync(1000);
      const result = await promise;
      expect(result).not.toBeNull();
      expect(result?.gameName).toBe("");
    });
  });
});
