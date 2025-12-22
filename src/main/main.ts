import { app, BrowserWindow } from "electron";
import path from "path";
import { ensureAppData, loadConfig, getConfig } from "./config";
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

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let activeAccountId: string | null = null;

function devLog(...args: unknown[]) {
  if (isDev) {
    console.log(...args);
  }
}

const STATS_REFRESH_INTERVAL_MS = 60000;
const INITIAL_STATS_REFRESH_DELAY_MS = 5000;

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

    await app.whenReady();
    devLog("App ready");
    await ensureAppData();
    await loadConfig();

    // Register IPC handlers before window creation
    setupIpcHandlers(null, {
      launchGame,
      setAutoStart,
      getAutoStartStatus,
      getStatus,
    });

    mainWindow = createWindow(isDev);

    // Check if we should start minimized
    const isMinimized = process.argv.includes("--minimized");
    if (!isMinimized && !isDev) {
      mainWindow?.once("ready-to-show", () => {
        mainWindow?.show();
      });
    } else if (!isMinimized && isDev) {
      // In dev we show immediately via createWindow
      mainWindow?.focus();
    }

    const switchAccountTrigger = async (id: string) => {
      activeAccountId = id;
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
      activeAccountId = null;
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
      console.error("Update check failed:", err),
    );
  } catch (err) {
    console.error("App initialization failed:", err);
  }
}

app.on("window-all-closed", () => {
  const config = getConfig();
  if (process.platform !== "darwin" && !config.minimizeToTray) {
    app.quit();
  }
});

initApp().catch((err) => {
  console.error("Fatal error:", err);
});
