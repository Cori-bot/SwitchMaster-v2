import { ipcMain, dialog, app, BrowserWindow } from "electron";
import crypto from "crypto";
import { getConfig, saveConfig } from "./config";
import { 
  loadAccountsMeta, 
  addAccount, 
  updateAccount, 
  deleteAccount, 
  getAccountCredentials,
  saveAccountsMeta 
} from "./accounts";
import { 
  killRiotProcesses, 
  launchRiotClient, 
  performAutomation, 
  autoDetectPaths 
} from "./automation";
import { handleUpdateCheck, simulateUpdateCheck, downloadUpdate, installUpdate } from "./updater";
import { fetchAccountStats } from "./statsService";
import path from "path";
import { Account, Config } from "../shared/types";

interface IpcContext {
  launchGame: (gameId: 'league' | 'valorant') => Promise<void>;
  setAutoStart: (enable: boolean) => void;
  getAutoStartStatus: () => { enabled: boolean; wasOpenedAtLogin: boolean };
  getStatus: () => Promise<{ status: string; accountId?: string; accountName?: string }>;
}

let handlersRegistered = false;

export function setupIpcHandlers(mainWindow: BrowserWindow | null, context: IpcContext) {
  // Account handlers don't need mainWindow
  if (!handlersRegistered) {
    registerAccountHandlers();
    registerConfigHandlers();
    registerRiotHandlers(context.launchGame);
    registerSecurityHandlers();
    handlersRegistered = true;
  }

  // Misc and Update handlers might need it
  if (mainWindow) {
    registerMiscHandlers(mainWindow, context);
    registerUpdateHandlers(mainWindow);
  }
}

function safeHandle(channel: string, handler: (...args: unknown[]) => unknown) {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handler);
}

function registerAccountHandlers() {
  safeHandle("get-accounts", async () => await loadAccountsMeta());
  safeHandle("get-account-credentials", async (_e, id) => await getAccountCredentials(id as string));
  safeHandle("add-account", async (_e, data) => await addAccount(data as Partial<Account>));
  safeHandle("update-account", async (_e, data) => await updateAccount(data as Account));
  safeHandle("delete-account", async (_e, id) => await deleteAccount(id as string));
  
  safeHandle("reorder-accounts", async (_e, idsRaw) => {
    const ids = idsRaw as string[];
    const accounts = await loadAccountsMeta();
    const accountMap = new Map(accounts.map(a => [a.id, a]));
    const reordered = ids.map(id => accountMap.get(id)).filter((a): a is Account => !!a);
    accounts.forEach(a => { if (!ids.includes(a.id)) reordered.push(a); });
    await saveAccountsMeta(reordered);

    // Notification de mise à jour via IPC
    const wins = BrowserWindow.getAllWindows();
    wins.forEach((win) => win.webContents.send('accounts-updated', reordered));

    return true;
  });

  safeHandle("fetch-account-stats", async (_e, idRaw) => {
    const id = idRaw as string;
    const accounts = await loadAccountsMeta();
    const acc = accounts.find(a => a.id === id);
    if (!acc || !acc.riotId) throw new Error("Invalid account or missing Riot ID");
    const stats = await fetchAccountStats(acc.riotId, acc.gameType);
    acc.stats = stats;
    await saveAccountsMeta(accounts);

    // Notification de mise à jour immédiate
    const wins = BrowserWindow.getAllWindows();
    wins.forEach((win) => win.webContents.send('accounts-updated', accounts));

    return stats;
  });
}

function registerConfigHandlers() {
  safeHandle("get-config", () => getConfig());
  safeHandle("save-config", async (_e, config) => {
    // Interdire la modification directe de la sécurité via save-config
    const cleanConfig = { ...config as Partial<Config> };
    if (cleanConfig.security) {
      delete cleanConfig.security;
    }
    await saveConfig(cleanConfig);
    return true;
  });
}

function registerRiotHandlers(launchGame: (gameId: 'league' | 'valorant') => Promise<void>) {
  safeHandle("select-riot-path", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Sélectionner l'exécutable Riot Client",
      filters: [{ name: "Executables", extensions: ["exe"] }],
      properties: ["openFile"],
    });
    return canceled ? null : filePaths[0];
  });

  safeHandle("auto-detect-paths", async () => await autoDetectPaths());

  safeHandle("switch-account", async (_e, id) => {
    const credentials = await getAccountCredentials(id as string);
    await killRiotProcesses();
    const config = getConfig();
    let clientPath = config.riotPath;
    if (!clientPath.endsWith(".exe")) clientPath = path.join(clientPath, "RiotClientServices.exe");
    
    await launchRiotClient(clientPath);
    await performAutomation(credentials.username || "", credentials.password || "");
    
    await saveConfig({ lastAccountId: id as string });
    return { success: true, id };
  });

  safeHandle("launch-game", async (_e, gameId) => {
    await launchGame(gameId as 'league' | 'valorant');
    return true;
  });
}

function registerSecurityHandlers() {
  safeHandle("verify-pin", async (_e, pin) => {
    const config = getConfig();
    if (!config.security?.enabled) return true;
    const hash = crypto.createHash("sha256").update(pin as string).digest("hex");
    return hash === config.security.pinHash;
  });

  safeHandle("set-pin", async (_e, pin) => {
    const hash = crypto.createHash("sha256").update(pin as string).digest("hex");
    await saveConfig({ security: { enabled: true, pinHash: hash } });
    return true;
  });

  safeHandle("disable-pin", async (_e, pin) => {
    const config = getConfig();
    if (!config.security?.enabled) return true;
    const hash = crypto.createHash("sha256").update(pin as string).digest("hex");
    if (hash === config.security.pinHash) {
      await saveConfig({ security: { enabled: false, pinHash: null } });
      return true;
    }
    return false;
  });

  safeHandle("get-security-status", () => {
    const config = getConfig();
    return config.security && config.security.enabled;
  });
}

function registerMiscHandlers(mainWindow: BrowserWindow, context: IpcContext) {
  safeHandle("select-account-image", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["jpg", "png", "gif", "jpeg", "webp"] }],
    });
    return canceled ? null : filePaths[0];
  });

  ipcMain.removeAllListeners("log-to-main");
  ipcMain.on("log-to-main", (_e, { level, args }) => {
    const prefix = `[Renderer ${level.toUpperCase()}]`;
    console.log(`${prefix}`, ...args);
  });

  safeHandle("get-status", async () => {
    const res = await context.getStatus();
    if (res.status === "Active" && res.accountId) {
      const accounts = await loadAccountsMeta();
      const acc = accounts.find(a => a.id === res.accountId);
      if (acc) {
        res.accountName = acc.name;
      }
    }
    return res;
  });
  safeHandle("get-auto-start", () => context.getAutoStartStatus());
  safeHandle("set-auto-start", (_e, enable) => {
    context.setAutoStart(enable as boolean);
    return true;
  });
  
  safeHandle("handle-quit-choice", async (_e, dataRaw) => {
    const { action, dontShowAgain } = dataRaw as { action: 'quit' | 'minimize', dontShowAgain: boolean };
    
    if (dontShowAgain) {
      const newConfig = { 
        showQuitModal: false,
        minimizeToTray: action === 'minimize'
      };
      await saveConfig(newConfig);
      // Notifier le renderer que la config a changé
      mainWindow.webContents.send('config-updated', newConfig);
    }

    if (action === 'quit') {
      app.quit();
    } else {
      mainWindow.hide();
    }
    return true;
  });

  safeHandle("close-app", () => {
    app.quit();
  });

  safeHandle("minimize-app", () => {
    mainWindow.minimize();
  });
}

function registerUpdateHandlers(mainWindow: BrowserWindow) {
  safeHandle("check-updates", async () => {
    await handleUpdateCheck(mainWindow, true);
    return true;
  });

  safeHandle("simulate-update", async () => {
    await simulateUpdateCheck(mainWindow, true);
    return true;
  });

  safeHandle("download-update", async () => {
    await downloadUpdate();
    return true;
  });

  safeHandle("install-update", () => {
    installUpdate();
    return true;
  });
}
