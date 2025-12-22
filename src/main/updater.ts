import { autoUpdater } from "electron-updater";
import log from "electron-log";
import { app, Notification, BrowserWindow } from "electron";
import path from "path";

autoUpdater.logger = log;
(autoUpdater.logger as any).transports.file.level = "info";
autoUpdater.autoDownload = false; // Disable auto-download

// Configuration des notifications système en français
autoUpdater.fullChangelog = true;

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const DEV_SIMULATED_UPDATE_DELAY = 2000;

export function setupUpdater(mainWindow: BrowserWindow | null) {
  autoUpdater.on("checking-for-update", () => {
    if (mainWindow)
      mainWindow.webContents.send("update-status", { status: "checking" });
  });

  autoUpdater.on("update-available", (info) => {
    if (mainWindow) {
      mainWindow.webContents.send("update-status", {
        status: "available",
        version: info.version,
        releaseNotes: info.releaseNotes,
      });
    }

    // Notification système personnalisée en français
    const notification = new Notification({
      title: "Mise à jour disponible",
      body: `Une nouvelle version (${info.version}) de SwitchMaster est disponible !`,
      icon: path.join(__dirname, "..", "assets", "logo.png"),
    });
    notification.show();
    notification.on("click", () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  });

  autoUpdater.on("update-not-available", () => {
    if (mainWindow)
      mainWindow.webContents.send("update-status", { status: "not-available" });
  });

  autoUpdater.on("error", (err) => {
    if (mainWindow) {
      let errorMessage = "Erreur lors de la mise à jour";
      if (err.message.includes("GitHub")) {
        errorMessage =
          "Erreur de connexion à GitHub. Vérifiez votre connexion internet.";
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

  autoUpdater.on("update-downloaded", (info) => {
    if (mainWindow) mainWindow.webContents.send("update-downloaded");

    // Notification système personnalisée en français
    const notification = new Notification({
      title: "Mise à jour prête",
      body: `La version ${info.version} a été téléchargée et est prête à être installée.`,
      icon: path.join(__dirname, "..", "assets", "logo.png"),
    });
    notification.show();
    notification.on("click", () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  });
}

export async function handleUpdateCheck(
  mainWindow: BrowserWindow | null,
  isManual: boolean = false,
) {
  if (isDev) {
    await simulateUpdateCheck(mainWindow, isManual);
    return { status: "dev" };
  } else {
    try {
      if (mainWindow) {
        mainWindow.webContents.send("update-status", {
          status: "checking",
          isManual,
        });
      }
      return await autoUpdater.checkForUpdates();
    } catch (err) {
      console.error("Initial update check failed:", err);
      if (mainWindow && isManual) {
        mainWindow.webContents.send("update-status", {
          status: "error",
          error: "Impossible de vérifier les mises à jour.",
          isManual: true,
        });
      }
      throw err;
    }
  }
}

export async function simulateUpdateCheck(
  mainWindow: BrowserWindow | null,
  isManual: boolean = false,
) {
  mainWindow?.webContents.send("update-status", {
    status: "checking",
    isManual,
  });
  await new Promise((resolve) =>
    setTimeout(resolve, DEV_SIMULATED_UPDATE_DELAY),
  );

  // En mode auto, on simule souvent "pas de mise à jour" pour ne pas déranger
  // En mode manuel, on simule une mise à jour 50% du temps
  const updateAvailable = isManual ? Math.random() > 0.5 : false;

  if (updateAvailable) {
    mainWindow?.webContents.send("update-status", {
      status: "available",
      version: "9.9.9",
      releaseNotes: "Ceci est une mise à jour simulée pour le mode dev.",
      isManual,
    });
  } else {
    mainWindow?.webContents.send("update-status", {
      status: "not-available",
      isManual,
    });
  }
}

export async function downloadUpdate() {
  if (isDev) {
    return;
  }
  return await autoUpdater.downloadUpdate();
}

export function installUpdate() {
  if (isDev) {
    app.relaunch();
    app.exit();
    return;
  }
  autoUpdater.quitAndInstall();
}
