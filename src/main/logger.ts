import { app } from "electron";

const isDev = process.env.NODE_ENV === "development" || (app && !app.isPackaged);

export function devLog(...args: unknown[]) {
  if (isDev) {
    console.log(...args);
  }
}

export function devError(...args: unknown[]) {
  if (isDev) {
    console.error(...args);
  }
}

export function devDebug(...args: unknown[]) {
  if (isDev) {
    console.debug(...args);
  }
}
