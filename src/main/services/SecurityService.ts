import crypto from "crypto";
import { safeStorage } from "electron";
import { ConfigService } from "./ConfigService";
import { devLog, devError } from "../logger";

export class SecurityService {
  private readonly PIN_MIN_LENGTH = 4;

  constructor(private configService: ConfigService) {}

  private hashPin(pin: string): string {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.createHmac("sha256", salt).update(pin).digest("hex");
    return `${salt}:${hash}`;
  }

  private verifyPinInternal(pin: string, storedHash: string): boolean {
    if (!storedHash.includes(":")) {
      // Legacy format (SHA-256 direct)
      const legacyHash = crypto.createHash("sha256").update(pin).digest("hex");
      return legacyHash === storedHash;
    }

    const [salt, hash] = storedHash.split(":");
    const currentHash = crypto
      .createHmac("sha256", salt)
      .update(pin)
      .digest("hex");
    return currentHash === hash;
  }

  public async verifyPin(pin: string): Promise<boolean> {
    if (typeof pin !== "string") return false;

    const config = this.configService.getConfig();
    if (!config.security?.enabled || !config.security.pinHash) {
      // Si la sécurité est désactivée ou pas de hash, on considère que c'est bon (ou on devrait ?)
      // Le handler actuel renvoie true.
      return true;
    }

    const isValid = this.verifyPinInternal(pin, config.security.pinHash);

    // Migration automatique
    if (isValid && !config.security.pinHash.includes(":")) {
      devLog("SecurityService: Migrating PIN to new hash format");
      const newHash = this.hashPin(pin);
      await this.configService.saveConfig({
        security: { ...config.security, pinHash: newHash },
      });
    }

    return isValid;
  }

  public async setPin(pin: string): Promise<boolean> {
    if (typeof pin !== "string" || pin.length < this.PIN_MIN_LENGTH) {
      throw new Error(
        `Le PIN doit faire au moins ${this.PIN_MIN_LENGTH} caractères`,
      );
    }

    const newHash = this.hashPin(pin);
    await this.configService.saveConfig({
      security: { enabled: true, pinHash: newHash },
    });
    return true;
  }

  public async disablePin(pin: string): Promise<boolean> {
    if (typeof pin !== "string") return false;

    const config = this.configService.getConfig();
    // Si déjà désactivé
    if (!config.security?.enabled || !config.security.pinHash) {
      await this.configService.saveConfig({
        security: { enabled: false, pinHash: null },
      });
      return true;
    }

    if (this.verifyPinInternal(pin, config.security.pinHash)) {
      await this.configService.saveConfig({
        security: { enabled: false, pinHash: null },
      });
      return true;
    }

    return false;
  }

  public isEnabled(): boolean {
    const config = this.configService.getConfig();
    return !!(config.security && config.security.enabled);
  }

  // Secure Encryption/Decryption
  public encryptData(data: string): string {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(data).toString("base64");
    } else {
      return Buffer.from(data).toString("base64");
    }
  }

  public decryptData(encryptedData: string): string | null {
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
}
