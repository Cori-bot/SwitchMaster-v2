import { Config } from "../../shared/types";
import { safeHandle } from "./utils";
import { ConfigService } from "../services/ConfigService";

export function registerConfigHandlers(configService: ConfigService) {
  safeHandle("get-config", () => configService.getConfig());
  safeHandle("save-config", async (_e, config) => {
    const cleanConfig = { ...(config as Partial<Config>) };
    await configService.saveConfig(cleanConfig);
    return true;
  });
}
