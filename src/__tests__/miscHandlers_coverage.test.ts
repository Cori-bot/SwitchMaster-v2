import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ipcMain, dialog } from "electron";

vi.mock("electron-updater", () => ({
  autoUpdater: { on: vi.fn(), checkForUpdatesAndNotify: vi.fn() },
}));

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
    removeHandler: vi.fn(),
  },

  dialog: { showOpenDialog: vi.fn() },
  app: {
    quit: vi.fn(),
    relaunch: vi.fn(),
    exit: vi.fn(),
    getVersion: vi.fn().mockReturnValue("1.0.0"),
  },
  BrowserWindow: { getAllWindows: vi.fn(() => []) },
}));

vi.mock("../main/logger", () => ({ devLog: vi.fn(), devError: vi.fn() }));

describe("miscHandlers Coverage Final", () => {
  const registered: any = {};
  const mockAcc = { getAccounts: vi.fn().mockResolvedValue([]) } as any;
  const mockCfg = { getConfig: vi.fn().mockReturnValue({}) } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    (ipcMain.handle as any).mockImplementation(
      (c: string, h: any) => (registered[c] = h),
    );
  });

  afterEach(() => vi.resetModules());

  it("select-account-image handles null window (Line 17)", async () => {
    const { registerMiscHandlers } = await import("../main/ipc/miscHandlers");
    registerMiscHandlers(() => null, {} as any, mockAcc, mockCfg);
    const res = await registered["select-account-image"]({});
    expect(res).toBeNull();
  });

  it("select-account-image handles selection (Line 24)", async () => {
    const { registerMiscHandlers } = await import("../main/ipc/miscHandlers");
    const win = {};
    (dialog.showOpenDialog as any).mockResolvedValue({
      canceled: false,
      filePaths: ["img.png"],
    });
    registerMiscHandlers(() => win as any, {} as any, mockAcc, mockCfg);
    const res = await registered["select-account-image"]({});
    expect(res).toBe("img.png");
  });

  it("select-account-image handles canceled selection", async () => {
    const { registerMiscHandlers } = await import("../main/ipc/miscHandlers");
    const win = {};
    (dialog.showOpenDialog as any).mockResolvedValue({
      canceled: true,
      filePaths: [],
    });
    registerMiscHandlers(() => win as any, {} as any, mockAcc, mockCfg);
    const res = await registered["select-account-image"]({});
    expect(res).toBeNull();
  });
});
