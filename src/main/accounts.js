const fs = require("fs-extra");
const crypto = require("crypto");
const { ACCOUNTS_FILE, encryptData, decryptData } = require("./config");
const { fetchAccountStats } = require("../../statsService");

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
    throw e;
  }
}

async function addAccount({ name, username, password, riotId, gameType, cardImage }) {
  const id = crypto.randomUUID();
  const encryptedUsername = encryptData(username);
  const encryptedPassword = encryptData(password);

  const newAccount = {
    id,
    name,
    username: encryptedUsername,
    password: encryptedPassword,
    riotId: riotId || null,
    gameType: gameType || "valorant",
    cardImage: cardImage || null,
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
  return newAccount;
}

async function updateAccount({ id, name, username, password, riotId, gameType, cardImage }) {
  const accounts = await loadAccountsMeta();
  const index = accounts.findIndex((a) => a.id === id);

  if (index === -1) {
    throw new Error("Compte introuvable");
  }

  const existing = accounts[index];
  const encryptedUsername = encryptData(username);
  const encryptedPassword = encryptData(password);

  const updatedAccount = {
    ...existing,
    name,
    username: encryptedUsername,
    password: encryptedPassword,
    riotId: riotId || null,
    gameType: gameType || "valorant",
    cardImage: cardImage || existing.cardImage,
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
  return updatedAccount;
}

async function deleteAccount(accountId) {
  let accounts = await loadAccountsMeta();
  accounts = accounts.filter((a) => a.id !== accountId);
  await saveAccountsMeta(accounts);
  return true;
}

async function getAccountCredentials(accountId) {
  const accounts = await loadAccountsMeta();
  const account = accounts.find((a) => a.id === accountId);

  if (!account) {
    throw new Error("Account not found.");
  }

  return {
    ...account,
    username: decryptData(account.username),
    password: decryptData(account.password),
  };
}

async function refreshAccountStats(account) {
  if (!account.riotId) return false;
  try {
    const newStats = await fetchAccountStats(account.riotId, account.gameType);
    if (JSON.stringify(account.stats) !== JSON.stringify(newStats)) {
      account.stats = newStats;
      return true;
    }
  } catch (err) {
    console.error(`Failed to refresh stats for ${account.name}:`, err.message);
  }
  return false;
}

async function refreshAllAccountStats(mainWindow) {
  const accounts = await loadAccountsMeta();
  const results = await Promise.all(accounts.map(refreshAccountStats));
  if (results.some(changed => changed)) {
    await saveAccountsMeta(accounts);
    if (mainWindow) mainWindow.webContents.send("accounts-updated", accounts);
  }
}

module.exports = {
  loadAccountsMeta,
  saveAccountsMeta,
  addAccount,
  updateAccount,
  deleteAccount,
  getAccountCredentials,
  refreshAllAccountStats,
};
