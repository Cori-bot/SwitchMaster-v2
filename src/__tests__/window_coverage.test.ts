import { describe, it, expect, vi, beforeEach } from "vitest";
import { app, BrowserWindow, Tray, Menu, shell } from "electron";

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
    closeDevTools: vi.fn(),
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
      destroy: vi.fn(),
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
      buildFromTemplate: vi.fn((template) => template),
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
    const { createWindow, resetWindowModuleForTests } =
      await import("../main/window");
    resetWindowModuleForTests();
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

  it("creation skip logic if isQuitting is true (Line 88)", async () => {
    const { createWindow } = await import("../main/window");
    (app as any).isQuitting = true;
    const win = createWindow(true, mockConfigService);

    const closeHandler = (win.on as any).mock.calls.find(
      (c: any) => c[0] === "close",
    )[1];
    const event = { preventDefault: vi.fn() };
    closeHandler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    (app as any).isQuitting = false;
  });

  it("creation handles showQuitModal but skips sending if destroyed (Line 92 check)", async () => {
    const { createWindow } = await import("../main/window");
    mockConfigService.getConfig.mockReturnValue({
      showQuitModal: true,
      minimizeToTray: false,
    });

    const win = createWindow(true, mockConfigService);
    (win.webContents.isDestroyed as any).mockReturnValue(true);

    const closeHandler = (win.on as any).mock.calls.find(
      (c: any) => c[0] === "close",
    )[1];
    const event = { preventDefault: vi.fn() };

    closeHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(win.webContents.send).not.toHaveBeenCalled();
    (win.webContents.isDestroyed as any).mockReturnValue(false); // Reset
  });

  it("creation handles production mode (isDev = false) and navigation (Lines 49, 56)", async () => {
    const { createWindow } = await import("../main/window");
    const win = createWindow(false, mockConfigService);
    expect(win.loadFile).toHaveBeenCalled();

    const navHandler = (win.webContents.on as any).mock.calls.find(
      (c: any) => c[0] === "will-navigate",
    )[1];
    const event = { preventDefault: vi.fn() };
    navHandler(event, "http://external.com");
    expect(event.preventDefault).toHaveBeenCalled();
    expect(shell.openExternal).toHaveBeenCalledWith("http://external.com");
  });

  it("production mode blocks devtools and special keys (Lines 64, 68)", async () => {
    const { createWindow } = await import("../main/window");
    const win = createWindow(false, mockConfigService);

    const devtoolsHandler = (win.webContents.on as any).mock.calls.find(
      (c: any) => c[0] === "devtools-opened",
    )[1];
    devtoolsHandler();
    expect(win.webContents.closeDevTools).toHaveBeenCalled();

    const inputHandler = (win.webContents.on as any).mock.calls.find(
      (c: any) => c[0] === "before-input-event",
    )[1];
    const eventI = { preventDefault: vi.fn() };
    inputHandler(eventI, { control: true, shift: true, key: "i" });
    expect(eventI.preventDefault).toHaveBeenCalled();
    inputHandler(eventI, { key: "F12" });
    expect(eventI.preventDefault).toHaveBeenCalledTimes(2);
  });

  it("setWindowOpenHandler prevents new windows (Line 82)", async () => {
    const { createWindow } = await import("../main/window");
    createWindow(true, mockConfigService);
    const handler = (mWin.webContents.setWindowOpenHandler as any).mock
      .calls[0][0];
    const result = handler({ url: "http://pop.up" });
    expect(result).toEqual({ action: "deny" });
    expect(shell.openExternal).toHaveBeenCalledWith("http://pop.up");
  });

  it("updateTrayMenu handles lastAccountId, Launch and Quit (Lines 132-135, 161, 182)", async () => {
    const { updateTrayMenu, createWindow, resetWindowModuleForTests } =
      await import("../main/window");
    resetWindowModuleForTests();
    createWindow(true, mockConfigService);

    mockConfigService.getConfig.mockReturnValue({ lastAccountId: "acc-last" });
    mockAccountService.getAccounts.mockResolvedValue([
      { id: "acc-last", name: "LastUsed", isFavorite: false },
    ]);

    const switchTrigger = vi.fn();
    const launchGame = vi.fn();
    await updateTrayMenu(
      launchGame,
      switchTrigger,
      mockConfigService,
      mockAccountService,
    );

    const template = (Menu.buildFromTemplate as any).mock.calls[0][0];

    // Click Launch LoL
    const lolItem = template.find(
      (i) => i.label === "Lancer League of Legends",
    );
    await lolItem.click();
    expect(launchGame).toHaveBeenCalledWith("league");

    // Click Launch Valorant
    const valItem = template.find((i) => i.label === "Lancer Valorant");
    await valItem.click();
    expect(launchGame).toHaveBeenCalledWith("valorant");

    // Click Last Account
    const lastItem = template.find(
      (i) => i.label && i.label.includes("Dernier compte"),
    );
    await lastItem.click();
    expect(switchTrigger).toHaveBeenCalledWith("acc-last");

    // Click Show
    const showItem = template.find((i) => i.label === "Afficher SwitchMaster");
    await showItem.click();
    expect(mWin.show).toHaveBeenCalled();

    // Click Quit
    const quitItem = template.find((i) => i.label === "Quitter");
    quitItem.click();
    expect(app.quit).toHaveBeenCalled();
  });

  it("updateTrayMenu skips lastAccountId if it is already a favorite (Line 157)", async () => {
    const { updateTrayMenu, resetWindowModuleForTests, createWindow } =
      await import("../main/window");
    resetWindowModuleForTests();
    createWindow(true, mockConfigService);

    mockConfigService.getConfig.mockReturnValue({ lastAccountId: "acc-1" });
    mockAccountService.getAccounts.mockResolvedValue([
      { id: "acc-1", name: "Fav", isFavorite: true },
    ]);

    await updateTrayMenu(
      vi.fn(),
      vi.fn(),
      mockConfigService,
      mockAccountService,
    );
    const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
    const lastItem = template.find(
      (i) => i.label && i.label.includes("Dernier compte"),
    );
    expect(lastItem).toBeUndefined();
  });

  it("updateTrayMenu handles lastAccountId existing in config but missing in accounts (Line 160 else)", async () => {
    const { updateTrayMenu, resetWindowModuleForTests, createWindow } =
      await import("../main/window");
    resetWindowModuleForTests();
    createWindow(true, mockConfigService);

    mockConfigService.getConfig.mockReturnValue({
      lastAccountId: "deleted-acc",
    });
    mockAccountService.getAccounts.mockResolvedValue([
      { id: "acc-1", name: "Other", isFavorite: false },
    ]);

    await updateTrayMenu(
      vi.fn(),
      vi.fn(),
      mockConfigService,
      mockAccountService,
    );
    const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
    const lastItem = template.find(
      (i) => i.label && i.label.includes("Dernier compte"),
    );
    expect(lastItem).toBeUndefined();
  });
});
