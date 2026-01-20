import { describe, it, expect, vi, beforeEach } from "vitest";
import { app } from "electron";

// Mock Electron pour DEV mode
vi.mock("electron", () => {
  return {
    app: {
      isPackaged: false, // Force DEV mode
      relaunch: vi.fn(),
      exit: vi.fn(),
    },
    Notification: vi.fn(),
    BrowserWindow: vi.fn(),
  };
});

vi.mock("electron-updater", () => ({
  autoUpdater: {}, // Pas utilisé en dev simulé
  AppUpdater: vi.fn(),
}));

vi.mock("electron-log", () => ({
  default: { transports: { file: { level: "" } } },
}));

vi.mock("../main/logger", () => ({
  devError: vi.fn(),
}));

describe("Updater Module (DEV Mode)", () => {
  let updaterModule: any;
  let mainWindow: any;

  beforeEach(async () => {
    vi.resetModules();
    updaterModule = await import("../main/updater");
    
    mainWindow = {
      webContents: {
        send: vi.fn(),
      },
    };
  });

  it("doit simuler la vérification des mises à jour (manuel)", async () => {
    // Mock random pour forcer update available
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.9);
    
    // handleUpdateCheck appelle simulateUpdateCheck en dev
    // simulateUpdateCheck attend 2s (DEV_SIMULATED_UPDATE_DELAY)
    // On doit utiliser les fake timers
    vi.useFakeTimers();
    
    const promise = updaterModule.handleUpdateCheck(mainWindow, true);
    
    // Avancer le temps pour passer le delay
    await vi.advanceTimersByTimeAsync(3000);
    
    await promise;
    
    expect(mainWindow.webContents.send).toHaveBeenCalledWith("update-status", expect.objectContaining({
      status: "checking"
    }));
    
    // Vérifier simulation update available
    expect(mainWindow.webContents.send).toHaveBeenCalledWith("update-status", expect.objectContaining({
      status: "available",
      version: "9.9.9"
    }));
    
    vi.useRealTimers();
    randomSpy.mockRestore();
  });

  it("doit simuler pas de mise à jour (auto)", async () => {
    vi.useFakeTimers();
    const promise = updaterModule.handleUpdateCheck(mainWindow, false);
    await vi.advanceTimersByTimeAsync(3000);
    await promise;
    
    expect(mainWindow.webContents.send).toHaveBeenCalledWith("update-status", expect.objectContaining({
      status: "not-available"
    }));
    vi.useRealTimers();
  });

  it("ne doit pas télécharger en dev", async () => {
    const res = await updaterModule.downloadUpdate();
    expect(res).toBeUndefined();
  });

  it("doit relancer l'app en dev au lieu d'installer", () => {
    updaterModule.installUpdate();
    expect(app.relaunch).toHaveBeenCalled();
    expect(app.exit).toHaveBeenCalled();
  });
});
