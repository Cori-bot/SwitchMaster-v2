import { describe, it, expect, vi, beforeEach } from "vitest";
import { SessionService } from "../main/services/SessionService";
import path from "path";

describe("SessionService", () => {
  let service: SessionService;
  let mockAcc: any;
  let mockAuto: any;
  let mockCfg: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAcc = {
      getCredentials: vi
        .fn()
        .mockResolvedValue({ username: "u", password: "p" }),
    };
    mockAuto = {
      killProcesses: vi.fn(),
      launchClient: vi.fn(),
      login: vi.fn(),
    };
    mockCfg = {
      getConfig: vi.fn().mockReturnValue({ riotPath: "R" }),
      saveConfig: vi.fn(),
    };
    service = new SessionService(mockAcc, mockAuto, mockCfg);
  });

  it("switchAccount success (Line 23-53)", async () => {
    expect(await service.switchAccount("id")).toBe(true);
    expect(mockAuto.launchClient).toHaveBeenCalled();
  });

  it("switchAccount handles path without .exe (Line 39-40)", async () => {
    mockCfg.getConfig.mockReturnValue({ riotPath: "C:\\Riot" });
    await service.switchAccount("id");
    expect(mockAuto.launchClient).toHaveBeenCalledWith(
      path.join("C:\\Riot", "RiotClientServices.exe"),
    );
  });

  it("switchAccount uses path as is if it ends with .exe", async () => {
    const validPath = "C:\\Riot\\RiotClientServices.exe";
    mockCfg.getConfig.mockReturnValue({ riotPath: validPath });
    await service.switchAccount("id");
    expect(mockAuto.launchClient).toHaveBeenCalledWith(validPath);
  });

  it("switchAccount uses path as is if it ends with .exe", async () => {
    const validPath = "C:\\Riot\\RiotClientServices.exe";
    mockCfg.getConfig.mockReturnValue({ riotPath: validPath });
    await service.switchAccount("id");
    expect(mockAuto.launchClient).toHaveBeenCalledWith(validPath);
  });

  it("switchAccount handles error (Line 55)", async () => {
    mockAcc.getCredentials.mockRejectedValue(new Error("FAIL"));
    await expect(service.switchAccount("id")).rejects.toThrow();
  });
});
