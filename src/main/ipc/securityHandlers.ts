import crypto from "crypto";
import { getConfig, saveConfig } from "../config";
import { safeHandle } from "./utils";

const PIN_MIN_LENGTH = 4;

function hashPin(pin: string, salt?: string): string {
  if (!salt) {
    salt = crypto.randomBytes(16).toString("hex");
  }
  const hash = crypto.createHmac("sha256", salt).update(pin).digest("hex");
  return `${salt}:${hash}`;
}

function verifyPinInternal(pin: string, storedHash: string): boolean {
  if (!storedHash.includes(":")) {
    // Ancien format (SHA-256 direct)
    const legacyHash = crypto.createHash("sha256").update(pin).digest("hex");
    return legacyHash === storedHash;
  }

  const [salt, hash] = storedHash.split(":");
  const currentHash = crypto.createHmac("sha256", salt).update(pin).digest("hex");
  return currentHash === hash;
}

export function registerSecurityHandlers() {
  safeHandle("verify-pin", async (_e, pin) => {
    if (typeof pin !== "string") return false;
    const config = getConfig();
    if (!config.security?.enabled || !config.security.pinHash) return true;

    const isValid = verifyPinInternal(pin, config.security.pinHash);

    // Migration vers le nouveau format si nécessaire
    if (isValid && !config.security.pinHash.includes(":")) {
      const newHash = hashPin(pin);
      await saveConfig({
        security: { ...config.security, pinHash: newHash },
      });
    }

    return isValid;
  });

  safeHandle("set-pin", async (_e, pin) => {
    if (typeof pin !== "string" || pin.length < PIN_MIN_LENGTH) {
      throw new Error(`Le PIN doit faire au moins ${PIN_MIN_LENGTH} caractères`);
    }
    const newHash = hashPin(pin);
    await saveConfig({ security: { enabled: true, pinHash: newHash } });
    return true;
  });

  safeHandle("disable-pin", async (_e, pin) => {
    if (typeof pin !== "string") return false;
    const config = getConfig();
    if (!config.security?.enabled || !config.security.pinHash) {
      await saveConfig({ security: { enabled: false, pinHash: null } });
      return true;
    }

    if (verifyPinInternal(pin, config.security.pinHash)) {
      await saveConfig({ security: { enabled: false, pinHash: null } });
      return true;
    }
    return false;
  });

  safeHandle("get-security-status", () => {
    const config = getConfig();
    return !!(config.security && config.security.enabled);
  });
}
