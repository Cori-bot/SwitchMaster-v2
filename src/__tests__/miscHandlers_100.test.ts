import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ipcMain, app, BrowserWindow } from "electron";

// Mocks
vi.mock("electron-updater", () => ({
  autoUpdater: {
    on: vi.fn(),
    checkForUpdatesAndNotify: vi.fn(),
  },
}));

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
  app: {
    quit: vi.fn(),
    relaunch: vi.fn(),
    exit: vi.fn(),
    getLoginItemSettings: vi.fn().mockReturnValue({}),
    getVersion: vi.fn().mockReturnValue("1.0.0"),
  },

  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
  },
}));

describe("miscHandlers - Branches manquantes", () => {
  const registeredHandlers: Record<string, Function> = {};
  const mockAccountService = {
    getAccounts: vi.fn().mockResolvedValue([]),
  } as any;
  const mockConfigService = {
    getConfig: vi.fn().mockReturnValue({}),
    saveConfig: vi.fn().mockResolvedValue({}),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(registeredHandlers).forEach(
      (k) => delete registeredHandlers[k],
    );

    (ipcMain.handle as any).mockImplementation(
      (channel: string, handler: Function) => {
        registeredHandlers[channel] = handler;
      },
    );
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("handle-quit-choice - branches window", () => {
    it("gère quit avec window null", async () => {
      const { registerMiscHandlers } = await import("../main/ipc/miscHandlers");

      const mockContext = {
        getStatus: vi.fn(),
        getAutoStartStatus: vi.fn(),
        setAutoStart: vi.fn(),
        isValorantRunning: vi.fn(),
      };

      registerMiscHandlers(
        () => null,
        mockContext as any,
        mockAccountService,
        mockConfigService,
      );

      const handler = registeredHandlers["handle-quit-choice"];
      const result = await handler(
        {},
        { action: "quit", dontShowAgain: false },
      );

      expect(result).toBe(true);
      expect(app.quit).toHaveBeenCalled();
    });

    it("gère dontShowAgain avec quit et ferme fenêtre non-destroyed", async () => {
      const { registerMiscHandlers } = await import("../main/ipc/miscHandlers");

      const mockWindow = {
        webContents: { send: vi.fn() },
        isDestroyed: () => false,
        hide: vi.fn(),
        close: vi.fn(),
      } as unknown as BrowserWindow;

      const mockContext = {
        getStatus: vi.fn(),
        getAutoStartStatus: vi.fn(),
        setAutoStart: vi.fn(),
        isValorantRunning: vi.fn(),
      };

      registerMiscHandlers(
        () => mockWindow,
        mockContext as any,
        mockAccountService,
        mockConfigService,
      );

      const handler = registeredHandlers["handle-quit-choice"];
      const result = await handler({}, { action: "quit", dontShowAgain: true });

      expect(result).toBe(true);
      expect(mockWindow.close).toHaveBeenCalled();
      expect(app.quit).toHaveBeenCalled();
      expect(mockConfigService.saveConfig).toHaveBeenCalled();
    });

    it("envoie config-updated pour minimize avec dontShowAgain", async () => {
      const { registerMiscHandlers } = await import("../main/ipc/miscHandlers");

      const mockWindow = {
        webContents: { send: vi.fn() },
        isDestroyed: () => false,
        hide: vi.fn(),
        close: vi.fn(),
      } as unknown as BrowserWindow;

      const mockContext = {
        getStatus: vi.fn(),
        getAutoStartStatus: vi.fn(),
        setAutoStart: vi.fn(),
        isValorantRunning: vi.fn(),
      };

      registerMiscHandlers(
        () => mockWindow,
        mockContext as any,
        mockAccountService,
        mockConfigService,
      );

      const handler = registeredHandlers["handle-quit-choice"];
      await handler({}, { action: "minimize", dontShowAgain: true });

      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        "config-updated",
        expect.any(Object),
      );
    });
  });

  describe("get-status branches", () => {
    it("retourne status sans enrichissement si status !== Active", async () => {
      const { registerMiscHandlers } = await import("../main/ipc/miscHandlers");

      const mockContext = {
        getStatus: vi.fn().mockResolvedValue({ status: "Idle" }),
        getAutoStartStatus: vi.fn(),
        setAutoStart: vi.fn(),
        isValorantRunning: vi.fn(),
      };

      registerMiscHandlers(
        () => null,
        mockContext as any,
        mockAccountService,
        mockConfigService,
      );

      const handler = registeredHandlers["get-status"];
      const result = await handler({});

      expect(result.status).toBe("Idle");
      expect(result.accountName).toBeUndefined();
    });
  });
});
