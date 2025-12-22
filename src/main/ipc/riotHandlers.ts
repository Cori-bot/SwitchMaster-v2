import { dialog } from "electron";
import path from "path";
import { getConfig, saveConfig } from "../config";
import { getAccountCredentials } from "../accounts";
import {
  killRiotProcesses,
  launchRiotClient,
  performAutomation,
  autoDetectPaths,
} from "../automation";
import { safeHandle } from "./utils";

export function registerRiotHandlers(
  launchGame: (gameId: "league" | "valorant") => Promise<void>,
) {
  safeHandle("select-riot-path", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Sélectionner l'exécutable Riot Client",
      filters: [{ name: "Executables", extensions: ["exe"] }],
      properties: ["openFile"],
    });
    return canceled ? null : filePaths[0];
  });

  safeHandle("auto-detect-paths", async () => await autoDetectPaths());

  safeHandle("switch-account", async (_e, id) => {
    const credentials = await getAccountCredentials(id as string);
    await killRiotProcesses();
    const config = getConfig();
    let clientPath = config.riotPath;
    if (!clientPath.endsWith(".exe"))
      clientPath = path.join(clientPath, "RiotClientServices.exe");

    await launchRiotClient(clientPath);
    await performAutomation(
      credentials.username || "",
      credentials.password || "",
    );

    await saveConfig({ lastAccountId: id as string });
    return { success: true, id };
  });

  safeHandle("launch-game", async (_e, gameId) => {
    await launchGame(gameId as "league" | "valorant");
    return true;
  });
}
