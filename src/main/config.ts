import { app, safeStorage } from "electron";
import path from "path";
import fs from "fs-extra";
import { Config } from "../shared/types";
import { devLog, devError } from "./logger";

let APP_DATA_PATH: string;
let CONFIG_FILE: string;
let ACCOUNTS_FILE: string;

export function getPaths() {
  if (!APP_DATA_PATH) {
    APP_DATA_PATH = app.getPath("userData");
    CONFIG_FILE = path.join(APP_DATA_PATH, "config.json");
    ACCOUNTS_FILE = path.join(APP_DATA_PATH, "accounts.json");
  }
  return {
    APP_DATA_PATH,
    CONFIG_FILE,
    ACCOUNTS_FILE,
  };
}

export const DEFAULT_RIOT_CLIENT_PATH =
  "C:\\Riot Games\\Riot Client\\RiotClientServices.exe";

let appConfig: Config = {
  riotPath: DEFAULT_RIOT_CLIENT_PATH,
  theme: "dark",
  minimizeToTray: false,
  showQuitModal: true,
  autoStart: false,
  startMinimized: false,
  lastAccountId: null,
  security: {
    enabled: false,
    pinHash: null,
  },
  hasSeenOnboarding: false,
  enableGPU: false,
};

export function resetConfigForTests(fullClean = false) {
  appConfig = {
    riotPath: DEFAULT_RIOT_CLIENT_PATH,
    theme: "dark",
    minimizeToTray: false,
    showQuitModal: true,
    autoStart: false,
    startMinimized: false,
    lastAccountId: null,
    security: fullClean ? undefined : {
      enabled: false,
      pinHash: null,
    },
    hasSeenOnboarding: false,
    enableGPU: false,
  };
}

export async function ensureAppData(): Promise<void> {
  const { APP_DATA_PATH } = getPaths();
  await fs.ensureDir(APP_DATA_PATH);
}

export async function loadConfig(): Promise<Config> {
  const { CONFIG_FILE } = getPaths();
  try {
    const exists = await fs.pathExists(CONFIG_FILE);
    if (exists) {
      const content = await fs.readFile(CONFIG_FILE, "utf-8");
      const trimmed = content ? content.trim() : "";
      if (trimmed !== "") {
        const savedConfig = JSON.parse(content);
        appConfig = { ...appConfig, ...savedConfig };
        return appConfig;
      }
    }
    return appConfig;
  } catch (e) {
    devError("Error loading config:", e);
    return appConfig;
  }
}

export function loadConfigSync(): Config {
  const { CONFIG_FILE } = getPaths();
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, "utf-8");
      const trimmed = content ? content.trim() : "";
      if (trimmed !== "") {
        const savedConfig = JSON.parse(content);
        appConfig = { ...appConfig, ...savedConfig };
        return appConfig;
      }
    }
    return appConfig;
  } catch (e) {
    devError("Error loading config sync:", e);
    return appConfig;
  }
}

export async function saveConfig(newConfig: Partial<Config>): Promise<Config> {
  const { CONFIG_FILE } = getPaths();

  // Merge spécial pour la sécurité pour éviter d'écraser pinHash si on ne change que enabled
  if (newConfig.security) {
    if (appConfig.security) {
      newConfig.security = {
        ...appConfig.security,
        ...newConfig.security,
      };
    }
  }

  appConfig = { ...appConfig, ...newConfig };
  try {
    await fs.ensureDir(path.dirname(CONFIG_FILE));
    await fs.writeJson(CONFIG_FILE, appConfig, { spaces: 2 });
    devLog("Config saved successfully to:", CONFIG_FILE);
    return appConfig;
  } catch (e) {
    devError("Error saving config:", e);
    throw e;
  }
}

export function getConfig(): Config {
  return appConfig;
}

// Secure Encryption/Decryption
export function encryptData(data: string): string {
  if (safeStorage && safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(data).toString("base64");
  } else {
    return Buffer.from(data).toString("base64");
  }
}

export function decryptData(encryptedData: string): string | null {
  if (safeStorage && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(encryptedData, "base64"));
    } catch (e) {
      devError("Decryption failed:", e);
      return null;
    }
  } else {
    return Buffer.from(encryptedData, "base64").toString("utf-8");
  }
}
