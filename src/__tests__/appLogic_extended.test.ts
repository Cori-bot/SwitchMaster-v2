import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.hoisted(() => {
  (process as any).resourcesPath = "C:\\Resources";
});

// Mock child_process complet
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

// Mock Electron
vi.mock("electron", () => ({
  app: {
    isPackaged: false, // Test en mode dev (non packaged)
    setLoginItemSettings: vi.fn(),
    getLoginItemSettings: vi.fn().mockReturnValue({ openAtLogin: true }),
  },
}));

// Mock fs-extra
vi.mock("fs-extra", () => ({
  default: {
    pathExists: vi.fn(),
    stat: vi.fn(),
  },
}));

vi.mock("../main/config", () => ({
  getConfig: vi.fn(),
}));

vi.mock("../main/logger");

import { launchGame, setAutoStart, getStatus, monitorRiotProcess, getAutoStartStatus, isValorantRunning } from "../main/appLogic";
import child_process from "child_process";
import fs from "fs-extra";
import { app } from "electron";
import * as configModule from "../main/config";

describe("AppLogic Extended Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("launchGame - branches supplémentaires", () => {
    it("doit gérer un chemin de dossier au lieu de fichier", async () => {
      (configModule.getConfig as any).mockReturnValue({ riotPath: "C:\\Riot" });
      (fs.pathExists as any).mockResolvedValue(true);
      (fs.stat as any).mockResolvedValue({ isDirectory: () => true });

      const promise = launchGame("valorant");
      await vi.advanceTimersByTimeAsync(4000);
      await promise;

      expect(child_process.spawn).toHaveBeenCalledWith(
        "C:\\Riot\\RiotClientServices.exe",
        expect.arrayContaining(["--launch-product=valorant"]),
        expect.anything()
      );
    });

    it("doit gérer un chemin parent si le chemin n'est ni fichier ni dossier existant", async () => {
      (configModule.getConfig as any).mockReturnValue({ riotPath: "C:\\Riot\\SomeFile.exe" });
      (fs.pathExists as any)
        .mockResolvedValueOnce(true) // Premier check
        .mockResolvedValueOnce(true); // Deuxième check après construction
      (fs.stat as any).mockResolvedValue({ isDirectory: () => false });

      const promise = launchGame("league");
      await vi.advanceTimersByTimeAsync(4000);
      await promise;

      expect(child_process.spawn).toHaveBeenCalledWith(
        expect.stringContaining("RiotClientServices.exe"),
        expect.arrayContaining(["--launch-product=league_of_legends"]),
        expect.anything()
      );
    });

    it("doit throw si l'exécutable n'existe pas", async () => {
      (configModule.getConfig as any).mockReturnValue({ riotPath: "C:\\Riot\\RiotClientServices.exe" });
      (fs.pathExists as any).mockResolvedValue(false);

      const promise = launchGame("valorant");
      await vi.advanceTimersByTimeAsync(4000);

      await expect(promise).rejects.toThrow("Executable Riot Client non trouvé");
    });
  });

  describe("setAutoStart - mode non-packaged", () => {
    it("doit ajouter le chemin du projet en mode dev", () => {
      (configModule.getConfig as any).mockReturnValue({ startMinimized: false });
      setAutoStart(true);

      expect(app.setLoginItemSettings).toHaveBeenCalledWith(expect.objectContaining({
        openAtLogin: true
      }));
    });

    it("doit désactiver le démarrage automatique", () => {
      (configModule.getConfig as any).mockReturnValue({ startMinimized: true });
      setAutoStart(false);

      expect(app.setLoginItemSettings).toHaveBeenCalledWith(expect.objectContaining({
        openAtLogin: false
      }));
    });
  });

  describe("getStatus - branches supplémentaires", () => {
    it("doit retourner Prêt si pas de lastAccountId même si client running", async () => {
      (configModule.getConfig as any).mockReturnValue({});
      (child_process.exec as any).mockImplementation((cmd: string, cb: any) =>
        cb(null, { stdout: "RiotClientServices.exe" })
      );

      const status = await getStatus();
      expect(status.status).toBe("Prêt");
    });

    it("doit gérer les erreurs execAsync", async () => {
      (child_process.exec as any).mockImplementation((cmd: string, cb: any) =>
        cb(new Error("Command failed"), null)
      );

      const status = await getStatus();
      expect(status.status).toBe("Prêt");
    });
  });

  describe("getAutoStartStatus", () => {
    it("doit retourner les valeurs par défaut si undefined", () => {
      (app.getLoginItemSettings as any).mockReturnValue({});
      const status = getAutoStartStatus();
      expect(status.enabled).toBe(false);
      expect(status.wasOpenedAtLogin).toBe(false);
    });
  });

  describe("isValorantRunning", () => {
    it("doit retourner true si VALORANT est en cours", async () => {
      (child_process.exec as any).mockImplementation((cmd: string, cb: any) =>
        cb(null, { stdout: "VALORANT-Win64-Shipping.exe" })
      );

      const result = await isValorantRunning();
      expect(result).toBe(true);
    });

    it("doit retourner false si VALORANT n'est pas en cours", async () => {
      (child_process.exec as any).mockImplementation((cmd: string, cb: any) =>
        cb(null, { stdout: "" })
      );

      const result = await isValorantRunning();
      expect(result).toBe(false);
    });

    it("doit retourner false en cas d'erreur", async () => {
      (child_process.exec as any).mockImplementation((cmd: string, cb: any) =>
        cb(new Error("Failed"), null)
      );

      const result = await isValorantRunning();
      expect(result).toBe(false);
    });
  });

  describe("monitorRiotProcess - callback onClosed", () => {
    it("doit appeler onClosed quand le client n'est plus détecté", async () => {
      const onClosed = vi.fn();
      (child_process.exec as any).mockImplementation((cmd: string, cb: any) =>
        cb(null, { stdout: "" })
      );

      monitorRiotProcess(null, onClosed);

      await vi.advanceTimersByTimeAsync(31000);

      expect(onClosed).toHaveBeenCalled();
    });

    it("doit gérer les erreurs du monitor", async () => {
      (child_process.exec as any).mockImplementation((cmd: string, cb: any) =>
        cb(new Error("Error"), null)
      );

      const mainWindow = { webContents: { send: vi.fn() } };

      // Ne doit pas throw
      monitorRiotProcess(mainWindow as any);
      await vi.advanceTimersByTimeAsync(31000);

      // Le send ne doit pas être appelé en cas d'erreur
      expect(mainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });
});
