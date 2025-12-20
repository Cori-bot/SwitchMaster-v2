const { BrowserWindow, Tray, Menu, app, shell } = require("electron");
const path = require("path");
const { getConfig, saveConfig } = require("./config");
const { loadAccountsMeta } = require("./accounts");

let mainWindow;
let tray = null;

function createWindow(isDev) {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 600,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "..", "..", "preload.js"),
    },
    backgroundColor: "#121212",
    frame: true,
    autoHideMenuBar: true,
    devTools: isDev,
    icon: path.join(__dirname, "..", "..", "assets", "logo.png"),
  });

  mainWindow.loadFile("index.html");

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
    if (app.isQuitting) return;
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

async function updateTrayMenu(launchGame, switchAccountTrigger) {
  const iconPath = path.join(__dirname, "..", "..", "assets", "logo.png");
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
  const menuItems = [
    { label: "Afficher SwitchMaster", click: () => mainWindow.show() },
    { type: "separator" },
    { label: "Lancer League of Legends", click: () => launchGame("league") },
    { label: "Lancer Valorant", click: () => launchGame("valorant") },
  ];

  if (config.lastAccountId) {
    const accounts = await loadAccountsMeta();
    const lastAccount = accounts.find((a) => a.id === config.lastAccountId);
    if (lastAccount) {
      menuItems.push({ type: "separator" }, {
        label: `Connecter: ${lastAccount.name}`,
        click: async () => {
          await switchAccountTrigger(lastAccount.id);
          mainWindow.webContents.send("quick-connect-triggered", lastAccount.id);
        },
      });
    }
  }

  menuItems.push(
    { type: "separator" },
    {
      label: "Quitter",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  );

  tray.setContextMenu(Menu.buildFromTemplate(menuItems));
}

function getMainWindow() {
  return mainWindow;
}

module.exports = {
  createWindow,
  updateTrayMenu,
  getMainWindow,
};
