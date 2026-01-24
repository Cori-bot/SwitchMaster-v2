import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  shell,
  dialog,
  ipcMain,
  clipboard,
} from "electron";
import * as cp from "child_process";
import fs from "fs-extra";

const mWin = {
  show: vi.fn(),
  hide: vi.fn(),
  focus: vi.fn(),
  minimize: vi.fn(),
  close: vi.fn(),
  isDestroyed: vi.fn().mockReturnValue(false),
  loadFile: vi.fn().mockResolvedValue(undefined),
  loadURL: vi.fn().mockResolvedValue(undefined),
  webContents: {
    send: vi.fn(),
    on: vi.fn(),
    setWindowOpenHandler: vi.fn(),
    getURL: vi.fn().mockReturnValue("http://localhost:3000"),
    closeDevTools: vi.fn(),
  },
  on: vi.fn(),
};

vi.mock("electron-updater", () => ({
  autoUpdater: { on: vi.fn(), checkForUpdatesAndNotify: vi.fn() },
}));

vi.mock("electron", () => {
  return {
    app: {
      isPackaged: true,
      getPath: vi.fn().mockReturnValue("USER"),
      getAppPath: vi.fn().mockReturnValue("APP"),
      quit: vi.fn(),
      relaunch: vi.fn(),
      exit: vi.fn(),
      getLoginItemSettings: vi.fn().mockReturnValue({}),
      getVersion: vi.fn().mockReturnValue("1.0.0"),
    },
    BrowserWindow: vi.fn().mockImplementation(function () {
      return mWin;
    }),
    Tray: vi.fn().mockImplementation(function () {
      return {
        setToolTip: vi.fn(),
        on: vi.fn(),
        setContextMenu: vi.fn(),
        destroy: vi.fn(),
      };
    }),
    Menu: { buildFromTemplate: vi.fn((t) => t) },
    shell: { openExternal: vi.fn() },
    dialog: {
      showOpenDialog: vi
        .fn()
        .mockResolvedValue({ canceled: false, filePaths: ["P"] }),
    },
    ipcMain: {
      handle: vi.fn(),
      on: vi.fn(),
      removeAllListeners: vi.fn(),
      removeHandler: vi.fn(),
    },
    clipboard: { clear: vi.fn() },
  };
});

vi.mock("child_process", () => {
  const s = vi.fn(() => ({
    unref: vi.fn(),
    on: vi.fn().mockReturnThis(),
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
  }));
  const e = vi.fn((c, o, cb) => {
    (typeof o === "function" ? o : cb)(null, { stdout: "", stderr: "" });
  });
  return { spawn: s, exec: e, default: { spawn: s, exec: e } };
});

vi.mock("fs-extra", () => {
  const mock = {
    pathExists: vi.fn().mockResolvedValue(true),
    ensureDir: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue("[]"),
    writeJson: vi.fn().mockResolvedValue(undefined),
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue("[]"),
    dirname: vi.fn().mockReturnValue("dir"),
  };
  return { ...mock, default: mock };
});

import { createWindow, updateTrayMenu } from "../main/window";
import { registerMiscHandlers } from "../main/ipc/miscHandlers";
import { RiotAutomationService } from "../main/services/RiotAutomationService";
import { AccountService } from "../main/services/AccountService";

describe("Final Coverage Push", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (app as any).isPackaged = true;
    (process as any).resourcesPath = "RES";
  });

  it("Window & Tray Edge Cases", async () => {
    const mockCfg = {
      getConfig: vi
        .fn()
        .mockReturnValue({
          lastAccountId: "1",
          showQuitModal: false,
          minimizeToTray: true,
        }),
    } as any;
    const mockAcc = {
      getAccounts: vi
        .fn()
        .mockResolvedValue([{ id: "1", name: "Last", isFavorite: false }]),
    } as any;

    const win = createWindow(false, mockCfg);

    const closeCb = (win.on as any).mock.calls.find(
      (c: any) => c[0] === "close",
    )[1];
    closeCb({ preventDefault: vi.fn() });
    expect(win.hide).toHaveBeenCalled();

    const navCb = (win.webContents.on as any).mock.calls.find(
      (c: any) => c[0] === "will-navigate",
    )[1];
    navCb({ preventDefault: vi.fn() }, "http://localhost:3000");
    expect(shell.openExternal).not.toHaveBeenCalled();

    await updateTrayMenu(vi.fn(), vi.fn(), mockCfg, mockAcc);
  });

  it("Misc Handlers System Calls", async () => {
    const handlers: any = {};
    (ipcMain.handle as any).mockImplementation(
      (n: string, f: any) => (handlers[n] = f),
    );
    registerMiscHandlers(
      () => mWin as any,
      { getStatus: vi.fn().mockResolvedValue({ status: "Idle" }) } as any,
      { getAccounts: vi.fn().mockResolvedValue([]) } as any,
      { getConfig: vi.fn().mockReturnValue({}) } as any,
    );

    await handlers["minimize-app"]();
    expect(mWin.minimize).toHaveBeenCalled();
    await handlers["close-app"]();
    await handlers["restart-app"]();
    expect(app.quit).toHaveBeenCalled();
  });

  it("RiotAutomationService Error Paths", async () => {
    const service = new RiotAutomationService();
    (fs.pathExists as any).mockResolvedValue(false);
    await expect(service.launchClient("x")).rejects.toThrow();
    await expect(service.launchGame("x", "league")).rejects.toThrow();

    (cp.exec as any).mockImplementation((c: string, cb: any) =>
      cb(new Error()),
    );
    expect(await service.isRiotClientRunning()).toBe(false);
  });

  it("AccountService Reorder & Refresh", async () => {
    const service = new AccountService(
      {} as any,
      { fetchAccountStats: vi.fn() } as any,
    );
    (fs.readFile as any).mockResolvedValue(JSON.stringify([{ id: "1" }]));
    await service.reorderAccounts(["2"]);

    await service.refreshAllAccountStats(mWin as any);
  });
});
