import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.hoisted(() => {
  (process as any).resourcesPath = "C:\\Resources";
});

// Mock Electron complet pour ce fichier
vi.mock("electron", () => {
  const m = {
    app: {
      isPackaged: true,
      setLoginItemSettings: vi.fn(),
      getLoginItemSettings: vi.fn(() => ({ openAtLogin: true, wasOpenedAtLogin: false })),
    }
  };
  return m;
});

// Mock child_process avant l'import
vi.mock("child_process", () => ({
  exec: vi.fn(),
  spawn: vi.fn(() => ({ unref: vi.fn() })),
  default: {
    exec: vi.fn(),
    spawn: vi.fn(() => ({ unref: vi.fn() })),
  }
}));

import { getAutoStartStatus, monitorRiotProcess } from "../main/appLogic";
import child_process from "child_process";
import { app } from "electron";

vi.mock("../main/config", () => ({
  getConfig: vi.fn(() => ({ startMinimized: true, autoStart: true })),
}));

vi.mock("../main/logger");

describe("AppLogic Extended Coverage Final", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("getAutoStartStatus doit retourner le statut réel", () => {
    (app.getLoginItemSettings as any).mockReturnValue({ openAtLogin: true, wasOpenedAtLogin: false });
    expect(getAutoStartStatus().enabled).toBe(true);
    (app.getLoginItemSettings as any).mockReturnValue({ openAtLogin: false, wasOpenedAtLogin: false });
    expect(getAutoStartStatus().enabled).toBe(false);
  });
});
