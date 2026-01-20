import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { app, BrowserWindow, Tray, Menu, shell } from "electron";
import { createWindow, getMainWindow, updateTrayMenu } from "../main/window";
import * as configModule from "../main/config";
import * as accountsModule from "../main/accounts";

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
  };

  const mTray = {
    setToolTip: vi.fn(),
    on: vi.fn(),
    setContextMenu: vi.fn(),
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
    BrowserWindow: vi.fn(function() { return mBrowserWindow; }),
    Tray: vi.fn(function() { return mTray; }),
    Menu: {
      buildFromTemplate: vi.fn((template) => template),
    },
    shell: {
      openExternal: vi.fn(),
    },
  };
});

// Mock dependencies
vi.mock("../main/config");
vi.mock("../main/accounts");
vi.mock("../main/logger");

describe("Window Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (configModule.getConfig as any).mockReturnValue({
      showQuitModal: true,
      minimizeToTray: false,
      lastAccountId: null,
    });
    (accountsModule.loadAccountsMeta as any).mockResolvedValue([]);
  });

  describe("createWindow", () => {
    it("doit créer une fenêtre en mode dev", () => {
      const win = createWindow(true);
      expect(BrowserWindow).toHaveBeenCalled();
      expect(win.loadURL).toHaveBeenCalledWith("http://localhost:3000");
    });

    it("doit créer une fenêtre en mode prod", () => {
      const win = createWindow(false);
      expect(win.loadFile).toHaveBeenCalled();
    });

    it("doit gérer l'événement close avec showQuitModal = true", () => {
      const win = createWindow(false);
      // Récupérer le handler 'close'
      const closeHandler = (win.on as any).mock.calls.find((call: any) => call[0] === "close")[1];
      
      const event = { preventDefault: vi.fn() };
      closeHandler(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(win.webContents.send).toHaveBeenCalledWith("show-quit-modal");
    });

    it("doit gérer l'événement close avec minimizeToTray = true", () => {
      (configModule.getConfig as any).mockReturnValue({
        showQuitModal: false,
        minimizeToTray: true,
      });
      const win = createWindow(false);
      const closeHandler = (win.on as any).mock.calls.find((call: any) => call[0] === "close")[1];
      
      const event = { preventDefault: vi.fn() };
      closeHandler(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(win.hide).toHaveBeenCalled();
    });

    it("doit quitter si app.isQuitting est true", () => {
      (app as any).isQuitting = true;
      const win = createWindow(false);
      const closeHandler = (win.on as any).mock.calls.find((call: any) => call[0] === "close")[1];
      
      const event = { preventDefault: vi.fn() };
      closeHandler(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      (app as any).isQuitting = false; // Reset
    });
    it("doit gérer will-navigate pour ouvrir les liens externes", () => {
      const win = createWindow(false);
      const navigateHandler = (win.webContents.on as any).mock.calls.find((call: any) => call[0] === "will-navigate")[1];
      
      const event = { preventDefault: vi.fn() };
      navigateHandler(event, "https://google.com");
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(shell.openExternal).toHaveBeenCalledWith("https://google.com");
    });

    it("doit gérer setWindowOpenHandler", () => {
      const win = createWindow(false);
      const openHandler = (win.webContents.setWindowOpenHandler as any).mock.calls[0][0];
      
      const result = openHandler({ url: "https://google.com" });
      expect(shell.openExternal).toHaveBeenCalledWith("https://google.com");
      expect(result).toEqual({ action: "deny" });
    });
  });

  describe("Tray Menu Interaction", () => {
    it("doit gérer le clic sur le Tray", async () => {
      const launchGame = vi.fn();
      const switchAccount = vi.fn();
      await updateTrayMenu(launchGame, switchAccount);
      
      const tray = (Tray as any).mock.results[0].value;
      const clickHandler = (tray.on as any).mock.calls.find((call: any) => call[0] === "click")[1];
      
      // Cas 1: Fenêtre visible
      const win = getMainWindow();
      (win.isVisible as any).mockReturnValue(true);
      clickHandler();
      expect(win.focus).toHaveBeenCalled();
      
      // Cas 2: Fenêtre cachée
      (win.isVisible as any).mockReturnValue(false);
      clickHandler();
      expect(win.show).toHaveBeenCalled();
    });

    it("doit gérer le clic sur 'Lancer League'", async () => {
      const launchGame = vi.fn();
      const switchAccount = vi.fn();
      await updateTrayMenu(launchGame, switchAccount);
      
      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const item = template.find((i: any) => i.label === "Lancer League of Legends");
      item.click();
      expect(launchGame).toHaveBeenCalledWith("league");
    });

    it("doit gérer le clic sur 'Quitter'", async () => {
      const launchGame = vi.fn();
      const switchAccount = vi.fn();
      await updateTrayMenu(launchGame, switchAccount);
      
      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const item = template.find((i: any) => i.label === "Quitter");
      item.click();
      expect(app.quit).toHaveBeenCalled();
      expect((app as any).isQuitting).toBe(true);
    });
  });
});
