import crypto from "crypto";
import { getConfig, saveConfig } from "../config";
import { safeHandle } from "./utils";

export function registerSecurityHandlers() {
  safeHandle("verify-pin", async (_e, pin) => {
    const config = getConfig();
    if (!config.security?.enabled) return true;
    const hash = crypto
      .createHash("sha256")
      .update(pin as string)
      .digest("hex");
    return hash === config.security.pinHash;
  });

  safeHandle("set-pin", async (_e, pin) => {
    const hash = crypto
      .createHash("sha256")
      .update(pin as string)
      .digest("hex");
    await saveConfig({ security: { enabled: true, pinHash: hash } });
    return true;
  });

  safeHandle("disable-pin", async (_e, pin) => {
    const config = getConfig();
    if (!config.security?.enabled) return true;
    const hash = crypto
      .createHash("sha256")
      .update(pin as string)
      .digest("hex");
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
