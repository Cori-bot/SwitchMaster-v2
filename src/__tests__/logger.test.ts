import { describe, it, expect, vi, beforeEach } from "vitest";
import log from "electron-log";
import { devLog, devError, devWarn, devDebug } from "../main/logger";

// Mock electron
vi.mock("electron", () => ({
  app: {
    isPackaged: false,
  },
}));

// Mock electron-log
vi.mock("electron-log", () => ({
  default: {
    transports: {
      file: { level: "" },
      console: { level: "" },
    },
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("Logger Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devLog appelle log.info", () => {
    devLog("test info");
    expect(log.info).toHaveBeenCalledWith("test info");
  });

  it("devError appelle log.error", () => {
    devError("test error");
    expect(log.error).toHaveBeenCalledWith("test error");
  });

  it("devWarn appelle log.warn", () => {
    devWarn("test warn");
    expect(log.warn).toHaveBeenCalledWith("test warn");
  });

  it("devDebug appelle log.debug", () => {
    devDebug("test debug");
    expect(log.debug).toHaveBeenCalledWith("test debug");
  });
});
