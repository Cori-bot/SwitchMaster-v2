const { app, safeStorage } = require("electron");
const path = require("path");
const fs = require("fs-extra");

const APP_DATA_PATH = path.join(app.getPath("userData"), "SwitchMaster-v2");
const CONFIG_FILE = path.join(APP_DATA_PATH, "config.json");
const ACCOUNTS_FILE = path.join(APP_DATA_PATH, "accounts.json");

const DEFAULT_RIOT_DATA_PATH = path.join(
  process.env.LOCALAPPDATA,
  "Riot Games",
  "Riot Client",
  "Data",
);

let appConfig = {
  riotPath: DEFAULT_RIOT_DATA_PATH,
  theme: "dark",
  minimizeToTray: true,
  showQuitModal: true,
  autoStart: false,
  lastAccountId: null,
  security: {
    enabled: false,
    pinHash: null,
  },
};

async function ensureAppData() {
  await fs.ensureDir(APP_DATA_PATH);
}

async function loadConfig() {
  try {
    if (await fs.pathExists(CONFIG_FILE)) {
      const savedConfig = await fs.readJson(CONFIG_FILE);
      appConfig = { ...appConfig, ...savedConfig };
    }
    return appConfig;
  } catch (e) {
    console.error("Error loading config:", e);
    return appConfig;
  }
}

async function saveConfig(newConfig) {
  appConfig = { ...appConfig, ...newConfig };
  try {
    await fs.outputJson(CONFIG_FILE, appConfig, { spaces: 2 });
    return appConfig;
  } catch (e) {
    console.error("Error saving config:", e);
    throw e;
  }
}

function getConfig() {
  return appConfig;
}

// Secure Encryption/Decryption
function encryptData(data) {
  if (safeStorage && safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(data).toString("base64");
  } else {
    return Buffer.from(data).toString("base64");
  }
}

function decryptData(encryptedData) {
  if (safeStorage && safeStorage.isEncryptionAvailable()) {
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

module.exports = {
  APP_DATA_PATH,
  CONFIG_FILE,
  ACCOUNTS_FILE,
  DEFAULT_RIOT_DATA_PATH,
  ensureAppData,
  loadConfig,
  saveConfig,
  getConfig,
  encryptData,
  decryptData,
};
