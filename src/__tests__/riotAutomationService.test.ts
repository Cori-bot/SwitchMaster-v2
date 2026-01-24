import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RiotAutomationService } from "../main/services/RiotAutomationService";
import * as cp from "child_process";
import fs from "fs-extra";
import { clipboard, app } from "electron";

vi.mock("child_process", () => {
  const s = vi.fn();
  const e = vi.fn();
  return { spawn: s, exec: e, default: { spawn: s, exec: e } };
});
vi.mock("fs-extra");
vi.mock("electron", () => ({
  app: {
    isPackaged: false,
    getAppPath: vi.fn().mockReturnValue("APP"),
    getPath: vi.fn().mockReturnValue("USER"),
  },
  clipboard: { clear: vi.fn() },
  BrowserWindow: vi.fn(),
}));
vi.mock("../main/logger", () => ({ devDebug: vi.fn(), devError: vi.fn() }));

describe("RiotAutomationService", () => {
  let service: RiotAutomationService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    service = new RiotAutomationService();
    (cp.exec as any).mockImplementation((c, o, cb) => {
      const callback = typeof o === "function" ? o : cb;
      if (callback) callback(null, { stdout: "SUCCESS", stderr: "" });
      return { on: vi.fn() };
    });
    (cp.spawn as any).mockReturnValue({
      unref: vi.fn(),
      on: vi.fn().mockReturnThis(),
      stdout: { on: vi.fn().mockReturnThis() },
      stderr: { on: vi.fn().mockReturnThis() },
    });
  });

  afterEach(() => vi.useRealTimers());

  it("killProcesses error branch", async () => {
    (cp.exec as any).mockImplementation((c, o, cb) => {
      (typeof o === "function" ? o : cb)(new Error());
    });
    const p = service.killProcesses();
    await vi.advanceTimersByTimeAsync(2000);
    await p;
    expect(cp.exec).toHaveBeenCalled();
  });

  it("launchClient success and fail", async () => {
    (fs.pathExists as any).mockResolvedValue(true);
    await service.launchClient("p");
    expect(cp.spawn).toHaveBeenCalled();

    (fs.pathExists as any).mockResolvedValue(false);
    await expect(service.launchClient("p")).rejects.toThrow();
  });

  it("launchGame success and fail", async () => {
    (fs.pathExists as any).mockResolvedValue(true);
    const p = service.launchGame("p", "valorant");
    await vi.advanceTimersByTimeAsync(3000);
    await p;
    expect(cp.spawn).toHaveBeenCalled();

    (fs.pathExists as any).mockResolvedValue(false);
    await expect(service.launchGame("p", "league")).rejects.toThrow();
  });

  it("launchGame success for league", async () => {
    (fs.pathExists as any).mockResolvedValue(true);
    const p = service.launchGame("p", "league");
    await vi.advanceTimersByTimeAsync(3000);
    await p;
    expect(cp.spawn).toHaveBeenCalledWith(
      "p",
      expect.arrayContaining(["--launch-product=league_of_legends"]),
      expect.anything(),
    );
  });

  it("login success", async () => {
    const mockOn = vi.fn();
    (cp.spawn as any).mockReturnValue({
      stdout: {
        on: vi.fn().mockImplementation((ev, cb) => {
          if (ev === "data") cb("SUCCESS");
          return { on: vi.fn() };
        }),
      },
      stderr: { on: vi.fn().mockReturnThis() },
      on: mockOn,
      unref: vi.fn(),
    });
    mockOn.mockImplementation((ev, cb) => {
      if (ev === "close") cb(0);
      return { on: mockOn };
    });

    await expect(service.login("u", "p")).resolves.not.toThrow();
    expect(clipboard.clear).toHaveBeenCalled();
  });

  it("launchGame success for league", async () => {
    (fs.pathExists as any).mockResolvedValue(true);
    const p = service.launchGame("p", "league");
    await vi.advanceTimersByTimeAsync(3000);
    await p;
    expect(cp.spawn).toHaveBeenCalledWith(
      "p",
      expect.arrayContaining(["--launch-product=league_of_legends"]),
      expect.anything(),
    );
  });

  it("login success", async () => {
    const mockOn = vi.fn();
    (cp.spawn as any).mockReturnValue({
      stdout: {
        on: vi.fn().mockImplementation((ev, cb) => {
          if (ev === "data") cb("SUCCESS");
          return { on: vi.fn() };
        }),
      },
      stderr: { on: vi.fn().mockReturnThis() },
      on: mockOn,
      unref: vi.fn(),
    });
    mockOn.mockImplementation((ev, cb) => {
      if (ev === "close") cb(0);
      return { on: mockOn };
    });

    await expect(service.login("u", "p")).resolves.not.toThrow();
    expect(clipboard.clear).toHaveBeenCalled();
  });

  it("login fail paths (Line 103, 109)", async () => {
    const mockOn = vi.fn();
    (cp.spawn as any).mockReturnValue({
      stdout: {
        on: vi.fn().mockImplementation((ev, cb) => {
          if (ev === "data") cb("FAIL");
          return { on: vi.fn() };
        }),
      },
      stderr: { on: vi.fn().mockReturnThis() },
      on: mockOn,
      unref: vi.fn(),
    });
    mockOn.mockImplementation((ev, cb) => {
      if (ev === "close") cb(1);
      if (ev === "error") cb(new Error("E"));
      return { on: mockOn };
    });

    await expect(service.login("u", "p")).rejects.toThrow();
  });

  it("autoDetectPaths success and fail", async () => {
    (fs.pathExists as any).mockResolvedValue(true);
    (cp.exec as any).mockImplementation((c, cb) => {
      cb(null, {
        stdout: JSON.stringify([
          { DisplayName: "Riot Client", InstallLocation: "C" },
        ]),
      });
    });
    expect(await service.autoDetectPaths()).not.toBeNull();

    (cp.exec as any).mockImplementation((c, cb) => {
      cb(new Error());
    });
    expect(await service.autoDetectPaths()).toBeNull();
  });

  it("isRiotClientRunning checks tasklist", async () => {
    (cp.exec as any).mockImplementation((c, cb) => {
      cb(null, { stdout: "RiotClientServices.exe" });
    });
    expect(await service.isRiotClientRunning()).toBe(true);

    (cp.exec as any).mockImplementation((c, cb) => {
      cb(new Error());
    });
    expect(await service.isRiotClientRunning()).toBe(false);
  });

  it("isValorantRunning checks tasklist", async () => {
    (cp.exec as any).mockImplementation((c, cb) => {
      cb(null, { stdout: "VALORANT-Win64-Shipping.exe" });
    });
    expect(await service.isValorantRunning()).toBe(true);

    (cp.exec as any).mockImplementation((c, cb) => {
      cb(new Error());
    });
    expect(await service.isValorantRunning()).toBe(false);
  });

  it("monitorRiotProcess coverage", async () => {
    const win = { webContents: { send: vi.fn() } };
    vi.spyOn(service, "isRiotClientRunning").mockResolvedValue(false);
    service.monitorRiotProcess(win as any);
    await vi.advanceTimersByTimeAsync(30000);
    expect(win.webContents.send).toHaveBeenCalled();
  });

  it("packaged path branch", async () => {
    (app as any).isPackaged = true;
    (process as any).resourcesPath = "RES";
    (cp.exec as any).mockImplementation((c, cb) => {
      cb(null, { stdout: "[]" });
    });
    await service.autoDetectPaths();
    expect(cp.exec).toHaveBeenCalledWith(
      expect.stringContaining("RES"),
      expect.anything(),
    );
  });

  it("killProcesses handles unexpected error (Line 40)", async () => {
    // Mock setTimeout to throw, forcing the outer catch block
    vi.spyOn(global, "setTimeout").mockImplementation(() => {
      throw new Error("Timeout Error");
    });
    await service.killProcesses();
    expect(global.setTimeout).toHaveBeenCalled();
  });
});
