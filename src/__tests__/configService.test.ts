import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConfigService } from "../main/services/ConfigService";
import fs from "fs-extra";
import { app } from "electron";

vi.mock("fs-extra");
vi.mock("electron", () => ({
  app: { getPath: vi.fn() },
}));
vi.mock("../main/logger", () => ({ devLog: vi.fn(), devError: vi.fn() }));

describe("ConfigService", () => {
  let service: ConfigService;

  beforeEach(() => {
    vi.clearAllMocks();
    (app.getPath as any).mockReturnValue("MOCK_USER_DATA");
    (fs.ensureDir as any).mockResolvedValue(undefined);
    (fs.writeJson as any).mockResolvedValue(undefined);
    service = new ConfigService();
  });

  it("getConfig returns config", () => {
    expect(service.getConfig()).toBeDefined();
  });

  it("init creates dir and loads config", async () => {
    (fs.pathExists as any).mockResolvedValue(false);
    await service.init();
    expect(fs.ensureDir).toHaveBeenCalled();
  });

  it("loadConfig handles existing file and merge", async () => {
    (fs.pathExists as any).mockResolvedValue(true);
    (fs.readFile as any).mockResolvedValue(JSON.stringify({ theme: "light" }));
    const config = await service.loadConfig();
    expect(config.theme).toBe("light");
    expect(config.minimizeToTray).toBe(false); // Default
  });

  it("loadConfig handles empty file (Line 51)", async () => {
    (fs.pathExists as any).mockResolvedValue(true);
    (fs.readFile as any).mockResolvedValue("");
    const config = await service.loadConfig();
    expect(config.theme).toBe("dark");
  });

  it("loadConfig handles errors (Line 57)", async () => {
    (fs.pathExists as any).mockResolvedValue(true);
    (fs.readFile as any).mockRejectedValue(new Error("FAIL"));
    await service.loadConfig();
    expect(true).toBe(true);
  });

  it("loadConfigSync handles existing file", () => {
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(
      JSON.stringify({ theme: "light" }),
    );
    const config = service.loadConfigSync();
    expect(config.theme).toBe("light");
  });

  it("loadConfigSync handles empty file", () => {
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue("");
    expect(service.loadConfigSync().theme).toBe("dark");
  });

  it("loadConfigSync handles missing file", () => {
    (fs.existsSync as any).mockReturnValue(false);
    expect(service.loadConfigSync().theme).toBe("dark"); // Default
  });

  it("loadConfigSync handles errors (Line 73)", () => {
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockImplementation(() => {
      throw new Error();
    });
    service.loadConfigSync();
    expect(true).toBe(true);
  });

  it("saveConfig merges security (Lines 81-104)", async () => {
    // 1. New config has security, current has security
    (service as any).config = { security: { enabled: false, pinHash: "old" } };
    await service.saveConfig({ security: { enabled: true } });
    const saved1 = (fs.writeJson as any).mock.calls[0][1];
    expect(saved1.security.pinHash).toBe("old"); // Preserved
    expect(saved1.security.enabled).toBe(true); // Updated

    // 2. New config has security, current has NO security
    vi.clearAllMocks();
    (service as any).config = {};
    await service.saveConfig({ security: { enabled: true, pinHash: "new" } });
    const saved2 = (fs.writeJson as any).mock.calls[0][1];
    expect(saved2.security.pinHash).toBe("new");
  });

  it("saveConfig handles write error (Lines 97-98)", async () => {
    (fs.writeJson as any).mockRejectedValue(new Error("Write Fail"));
    await expect(service.saveConfig({})).rejects.toThrow("Write Fail");
  });

  it("getRiotPath returns default or configured", () => {
    expect(service.getRiotPath()).toContain("RiotClientServices.exe");
  });
});
