import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { launchGame, setAutoStart, getStatus, monitorRiotProcess } from "../main/appLogic";
import child_process from "child_process";
import fs from "fs-extra";
import { app } from "electron";
import * as configModule from "../main/config";

// Mock complet child_process
vi.mock("child_process", () => {
  return {
    exec: vi.fn(),
    spawn: vi.fn(() => ({ unref: vi.fn() })),
    default: {
      exec: vi.fn(),
      spawn: vi.fn(() => ({ unref: vi.fn() })),
    }
  };
});

vi.mock("electron", () => ({
  app: {
    isPackaged: true,
    setLoginItemSettings: vi.fn(),
    getLoginItemSettings: vi.fn().mockReturnValue({ openAtLogin: true }),
  },
}));

vi.mock("fs-extra", () => ({
  default: {
    pathExists: vi.fn().mockResolvedValue(true),
    stat: vi.fn().mockResolvedValue({ isDirectory: () => false }),
  },
}));

vi.mock("../main/config", () => ({
  getConfig: vi.fn(),
}));

vi.mock("../main/logger");

describe("AppLogic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("launchGame", () => {
    it("doit lancer Valorant avec les bons arguments", async () => {
      (configModule.getConfig as any).mockReturnValue({ riotPath: "C:\\Riot\\RiotClientServices.exe" });
      
      const promise = launchGame("valorant");
      // Utilisation de advanceTimersByTimeAsync pour résoudre les promesses internes
      await vi.advanceTimersByTimeAsync(4000);
      await promise;
      
      expect(child_process.spawn).toHaveBeenCalledWith(
        "C:\\Riot\\RiotClientServices.exe",
        expect.arrayContaining(["--launch-product=valorant"]),
        expect.anything()
      );
    });
  });

  describe("setAutoStart", () => {
    it("doit configurer le démarrage automatique", () => {
      (configModule.getConfig as any).mockReturnValue({ startMinimized: true });
      setAutoStart(true);
      expect(app.setLoginItemSettings).toHaveBeenCalledWith(expect.objectContaining({
        openAtLogin: true,
        args: ["--minimized"]
      }));
    });
  });

  describe("getStatus", () => {
    it("doit retourner 'Active' si Riot Client tourne", async () => {
      (configModule.getConfig as any).mockReturnValue({ lastAccountId: "1" });
      (child_process.exec as any).mockImplementation((cmd: string, cb: any) => 
        cb(null, { stdout: "RiotClientServices.exe" })
      );
      
      const status = await getStatus();
      expect(status.status).toBe("Active");
    });

    it("doit retourner 'Prêt' sinon", async () => {
      (child_process.exec as any).mockImplementation((cmd: string, cb: any) => 
        cb(null, { stdout: "" })
      );
      const status = await getStatus();
      expect(status.status).toBe("Prêt");
    });
  });

  describe("monitorRiotProcess", () => {
    it("doit envoyer un événement quand le client ferme", async () => {
      const mainWindow = { webContents: { send: vi.fn() } };
      (child_process.exec as any).mockImplementation((cmd: string, cb: any) => cb(null, { stdout: "" }));
      
      monitorRiotProcess(mainWindow as any);
      
      await vi.advanceTimersByTimeAsync(31000);
      
      expect(mainWindow.webContents.send).toHaveBeenCalledWith("riot-client-closed");
    });
  });
});
