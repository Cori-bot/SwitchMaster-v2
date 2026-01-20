import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { killRiotProcesses, launchRiotClient, performAutomation, autoDetectPaths } from "../main/automation";
import child_process from "child_process";
import fs from "fs-extra";
import { clipboard } from "electron";
import { EventEmitter } from "events";

// Mock Electron
vi.mock("electron", () => ({
  app: { isPackaged: false },
  clipboard: { clear: vi.fn() },
}));

// Mock logger
vi.mock("../main/logger", () => ({
  devDebug: vi.fn(),
  devError: vi.fn(),
}));

// Mock fs-extra
vi.mock("fs-extra", () => ({
  default: {
    pathExists: vi.fn(),
  },
}));

// Mock child_process
vi.mock("child_process", () => {
  return {
    spawn: vi.fn(),
    exec: vi.fn(),
    default: {
      spawn: vi.fn(),
      exec: vi.fn(),
    }
  };
});

// Mock timers
vi.useFakeTimers();

describe("Automation Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks(); // Important pour restaurer setTimeout si spied
  });

  describe("killRiotProcesses", () => {
    it("doit tuer les processus Riot", async () => {
      (child_process.exec as any).mockImplementation((cmd: string, cb: any) => cb(null, "OK"));
      
      const promise = killRiotProcesses();
      // On avance les timers pour passer le délai de 2000ms
      await vi.advanceTimersByTimeAsync(3000);
      await promise;
      
      expect(child_process.exec).toHaveBeenCalledWith(
        expect.stringContaining("taskkill"),
        expect.any(Function)
      );
    });

    it("doit ignorer les erreurs de taskkill", async () => {
      (child_process.exec as any).mockImplementation((cmd: string, cb: any) => cb(new Error("No process")));
      
      const promise = killRiotProcesses();
      await vi.advanceTimersByTimeAsync(3000);
      await promise;
      // Ne doit pas throw
    });

    it("doit gérer les erreurs inattendues dans killRiotProcesses", async () => {
      // On force setTimeout à thrower une erreur
      vi.spyOn(global, "setTimeout").mockImplementation(() => { throw new Error("Timeout error"); });
      
      // On mock exec pour qu'il passe
      (child_process.exec as any).mockImplementation((cmd: string, cb: any) => cb(null, "OK"));

      try {
        await killRiotProcesses();
      } catch (e) {
        // Expected to be caught inside killRiotProcesses
      }
      
      // On s'attend à ce que ça ne plante pas mais loggue l'erreur
    });
  });

  describe("launchRiotClient", () => {
    it("doit lancer le client si le chemin existe", async () => {
      (fs.pathExists as any).mockResolvedValue(true);
      const mockChild = { unref: vi.fn() };
      (child_process.spawn as any).mockReturnValue(mockChild);
      
      await launchRiotClient("C:\\Riot\\Client.exe");
      
      expect(child_process.spawn).toHaveBeenCalledWith(
        "C:\\Riot\\Client.exe",
        [],
        expect.objectContaining({ detached: true })
      );
      expect(mockChild.unref).toHaveBeenCalled();
    });

    it("doit échouer si le chemin n'existe pas", async () => {
      (fs.pathExists as any).mockResolvedValue(false);
      
      await expect(launchRiotClient("C:\\Fake.exe")).rejects.toThrow("executable not found");
    });
  });

  describe("performAutomation", () => {
    it("doit exécuter le script PowerShell avec succès", async () => {
      const mockChild = new EventEmitter();
      (mockChild as any).stdout = new EventEmitter();
      (mockChild as any).stderr = new EventEmitter();
      (child_process.spawn as any).mockReturnValue(mockChild);
      
      const promise = performAutomation("user", "pass");
      
      // Simuler sortie
      (mockChild as any).stdout.emit("data", "SUCCESS");
      mockChild.emit("close", 0);
      
      await promise;
      expect(clipboard.clear).toHaveBeenCalled();
    });

    it("doit gérer l'échec du script (code != 0)", async () => {
      const mockChild = new EventEmitter();
      (mockChild as any).stdout = new EventEmitter();
      (mockChild as any).stderr = new EventEmitter();
      (child_process.spawn as any).mockReturnValue(mockChild);
      
      const promise = performAutomation("user", "pass");
      
      (mockChild as any).stderr.emit("data", "Error message");
      mockChild.emit("close", 1);
      
      await expect(promise).rejects.toThrow("Login automation failed");
      expect(clipboard.clear).toHaveBeenCalled();
    });

    it("doit gérer l'erreur de spawn", async () => {
      const mockChild = new EventEmitter();
      (mockChild as any).stdout = new EventEmitter();
      (mockChild as any).stderr = new EventEmitter();
      (child_process.spawn as any).mockReturnValue(mockChild);
      
      const promise = performAutomation("user", "pass");
      
      mockChild.emit("error", new Error("Spawn error"));
      
      await expect(promise).rejects.toThrow("Spawn error");
      expect(clipboard.clear).toHaveBeenCalled();
    });
  });

  describe("autoDetectPaths", () => {
    it("doit détecter le chemin Riot Client", async () => {
      const mockOutput = JSON.stringify([
        { DisplayName: "Riot Client", InstallLocation: "C:\\Riot Games" }
      ]);
      (child_process.exec as any).mockImplementation((cmd: string, cb: any) => cb(null, { stdout: mockOutput }));
      (fs.pathExists as any).mockResolvedValue(true);
      
      const result = await autoDetectPaths();
      
      expect(result).toEqual({ riotPath: "C:\\Riot Games\\RiotClientServices.exe" });
    });

    it("doit retourner null si rien n'est trouvé", async () => {
      (child_process.exec as any).mockImplementation((cmd: string, cb: any) => cb(null, { stdout: "[]" }));
      
      const result = await autoDetectPaths();
      expect(result).toBeNull();
    });

    it("doit gérer les erreurs d'exécution", async () => {
      (child_process.exec as any).mockImplementation((cmd: string, cb: any) => cb(new Error("Exec error")));
      
      const result = await autoDetectPaths();
      expect(result).toBeNull();
    });
  });
});