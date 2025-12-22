import { BrowserWindow, Tray, Menu, app, shell } from "electron";
import path from "path";

app.commandLine.appendSwitch("disable-gpu-cache");
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
app.commandLine.appendSwitch("disable-http-cache");
app.commandLine.appendSwitch("lang", "fr-FR");
// app.commandLine.appendSwitch("remote-debugging-port", "9222");

import { getConfig } from "./config";
import { loadAccountsMeta } from "./accounts";

let mainWindow: BrowserWindow;
let tray: Tray | null = null;

const DEFAULT_WIDTH = 1000;
const DEFAULT_HEIGHT = 700;
const MIN_WIDTH = 600;
const MIN_HEIGHT = 600;

export function createWindow(isDev: boolean): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    backgroundColor: "#121212",
    frame: true,
    show: isDev, // Show immediately in dev to debug
    autoHideMenuBar: true,
    icon: path.join(__dirname, "..", "assets", "logo.png"),
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("close", (event) => {
    if ((app as any).isQuitting) return;
    const config = getConfig();
    if (config.showQuitModal) {
      event.preventDefault();
      mainWindow.webContents.send("show-quit-modal");
    } else if (config.minimizeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  return mainWindow;
}

export async function updateTrayMenu(
  launchGame: (gameId: "league" | "valorant") => Promise<void>,
  switchAccountTrigger: (id: string) => Promise<void>,
) {
  const iconPath = path.join(__dirname, "..", "assets", "logo.png");
  if (!tray) {
    tray = new Tray(iconPath);
    tray.setToolTip("SwitchMaster");
    tray.on("click", () => {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }

  const config = getConfig();
  const menuItems: Electron.MenuItemConstructorOptions[] = [
    { label: "Afficher SwitchMaster", click: () => mainWindow.show() },
    { type: "separator" },
    { label: "Lancer League of Legends", click: () => launchGame("league") },
    { label: "Lancer Valorant", click: () => launchGame("valorant") },
  ];

  if (config.lastAccountId) {
    const accounts = await loadAccountsMeta();
    const lastAccount = accounts.find((a) => a.id === config.lastAccountId);
    if (lastAccount) {
      menuItems.push(
        { type: "separator" },
        {
          label: `Connecter: ${lastAccount.name}`,
          click: async () => {
            await switchAccountTrigger(lastAccount.id);
            void mainWindow.webContents.send(
              "quick-connect-triggered",
              lastAccount.id,
            );
          },
        },
      );
    }
  }

  menuItems.push(
    { type: "separator" },
    {
      label: "Quitter",
      click: () => {
        (app as any).isQuitting = true;
        app.quit();
      },
    },
  );

  tray.setContextMenu(Menu.buildFromTemplate(menuItems));
}

export function getMainWindow() {
  return mainWindow;
}
