import { describe, it, expect, vi, beforeEach } from "vitest";
import { app, BrowserWindow, Tray, Menu, shell } from "electron";
import {
  createWindow,
  getMainWindow,
  updateTrayMenu,
  resetWindowModuleForTests,
} from "../main/window";

// Mock Electron
vi.mock("electron", () => {
  const mBrowserWindow = {
    loadURL: vi.fn(),
    loadFile: vi.fn().mockResolvedValue(undefined),
    webContents: {
      on: vi.fn(),
      setWindowOpenHandler: vi.fn(),
      send: vi.fn(),
      getURL: vi.fn().mockReturnValue("http://localhost:3000"),
      isDestroyed: vi.fn().mockReturnValue(false),
      closeDevTools: vi.fn(),
    },
    on: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    isVisible: vi.fn().mockReturnValue(false),
    focus: vi.fn(),
    destroy: vi.fn(),
    minimize: vi.fn(),
  };

  const mTray = {
    setToolTip: vi.fn(),
    on: vi.fn(),
    setContextMenu: vi.fn(),
    destroy: vi.fn(),
  };

  return {
    app: {
      commandLine: {
        appendSwitch: vi.fn(),
      },
      isPackaged: false,
      getPath: vi.fn().mockReturnValue("userDataPath"),
      quit: vi.fn(),
    },
    BrowserWindow: vi.fn(function () {
      return mBrowserWindow;
    }),
    Tray: vi.fn(function () {
      return mTray;
    }),
    Menu: {
      buildFromTemplate: vi.fn((template) => template),
    },
    shell: {
      openExternal: vi.fn(),
    },
  };
});

vi.mock("../main/logger");

describe("Window Module", () => {
  const mockConfigService = {
    getConfig: vi.fn().mockReturnValue({}),
  } as any;
  const mockAccountService = {
    getAccounts: vi.fn().mockResolvedValue([]),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetWindowModuleForTests();
  });

  describe("createWindow", () => {
    it("doit créer une fenêtre en mode dev", () => {
      const win = createWindow(true, mockConfigService);
      expect(BrowserWindow).toHaveBeenCalled();
      expect(win.loadURL).toHaveBeenCalledWith("http://localhost:3000");
    });

    it("doit créer une fenêtre en mode prod", () => {
      const win = createWindow(false, mockConfigService);
      expect(win.loadFile).toHaveBeenCalled();
    });

    it("doit gérer les erreurs de chargement de index.html", async () => {
      const win = createWindow(false, mockConfigService);
      const loadFileSpy = vi
        .spyOn(win, "loadFile")
        .mockRejectedValue(new Error("Load error"));
      createWindow(false, mockConfigService);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(loadFileSpy).toHaveBeenCalled();
    });

    it("doit gérer l'événement close avec showQuitModal = true", () => {
      mockConfigService.getConfig.mockReturnValue({ showQuitModal: true });
      const win = createWindow(false, mockConfigService);
      const closeHandler = (win.on as any).mock.calls.find(
        (call: any) => call[0] === "close",
      )[1];
      const event = { preventDefault: vi.fn() };
      closeHandler(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(win.webContents.send).toHaveBeenCalledWith("show-quit-modal");
    });
    it("doit gérer l'événement close avec minimizeToTray = true", () => {
      mockConfigService.getConfig.mockReturnValue({
        showQuitModal: false,
        minimizeToTray: true,
      });
      const win = createWindow(false, mockConfigService);
      const closeHandler = (win.on as any).mock.calls.find(
        (call: any) => call[0] === "close",
      )[1];
      const event = { preventDefault: vi.fn() };
      closeHandler(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(win.hide).toHaveBeenCalled();
    });

    it("ne doit pas empêcher la fermeture si ni modal ni tray", () => {
      mockConfigService.getConfig.mockReturnValue({
        showQuitModal: false,
        minimizeToTray: false,
      });
      const win = createWindow(false, mockConfigService);
      const closeHandler = (win.on as any).mock.calls.find(
        (call: any) => call[0] === "close",
      )[1];
      const event = { preventDefault: vi.fn() };
      closeHandler(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
    it("doit gérer l'événement close avec minimizeToTray = true", () => {
      mockConfigService.getConfig.mockReturnValue({
        showQuitModal: false,
        minimizeToTray: true,
      });
      const win = createWindow(false, mockConfigService);
      const closeHandler = (win.on as any).mock.calls.find(
        (call: any) => call[0] === "close",
      )[1];
      const event = { preventDefault: vi.fn() };
      closeHandler(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(win.hide).toHaveBeenCalled();
    });

    it("ne doit pas empêcher la fermeture si ni modal ni tray", () => {
      mockConfigService.getConfig.mockReturnValue({
        showQuitModal: false,
        minimizeToTray: false,
      });
      const win = createWindow(false, mockConfigService);
      const closeHandler = (win.on as any).mock.calls.find(
        (call: any) => call[0] === "close",
      )[1];
      const event = { preventDefault: vi.fn() };
      closeHandler(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("Tray Menu Interaction", () => {
    it("doit mettre à jour le Tray s'il existe déjà", async () => {
      createWindow(true, mockConfigService);
      // Premier appel : création
      await updateTrayMenu(
        vi.fn(),
        vi.fn(),
        mockConfigService,
        mockAccountService,
      );
      expect(Tray).toHaveBeenCalledTimes(1);

      // Deuxième appel : mise à jour
      await updateTrayMenu(
        vi.fn(),
        vi.fn(),
        mockConfigService,
        mockAccountService,
      );
      expect(Tray).toHaveBeenCalledTimes(1); // Pas de nouvelle instance
      const trayInstance = (Tray as any).mock.results[0].value;
      expect(trayInstance.setContextMenu).toHaveBeenCalledTimes(2);
    });

    it("doit créer le Tray s'il n'existe pas", async () => {
      createWindow(true, mockConfigService);
      await updateTrayMenu(
        vi.fn(),
        vi.fn(),
        mockConfigService,
        mockAccountService,
      );
      expect(Tray).toHaveBeenCalled();
    });

    it("doit gérer le clic sur le Tray", async () => {
      createWindow(true, mockConfigService);
      await updateTrayMenu(
        vi.fn(),
        vi.fn(),
        mockConfigService,
        mockAccountService,
      );
      const tray = (Tray as any).mock.results[0].value;
      const clickHandler = (tray.on as any).mock.calls.find(
        (call: any) => call[0] === "click",
      )[1];
      const win = getMainWindow();
      (win.isVisible as any).mockReturnValue(true);
      clickHandler();
      expect(win.focus).toHaveBeenCalled();
      (win.isVisible as any).mockReturnValue(false);
      clickHandler();
      expect(win.show).toHaveBeenCalled();
    });

    it("doit gérer le clic sur un compte favori", async () => {
      createWindow(true, mockConfigService);
      mockAccountService.getAccounts.mockResolvedValue([
        { id: "fav-1", name: "Favori", isFavorite: true },
      ]);
      const switchAccount = vi.fn();
      await updateTrayMenu(
        vi.fn(),
        switchAccount,
        mockConfigService,
        mockAccountService,
      );
      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const favItem = template.find((i: any) => i.label === "⭐ Favori");
      await favItem.click();
      expect(switchAccount).toHaveBeenCalledWith("fav-1");
    });
  });
});
