const { ipcMain, dialog, app, crypto } = require("electron");
const { getConfig, saveConfig, encryptData, decryptData } = require("./config");
const { 
  loadAccountsMeta, 
  addAccount, 
  updateAccount, 
  deleteAccount, 
  getAccountCredentials,
  saveAccountsMeta 
} = require("./accounts");
const { 
  killRiotProcesses, 
  launchRiotClient, 
  performAutomation, 
  autoDetectPaths 
} = require("./automation");
const { handleUpdateCheck, simulateUpdateCheck } = require("./updater");
const { fetchAccountStats } = require("../../statsService");
const path = require("path");

function setupIpcHandlers(mainWindow, launchGame, setAutoStart, getAutoStartStatus) {
  // Accounts
  ipcMain.handle("get-accounts", async () => await loadAccountsMeta());
  ipcMain.handle("get-account-credentials", async (e, id) => await getAccountCredentials(id));
  ipcMain.handle("add-account", async (e, data) => await addAccount(data));
  ipcMain.handle("update-account", async (e, data) => await updateAccount(data));
  ipcMain.handle("delete-account", async (e, id) => await deleteAccount(id));
  
  ipcMain.handle("reorder-accounts", async (e, ids) => {
    const accounts = await loadAccountsMeta();
    const map = new Map(accounts.map(a => [a.id, a]));
    const reordered = ids.map(id => map.get(id)).filter(Boolean);
    accounts.forEach(a => { if (!ids.includes(a.id)) reordered.push(a); });
    await saveAccountsMeta(reordered);
    return true;
  });

  // Config
  ipcMain.handle("get-config", () => getConfig());
  ipcMain.handle("save-config", async (e, config) => {
    await saveConfig(config);
    return true;
  });

  // Riot Path
  ipcMain.handle("select-riot-path", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Sélectionner l'exécutable Riot Client",
      filters: [{ name: "Executables", extensions: ["exe"] }],
      properties: ["openFile"],
    });
    return canceled ? null : filePaths[0];
  });

  ipcMain.handle("auto-detect-paths", async () => await autoDetectPaths());

  // Switch Account
  ipcMain.handle("switch-account", async (e, id) => {
    const credentials = await getAccountCredentials(id);
    await killRiotProcesses();
    const config = getConfig();
    let clientPath = config.riotPath;
    if (!clientPath.endsWith(".exe")) clientPath = path.join(clientPath, "RiotClientServices.exe");
    
    await launchRiotClient(clientPath);
    await performAutomation(credentials.username, credentials.password);
    
    await saveConfig({ lastAccountId: id });
    return { success: true, id };
  });

  // Games
  ipcMain.handle("launch-game", async (e, gameId) => {
    await launchGame(gameId);
    return true;
  });

  // Security
  ipcMain.handle("verify-pin", async (e, pin) => {
    const config = getConfig();
    if (!config.security.enabled) return true;
    const hash = require("crypto").createHash("sha256").update(pin).digest("hex");
    return hash === config.security.pinHash;
  });

  ipcMain.handle("set-pin", async (e, pin) => {
    const hash = require("crypto").createHash("sha256").update(pin).digest("hex");
    await saveConfig({ security: { enabled: true, pinHash: hash } });
    return true;
  });

  ipcMain.handle("disable-pin", async () => {
    await saveConfig({ security: { enabled: false, pinHash: null } });
    return true;
  });

  ipcMain.handle("check-security-enabled", () => getConfig().security.enabled);

  // Misc
  ipcMain.handle("select-image", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["jpg", "png", "gif", "jpeg", "webp"] }],
    });
    return canceled ? null : filePaths[0];
  });

  ipcMain.on("log-to-main", (e, { level, args }) => {
    const prefix = `[Renderer ${level.toUpperCase()}]`;
    const msg = `${prefix} ${args.join(" ")}\n`;
    if (level === "error") process.stderr.write(msg);
    else process.stdout.write(msg);
  });

  ipcMain.handle("get-status", async () => {
    // This is simplified, real logic would track activeAccountId
    return { status: "Ready" }; 
  });

  ipcMain.handle("fetch-account-stats", async (e, id) => {
    const accounts = await loadAccountsMeta();
    const acc = accounts.find(a => a.id === id);
    if (!acc || !acc.riotId) throw new Error("Invalid account or missing Riot ID");
    const stats = await fetchAccountStats(acc.riotId, acc.gameType);
    acc.stats = stats;
    await saveAccountsMeta(accounts);
    return stats;
  });

  ipcMain.handle("handle-quit-choice", async (e, { action, dontShowAgain }) => {
    if (dontShowAgain) await saveConfig({ showQuitModal: false });
    if (action === "quit") {
      app.isQuitting = true;
      app.quit();
    } else if (action === "minimize") {
      mainWindow.hide();
    }
    return true;
  });

  ipcMain.handle("set-auto-start", async (e, enable) => {
    setAutoStart(enable);
    return true;
  });

  ipcMain.handle("get-auto-start-status", () => getAutoStartStatus());

  ipcMain.handle("check-for-updates", async () => {
    if (process.env.NODE_ENV === "development" || !app.isPackaged) {
      await simulateUpdateCheck(mainWindow);
      return { status: "simulated" };
    }
    return await handleUpdateCheck(mainWindow);
  });

  ipcMain.handle("install-update", () => {
    require("electron-updater").autoUpdater.quitAndInstall();
    return true;
  });
}

module.exports = { setupIpcHandlers };
