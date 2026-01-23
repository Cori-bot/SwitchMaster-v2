import { app } from "electron";
import path from "path";
import { devDebug } from "../logger";

export class SystemService {
  constructor() {}

  public setAutoStart(enable: boolean, startMinimized: boolean): void {
    const isPackaged = app.isPackaged;
    const args: string[] = [];

    if (enable) {
      if (!isPackaged) {
        args.push(path.resolve(process.cwd(), "."));
      }

      if (startMinimized) {
        args.push("--minimized");
      }
    }

    const settings: Electron.Settings = {
      openAtLogin: enable,
      path: isPackaged ? process.execPath : undefined,
      args: args,
    };

    devDebug(
      `SystemService: Setting AutoStart: ${enable}, Minimized: ${startMinimized}, Args: ${args.join(" ")}`,
    );
    app.setLoginItemSettings(settings);
  }

  public getAutoStartStatus() {
    const settings = app.getLoginItemSettings();
    return {
      enabled: settings.openAtLogin || false,
      wasOpenedAtLogin: settings.wasOpenedAtLogin || false,
    };
  }
}
