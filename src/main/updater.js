const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const { app } = require("electron");

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const DEV_UPDATE_NOTIF_DELAY_MS = 1500;
const DEV_SIMULATED_UPDATE_DELAY = 2000;

function setupUpdater(mainWindow) {
  autoUpdater.on("checking-for-update", () => {
    if (mainWindow) mainWindow.webContents.send("update-status", { status: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    if (mainWindow) {
      mainWindow.webContents.send("update-status", {
        status: "available",
        version: info.version,
        releaseNotes: info.releaseNotes,
      });
    }
  });

  autoUpdater.on("update-not-available", () => {
    if (mainWindow) mainWindow.webContents.send("update-status", { status: "not-available" });
  });

  autoUpdater.on("error", (err) => {
    if (mainWindow) {
      let errorMessage = "Erreur lors de la mise à jour";
      if (err.message.includes("GitHub")) {
        errorMessage = "Erreur de connexion à GitHub. Vérifiez votre connexion internet.";
      }
      mainWindow.webContents.send("update-status", {
        status: "error",
        error: errorMessage,
        details: err.message,
      });
    }
  });

  autoUpdater.on("download-progress", (progressObj) => {
    if (mainWindow) {
      mainWindow.webContents.send("update-progress", {
        percent: Math.round(progressObj.percent),
        transferred: progressObj.transferred,
        total: progressObj.total,
      });
    }
  });

  autoUpdater.on("update-downloaded", () => {
    if (mainWindow) mainWindow.webContents.send("update-downloaded");
  });
}

async function handleUpdateCheck(mainWindow) {
  if (isDev) {
    console.log("Running in development mode - update checking disabled");
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.webContents.send("update-status", {
          status: "error",
          error: "Mise à jour impossible en mode développement.",
        });
      }
    }, DEV_UPDATE_NOTIF_DELAY_MS);
    return { status: "dev" };
  } else {
    try {
      return await autoUpdater.checkForUpdatesAndNotify();
    } catch (err) {
      console.error("Initial update check failed:", err);
      throw err;
    }
  }
}

async function simulateUpdateCheck(mainWindow) {
  mainWindow.webContents.send("update-status", { status: "checking" });
  await new Promise((resolve) => setTimeout(resolve, DEV_SIMULATED_UPDATE_DELAY));

  const updateAvailable = Math.random() > 0.5;
  if (updateAvailable) {
    mainWindow.webContents.send("update-status", {
      status: "available",
      version: "9.9.9",
      releaseNotes: "Ceci est une mise à jour simulée pour le mode dev.",
    });
  } else {
    mainWindow.webContents.send("update-status", { status: "not-available" });
  }
}

module.exports = {
  setupUpdater,
  handleUpdateCheck,
  simulateUpdateCheck,
};
