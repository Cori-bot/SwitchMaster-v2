import { BrowserWindow, Tray, Menu, app, shell } from "electron";
import path from "path";
import { devLog, devError } from "./logger";
import { ConfigService } from "./services/ConfigService";
import { AccountService } from "./services/AccountService";

let mainWindow: BrowserWindow;
let trayRef: Tray | null = null;

const DEFAULT_WIDTH = 1000;
const DEFAULT_HEIGHT = 700;
const MIN_WIDTH = 600;
const MIN_HEIGHT = 600;

export function resetWindowModuleForTests() {
  mainWindow = undefined as any;
  if (trayRef) {
    trayRef.destroy();
    trayRef = null;
  }
}

export function createWindow(
  isDev: boolean,
  configService: ConfigService,
): BrowserWindow {
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
    show: false,
    autoHideMenuBar: true,
    icon: app.isPackaged
      ? path.join(process.resourcesPath, "assets", "logo.png")
      : path.join(__dirname, "..", "..", "src", "assets", "logo.png"),
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    const indexPath = path.join(__dirname, "..", "dist", "index.html");
    devLog("Chargement du fichier index (prod):", indexPath);
    mainWindow.loadFile(indexPath).catch((err) => {
      devError("Erreur lors du chargement de index.html:", err);
    });
  }

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  if (!isDev) {
    mainWindow.webContents.on("devtools-opened", () => {
      mainWindow.webContents.closeDevTools();
    });

    mainWindow.webContents.on("before-input-event", (event, input) => {
      if (
        (input.control || input.meta) &&
        input.shift &&
        input.key.toLowerCase() === "i"
      ) {
        event.preventDefault();
      }
      if (input.key === "F12") {
        event.preventDefault();
      }
    });
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("close", (event) => {
    if ((app as any).isQuitting || (global as any).isQuitting) return;
    const config = configService.getConfig();
    if (config.showQuitModal) {
      event.preventDefault();
      if (mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send("show-quit-modal");
      }
    } else if (config.minimizeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  return mainWindow;
}

export async function updateTrayMenu(
  launchGame: (data: {
    launcherType: string;
    gameId: string;
    credentials?: any;
  }) => Promise<void>,
  switchAccountTrigger: (id: string) => Promise<void>,
  configService: ConfigService,
  accountService: AccountService,
) {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "assets", "logo.png")
    : path.join(__dirname, "..", "..", "src", "assets", "logo.png");

  if (!trayRef) {
    trayRef = new Tray(iconPath);
    trayRef.setToolTip("SwitchMaster");
    trayRef.on("click", () => {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }

  const config = configService.getConfig();
  const accounts = await accountService.getAccounts();
  const favoriteAccounts = accounts.filter((a) => a.isFavorite);

  const menuItems: Electron.MenuItemConstructorOptions[] = [
    { label: "Afficher SwitchMaster", click: () => mainWindow.show() },
    { type: "separator" },
    {
      label: "Lancer League of Legends",
      click: () => launchGame({ launcherType: "riot", gameId: "league" }),
    },
    {
      label: "Lancer Valorant",
      click: () => launchGame({ launcherType: "riot", gameId: "valorant" }),
    },
  ];

  if (favoriteAccounts.length > 0) {
    menuItems.push({ type: "separator" });
    menuItems.push({
      label: "Favoris",
      enabled: false,
    });
    favoriteAccounts.forEach((acc) => {
      menuItems.push({
        label: `⭐ ${acc.name}`,
        click: async () => {
          await switchAccountTrigger(acc.id);
          void mainWindow.webContents.send("quick-connect-triggered", acc.id);
        },
      });
    });
  }

  if (
    config.lastAccountId &&
    !favoriteAccounts.some((a) => a.id === config.lastAccountId)
  ) {
    const lastAccount = accounts.find((a) => a.id === config.lastAccountId);
    if (lastAccount) {
      menuItems.push(
        { type: "separator" },
        {
          label: `Dernier compte: ${lastAccount.name}`,
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
        (global as any).isQuitting = true;
        app.quit();
      },
    },
  );

  trayRef.setContextMenu(Menu.buildFromTemplate(menuItems));
  devLog("Tray menu updated with", favoriteAccounts.length, "favorites");
}

export function getMainWindow() {
  return mainWindow;
}
