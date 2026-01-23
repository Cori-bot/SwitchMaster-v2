import { describe, it, expect, vi, beforeEach } from "vitest";
import { RiotAutomationService } from "../main/services/RiotAutomationService";
import * as cp from "child_process";
import fs from "fs-extra";
import { clipboard } from "electron";

vi.mock("child_process", () => {
  const mSpawn = vi.fn();
  const mExec = vi.fn();
  return {
    spawn: mSpawn,
    exec: mExec,
    // Add default for some environments
    default: {
      spawn: mSpawn,
      exec: mExec,
    },
  };
});

vi.mock("fs-extra");
vi.mock("electron", () => ({
  app: {
    isPackaged: false,
    getAppPath: vi.fn().mockReturnValue("APP_PATH"),
    getPath: vi.fn().mockReturnValue("USER_DATA"),
  },
  clipboard: {
    clear: vi.fn(),
  },
}));
vi.mock("../main/logger");

describe("RiotAutomationService", () => {
  let service: RiotAutomationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RiotAutomationService();

    (cp.exec as any).mockImplementation(
      (cmd: string, options: any, cb: any) => {
        const callback = typeof options === "function" ? options : cb;
        if (callback) callback(null, { stdout: "stdout", stderr: "stderr" });
        return { on: vi.fn() };
      },
    );

    (cp.spawn as any).mockReturnValue({
      unref: vi.fn(),
      on: vi.fn().mockReturnThis(),
      stdout: { on: vi.fn().mockReturnThis() },
      stderr: { on: vi.fn().mockReturnThis() },
    });
  });

  it("killProcesses doit exécuter taskkill", async () => {
    await service.killProcesses();
    expect(cp.exec).toHaveBeenCalled();
  });

  it("launchClient doit spawn le processus si le fichier existe", async () => {
    (fs.pathExists as any).mockResolvedValue(true);
    await service.launchClient("C:\\Riot\\Client.exe");
    expect(cp.spawn).toHaveBeenCalled();
  });

  it("login doit exécuter le script powershell", async () => {
    const mockStdout = { on: vi.fn().mockReturnThis() };
    const mockStderr = { on: vi.fn().mockReturnThis() };
    const mockOn = vi.fn().mockReturnThis();

    (cp.spawn as any).mockReturnValue({
      stdout: mockStdout,
      stderr: mockStderr,
      on: mockOn,
      unref: vi.fn(),
    });

    mockOn.mockImplementation((event: string, cb: any) => {
      if (event === "close") cb(0);
      return { on: mockOn };
    });

    mockStdout.on.mockImplementation((event: string, cb: any) => {
      if (event === "data") cb("SUCCESS");
      return mockStdout;
    });

    await service.login("user", "pass");

    expect(cp.spawn).toHaveBeenCalled();
    expect(clipboard.clear).toHaveBeenCalled();
  });
});
