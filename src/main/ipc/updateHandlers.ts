import { BrowserWindow } from "electron";
import {
  handleUpdateCheck,
  simulateUpdateCheck,
  downloadUpdate,
  installUpdate,
} from "../updater";
import { safeHandle } from "./utils";

export function registerUpdateHandlers(mainWindow: BrowserWindow) {
  safeHandle("check-updates", async () => {
    await handleUpdateCheck(mainWindow, true);
    return true;
  });

  safeHandle("simulate-update", async () => {
    await simulateUpdateCheck(mainWindow, true);
    return true;
  });

  safeHandle("download-update", async () => {
    await downloadUpdate();
    return true;
  });

  safeHandle("install-update", () => {
    installUpdate();
    return true;
  });
}
