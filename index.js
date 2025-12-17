const {
  app,
  BrowserWindow,
  ipcMain,
  safeStorage,
  shell,
  dialog,
  clipboard,
  Tray,
  Menu,
} = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs-extra");
const yaml = require("yaml");
const chokidar = require("chokidar");
const crypto = require("crypto");
const { fetchAccountStats } = require("./statsService");
const { spawn, exec } = require("child_process");

// Set user data path to a local directory to avoid permission issues
const userDataPath = path.join(app.getAppPath(), "..\\app-data");
app.setPath("userData", userDataPath);

// --- Constants & Paths ---
const WINDOW_DEFAULT_HEIGHT = 700;
const WINDOW_DEFAULT_WIDTH = 1000;
const WINDOW_MIN_HEIGHT = 600;
const WINDOW_MIN_WIDTH = 600;
const RIOT_PROCESS_CHECK_INTERVAL = 5000; // 5 seconds
const PROCESS_TERMINATION_DELAY = 2000; // 2 seconds
const STATS_REFRESH_INTERVAL_MS = 60000; // 1 minute
const MAX_WINDOW_CHECK_ATTEMPTS = 30;
const GAME_LAUNCH_DELAY_MS = 10000; // 10 seconds

const APP_DATA_PATH = app.getPath("userData");
const ACCOUNTS_FILE = path.join(APP_DATA_PATH, "accounts.json");
const CONFIG_FILE = path.join(APP_DATA_PATH, "config.json");
const DEFAULT_RIOT_DATA_PATH =
  "C:\\Riot Games\\Riot Client\\RiotClientServices.exe";
const PRIVATE_SETTINGS_FILE = "RiotClientPrivateSettings.yaml";

// Get scripts path (works in both dev and production)
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const SCRIPTS_PATH = isDev
  ? path.join(__dirname, "assets", "scripts")
  : path.join(process.resourcesPath, "scripts");

// Ensure User Data Directory Exists
fs.ensureDirSync(APP_DATA_PATH);

// Verify scripts exist
const automateLoginScript = path.join(SCRIPTS_PATH, "automate_login.ps1");
const detectGamesScript = path.join(SCRIPTS_PATH, "detect_games.ps1");

if (!fs.existsSync(automateLoginScript)) {
  console.error(`Automation script not found: ${automateLoginScript}`);
}
if (!fs.existsSync(detectGamesScript)) {
  console.error(`Detection script not found: ${detectGamesScript}`);
}

let mainWindow;
let tray = null;
let riotDataPath = DEFAULT_RIOT_DATA_PATH;
let appConfig = {
  riotPath: DEFAULT_RIOT_DATA_PATH,
  theme: "dark",
  showLogs: true,
  minimizeToTray: true,
  showQuitModal: true,
  autoStart: false,
  lastAccountId: null,
  security: {
    enabled: false,
    pinHash: null,
  },
};

// ... (keep existing code matches)

// --- Security Functions ---
function hashPin(pin) {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

// ... (at the end of IPC handlers section)

// 8. Security IPC
ipcMain.handle("verify-pin", async (event, pin) => {
  if (!appConfig.security.enabled) return true;

  // Simple SHA256 hash comparison
  const hashed = hashPin(pin);
  return hashed === appConfig.security.pinHash;
});

ipcMain.handle("set-pin", async (event, pin) => {
  const hashed = hashPin(pin);
  appConfig.security = {
    enabled: true,
    pinHash: hashed,
  };
  await saveConfig(appConfig);
  return true;
});

ipcMain.handle("disable-pin", async (event) => {
  appConfig.security = {
    enabled: false,
    pinHash: null,
  };
  await saveConfig(appConfig);
  return true;
});

ipcMain.handle("select-image", async () => {
  const imageDialogResult = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "Images", extensions: ["jpg", "png", "gif", "jpeg", "webp"] },
    ],
  });
  if (imageDialogResult.canceled || imageDialogResult.filePaths.length === 0)
    return null;
  return imageDialogResult.filePaths[0];
});

// 9. Check Security Enabled
ipcMain.handle("check-security-enabled", () => {
  return appConfig.security && appConfig.security.enabled;
});

let activeAccountId = null;

// --- Helper Functions ---

// Ouvrir un lien externe de manière sécurisée (HTTP/HTTPS uniquement)
function openExternalSafe(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      shell.openExternal(url);
    } else {
      console.warn("Blocked external URL with invalid protocol:", url);
    }
  } catch (e) {
    console.error("Invalid external URL:", url, e);
  }
}

async function loadConfig() {
  try {
    if (await fs.pathExists(CONFIG_FILE)) {
      const savedConfig = await fs.readJson(CONFIG_FILE);
      appConfig = { ...appConfig, ...savedConfig };
      riotDataPath = appConfig.riotPath;
    }
  } catch (e) {
    console.error("Error loading config:", e);
  }
}

async function saveConfig(newConfig) {
  appConfig = { ...appConfig, ...newConfig };
  riotDataPath = appConfig.riotPath;
  try {
    await fs.outputJson(CONFIG_FILE, appConfig, { spaces: 2 });
  } catch (e) {
    console.error("Error saving config:", e);
  }
}

// Secure Encryption/Decryption
function encryptData(data) {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(data).toString("base64");
  } else {
    return Buffer.from(data).toString("base64");
  }
}

function decryptData(encryptedData) {
  if (safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(encryptedData, "base64"));
    } catch (e) {
      console.error("Decryption failed:", e);
      return null;
    }
  } else {
    return Buffer.from(encryptedData, "base64").toString("utf-8");
  }
}

// Load/Save Accounts Metadata
async function loadAccountsMeta() {
  try {
    if (await fs.pathExists(ACCOUNTS_FILE)) {
      return await fs.readJson(ACCOUNTS_FILE);
    }
  } catch (e) {
    console.error("Error loading accounts:", e);
  }
  return [];
}

async function saveAccountsMeta(accounts) {
  try {
    await fs.outputJson(ACCOUNTS_FILE, accounts, { spaces: 2 });
  } catch (e) {
    console.error("Error saving accounts:", e);
  }
}

// --- Main Window ---
function createWindow() {
  mainWindow = new BrowserWindow({
    width: WINDOW_DEFAULT_WIDTH,
    height: WINDOW_DEFAULT_HEIGHT,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    webPreferences: {
      // Nouveau modèle sécurisé : pas de nodeIntegration, preload isolé
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
    },
    backgroundColor: "#121212",
    frame: true,
    autoHideMenuBar: true,
    devTools: isDev,
    icon: path.join(__dirname, "assets", "logo.png"),
  });

  mainWindow.loadFile("index.html");

  // Sécuriser la navigation : empêcher les navigations internes vers des URLs externes
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      openExternalSafe(url);
    }
  });

  // Empêcher l'ouverture de nouvelles fenêtres non contrôlées
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalSafe(url);
    return { action: "deny" };
  });

  // Handle window close event
  mainWindow.on("close", (event) => {
    // Allow quit if explicitly requested
    if (app.isQuitting) {
      return;
    }

    if (appConfig.showQuitModal) {
      event.preventDefault();
      mainWindow.webContents.send("show-quit-modal");
    } else {
      if (appConfig.minimizeToTray) {
        event.preventDefault();
        mainWindow.hide();
      }
      // If minimizeToTray is false, allow default quit behavior
    }
  });
}

// --- System Tray ---
async function updateTrayMenu() {
  if (!tray) {
    const iconPath = path.join(__dirname, "assets", "logo.png");
    tray = new Tray(iconPath);
    tray.setToolTip("SwitchMaster");

    // Click on tray icon to show window
    tray.on("click", () => {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }

  // Build menu items
  const menuItems = [
    {
      label: "Afficher SwitchMaster",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: "separator" },
    {
      label: "Lancer League of Legends",
      click: () => launchGame("league"),
    },
    {
      label: "Lancer Valorant",
      click: () => launchGame("valorant"),
    },
  ];

  // Add quick connect if there's a last account
  if (appConfig.lastAccountId) {
    try {
      const accounts = await loadAccountsMeta();
      const lastAccount = accounts.find(
        (a) => a.id === appConfig.lastAccountId,
      );
      if (lastAccount) {
        menuItems.push(
          { type: "separator" },
          {
            label: `Connecter: ${lastAccount.name}`,
            click: async () => {
              try {
                // Trigger the switch account handler
                await ipcMain.emit("switch-account-trigger", lastAccount.id);
                mainWindow.webContents.send(
                  "quick-connect-triggered",
                  lastAccount.id,
                );
              } catch (err) {
                console.error("Quick connect error:", err);
              }
            },
          },
        );
      }
    } catch (err) {
      console.error("Error loading accounts for tray menu:", err);
    }
  }

  // Add quit button
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

// --- Process Monitoring ---
function monitorRiotProcess() {
  setInterval(() => {
    if (!activeAccountId) return;

    exec(
      'tasklist /FI "IMAGENAME eq RiotClientServices.exe" /FO CSV',
      (err, stdout) => {
        if (err) return;
        // stdout will contain "No tasks are running" or similar if not found,
        // or the CSV header + process line if found.
        // Simplest check: does it include the exe name in a data line?
        // "INFO: No tasks are running"

        if (!stdout.includes("RiotClientServices.exe")) {
          console.log("Riot Client closed. Resetting active status.");
          activeAccountId = null;

          // Notifier le renderer pour qu'il enlève la bordure verte / statut actif
          if (mainWindow) {
            mainWindow.webContents.send("riot-client-closed");
          }
        }
      },
    );
  }, RIOT_PROCESS_CHECK_INTERVAL);
}

// --- Auto-start functionality
function setAutoStart(enable) {
  try {
    // For electron-builder, we need to handle both dev and production cases
    const settings = {
      openAtLogin: enable,
    };

    // In production (packaged app), electron-builder handles the path automatically
    // In development, we need to specify the electron executable
    if (!app.isPackaged) {
      settings.path = process.execPath;
      // Also specify args for development
      settings.args = ["."];
    }

    app.setLoginItemSettings(settings);
    console.log(`Auto-start ${enable ? "enabled" : "disabled"}`);

    // Verify the setting was applied
    const currentSettings = app.getLoginItemSettings();
    console.log("Current login item settings:", currentSettings);
  } catch (error) {
    console.error("Error setting auto-start:", error);
  }
}

// --- Auto Updater ---
autoUpdater.logger = require("electron-log");
autoUpdater.logger.transports.file.level = "info";
autoUpdater.logger.info("App starting...");

// Debug: Show update configuration
console.log("Update configuration:", {
  isPackaged: app.isPackaged,
  version: app.getVersion(),
  repo: "Cori-bot/SwitchMaster-electron",
});

autoUpdater.on("checking-for-update", () => {
  console.log("Checking for update...");
  autoUpdater.logger.info("Checking for update...");
  if (mainWindow) {
    mainWindow.webContents.send("update-status", { status: "checking" });
  }
});

autoUpdater.on("update-available", (info) => {
  console.log("Update available:", info);
  if (mainWindow) {
    mainWindow.webContents.send("update-status", {
      status: "available",
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  }
});

autoUpdater.on("update-not-available", (info) => {
  console.log("Update not available:", info);
  if (mainWindow) {
    mainWindow.webContents.send("update-status", { status: "not-available" });
  }
});

autoUpdater.on("error", (err) => {
  console.error("Update error:", err);
  if (mainWindow) {
    let errorMessage = "Erreur lors de la mise à jour";

    if (err.message.includes("GitHub")) {
      errorMessage =
        "Erreur de connexion à GitHub. Vérifiez votre connexion internet.";
    } else if (err.message.includes("404")) {
      errorMessage = "Aucune mise à jour trouvée sur GitHub.";
    } else if (err.message.includes("ENOENT")) {
      errorMessage = "Fichier de mise à jour introuvable.";
    }

    mainWindow.webContents.send("update-status", {
      status: "error",
      error: errorMessage,
      details: err.message,
    });
  }
});

autoUpdater.on("download-progress", (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + " - Downloaded " + progressObj.percent + "%";
  log_message =
    log_message +
    " (" +
    progressObj.transferred +
    "/" +
    progressObj.total +
    ")";
  console.log(log_message);
  if (mainWindow) {
    mainWindow.webContents.send("update-progress", {
      percent: Math.round(progressObj.percent),
      transferred: progressObj.transferred,
      total: progressObj.total,
    });
  }
});

autoUpdater.on("update-downloaded", (info) => {
  console.log("Update downloaded");
  if (mainWindow) {
    mainWindow.webContents.send("update-downloaded");
  }
});

app.whenReady().then(async () => {
  await loadConfig();
  createWindow();
  updateTrayMenu();

  // Start process monitoring if function exists
  if (typeof monitorRiotProcess === "function") {
    monitorRiotProcess();
  } else {
    console.warn("monitorRiotProcess function not found");
  }

  // Initial and periodic stats refresh
  refreshAllAccountStats(); // Initial refresh
  setInterval(refreshAllAccountStats, STATS_REFRESH_INTERVAL_MS); // Refresh every minute

  const settingsPath = path.join(riotDataPath, PRIVATE_SETTINGS_FILE);
  if (fs.existsSync(riotDataPath)) {
    chokidar.watch(settingsPath).on("change", () => {
      // Optional: Notify renderer
    });
  }

  // Check for updates on startup
  if (!app.isPackaged) {
    console.log("Running in development mode - update checking disabled");
  } else {
    console.log("Production mode - checking for updates...");
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error("Initial update check failed:", err);
    });
  }
});

app.on("window-all-closed", () => {
  // Don't quit on window close if minimizing to tray
  if (process.platform !== "darwin" && !appConfig.minimizeToTray) {
    app.quit();
  }
});

// --- IPC Handlers ---

// 1. Get Accounts
ipcMain.handle("get-accounts", async () => {
  return await loadAccountsMeta();
});

// Get account with decrypted credentials (for editing)
ipcMain.handle("get-account-credentials", async (event, accountId) => {
  const accounts = await loadAccountsMeta();
  const account = accounts.find((a) => a.id === accountId);

  if (!account) throw new Error("Account not found.");

  // Decrypt credentials
  const decryptedAccount = {
    ...account,
    username: decryptData(account.username),
    password: decryptData(account.password),
  };

  return decryptedAccount;
});

// 2. Add Account (with credentials)
ipcMain.handle(
  "add-account",
  async (event, { name, username, password, riotId, gameType, cardImage }) => {
    const id = crypto.randomUUID();

    // Encrypt credentials
    const encryptedUsername = encryptData(username);
    const encryptedPassword = encryptData(password);

    const newAccount = {
      id,
      name,
      username: encryptedUsername,
      password: encryptedPassword,
      riotId: riotId || null,
      gameType: gameType || "valorant",
      cardImage: cardImage || null, // Save the image path
      timestamp: Date.now(),
      stats: null,
    };

    const accounts = await loadAccountsMeta();
    accounts.push(newAccount);

    // Rafraîchir immédiatement les stats (rank) si un Riot ID est présent
    if (newAccount.riotId) {
      try {
        const stats = await fetchAccountStats(
          newAccount.riotId,
          newAccount.gameType,
        );
        newAccount.stats = stats;
      } catch (err) {
        console.error("Error fetching stats on add-account:", err);
      }
    }

    await saveAccountsMeta(accounts);

    return newAccount;
  },
);

// 2b. Update Account (In-place to preserve order)
ipcMain.handle(
  "update-account",
  async (
    event,
    { id, name, username, password, riotId, gameType, cardImage },
  ) => {
    const accounts = await loadAccountsMeta();
    const index = accounts.findIndex((a) => a.id === id);

    if (index === -1) throw new Error("Compte introuvable");

    // Keep existing timestamp/stats si non modifiés
    const existing = accounts[index];

    // Encrypt credentials (le renderer envoie du texte en clair)
    const encryptedUsername = encryptData(username);
    const encryptedPassword = encryptData(password);

    const updatedAccount = {
      ...existing,
      name,
      username: encryptedUsername,
      password: encryptedPassword,
      riotId: riotId || null,
      gameType: gameType || "valorant",
      cardImage: cardImage || existing.cardImage, // Preserve if not sent, or update
    };

    // Rafraîchir immédiatement les stats (rank) si un Riot ID est présent
    if (updatedAccount.riotId) {
      try {
        const stats = await fetchAccountStats(
          updatedAccount.riotId,
          updatedAccount.gameType,
        );
        updatedAccount.stats = stats;
      } catch (err) {
        console.error("Error fetching stats on update-account:", err);
      }
    }

    accounts[index] = updatedAccount;
    await saveAccountsMeta(accounts);
    return updatedAccount;
  },
);

// 2c. Reorder Accounts
ipcMain.handle("reorder-accounts", async (event, newOrderIds) => {
  const accounts = await loadAccountsMeta();

  // Sort accounts array based on the newOrderIds array
  // newOrderIds should be an array of IDs in the desired order
  const reorderedMap = new Map(accounts.map((a) => [a.id, a]));
  const reorderedAccounts = [];

  // Add existing accounts in the new order
  for (const id of newOrderIds) {
    if (reorderedMap.has(id)) {
      reorderedAccounts.push(reorderedMap.get(id));
      reorderedMap.delete(id);
    }
  }

  // Safety: append any accounts that might have been missing from the input list (shouldn't happen but good for safety)
  for (const acc of reorderedMap.values()) {
    reorderedAccounts.push(acc);
  }

  await saveAccountsMeta(reorderedAccounts);
  return true;
});

// 3. Delete Account
ipcMain.handle("delete-account", async (event, accountId) => {
  let accounts = await loadAccountsMeta();
  accounts = accounts.filter((a) => a.id !== accountId);
  await saveAccountsMeta(accounts);
  return true;
});

// --- Stats Refresh ---
async function refreshAllAccountStats() {
  const accounts = await loadAccountsMeta();
  let hasChanged = false;

  for (const account of accounts) {
    if (account.riotId) {
      try {
        const newStats = await fetchAccountStats(
          account.riotId,
          account.gameType,
        );
        // Check if stats have actually changed to avoid unnecessary writes
        if (JSON.stringify(account.stats) !== JSON.stringify(newStats)) {
          account.stats = newStats;
          hasChanged = true;
        }
      } catch (err) {
        console.error(
          `Failed to refresh stats for ${account.name}:`,
          err.message,
        );
      }
    }
  }

  if (hasChanged) {
    await saveAccountsMeta(accounts);
    if (mainWindow) {
      mainWindow.webContents.send("accounts-updated", accounts);
    }
  }
}

// 4. Select Riot Path
ipcMain.handle("select-riot-path", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Sélectionner l'exécutable Riot Client",
    filters: [{ name: "Executables", extensions: ["exe"] }],
    properties: ["openFile"],
  });
  if (canceled || filePaths.length === 0) {
    return null;
  }
  return filePaths[0];
});

// 4b. Auto Detect Paths
ipcMain.handle("auto-detect-paths", async () => {
  try {
    const psScript = path.join(SCRIPTS_PATH, "detect_games.ps1");

    return new Promise((resolve, reject) => {
      const ps = spawn("powershell.exe", [
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        psScript,
      ]);
      let output = "";
      let errorOutput = "";

      ps.stdout.on("data", (d) => (output += d.toString()));
      ps.stderr.on("data", (d) => (errorOutput += d.toString()));

      ps.on("close", (code) => {
        if (code !== 0) {
          console.error("Detection PS failed:", errorOutput);
          resolve(null); // Return null on failure, don't crash
          return;
        }

        try {
          const detectionResults = JSON.parse(output);
          // Find Riot Client
          const riotEntry = detectionResults.find(
            (item) =>
              item.DisplayName && item.DisplayName.includes("Riot Client"),
          );
          let riotPath = null;
          if (riotEntry && riotEntry.InstallLocation) {
            riotPath = path.join(
              riotEntry.InstallLocation,
              "RiotClientServices.exe",
            );
            if (fs.existsSync(riotPath)) return resolve({ riotPath });
          }

          // Fallback search or just return what we have
          resolve(null);
        } catch (e) {
          console.error("JSON Parse error in detection:", e);
          resolve(null);
        }
      });
    });
  } catch (e) {
    console.error("Auto detect error:", e);
    return null;
  }
});

// 5. Switch Account (with automation)
ipcMain.handle("switch-account", async (event, id) => {
  const accounts = await loadAccountsMeta();
  const account = accounts.find((a) => a.id === id);

  if (!account) throw new Error("Account not found.");

  // Decrypt credentials
  const username = decryptData(account.username);
  const password = decryptData(account.password);

  console.log(`Switching to account: ${account.name}`);

  // Kill Riot Processes
  try {
    console.log("Killing existing Riot processes...");
    await new Promise((resolve) => {
      exec(
        'taskkill /F /IM "RiotClientServices.exe" /IM "LeagueClient.exe" /IM "VALORANT.exe"',
        () => resolve(),
      );
    });
    await new Promise((r) => setTimeout(r, PROCESS_TERMINATION_DELAY));
  } catch (e) {
    console.log("Processes cleanup err:", e.message);
  }

  // Launch Riot Client
  let clientPath = appConfig.riotPath || DEFAULT_RIOT_DATA_PATH;
  if (!clientPath.endsWith(".exe")) {
    clientPath = path.join(clientPath, "RiotClientServices.exe");
  }

  console.log("Launching Riot Client from:", clientPath);
  if (fs.existsSync(clientPath)) {
    const child = spawn(clientPath, [], { detached: true, stdio: "ignore" });
    child.unref();
  } else {
    throw new Error("Riot Client executable not found at: " + clientPath);
  }

  // Automation
  try {
    const psScript = path.join(SCRIPTS_PATH, "automate_login.ps1");

    // Helper to run PS
    const runPs = (action) => {
      return new Promise((resolve, reject) => {
        const ps = spawn("powershell.exe", [
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          psScript,
          "-Action",
          action,
        ]);
        let output = "";
        ps.stdout.on("data", (d) => (output += d.toString()));
        ps.on("close", (code) => {
          if (code === 0) resolve(output);
          else reject(new Error(`PS Action ${action} failed`));
        });
      });
    };

    // Wait for window (polling)
    console.log("Waiting for window...");
    let attempts = 0;
    let isWindowFound = false;
    while (attempts < MAX_WINDOW_CHECK_ATTEMPTS) {
      try {
        const check = await runPs("Check");
        if (check && check.includes("Found")) {
          isWindowFound = true;
          break;
        }
      } catch (e) {
        /*ignore*/
      }
      await new Promise((r) => setTimeout(r, 1000));
      attempts++;
    }

    if (!isWindowFound) throw new Error("Riot Client window not detected.");
    console.log("Window found. Performing Login...");

    clipboard.writeText(username);
    await runPs("PasteTab");
    clipboard.clear();

    await new Promise((r) => setTimeout(r, 500));

    clipboard.writeText(password);
    await runPs("PasteEnter");
    clipboard.clear();
  } catch (err) {
    console.error("Automation error:", err);
    throw err;
  }

  activeAccountId = id;
  appConfig.lastAccountId = id;
  await saveConfig(appConfig);
  updateTrayMenu(); // Update tray menu with new last account
  return { success: true };
});

// Helper function to launch game
async function launchGame(gameId) {
  let clientPath =
    appConfig.riotPath || "C:\\Riot Games\\Riot Client\\RiotClientServices.exe";
  if (!clientPath.endsWith(".exe")) {
    clientPath = path.join(clientPath, "RiotClientServices.exe");
  }

  if (!(await fs.pathExists(clientPath))) {
    throw new Error("Riot Client Executable not found.");
  }

  // Wait 10 seconds before launching the game (let the client fully connect)
  await new Promise((resolve) => setTimeout(resolve, 10000));

  let args = [];
  if (gameId === "valorant") {
    args = ["--launch-product=valorant", "--launch-patchline=live"];
  } else if (gameId === "league") {
    args = ["--launch-product=league_of_legends", "--launch-patchline=live"];
  }

  spawn(clientPath, args, { detached: true, stdio: "ignore" }).unref();
}

// 6. Launch Game
ipcMain.handle("launch-game", async (event, gameId) => {
  await launchGame(gameId);
  return true;
});

// 7. Get Current Status
ipcMain.handle("get-status", async () => {
  if (activeAccountId) {
    return { status: "Active", accountId: activeAccountId };
  }
  return { status: "Ready" };
});

// 8. Settings IPC
ipcMain.handle("get-config", () => appConfig);

ipcMain.handle("save-config", async (event, config) => {
  await saveConfig(config);
  return true;
});

// 9. Fetch Account Stats
ipcMain.handle("fetch-account-stats", async (event, accountId) => {
  try {
    const accounts = await loadAccountsMeta();
    const account = accounts.find((a) => a.id === accountId);

    if (!account) {
      throw new Error("Account not found");
    }

    if (!account.riotId) {
      throw new Error("Riot ID is required to fetch stats");
    }

    const stats = await fetchAccountStats(account.riotId, account.gameType);

    // Update account with stats
    account.stats = stats;
    await saveAccountsMeta(accounts);

    return stats;
  } catch (error) {
    console.error("Error fetching account stats:", error);
    throw error;
  }
});

ipcMain.handle("update-account-stats", async (event, accountId, stats) => {
  try {
    const accounts = await loadAccountsMeta();
    const account = accounts.find((a) => a.id === accountId);

    if (!account) {
      throw new Error("Account not found");
    }

    account.stats = stats;
    await saveAccountsMeta(accounts);

    return true;
  } catch (error) {
    console.error("Error updating account stats:", error);
    throw error;
  }
});

// 10. Handle Quit Modal Choice
ipcMain.handle(
  "handle-quit-choice",
  async (event, { action, dontShowAgain }) => {
    if (dontShowAgain) {
      appConfig.showQuitModal = false;
      await saveConfig(appConfig);
    }

    if (action === "quit") {
      app.isQuitting = true;
      app.quit();
    } else if (action === "minimize") {
      mainWindow.hide();
    }
    // action === 'cancel' does nothing

    return true;
  },
);

// 11. Set Auto-Start
ipcMain.handle("set-auto-start", async (event, enable) => {
  setAutoStart(enable);
  return true;
});

// 12. Get Auto-Start Status
ipcMain.handle("get-auto-start-status", () => {
  try {
    const settings = app.getLoginItemSettings();
    return {
      enabled: settings.openAtLogin || false,
      wasOpenedAtLogin: settings.wasOpenedAtLogin || false,
    };
  } catch (error) {
    console.error("Error getting auto-start status:", error);
    return { enabled: false, wasOpenedAtLogin: false };
  }
});

// 13. Check for Updates
ipcMain.handle("check-for-updates", async () => {
  try {
    if (!app.isPackaged) {
      // In development, simulate update check
      console.log("Development mode - simulating update check");
      mainWindow.webContents.send("update-status", { status: "not-available" });
      return {
        status: "not-available",
        message: "Development mode - update checking simulated",
      };
    }
    await autoUpdater.checkForUpdatesAndNotify();
    return { status: "checking" };
  } catch (error) {
    console.error("Update check failed:", error);
    throw error;
  }
});

// 14. Install Update
ipcMain.handle("install-update", async () => {
  try {
    autoUpdater.quitAndInstall();
    return true;
  } catch (error) {
    console.error("Install update failed:", error);
    throw error;
  }
});
