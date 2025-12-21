import { BrowserWindow } from "electron";
import fs from "fs-extra";
import crypto from "crypto";
import { getPaths, encryptData, decryptData } from "./config";
import { fetchAccountStats } from "./statsService";
import { Account } from "../shared/types";

export async function loadAccountsMeta(): Promise<Account[]> {
  const { ACCOUNTS_FILE, ACCOUNTS_BACKUP } = getPaths();
  try {
    if (await fs.pathExists(ACCOUNTS_FILE)) {
      const content = await fs.readFile(ACCOUNTS_FILE, "utf-8");
      if (content && content.trim() !== "") {
        const accounts = JSON.parse(content);
        // Si le chargement réussit, on met à jour le backup
        await fs.copy(ACCOUNTS_FILE, ACCOUNTS_BACKUP, { overwrite: true }).catch(() => {});
        return accounts;
      }
    }

    // Si le fichier principal est vide ou absent, on tente le backup
    if (await fs.pathExists(ACCOUNTS_BACKUP)) {
      console.warn("Main accounts file invalid, attempting to restore from backup...");
      const backupContent = await fs.readFile(ACCOUNTS_BACKUP, "utf-8");
      if (backupContent && backupContent.trim() !== "") {
        const accounts = JSON.parse(backupContent);
        // On restaure le fichier principal à partir du backup
        await fs.outputJson(ACCOUNTS_FILE, accounts, { spaces: 2 });
        return accounts;
      }
    }
  } catch (e) {
    console.error("Error loading accounts, trying backup:", e);
    try {
      if (await fs.pathExists(ACCOUNTS_BACKUP)) {
        const backupContent = await fs.readFile(ACCOUNTS_BACKUP, "utf-8");
        const accounts = JSON.parse(backupContent);
        await fs.outputJson(ACCOUNTS_FILE, accounts, { spaces: 2 });
        return accounts;
      }
    } catch (backupErr) {
      console.error("Backup restoration failed:", backupErr);
    }
  }
  return [];
}

export async function saveAccountsMeta(accounts: Account[]): Promise<void> {
  const { ACCOUNTS_FILE } = getPaths();
  try {
    // Écriture atomique via un fichier temporaire pour éviter la corruption en cas de crash
    const tempFile = `${ACCOUNTS_FILE}.tmp`;
    await fs.outputJson(tempFile, accounts, { spaces: 2 });
    await fs.move(tempFile, ACCOUNTS_FILE, { overwrite: true });
  } catch (e) {
    console.error("Error saving accounts:", e);
    throw e;
  }
}

export async function addAccount(accountData: Partial<Account>): Promise<Account> {
  const { name, username, password, riotId, gameType, cardImage } = accountData;
  const id = crypto.randomUUID();
  const encryptedUsername = encryptData(username || "");
  const encryptedPassword = encryptData(password || "");

  const newAccount: Account = {
    id,
    name: name || "Nouveau Compte",
    username: encryptedUsername,
    password: encryptedPassword,
    riotId: riotId || "",
    gameType: gameType || "valorant",
    cardImage: cardImage || "",
    timestamp: Date.now(),
    stats: null,
  };

  const accounts = await loadAccountsMeta();
  
  if (newAccount.riotId) {
    try {
      newAccount.stats = await fetchAccountStats(newAccount.riotId, newAccount.gameType);
    } catch (err) {
      console.error("Error fetching stats on addAccount:", err);
    }
  }

  accounts.push(newAccount);
  await saveAccountsMeta(accounts);
  
  // Notification de mise à jour via IPC
  const { BrowserWindow } = require('electron');
  const wins = BrowserWindow.getAllWindows();
  wins.forEach((win: any) => win.webContents.send('accounts-updated', accounts));

  return newAccount;
}

export async function updateAccount(accountData: Partial<Account>): Promise<Account> {
  const { id, name, username, password, riotId, gameType, cardImage } = accountData;
  const accounts = await loadAccountsMeta();
  const index = accounts.findIndex((a) => a.id === id);

  if (index === -1) {
    throw new Error("Compte introuvable");
  }

  const existing = accounts[index];
  const encryptedUsername = username ? encryptData(username) : existing.username;
  const encryptedPassword = password ? encryptData(password) : existing.password;

  const updatedAccount: Account = {
    ...existing,
    name: name || existing.name,
    username: encryptedUsername,
    password: encryptedPassword,
    riotId: riotId !== undefined ? riotId : existing.riotId,
    gameType: gameType || existing.gameType,
    cardImage: cardImage !== undefined ? cardImage : existing.cardImage,
  };

  if (updatedAccount.riotId) {
    try {
      updatedAccount.stats = await fetchAccountStats(updatedAccount.riotId, updatedAccount.gameType);
    } catch (err) {
      console.error("Error fetching stats on updateAccount:", err);
    }
  }

  accounts[index] = updatedAccount;
  await saveAccountsMeta(accounts);

  // Notification de mise à jour via IPC
  const { BrowserWindow } = require('electron');
  const wins = BrowserWindow.getAllWindows();
  wins.forEach((win: any) => win.webContents.send('accounts-updated', accounts));

  return updatedAccount;
}

export async function deleteAccount(accountId: string): Promise<boolean> {
  const accounts = await loadAccountsMeta();
  const filtered = accounts.filter((a) => a.id !== accountId);
  
  if (filtered.length !== accounts.length) {
    await saveAccountsMeta(filtered);
    
    // Notification de mise à jour via IPC
    const { BrowserWindow } = require('electron');
    const wins = BrowserWindow.getAllWindows();
    wins.forEach((win: any) => win.webContents.send('accounts-updated', filtered));

    return true;
  }
  return false;
}

export async function getAccountCredentials(accountId: string): Promise<Account> {
  const accounts = await loadAccountsMeta();
  const account = accounts.find((a) => a.id === accountId);

  if (!account) {
    throw new Error("Account not found.");
  }

  return {
    ...account,
    username: decryptData(account.username || "") || "",
    password: decryptData(account.password || "") || "",
  };
}

async function refreshAccountStats(account: Account): Promise<boolean> {
  if (!account.riotId) return false;
  try {
    const newStats = await fetchAccountStats(account.riotId, account.gameType);
    if (JSON.stringify(account.stats) !== JSON.stringify(newStats)) {
      account.stats = newStats;
      return true;
    }
  } catch (err) {
    const error = err as Error;
    console.error(`Failed to refresh stats for ${account.name}:`, error.message);
  }
  return false;
}

export async function refreshAllAccountStats(mainWindow: BrowserWindow | null): Promise<void> {
  const accounts = await loadAccountsMeta();
  const results = await Promise.all(accounts.map(refreshAccountStats));
  if (results.some(changed => changed)) {
    await saveAccountsMeta(accounts);
    if (mainWindow) mainWindow.webContents.send("accounts-updated", accounts);
  }
}
