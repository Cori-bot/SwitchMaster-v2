import { BrowserWindow } from "electron";
import {
  handleUpdateCheck,
  simulateUpdateCheck,
  downloadUpdate,
  installUpdate,
} from "../updater";
import { safeHandle } from "./utils";

export function registerUpdateHandlers(
  getMainWindow: () => BrowserWindow | null,
) {
  safeHandle("check-updates", async () => {
    const win = getMainWindow();
    if (win) {
      await handleUpdateCheck(win, true);
    }
    return true;
  });

  safeHandle("simulate-update", async () => {
    const win = getMainWindow();
    if (win) {
      await simulateUpdateCheck(win, true);
    }
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
