import { describe, it, expect, vi, beforeEach } from "vitest";
import { app, BrowserWindow, Tray } from "electron";

// Mock Electron
const mWin = {
  loadURL: vi.fn(),
  loadFile: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  webContents: {
    setWindowOpenHandler: vi.fn(),
    send: vi.fn(),
    on: vi.fn(),
    isDestroyed: vi.fn().mockReturnValue(false),
    getURL: vi.fn().mockReturnValue("http://localhost:3000"),
  },
  hide: vi.fn(),
  show: vi.fn(),
  focus: vi.fn(),
  isVisible: vi.fn().mockReturnValue(true),
  minimize: vi.fn(),
};

vi.hoisted(() => {
  (process as any).resourcesPath = "C:\\Resources";
});

vi.mock("electron", () => {
  const mockApp = {
    isPackaged: false,
    on: vi.fn(),
    getPath: vi.fn(() => "mock-path"),
    getAppPath: vi.fn(() => "mock-app-path"),
    commandLine: { appendSwitch: vi.fn() },
    quit: vi.fn(),
  };
  const mockTray = vi.fn().mockImplementation(function () {
    return {
      setToolTip: vi.fn(),
      on: vi.fn(),
      setContextMenu: vi.fn(),
    };
  });
  const mockBrowserWindow = vi.fn().mockImplementation(function () {
    return mWin;
  });

  return {
    app: mockApp,
    BrowserWindow: mockBrowserWindow,
    Tray: mockTray,
    Menu: {
      buildFromTemplate: vi.fn().mockReturnValue({}),
    },
    shell: { openExternal: vi.fn() },
  };
});

describe("Window Exhaustive Coverage", () => {
  const mockConfigService = {
    getConfig: vi.fn().mockReturnValue({}),
  } as any;
  const mockAccountService = {
    getAccounts: vi.fn().mockResolvedValue([]),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creation handles minimizeToTray without showQuitModal (Line 98)", async () => {
    const { createWindow } = await import("../main/window");
    mockConfigService.getConfig.mockReturnValue({
      showQuitModal: false,
      minimizeToTray: true,
    });
    const win = createWindow(true, mockConfigService);

    const closeHandler = (win.on as any).mock.calls.find(
      (c: any) => c[0] === "close",
    )[1];
    const event = { preventDefault: vi.fn() };
    closeHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(win.hide).toHaveBeenCalled();
  });

  it("creation handles showQuitModal sending event (Line 96)", async () => {
    const { createWindow } = await import("../main/window");
    mockConfigService.getConfig.mockReturnValue({
      showQuitModal: true,
      minimizeToTray: false,
    });

    const win = createWindow(true, mockConfigService);
    const closeHandler = (win.on as any).mock.calls.find(
      (c: any) => c[0] === "close",
    )[1];
    const event = { preventDefault: vi.fn() };

    closeHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(win.webContents.send).toHaveBeenCalledWith("show-quit-modal");
  });

  it("creation handles close normally when no modal and no tray minimize (Line 98 else)", async () => {
    const { createWindow } = await import("../main/window");
    mockConfigService.getConfig.mockReturnValue({
      showQuitModal: false,
      minimizeToTray: false,
    });

    const win = createWindow(true, mockConfigService);
    const closeHandler = (win.on as any).mock.calls.find(
      (c: any) => c[0] === "close",
    )[1];
    const event = { preventDefault: vi.fn() };

    closeHandler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(win.hide).not.toHaveBeenCalled();
  });

  it("updateTrayMenu and tray interaction coverage", async () => {
    const { createWindow, updateTrayMenu } = await import("../main/window");
    (app as any).isPackaged = true;
    mockConfigService.getConfig.mockReturnValue({ lastAccountId: "ghost" });
    mockAccountService.getAccounts.mockResolvedValue([
      { id: "1", name: "Fav", isFavorite: true },
    ]);

    createWindow(true, mockConfigService);
    await updateTrayMenu(
      vi.fn(),
      vi.fn(),
      mockConfigService,
      mockAccountService,
    );
    expect(Tray).toHaveBeenCalled();

    const trayInstance = (Tray as any).mock.results[0].value;
    const clickHandler = trayInstance.on.mock.calls.find(
      (c: any) => c[0] === "click",
    )[1];

    // Case visible
    (mWin.isVisible as any).mockReturnValue(true);
    clickHandler();
    expect(mWin.focus).toHaveBeenCalled();

    // Case hidden
    (mWin.isVisible as any).mockReturnValue(false);
    clickHandler();
    expect(mWin.show).toHaveBeenCalled();
  });
});
