import { app } from "electron";
import log from "electron-log";

const isDev =
  process.env.NODE_ENV === "development" || (app && !app.isPackaged);

// Configure electron-log
log.transports.file.level = "info";
log.transports.console.level = isDev ? "debug" : false;

export function devLog(...args: unknown[]) {
  log.info(...args);
}

export function devError(...args: unknown[]) {
  log.error(...args);
}

export function devWarn(...args: unknown[]) {
  log.warn(...args);
}

export function devDebug(...args: unknown[]) {
  log.debug(...args);
}
