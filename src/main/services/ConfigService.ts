import { app } from "electron";
import path from "path";
import fs from "fs-extra";
import { EventEmitter } from "events";
import { Config } from "../../shared/types";
import { devLog, devError } from "../logger";

export class ConfigService extends EventEmitter {
  private configPath: string;
  private appDataPath: string;
  private config: Config;

  private readonly DEFAULT_RIOT_PATH =
    "C:\\Riot Games\\Riot Client\\RiotClientServices.exe";
  private readonly DEFAULT_CONFIG: Config = {
    riotPath: this.DEFAULT_RIOT_PATH,
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
    riotLaunchDelay: 10000,
    showLaunchGamePopup: true,
    activeDesignModule: "modern",
    autoUpdate: true,
  };

  constructor() {
    super();
    this.appDataPath = app.getPath("userData");
    this.configPath = path.join(this.appDataPath, "config.json");
    this.config = { ...this.DEFAULT_CONFIG };
  }

  public async init(): Promise<void> {
    await fs.ensureDir(this.appDataPath);
    await this.loadConfig();
  }

  public getConfig(): Config {
    return this.config;
  }

  public async loadConfig(): Promise<Config> {
    try {
      const exists = await fs.pathExists(this.configPath);
      if (exists) {
        const content = await fs.readFile(this.configPath, "utf-8");
        const trimmed = content ? content.trim() : "";
        if (trimmed !== "") {
          const savedConfig = JSON.parse(content);
          this.config = { ...this.config, ...savedConfig };
        }
      }
    } catch (e) {
      devError("ConfigService: Error loading config:", e);
    }
    return this.config;
  }

  public loadConfigSync(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, "utf-8");
        const trimmed = content ? content.trim() : "";
        if (trimmed !== "") {
          const savedConfig = JSON.parse(content);
          this.config = { ...this.config, ...savedConfig };
        }
      }
    } catch (e) {
      devError("ConfigService: Error loading config sync:", e);
    }
    return this.config;
  }

  public async saveConfig(newConfig: Partial<Config>): Promise<Config> {
    // Merge spécial pour la sécurité
    if (newConfig.security) {
      if (this.config.security) {
        newConfig.security = {
          ...this.config.security,
          ...newConfig.security,
        };
      }
    }

    this.config = { ...this.config, ...newConfig };

    try {
      await fs.ensureDir(path.dirname(this.configPath));
      await fs.writeJson(this.configPath, this.config, { spaces: 2 });
      devLog("ConfigService: Config saved to:", this.configPath);
      this.emit("updated", this.config);
      return this.config;
    } catch (e) {
      devError("ConfigService: Error saving config:", e);
      throw e;
    }
  }

  // Getters spécifiques si nécessaire
  public getRiotPath(): string {
    return this.config.riotPath || this.DEFAULT_RIOT_PATH;
  }
}
