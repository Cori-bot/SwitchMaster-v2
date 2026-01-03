import { app, BrowserWindow, protocol, net } from "electron";
import path from "path";
import { pathToFileURL } from "url";
import { ensureAppData, loadConfig, getConfig, loadConfigSync } from "./config";
import { devLog, devError } from "./logger";

// Capture globale des erreurs fatales (Production Stability)
process.on("uncaughtException", (err) => {
  devError("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  devError("UNHANDLED REJECTION at:", promise, "reason:", reason);
});

// Register privileged schemes for custom protocols
protocol.registerSchemesAsPrivileged([
  {
    scheme: "sm-img",
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

import { refreshAllAccountStats } from "./accounts";
import { createWindow, updateTrayMenu } from "./window";
import { setupIpcHandlers } from "./ipc";
import { setupUpdater, handleUpdateCheck } from "./updater";
import {
  monitorRiotProcess,
  launchGame,
  setAutoStart,
  getAutoStartStatus,
  getStatus,
  isValorantRunning,
} from "./appLogic";

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

const STATS_REFRESH_INTERVAL_MS = 120000;
const INITIAL_STATS_REFRESH_DELAY_MS = 5000;

// Set App Name and UserData path before any complex logic
app.name = "switchmaster";
const userDataPath = path.join(app.getPath("appData"), "switchmaster");
app.setPath("userData", userDataPath);

// Chargement synchrone de la config pour GPU
const initialConfig = loadConfigSync();
if (!initialConfig.enableGPU) {
  app.disableHardwareAcceleration();
}

// Single Instance Lock - Appel immédiat au niveau racine
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  devLog("Une autre instance est déjà en cours d'exécution. Fermeture.");
  app.quit();
} else {
  initApp().catch((err) => {
    devError("Fatal error:", err);
    app.quit();
  });

  app.on("window-all-closed", () => {
    const config = getConfig();
    if (process.platform !== "darwin" && !config.minimizeToTray) {
      app.quit();
    }
  });
}

async function initApp() {
  devLog("Démarrage de l'initialisation de l'application...");
  devLog("UserData Path:", userDataPath);

  try {
    // Set App User Model ID for Windows notifications
    if (process.platform === "win32") {
      app.setAppUserModelId("com.switchmaster.app");
    }
    devLog("Mode développement:", isDev);

    await loadConfig();
    await app.whenReady();

    // Enregistrement du protocole sm-img pour les images locales
    protocol.handle("sm-img", (request) => {
      try {
        const parsedUrl = new URL(request.url);
        let decodedPath = decodeURIComponent(
          parsedUrl.hostname + parsedUrl.pathname,
        );

        if (process.platform === "win32" && decodedPath.startsWith("/")) {
          decodedPath = decodedPath.substring(1);
        }

        const fileUrl = pathToFileURL(decodedPath).toString();
        return net.fetch(fileUrl);
      } catch (e) {
        devError(`[sm-img] Erreur pour ${request.url}:`, e);
        return new Response("Not Found", { status: 404 });
      }
    });

    await ensureAppData();

    // Register IPC handlers ALWAYS BEFORE window creation
    setupIpcHandlers(null, {
      launchGame,
      setAutoStart,
      getAutoStartStatus,
      getStatus,
      isValorantRunning,
    });

    mainWindow = createWindow(isDev);

    // Détection du mode de démarrage en arrière-plan
    const isAutoStartArg = process.argv.includes("--minimized");
    const os = require("os");
    const fs = require("fs");
    const uptime = os.uptime();
    const currentBootTime = Math.floor((Date.now() - uptime * 1000) / 60000);

    let lastBootTime = "";
    const bootFilePath = path.join(app.getPath("userData"), "last-boot.txt");
    try {
      if (fs.existsSync(bootFilePath)) {
        lastBootTime = fs.readFileSync(bootFilePath, "utf8");
      }
      fs.writeFileSync(bootFilePath, currentBootTime.toString());
    } catch (e) {
      devError("Erreur gestion boot time:", e);
    }

    const isNewSession = lastBootTime !== currentBootTime.toString();
    const isFirstRunOfSession = isNewSession && uptime < 300;
    const config = getConfig();
    const isMinimized = config.startMinimized && config.autoStart && (isAutoStartArg || isFirstRunOfSession);

    // Gestion de la deuxième instance
    app.on("second-instance", (_event, commandLine) => {
      const isSecondInstanceAuto = commandLine.includes("--minimized") || commandLine.includes("--hidden");
      if (isMinimized && isSecondInstanceAuto && uptime < 600) return;

      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    });

    if (!isMinimized) {
      if (mainWindow) {
        if (isDev) {
          mainWindow.show();
        } else {
          mainWindow.once("ready-to-show", () => {
            mainWindow?.show();
          });
          setTimeout(() => {
            if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
          }, 1000);
        }
      }
    }

    const switchAccountTrigger = async (id: string) => {
      if (mainWindow) {
        mainWindow.webContents.send("quick-connect-triggered", id);
      }
      await updateTrayMenu(launchGame, switchAccountTrigger);
    };

    (global as any).refreshTray = () => updateTrayMenu(launchGame, switchAccountTrigger);

    setupIpcHandlers(mainWindow, {
      launchGame,
      setAutoStart,
      getAutoStartStatus,
      getStatus,
      isValorantRunning,
    });

    setupUpdater(mainWindow);
    await (global as any).refreshTray();

    monitorRiotProcess(mainWindow, () => { });

    setInterval(() => refreshAllAccountStats(mainWindow), STATS_REFRESH_INTERVAL_MS);
    setTimeout(() => refreshAllAccountStats(mainWindow), INITIAL_STATS_REFRESH_DELAY_MS);

    handleUpdateCheck(mainWindow).catch((err) =>
      devError("Update check failed:", err),
    );

  } catch (err) {
    devError("App initialization failed:", err);
  }
}

app.on("window-all-closed", () => {
  const config = getConfig();
  if (process.platform !== "darwin" && !config.minimizeToTray) {
    app.quit();
  }
});
