import { app, safeStorage } from "electron";
import path from "path";
import fs from "fs-extra";
import { Config } from "../shared/types";

let APP_DATA_PATH: string;
let CONFIG_FILE: string;
let ACCOUNTS_FILE: string;
let CONFIG_BACKUP: string;
let ACCOUNTS_BACKUP: string;

export function getPaths() {
  if (!APP_DATA_PATH) {
    APP_DATA_PATH = app.getPath("userData");
    CONFIG_FILE = path.join(APP_DATA_PATH, "config.json");
    ACCOUNTS_FILE = path.join(APP_DATA_PATH, "accounts.json");
    CONFIG_BACKUP = path.join(APP_DATA_PATH, "config.bak.json");
    ACCOUNTS_BACKUP = path.join(APP_DATA_PATH, "accounts.bak.json");
  }
  return {
    APP_DATA_PATH,
    CONFIG_FILE,
    ACCOUNTS_FILE,
    CONFIG_BACKUP,
    ACCOUNTS_BACKUP,
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
};

export async function ensureAppData(): Promise<void> {
  const { APP_DATA_PATH } = getPaths();
  await fs.ensureDir(APP_DATA_PATH);
}

export async function loadConfig(): Promise<Config> {
  const { CONFIG_FILE, CONFIG_BACKUP } = getPaths();
  try {
    if (await fs.pathExists(CONFIG_FILE)) {
      const content = await fs.readFile(CONFIG_FILE, "utf-8");
      if (content && content.trim() !== "") {
        const savedConfig = JSON.parse(content);
        appConfig = { ...appConfig, ...savedConfig };
        // Si le chargement réussit, on met à jour le backup
        await fs
          .copy(CONFIG_FILE, CONFIG_BACKUP, { overwrite: true })
          .catch(() => {});
        return appConfig;
      }
    }

    // Tentative de restauration depuis le backup si le fichier principal échoue
    if (await fs.pathExists(CONFIG_BACKUP)) {
      console.warn(
        "Main config file invalid, attempting to restore from backup...",
      );
      const backupContent = await fs.readFile(CONFIG_BACKUP, "utf-8");
      if (backupContent && backupContent.trim() !== "") {
        const savedConfig = JSON.parse(backupContent);
        appConfig = { ...appConfig, ...savedConfig };
        await fs.outputJson(CONFIG_FILE, appConfig, { spaces: 2 });
      }
    }
    return appConfig;
  } catch (e) {
    console.error("Error loading config, trying backup:", e);
    try {
      if (await fs.pathExists(CONFIG_BACKUP)) {
        const backupContent = await fs.readFile(CONFIG_BACKUP, "utf-8");
        const savedConfig = JSON.parse(backupContent);
        appConfig = { ...appConfig, ...savedConfig };
        await fs.outputJson(CONFIG_FILE, appConfig, { spaces: 2 });
      }
    } catch (backupErr) {
      console.error("Backup restoration failed:", backupErr);
    }
    return appConfig;
  }
}

export async function saveConfig(newConfig: Partial<Config>): Promise<Config> {
  const { CONFIG_FILE } = getPaths();

  // Merge spécial pour la sécurité pour éviter d'écraser pinHash si on ne change que enabled
  if (newConfig.security && appConfig.security) {
    newConfig.security = {
      ...appConfig.security,
      ...newConfig.security,
    };
  }

  appConfig = { ...appConfig, ...newConfig };
  try {
    // Écriture atomique
    const tempFile = `${CONFIG_FILE}.tmp`;
    await fs.outputJson(tempFile, appConfig, { spaces: 2 });
    await fs.move(tempFile, CONFIG_FILE, { overwrite: true });
    return appConfig;
  } catch (e) {
    console.error("Error saving config:", e);
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
      console.error("Decryption failed:", e);
      return null;
    }
  } else {
    return Buffer.from(encryptedData, "base64").toString("utf-8");
  }
}
