const { app } = require("electron");
const path = require("path");
const { ensureAppData, loadConfig, getConfig } = require("./src/main/config");
const { refreshAllAccountStats } = require("./src/main/accounts");
const { createWindow, updateTrayMenu } = require("./src/main/window");
const { setupIpcHandlers } = require("./src/main/ipc");
const { setupUpdater, handleUpdateCheck } = require("./src/main/updater");
const { monitorRiotProcess, launchGame, setAutoStart, getAutoStartStatus } = require("./src/main/appLogic");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
let mainWindow;
let activeAccountId = null;

async function initApp() {
  try {
    await app.whenReady();
    await ensureAppData();
    await loadConfig();
    
    mainWindow = createWindow(isDev);
    
    const switchAccountTrigger = async (id) => {
      activeAccountId = id;
      await updateTrayMenu(launchGame, switchAccountTrigger);
    };

    setupIpcHandlers(mainWindow, launchGame, setAutoStart, getAutoStartStatus);
    setupUpdater(mainWindow);
    await updateTrayMenu(launchGame, switchAccountTrigger);

    monitorRiotProcess(mainWindow, () => {
      activeAccountId = null;
    });

    // Stats refresh
    setInterval(() => refreshAllAccountStats(mainWindow), 60000);
    setTimeout(() => refreshAllAccountStats(mainWindow), 5000);

    // Initial update check
    handleUpdateCheck(mainWindow).catch(err => console.error("Update check failed:", err));

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

initApp().catch(err => {
  console.error("Fatal error:", err);
});
