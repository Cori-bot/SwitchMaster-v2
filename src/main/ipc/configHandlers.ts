import { getConfig, saveConfig } from "../config";
import { Config } from "../../shared/types";
import { safeHandle } from "./utils";

export function registerConfigHandlers() {
  safeHandle("get-config", () => getConfig());
  safeHandle("save-config", async (_e, config) => {
    const cleanConfig = { ...(config as Partial<Config>) };
    await saveConfig(cleanConfig);
    return true;
  });
}
