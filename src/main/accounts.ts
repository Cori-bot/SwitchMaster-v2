import { BrowserWindow } from "electron";
import fs from "fs-extra";
import crypto from "crypto";
import { getPaths, encryptData, decryptData } from "./config";
import { fetchAccountStats } from "./statsService";
import { Account } from "../shared/types";
import { devError } from "./logger";

export async function loadAccountsMeta(): Promise<Account[]> {
  const { ACCOUNTS_FILE } = getPaths();
  try {
    if (await fs.pathExists(ACCOUNTS_FILE)) {
      const content = await fs.readFile(ACCOUNTS_FILE, "utf-8");
      if (content && content.trim() !== "") {
        const accounts = JSON.parse(content);
        return accounts;
      }
    }
  } catch (e) {
    devError("Error loading accounts:", e);
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
    devError("Error saving accounts:", e);
    throw e;
  }
}

export async function addAccount(
  accountData: Partial<Account>,
): Promise<Account> {
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
      newAccount.stats = await fetchAccountStats(
        newAccount.riotId,
        newAccount.gameType,
      );
    } catch (err) {
      devError("Error fetching stats on addAccount:", err);
    }
  }

  accounts.push(newAccount);
  await saveAccountsMeta(accounts);

  // Notification de mise à jour via IPC
  const { BrowserWindow } = require("electron");
  const wins = BrowserWindow.getAllWindows();
  wins.forEach((win: any) =>
    win.webContents.send("accounts-updated", accounts),
  );

  return newAccount;
}

export async function updateAccount(
  accountData: Partial<Account>,
): Promise<Account> {
  const { id, name, username, password, riotId, gameType, cardImage, isFavorite } =
    accountData;
  const accounts = await loadAccountsMeta();
  const index = accounts.findIndex((a) => a.id === id);

  if (index === -1) {
    throw new Error("Compte introuvable");
  }

  const existing = accounts[index];

  // N-encrypter que si les identifiants sont différents de ceux déjà cryptés
  const encryptedUsername = (username && username !== existing.username)
    ? encryptData(username)
    : existing.username;
  const encryptedPassword = (password && password !== existing.password)
    ? encryptData(password)
    : existing.password;

  const updatedAccount: Account = {
    ...existing,
    name: name || existing.name,
    username: encryptedUsername,
    password: encryptedPassword,
    riotId: riotId !== undefined ? riotId : existing.riotId,
    gameType: gameType || existing.gameType,
    cardImage: cardImage !== undefined ? cardImage : existing.cardImage,
    isFavorite: isFavorite !== undefined ? isFavorite : existing.isFavorite,
  };

  // Ne re-fétcher les stats que si le Riot ID ou le type de jeu a changé,
  // ou si les stats sont manquantes, pour éviter de bloquer l'UI lors d'un simple toggle de favori.
  const needsStatsRefresh =
    updatedAccount.riotId && (
      updatedAccount.riotId !== existing.riotId ||
      updatedAccount.gameType !== existing.gameType ||
      !updatedAccount.stats
    );

  if (needsStatsRefresh && updatedAccount.riotId) {
    try {
      updatedAccount.stats = await fetchAccountStats(
        updatedAccount.riotId,
        updatedAccount.gameType,
      );
    } catch (err) {
      devError("Error fetching stats on updateAccount:", err);
    }
  }

  accounts[index] = updatedAccount;
  await saveAccountsMeta(accounts);

  // Notification de mise à jour via IPC
  const { BrowserWindow } = require("electron");
  const wins = BrowserWindow.getAllWindows();
  wins.forEach((win: any) =>
    win.webContents.send("accounts-updated", accounts),
  );

  return updatedAccount;
}

export async function deleteAccount(accountId: string): Promise<boolean> {
  const accounts = await loadAccountsMeta();
  const filtered = accounts.filter((a) => a.id !== accountId);

  if (filtered.length !== accounts.length) {
    await saveAccountsMeta(filtered);

    // Notification de mise à jour via IPC
    const { BrowserWindow } = require("electron");
    const wins = BrowserWindow.getAllWindows();
    wins.forEach((win: any) =>
      win.webContents.send("accounts-updated", filtered),
    );

    return true;
  }
  return false;
}

export async function getAccountCredentials(
  accountId: string,
): Promise<Account> {
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
    devError(`Failed to refresh stats for ${account.name}:`, error.message);
  }
  return false;
}

export async function refreshAllAccountStats(
  mainWindow: BrowserWindow | null,
): Promise<void> {
  const accounts = await loadAccountsMeta();
  const results = await Promise.all(accounts.map(refreshAccountStats));
  if (results.some((changed) => changed)) {
    await saveAccountsMeta(accounts);
    if (mainWindow) mainWindow.webContents.send("accounts-updated", accounts);
  }
}
