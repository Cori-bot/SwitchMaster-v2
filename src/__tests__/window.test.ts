import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Electron AVANT tout import
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

import { app, BrowserWindow, Tray, Menu, shell } from "electron";
import { createWindow, getMainWindow, updateTrayMenu, resetWindowModuleForTests } from "../main/window";
import * as configModule from "../main/config";
import * as accountsModule from "../main/accounts";

// Mock dependencies
vi.mock("../main/config");
vi.mock("../main/accounts");
vi.mock("../main/logger");

describe("Window Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetWindowModuleForTests();
    (configModule.getConfig as any).mockReturnValue({
      showQuitModal: true,
      minimizeToTray: false,
      lastAccountId: null,
    });
    (accountsModule.loadAccountsMeta as any).mockResolvedValue([]);
    (app.getPath as any).mockReturnValue("C:\\Mock\\UserData");
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

    it("doit gérer les erreurs de chargement de index.html", async () => {
      const win = createWindow(false);
      const loadFileSpy = vi.spyOn(win, "loadFile").mockRejectedValue(new Error("Load error"));
      createWindow(false);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(loadFileSpy).toHaveBeenCalled();
    });

    it("doit gérer l'événement close avec showQuitModal = true", () => {
      const win = createWindow(false);
      const closeHandler = (win.on as any).mock.calls.find((call: any) => call[0] === "close")[1];
      const event = { preventDefault: vi.fn() };
      closeHandler(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(win.webContents.send).toHaveBeenCalledWith("show-quit-modal");
    });

    it("doit empêcher l'ouverture des devtools et intercepter les touches en prod", () => {
      const win = createWindow(false);
      const devtoolsHandler = (win.webContents.on as any).mock.calls.find((call: any) => call[0] === "devtools-opened")[1];
      const inputHandler = (win.webContents.on as any).mock.calls.find((call: any) => call[0] === "before-input-event")[1];
      
      devtoolsHandler();
      expect(win.webContents.closeDevTools).toHaveBeenCalled();
      
      const event = { preventDefault: vi.fn() };
      // Test Ctrl+Shift+I (insensible à la casse)
      inputHandler(event, { control: true, shift: true, key: "i" });
      expect(event.preventDefault).toHaveBeenCalled();
      
      inputHandler(event, { control: true, shift: true, key: "I" });
      expect(event.preventDefault).toHaveBeenCalledTimes(2);

      // Test F12
      inputHandler(event, { key: "F12" });
      expect(event.preventDefault).toHaveBeenCalledTimes(3);
    });

    it("doit utiliser le chemin d'icône packagé en prod", () => {
      (app as any).isPackaged = true;
      (process as any).resourcesPath = "C:\\Resources";
      const win = createWindow(false);
      expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
        icon: expect.stringContaining("Resources")
      }));
      (app as any).isPackaged = false;
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
    it("doit créer le Tray s'il n'existe pas", async () => {
      createWindow(true);
      await updateTrayMenu(vi.fn(), vi.fn());
      expect(Tray).toHaveBeenCalled();
    });

    it("doit gérer le clic sur le Tray", async () => {
      createWindow(true);
      await updateTrayMenu(vi.fn(), vi.fn());
      const tray = (Tray as any).mock.results[0].value;
      const clickHandler = (tray.on as any).mock.calls.find((call: any) => call[0] === "click")[1];
      const win = getMainWindow();
      (win.isVisible as any).mockReturnValue(true);
      clickHandler();
      expect(win.focus).toHaveBeenCalled();
      (win.isVisible as any).mockReturnValue(false);
      clickHandler();
      expect(win.show).toHaveBeenCalled();
    });

    it("doit gérer le clic sur un compte favori", async () => {
      createWindow(true);
      (accountsModule.loadAccountsMeta as any).mockResolvedValue([
        { id: "fav-1", name: "Favori", isFavorite: true },
      ]);
      const switchAccount = vi.fn();
      await updateTrayMenu(vi.fn(), switchAccount);
      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const favItem = template.find((i: any) => i.label === "⭐ Favori");
      await favItem.click();
      expect(switchAccount).toHaveBeenCalledWith("fav-1");
    });

    it("doit gérer le clic sur le dernier compte utilisé", async () => {
      createWindow(true);
      (accountsModule.loadAccountsMeta as any).mockResolvedValue([
        { id: "last-1", name: "Dernier", isFavorite: false },
      ]);
      (configModule.getConfig as any).mockReturnValue({ lastAccountId: "last-1" });
      const switchAccount = vi.fn();
      await updateTrayMenu(vi.fn(), switchAccount);
      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const lastItem = template.find((i: any) => i.label === "Dernier compte: Dernier");
      await lastItem.click();
      expect(switchAccount).toHaveBeenCalledWith("last-1");
    });

    it("doit gérer le clic sur 'Lancer League'", async () => {
      const launchGame = vi.fn();
      await updateTrayMenu(launchGame, vi.fn());
      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const item = template.find((i: any) => i.label === "Lancer League of Legends");
      item.click();
      expect(launchGame).toHaveBeenCalledWith("league");
    });

    it("doit gérer le clic sur 'Quitter'", async () => {
      await updateTrayMenu(vi.fn(), vi.fn());
      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const item = template.find((i: any) => i.label === "Quitter");
      item.click();
      expect(app.quit).toHaveBeenCalled();
    });
  });
});
