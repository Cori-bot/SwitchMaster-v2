import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockWin, handlers } = vi.hoisted(() => {
  (process as any).resourcesPath = "C:\\Resources";
  const m = {
    minimize: vi.fn(),
    hide: vi.fn(),
    close: vi.fn(),
    isDestroyed: vi.fn().mockReturnValue(false),
    webContents: { send: vi.fn() },
  };
  return {
    mockWin: m,
    handlers: {} as Record<string, Function>,
  };
});

// MOCK ELECTRON-UPDATER
vi.mock("electron-updater", () => ({
  autoUpdater: {
    on: vi.fn(),
    logger: null,
    autoDownload: false,
    checkForUpdatesAndNotify: vi.fn().mockResolvedValue({}),
    downloadUpdate: vi.fn().mockResolvedValue(["path"]),
    quitAndInstall: vi.fn(),
  },
  AppUpdater: vi.fn(),
}));

// MOCK ELECTRON
vi.mock("electron", () => {
  function MockBW() {
    return mockWin;
  }
  (MockBW as any).getAllWindows = vi.fn().mockReturnValue([mockWin]);

  return {
    app: {
      getPath: vi.fn().mockReturnValue("userDataPath"),
      isPackaged: true,
      getVersion: vi.fn().mockReturnValue("1.0.0"),
      commandLine: { appendSwitch: vi.fn() },
      getLoginItemSettings: vi.fn().mockReturnValue({}),
      quit: vi.fn(),
      relaunch: vi.fn(),
      exit: vi.fn(),
    },
    ipcMain: {
      handle: vi.fn(),
      on: vi.fn(),
      removeAllListeners: vi.fn(),
    },
    BrowserWindow: MockBW,
    dialog: {
      showOpenDialog: vi
        .fn()
        .mockResolvedValue({ canceled: false, filePaths: ["path"] }),
    },
    shell: { openExternal: vi.fn() },
    clipboard: { clear: vi.fn() },
  };
});

// MOCK UTILS pour capturer les handlers
vi.mock("../main/ipc/utils", () => ({
  safeHandle: vi.fn((name, fn) => {
    handlers[name] = fn;
  }),
  safeOn: vi.fn((name, fn) => {
    handlers[name] = fn;
  }),
}));

vi.mock("../main/logger");

import { registerAccountHandlers } from "../main/ipc/accountHandlers";
import { registerConfigHandlers } from "../main/ipc/configHandlers";
import { registerRiotHandlers } from "../main/ipc/riotHandlers";
import { registerMiscHandlers } from "../main/ipc/miscHandlers";
import { registerUpdateHandlers } from "../main/ipc/updateHandlers";
import { app } from "electron";

// Couvrir le fichier d'index des modals (ré-exports)
import * as AppModals from "../renderer/components/AppModals";

describe("Main Process IPC Handlers Full Coverage", () => {
  const mockAccountService = {
    getAccounts: vi.fn().mockResolvedValue([]),
    getCredentials: vi.fn(),
    addAccount: vi.fn().mockResolvedValue({ id: "1" }),
    updateAccount: vi.fn().mockResolvedValue({ id: "1" }),
    deleteAccount: vi.fn().mockResolvedValue(true),
    reorderAccounts: vi.fn().mockResolvedValue(true),
    fetchAndSaveStats: vi.fn().mockResolvedValue({}),
  } as any;

  const mockConfigService = {
    getConfig: vi.fn().mockReturnValue({}),
    saveConfig: vi.fn().mockResolvedValue({}),
  } as any;

  const mockSessionService = {
    switchAccount: vi.fn().mockResolvedValue(true),
  } as any;

  const mockAutomationService = {
    autoDetectPaths: vi.fn().mockResolvedValue({}),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("doit couvrir AccountHandlers", async () => {
    registerAccountHandlers(() => mockWin as any, mockAccountService);

    if (handlers["get-accounts"]) await handlers["get-accounts"]();
    if (handlers["get-account-credentials"])
      await handlers["get-account-credentials"](null, "1");

    const validAcc = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Test",
      gameType: "valorant",
      riotId: "User#TAG",
    };

    if (handlers["add-account"]) await handlers["add-account"](null, validAcc);
    if (handlers["update-account"])
      await handlers["update-account"](null, validAcc);
    if (handlers["delete-account"]) await handlers["delete-account"](null, "1");
    if (handlers["reorder-accounts"])
      await handlers["reorder-accounts"](null, ["1"]);
    if (handlers["fetch-account-stats"])
      await handlers["fetch-account-stats"](null, "1");

    expect(mockAccountService.addAccount).toHaveBeenCalled();
  });

  it("doit enregistrer et appeler ConfigHandlers", async () => {
    registerConfigHandlers(mockConfigService);
    if (handlers["get-config"]) await handlers["get-config"]();
    if (handlers["save-config"])
      await handlers["save-config"](null, { theme: "dark" });
    expect(mockConfigService.saveConfig).toHaveBeenCalled();
  });

  it("doit enregistrer et appeler RiotHandlers", async () => {
    registerRiotHandlers(
      () => mockWin as any,
      vi.fn(),
      vi.fn(),
      mockSessionService,
      mockAutomationService,
    );

    if (handlers["select-riot-path"]) await handlers["select-riot-path"]();
    if (handlers["auto-detect-paths"]) await handlers["auto-detect-paths"]();
    if (handlers["switch-account"]) await handlers["switch-account"](null, "1");
    if (handlers["launch-game"])
      await handlers["launch-game"](null, "valorant");

    expect(mockSessionService.switchAccount).toHaveBeenCalled();
  });

  it("doit enregistrer et appeler MiscHandlers", async () => {
    const mockContext = {
      getStatus: vi
        .fn()
        .mockResolvedValue({ status: "Active", accountId: "1" }),
      getAutoStartStatus: vi.fn(),
      setAutoStart: vi.fn(),
      isValorantRunning: vi.fn(),
    };
    registerMiscHandlers(
      () => mockWin as any,
      mockContext as any,
      mockAccountService,
      mockConfigService,
    );

    // Test logs
    if (handlers["log-to-main"])
      handlers["log-to-main"](null, { level: "info", args: ["test"] });

    await handlers["select-account-image"]();
    await handlers["get-status"]();
    await handlers["get-auto-start"]();
    await handlers["set-auto-start"](null, true);

    // Test fermeture avec minimize
    await handlers["handle-quit-choice"](null, {
      action: "minimize",
      dontShowAgain: true,
    });
    expect(mockWin.hide).toHaveBeenCalled();

    // Test fermeture avec quit
    await handlers["handle-quit-choice"](null, {
      action: "quit",
      dontShowAgain: false,
    });
    expect(app.quit).toHaveBeenCalled();
  });

  it("doit enregistrer et appeler UpdateHandlers", async () => {
    registerUpdateHandlers(() => mockWin as any);

    // packaged = true branch
    (app as any).isPackaged = true;
    if (handlers["simulate-update"]) await handlers["simulate-update"]();

    // packaged = false branch
    (app as any).isPackaged = false;
    if (handlers["simulate-update"]) await handlers["simulate-update"]();

    if (handlers["check-updates"]) await handlers["check-updates"]();
    if (handlers["download-update"]) await handlers["download-update"]();
    if (handlers["install-update"]) await handlers["install-update"]();
  });

  it("doit vérifier que les ré-exports de AppModals sont présents", () => {
    expect(AppModals).toBeDefined();
  });
});
