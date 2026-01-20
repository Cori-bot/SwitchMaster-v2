import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";

// Mock Electron AVANT l'import du module
vi.mock("electron", () => {
  // Simulation d'un EventEmitter simplifié pour Notification
  class MockNotification {
    callbacks: Record<string, Function> = {};
    constructor() {}
    show = vi.fn();
    on = vi.fn((event, cb) => {
      this.callbacks[event] = cb;
    });
    // Helper pour déclencher le clic dans les tests
    click() {
      if (this.callbacks["click"]) this.callbacks["click"]();
    }
  }

  return {
    app: {
      isPackaged: true, // Force PROD mode par défaut
      relaunch: vi.fn(),
      exit: vi.fn(),
    },
    Notification: vi.fn().mockImplementation(function() {
      return new MockNotification();
    }),
    BrowserWindow: vi.fn(),
  };
});

// Mock electron-updater avec une factory qui retourne un EventEmitter
vi.mock("electron-updater", async () => {
  const EventEmitter = await import("events").then(m => m.EventEmitter);
  const mockEmitter = new EventEmitter();
  (mockEmitter as any).logger = { transports: { file: { level: "" } } };
  (mockEmitter as any).autoDownload = false;
  (mockEmitter as any).checkForUpdates = vi.fn();
  (mockEmitter as any).downloadUpdate = vi.fn();
  (mockEmitter as any).quitAndInstall = vi.fn();
  
  return {
    autoUpdater: mockEmitter,
    AppUpdater: vi.fn(),
  };
});

vi.mock("electron-log", () => ({
  default: {
    transports: { file: { level: "" } },
  },
}));

vi.mock("../main/logger", () => ({
  devError: vi.fn(),
}));

import { setupUpdater, handleUpdateCheck, downloadUpdate, installUpdate } from "../main/updater";
import { autoUpdater } from "electron-updater";
import { Notification } from "electron";

describe("Updater Module", () => {
  let mainWindow: any;
  // On cast autoUpdater pour accéder aux méthodes mockées et emit
  const mockAutoUpdater = autoUpdater as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAutoUpdater.removeAllListeners();
    // Reset mock resource path if defined
    (process as any).resourcesPath = "C:\\Resources";

    mainWindow = {
      webContents: {
        send: vi.fn(),
      },
      show: vi.fn(),
      focus: vi.fn(),
    };
  });

  describe("setupUpdater (Events)", () => {
    it("doit envoyer checking-for-update", () => {
      setupUpdater(mainWindow);
      mockAutoUpdater.emit("checking-for-update");
      expect(mainWindow.webContents.send).toHaveBeenCalledWith("update-status", {
        status: "checking",
        isManual: false,
      });
    });

    it("doit gérer update-available et le clic sur la notification", () => {
      setupUpdater(mainWindow);
      const updateInfo = { version: "1.0.1", releaseNotes: "Notes" };
      
      mockAutoUpdater.emit("update-available", updateInfo);
      
      expect(mainWindow.webContents.send).toHaveBeenCalledWith("update-status", expect.objectContaining({
        status: "available",
        version: "1.0.1",
      }));
      expect(Notification).toHaveBeenCalled();

      // Test du clic
      const notificationInstance = (Notification as any).mock.results[0].value;
      notificationInstance.click();
      expect(mainWindow.show).toHaveBeenCalled();
      expect(mainWindow.focus).toHaveBeenCalled();
    });

    it("doit gérer update-not-available", () => {
      setupUpdater(mainWindow);
      mockAutoUpdater.emit("update-not-available");
      expect(mainWindow.webContents.send).toHaveBeenCalledWith("update-status", {
        status: "not-available",
        isManual: false,
      });
    });

    it("doit gérer les erreurs génériques", () => {
      setupUpdater(mainWindow);
      const error = new Error("Generic error");
      mockAutoUpdater.emit("error", error);
      
      expect(mainWindow.webContents.send).toHaveBeenCalledWith("update-status", {
        status: "error",
        error: "Erreur lors de la mise à jour",
        details: "Generic error",
        isManual: false,
      });
    });

    it("doit gérer les erreurs GitHub/réseau", () => {
      setupUpdater(mainWindow);
      const error = new Error("GitHub connection failed");
      mockAutoUpdater.emit("error", error);
      
      expect(mainWindow.webContents.send).toHaveBeenCalledWith("update-status", expect.objectContaining({
        error: expect.stringContaining("Erreur de connexion à GitHub"),
      }));
    });

    it("doit gérer spécifiquement l'erreur Semver 'Invalid Version'", () => {
      setupUpdater(mainWindow);
      // Erreur contenant exactement la chaîne cherchée
      const error = new Error("Invalid Version: 2.2"); 
      mockAutoUpdater.emit("error", error);
      
      // Doit envoyer status: not-available et non error
      expect(mainWindow.webContents.send).toHaveBeenCalledWith("update-status", {
        status: "not-available",
        isManual: false,
      });
    });

    it("doit gérer download-progress", () => {
      setupUpdater(mainWindow);
      mockAutoUpdater.emit("download-progress", { percent: 50, transferred: 100, total: 200 });
      expect(mainWindow.webContents.send).toHaveBeenCalledWith("update-progress", {
        percent: 50,
        transferred: 100,
        total: 200,
      });
    });

    it("doit gérer update-downloaded et le clic sur la notification", () => {
      setupUpdater(mainWindow);
      mockAutoUpdater.emit("update-downloaded", { version: "1.0.1" });
      
      expect(mainWindow.webContents.send).toHaveBeenCalledWith("update-downloaded");
      expect(Notification).toHaveBeenCalled();

      // Test du clic
      const notificationInstance = (Notification as any).mock.results[0].value;
      notificationInstance.click();
      expect(mainWindow.show).toHaveBeenCalled();
      expect(mainWindow.focus).toHaveBeenCalled();
    });
  });

  describe("handleUpdateCheck", () => {
    it("doit lancer checkForUpdates en mode prod", async () => {
      await handleUpdateCheck(mainWindow, true);
      expect(mainWindow.webContents.send).toHaveBeenCalledWith("update-status", expect.objectContaining({ status: "checking" }));
      expect(mockAutoUpdater.checkForUpdates).toHaveBeenCalled();
    });

    it("doit gérer les erreurs de check", async () => {
      mockAutoUpdater.checkForUpdates.mockRejectedValue(new Error("Check failed"));
      await handleUpdateCheck(mainWindow, true);
      expect(mainWindow.webContents.send).toHaveBeenCalledWith("update-status", expect.objectContaining({ status: "error" }));
    });
    
    it("doit ignorer les erreurs semver lors du check", async () => {
      mockAutoUpdater.checkForUpdates.mockRejectedValue(new Error("Invalid Version: 2.2"));
      await handleUpdateCheck(mainWindow, true);
      expect(mainWindow.webContents.send).toHaveBeenCalledWith("update-status", expect.objectContaining({ status: "not-available" }));
    });
  });

  describe("downloadUpdate & installUpdate", () => {
    it("doit appeler autoUpdater.downloadUpdate en prod", async () => {
      await downloadUpdate();
      expect(mockAutoUpdater.downloadUpdate).toHaveBeenCalled();
    });

    it("doit appeler autoUpdater.quitAndInstall en prod", () => {
      installUpdate();
      expect(mockAutoUpdater.quitAndInstall).toHaveBeenCalled();
    });
  });
});