import { BrowserWindow, dialog } from "electron";
import { safeHandle } from "./utils";
import { SessionService } from "../services/SessionService";
import { RiotAutomationService } from "../services/RiotAutomationService";

export function registerRiotHandlers(
  getWin: () => BrowserWindow | null,
  launchGame: (data: {
    launcherType: string;
    gameId: string;
    credentials?: any;
  }) => Promise<void>,
  getStatus: () => Promise<any>,
  sessionService: SessionService,
  automationService: RiotAutomationService,
) {
  safeHandle("select-riot-path", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Sélectionner l'exécutable Riot Client",
      filters: [{ name: "Executables", extensions: ["exe"] }],
      properties: ["openFile"],
    });
    return canceled ? null : filePaths[0];
  });

  safeHandle(
    "auto-detect-paths",
    async () => await automationService.autoDetectPaths(),
  );

  safeHandle("switch-account", async (_e, id) => {
    await sessionService.switchAccount(id as string);

    const status = await getStatus();
    const win = getWin();
    if (win && !win.isDestroyed()) {
      win.webContents.send("status-updated", status);
    }

    return { success: true, id };
  });

  safeHandle("launch-game", async (_e, data: any) => {
    if (typeof data === "string") {
      await launchGame({ launcherType: "riot", gameId: data });
    } else {
      await launchGame(data);
    }
    return true;
  });
}
