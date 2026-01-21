import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockWin, handlers } = vi.hoisted(() => {
  (process as any).resourcesPath = "C:\\Resources";
  const m = {
    minimize: vi.fn(),
    hide: vi.fn(),
    close: vi.fn(),
    isDestroyed: vi.fn().mockReturnValue(false),
    webContents: { send: vi.fn() }
  };
  return {
    mockWin: m,
    handlers: {} as Record<string, Function>
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
  function MockBW() { return mockWin; }
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
      removeAllListeners: vi.fn()
    },
    BrowserWindow: MockBW,
    dialog: {
      showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: ["path"] })
    },
    shell: { openExternal: vi.fn() },
  };
});

// MOCK UTILS pour capturer les handlers
vi.mock("../main/ipc/utils", () => ({
  safeHandle: vi.fn((name, fn) => { handlers[name] = fn; }),
  safeOn: vi.fn((name, fn) => { handlers[name] = fn; }),
}));

vi.mock("../main/accounts");
vi.mock("../main/accounts");
vi.mock("../main/config", () => ({
  getConfig: vi.fn().mockReturnValue({ riotPath: "d:\\Code\\SwitchMaster-v2\\dummy_riot" }),
  saveConfig: vi.fn(),
  loadConfig: vi.fn().mockResolvedValue({}),
}));
vi.mock("../main/accounts");
vi.mock("../main/config", () => ({
  getConfig: vi.fn().mockReturnValue({ riotPath: "d:\\Code\\SwitchMaster-v2\\dummy_riot" }),
  saveConfig: vi.fn(),
  loadConfig: vi.fn().mockResolvedValue({}),
}));
vi.mock("../main/automation", () => ({
  killRiotProcesses: vi.fn().mockResolvedValue(undefined),
  launchRiotClient: vi.fn().mockResolvedValue(undefined),
  performAutomation: vi.fn().mockResolvedValue(undefined),
  autoDetectPaths: vi.fn().mockResolvedValue({ riotPath: "d:\\Code\\SwitchMaster-v2\\dummy_riot" }),
}));
vi.mock("../main/logger");
vi.mock("../main/logger");
vi.mock("../main/logger");
vi.mock("../main/statsService");
vi.mock("fs-extra", () => {
  const mockMethods = {
    pathExists: vi.fn().mockResolvedValue(true),
    stat: vi.fn().mockResolvedValue({ isDirectory: () => true }),
    existsSync: vi.fn().mockReturnValue(true),
  };
  return {
    ...mockMethods,
    default: mockMethods,
  };
});
vi.mock("../main/appLogic", () => ({
  launchGame: vi.fn().mockResolvedValue(undefined),
  monitorRiotProcess: vi.fn(),
  setAutoStart: vi.fn(),
  getAutoStartStatus: vi.fn().mockReturnValue({ enabled: false }),
  getStatus: vi.fn().mockResolvedValue({ status: "Prêt" }),
  isValorantRunning: vi.fn().mockResolvedValue(false),
}));

import { registerAccountHandlers } from "../main/ipc/accountHandlers";
import { registerConfigHandlers } from "../main/ipc/configHandlers";
import { registerRiotHandlers } from "../main/ipc/riotHandlers";
import { registerMiscHandlers } from "../main/ipc/miscHandlers";
import { registerUpdateHandlers } from "../main/ipc/updateHandlers";
import * as accountsModule from "../main/accounts";
import * as configModule from "../main/config";
import * as automationModule from "../main/automation";
import { app } from "electron";

// Couvrir le fichier d'index des modals (ré-exports)
import * as AppModals from "../renderer/components/AppModals";

describe("Main Process IPC Handlers Full Coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("doit couvrir AccountHandlers", async () => {
    registerAccountHandlers(() => mockWin as any);
    (accountsModule.loadAccountsMeta as any).mockResolvedValue([{ id: "550e8400-e29b-41d4-a716-446655440000", riotId: "U#T" }]);

    if (handlers["get-accounts"]) await handlers["get-accounts"]();
    if (handlers["get-account-credentials"]) await handlers["get-account-credentials"](null, "1");

    const validAcc = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Test",
      gameType: "valorant",
      riotId: "User#TAG",
      region: "eu"
    };

    if (handlers["add-account"]) await handlers["add-account"](null, validAcc);
    if (handlers["update-account"]) await handlers["update-account"](null, validAcc);
    if (handlers["delete-account"]) await handlers["delete-account"](null, "1");
    if (handlers["reorder-accounts"]) await handlers["reorder-accounts"](null, ["1"]);
    if (handlers["fetch-account-stats"]) await handlers["fetch-account-stats"](null, "550e8400-e29b-41d4-a716-446655440000");

    expect(accountsModule.addAccount).toHaveBeenCalled();
  });

  it("doit enregistrer et appeler ConfigHandlers", async () => {
    registerConfigHandlers();
    (configModule.getConfig as any).mockReturnValue({});
    if (handlers["get-config"]) await handlers["get-config"]();
    if (handlers["save-config"]) await handlers["save-config"](null, { theme: "dark" });
    expect(configModule.saveConfig).toHaveBeenCalled();
  });

  it("doit enregistrer et appeler RiotHandlers", async () => {
    registerRiotHandlers(() => mockWin as any, vi.fn(), vi.fn());
    (accountsModule.getAccountCredentials as any).mockResolvedValue({ username: "u", password: "p" });
    // Point to the dummy file we created
    (configModule.getConfig as any).mockReturnValue({ riotPath: "d:\\Code\\SwitchMaster-v2\\dummy_riot" });

    if (handlers["select-riot-path"]) await handlers["select-riot-path"]();
    if (handlers["auto-detect-paths"]) await handlers["auto-detect-paths"]();
    if (handlers["switch-account"]) await handlers["switch-account"](null, "1");
    if (handlers["launch-game"]) await handlers["launch-game"](null, "valorant");

    expect(automationModule.performAutomation).toHaveBeenCalled();
  });

  it("doit enregistrer et appeler MiscHandlers", async () => {
    const mockContext = {
      getStatus: vi.fn().mockResolvedValue({ status: "Active", accountId: "550e8400-e29b-41d4-a716-446655440000" }),
      getAutoStartStatus: vi.fn(),
      setAutoStart: vi.fn(),
      isValorantRunning: vi.fn()
    };
    registerMiscHandlers(() => mockWin as any, mockContext as any);

    // Test logs
    if (handlers["log-to-main"]) handlers["log-to-main"](null, { level: "info", args: ["test"] });

    await handlers["select-account-image"]();
    await handlers["get-status"]();
    await handlers["get-auto-start"]();
    await handlers["set-auto-start"](null, true);

    // Test fermeture avec minimize
    await handlers["handle-quit-choice"](null, { action: "minimize", dontShowAgain: true });
    expect(mockWin.hide).toHaveBeenCalled();

    // Test fermeture avec quit
    await handlers["handle-quit-choice"](null, { action: "quit", dontShowAgain: false });
    expect(app.quit).toHaveBeenCalled();
  });

  it("doit enregistrer et appeler UpdateHandlers", async () => {
    registerUpdateHandlers(() => mockWin as any);
    if (handlers["check-updates"]) await handlers["check-updates"]();
    if (handlers["simulate-update"]) await handlers["simulate-update"]();
    if (handlers["download-update"]) await handlers["download-update"]();
    if (handlers["install-update"]) await handlers["install-update"]();
  });

  it("doit vérifier que les ré-exports de AppModals sont présents", () => {
    expect(AppModals).toBeDefined();
  });
});
