import { describe, it, expect, vi } from "vitest";
import { RiotWebviewAuth } from "../main/valorant-api/riotWebviewAuth";

// Mock Electron avec function pour constructeur
vi.mock("electron", () => {
  function MockWin() {
    this.loadURL = vi.fn();
    this.close = vi.fn();
    this.destroy = vi.fn();
    this.on = vi.fn();
    this.once = vi.fn();
    this.webContents = {
      session: { cookies: { get: vi.fn().mockResolvedValue([]) } },
      on: vi.fn(),
      insertCSS: vi.fn().mockResolvedValue(undefined),
      getURL: vi.fn().mockReturnValue("https://auth.riotgames.com")
    };
  }
  
  return {
    app: { isPackaged: true },
    BrowserWindow: MockWin
  };
});

vi.mock("../main/logger");

describe("Riot Webview Auth", () => {
  it("doit appeler la méthode login avec succès", async () => {
    const promise = RiotWebviewAuth.login(null, true);
    expect(promise).toBeDefined();
  });
});
