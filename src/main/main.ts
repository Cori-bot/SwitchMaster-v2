import { app, BrowserWindow, protocol, net } from "electron";
import path from "path";
import { pathToFileURL } from "url";
import { ensureAppData, loadConfig, getConfig } from "./config";

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
} from "./appLogic";

import { devLog, devError } from "./logger";

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

const STATS_REFRESH_INTERVAL_MS = 60000;
const INITIAL_STATS_REFRESH_DELAY_MS = 5000;

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

  try {
    // Set App Name and UserData path before ready
    app.name = "switchmaster";
    const userDataPath = path.join(app.getPath("appData"), "switchmaster");
    app.setPath("userData", userDataPath);
    devLog("UserData Path:", userDataPath);

    // Set App User Model ID for Windows notifications
    if (process.platform === "win32") {
      app.setAppUserModelId("com.switchmaster.app");
    }
    devLog("Mode développement:", isDev);

    devLog("Attente de app.whenReady()...");
    await app.whenReady();
    devLog("App ready");

    // Enregistrement du protocole sm-img pour les images locales
    protocol.handle("sm-img", (request) => {
      try {
        const parsedUrl = new URL(request.url);
        // Sur Windows, si l'URL est sm-img://C:/path, hostname est "c:" et pathname est "/path"
        let decodedPath = decodeURIComponent(
          parsedUrl.hostname + parsedUrl.pathname,
        );

        // Si le chemin commence par un slash (ex: /C:/...), on l'enlève pour pathToFileURL sur Windows
        if (process.platform === "win32" && decodedPath.startsWith("/")) {
          decodedPath = decodedPath.substring(1);
        }

        const fileUrl = pathToFileURL(decodedPath).toString();
        devLog(`[sm-img] Request: ${request.url} -> Path: ${decodedPath}`);

        return net.fetch(fileUrl);
      } catch (e) {
        devError(`[sm-img] Erreur pour ${request.url}:`, e);
        return new Response("Not Found", { status: 404 });
      }
    });
    await ensureAppData();
    devLog("Chargement de la configuration...");
    await loadConfig();

    devLog("Configuration des IPC handlers (étape 1)...");
    // Register IPC handlers before window creation
    setupIpcHandlers(null, {
      launchGame,
      setAutoStart,
      getAutoStartStatus,
      getStatus,
    });

    devLog("Création de la fenêtre principale...");
    mainWindow = createWindow(isDev);
    devLog("Fenêtre créée.");

    // Gestion de la deuxième instance
    app.on("second-instance", () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    });

    // Check if we should start minimized
    const isMinimized = process.argv.includes("--minimized");
    devLog("Démarrage minimisé:", isMinimized);

    if (!isMinimized) {
      if (isDev) {
        devLog("Mode dev: focus sur la fenêtre.");
        mainWindow?.focus();
      } else {
        devLog("Mode prod: configuration de l'affichage de la fenêtre.");
        const showWindow = () => {
          devLog("Tentative d'affichage de la fenêtre (showWindow)...");
          if (mainWindow) {
            if (!mainWindow.isVisible()) {
              mainWindow.show();
              devLog("mainWindow.show() appelé.");
            }
            mainWindow.focus();
            devLog("mainWindow.focus() appelé.");
          } else {
            devLog("mainWindow est null dans showWindow.");
          }
        };

        mainWindow?.once("ready-to-show", () => {
          devLog("Événement ready-to-show reçu.");
          showWindow();
        });
        
        // Sécurité supplémentaire pour l'affichage
        mainWindow?.webContents.once("did-finish-load", () => {
          devLog("Événement did-finish-load reçu.");
          // On attend un petit peu après le chargement pour être sûr
          setTimeout(showWindow, 100);
        });

        // Sécurité ultime : si rien ne s'affiche après 5 secondes
        setTimeout(() => {
          devLog("Fallback de sécurité (5s) pour l'affichage.");
          showWindow();
        }, 5000);
      }
    }

    const switchAccountTrigger = async (_id: string) => {
      await updateTrayMenu(launchGame, switchAccountTrigger);
    };

    // Pass the actual mainWindow to handlers that need it
    setupIpcHandlers(mainWindow, {
      launchGame,
      setAutoStart,
      getAutoStartStatus,
      getStatus,
    });
    setupUpdater(mainWindow);
    await updateTrayMenu(launchGame, switchAccountTrigger);

    monitorRiotProcess(mainWindow, () => {
      // Logic when process ends
    });

    // Stats refresh
    setInterval(
      () => refreshAllAccountStats(mainWindow),
      STATS_REFRESH_INTERVAL_MS,
    );
    setTimeout(
      () => refreshAllAccountStats(mainWindow),
      INITIAL_STATS_REFRESH_DELAY_MS,
    );

    // Initial update check
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


