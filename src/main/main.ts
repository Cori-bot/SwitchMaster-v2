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

// Set App Name and UserData path before any complex logic
app.name = "switchmaster";
const userDataPath = path.join(app.getPath("appData"), "switchmaster");
app.setPath("userData", userDataPath);

async function initApp() {
  devLog("Démarrage de l'initialisation de l'application...");
  devLog("UserData Path:", userDataPath);

  try {

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

    devLog("Configuration des IPC handlers...");
    // Register IPC handlers ALWAYS BEFORE window creation
    setupIpcHandlers(null, {
      launchGame,
      setAutoStart,
      getAutoStartStatus,
      getStatus,
    });

    devLog("Création de la fenêtre principale...");
    mainWindow = createWindow(isDev);
    devLog("Fenêtre créée.");

    // Détection du mode de démarrage en arrière-plan (v4 hybride)
    // 1. Détection via argument CLI (fiable si le registre est bien lu)
    const isAutoStartArg = process.argv.includes("--minimized");

    // 2. Détection via "Identifiant de Session" (basé sur l'uptime Windows)
    // On calcule l'heure approximative du boot (à la minute près)
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
      // Sauvegarder le boot time actuel pour les prochains lancements
      fs.writeFileSync(bootFilePath, currentBootTime.toString());
    } catch (e) {
      devError("Erreur gestion boot time:", e);
    }

    const isNewSession = lastBootTime !== currentBootTime.toString();
    // On considère que c'est un démarrage auto si c'est la 1ère fois de la session
    // et que le PC a démarré il y a moins de 5 minutes.
    const isFirstRunOfSession = isNewSession && uptime < 300;

    const config = getConfig();
    const isMinimized = config.startMinimized && config.autoStart && (isAutoStartArg || isFirstRunOfSession);

    devLog("Arguments:", process.argv);
    devLog("isAutoStartArg:", isAutoStartArg);
    devLog("Windows uptime:", uptime);
    devLog("isFirstRunOfSession:", isFirstRunOfSession);
    devLog("config.startMinimized:", config.startMinimized);
    devLog("Décision Démarrage en arrière-plan:", isMinimized);

    // Gestion de la deuxième instance
    app.on("second-instance", (_event, commandLine) => {
      devLog("Seconde instance détectée avec arguments:", commandLine);

      // Protection anti-réveil auto : 
      // Si l'app actuelle a démarré réduite ET que la nouvelle instance a aussi le flag --minimized
      // ET que le PC a démarré il y a peu de temps, on ignore l'affichage.
      const isSecondInstanceAuto = commandLine.includes("--minimized") || commandLine.includes("--hidden");
      if (isMinimized && isSecondInstanceAuto && uptime < 600) {
        devLog("Appel second-instance ignoré (Démarrage auto en cours).");
        return;
      }

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
          // En prod, on attend que la fenêtre soit prête pour éviter le flash blanc/noir
          mainWindow.once("ready-to-show", () => {
            mainWindow?.show();
          });
          // Sécurité : si ready-to-show ne vient pas (rare), on montre quand même
          setTimeout(() => {
            if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
          }, 1000);
        }
      }
    }

    const switchAccountTrigger = async (id: string) => {
      // Pour le Tray, on demande au renderer de faire le switch (qui gérera les confirmations si besoin)
      // Ou on pourrait le faire en direct ici, mais restons cohérents avec le flux UI.
      if (mainWindow) {
        mainWindow.webContents.send("quick-connect-triggered", id);
      }
      await updateTrayMenu(launchGame, switchAccountTrigger);
    };

    (global as any).refreshTray = () => updateTrayMenu(launchGame, switchAccountTrigger);

    // Pass the actual mainWindow to handlers to complete registration
    setupIpcHandlers(mainWindow, {
      launchGame,
      setAutoStart,
      getAutoStartStatus,
      getStatus,
    });
    setupUpdater(mainWindow);
    await (global as any).refreshTray();

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


