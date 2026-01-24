import { describe, it, expect, vi, beforeEach } from "vitest";
import { AccountService } from "../main/services/AccountService";
import { SecurityService } from "../main/services/SecurityService";
import { ConfigService } from "../main/services/ConfigService";
import { StatsService } from "../main/services/StatsService";
import fs from "fs-extra";
import { app } from "electron";

vi.mock("fs-extra");
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("TEST_USER_DATA"),
  },
  BrowserWindow: vi.fn(),
}));

vi.mock("../main/logger", () => ({
  devLog: vi.fn(),
  devError: vi.fn(),
}));

describe("AccountService", () => {
  let service: AccountService;
  let mockSec: any;
  let mockStats: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // ConfigService mock needed for SecurityService
    const mockConfigService = new ConfigService() as any;

    // Explicit mock methods for SecurityService
    mockSec = {
      encryptData: vi.fn((data) => `encrypted_${data}`),
      decryptData: vi.fn((data) => data.replace("encrypted_", "")),
    };

    mockStats = {
      fetchAccountStats: vi.fn(),
    };

    (fs.pathExists as any).mockResolvedValue(true);
    (fs.ensureDir as any).mockResolvedValue(undefined);
    (fs.writeJson as any).mockResolvedValue(undefined);

    service = new AccountService(mockSec, mockStats);
  });

  // Basic Read/Write
  it("getAccounts returns empty array on disk error", async () => {
    (fs.readFile as any).mockRejectedValue(new Error("Disk error"));
    const accounts = await service.getAccounts();
    expect(accounts).toEqual([]);
  });

  it("getAccounts returns empty array if file does not exist", async () => {
    (fs.pathExists as any).mockResolvedValue(false);
    const accounts = await service.getAccounts();
    expect(accounts).toEqual([]);
  });

  it("getAccounts handles empty file content", async () => {
    (fs.readFile as any).mockResolvedValue("   ");
    expect(await service.getAccounts()).toEqual([]);
  });

  it("saveAccounts handles write error", async () => {
    (fs.writeJson as any).mockRejectedValue(new Error("Write fail"));
    await expect(service.addAccount({})).rejects.toThrow("Write fail");
  });

  // Credential Management
  it("getCredentials returns decrypted data", async () => {
    const mock = { id: "1", username: "enc_u", password: "enc_p" };
    (fs.readFile as any).mockResolvedValue(JSON.stringify([mock]));
    mockSec.decryptData.mockReturnValueOnce("u").mockReturnValueOnce("p");

    const creds = await service.getCredentials("1");
    expect(creds.username).toBe("u");
    expect(creds.password).toBe("p");
  });

  it("getCredentials throws if account not found", async () => {
    (fs.readFile as any).mockResolvedValue("[]");
    await expect(service.getCredentials("1")).rejects.toThrow(
      "Account not found",
    );
  });

  // Account CRUD
  it("addAccount encrypts data and saves", async () => {
    (fs.readFile as any).mockResolvedValue("[]");
    const acc = await service.addAccount({ username: "u", password: "p" });
    expect(mockSec.encryptData).toHaveBeenCalledTimes(2);
    expect(fs.writeJson).toHaveBeenCalled();
    expect(acc.username).toContain("encrypted_");
  });

  it("addAccount fetches stats if Riot ID provided", async () => {
    (fs.readFile as any).mockResolvedValue("[]");
    mockStats.fetchAccountStats.mockResolvedValue({ rank: "Gold" });
    const acc = await service.addAccount({ riotId: "u#t" });
    expect(acc.stats?.rank).toBe("Gold");
  });

  it("addAccount handles stats fetch failure", async () => {
    (fs.readFile as any).mockResolvedValue("[]");
    mockStats.fetchAccountStats.mockRejectedValue(new Error("API Fail"));
    const acc = await service.addAccount({ riotId: "u#t" });
    expect(acc.stats).toBeNull();
  });

  it("updateAccount throws if not found", async () => {
    (fs.readFile as any).mockResolvedValue("[]");
    await expect(service.updateAccount({ id: "1" })).rejects.toThrow(
      "Compte introuvable",
    );
  });

  it("updateAccount only re-encrypts if changed", async () => {
    const mock = { id: "1", username: "enc_u", password: "enc_p" };
    (fs.readFile as any).mockResolvedValue(JSON.stringify([mock]));
    mockSec.decryptData.mockImplementation((d: string) =>
      d.replace("enc_", ""),
    );

    // Case 1: Same credentials
    await service.updateAccount({ id: "1", username: "u" });
    expect(mockSec.encryptData).not.toHaveBeenCalled();

    // Case 2: Changed credentials
    await service.updateAccount({ id: "1", username: "new_u" });
    expect(mockSec.encryptData).toHaveBeenCalledWith("new_u");
  });

  it("updateAccount fetches stats on Riot ID change", async () => {
    const mock = { id: "1", riotId: "old#t", gameType: "valorant" };
    (fs.readFile as any).mockResolvedValue(JSON.stringify([mock]));
    mockStats.fetchAccountStats.mockResolvedValue({ rank: "Plat" });

    const updated = await service.updateAccount({ id: "1", riotId: "new#t" });
    expect(mockStats.fetchAccountStats).toHaveBeenCalledWith(
      "new#t",
      "valorant",
    );
    expect(updated.stats?.rank).toBe("Plat");
  });

  it("updateAccount handles stats failure", async () => {
    const mock = { id: "1", riotId: "old#t", gameType: "valorant" };
    (fs.readFile as any).mockResolvedValue(JSON.stringify([mock]));
    mockStats.fetchAccountStats.mockRejectedValue(new Error("Fail"));

    await service.updateAccount({ id: "1", riotId: "new#t" });
    expect(fs.writeJson).toHaveBeenCalled(); // Still saves
  });

  it("deleteAccount removes item", async () => {
    (fs.readFile as any).mockResolvedValue(JSON.stringify([{ id: "1" }]));
    expect(await service.deleteAccount("1")).toBe(true);
    expect(fs.writeJson).toHaveBeenCalledWith(
      expect.anything(),
      [],
      expect.anything(),
    );
  });

  it("deleteAccount returns false if not found", async () => {
    (fs.readFile as any).mockResolvedValue("[]");
    expect(await service.deleteAccount("1")).toBe(false);
  });

  // Advanced Operations
  it("reorderAccounts reorders and adds missing", async () => {
    (fs.readFile as any).mockResolvedValue(
      JSON.stringify([{ id: "1" }, { id: "2" }]),
    );
    await service.reorderAccounts(["2"]);
    expect(fs.writeJson).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([{ id: "2" }, { id: "1" }]),
      expect.anything(),
    );
  });

  it("fetchAndSaveStats throws if missing ID", async () => {
    (fs.readFile as any).mockResolvedValue(JSON.stringify([{ id: "1" }]));
    await expect(service.fetchAndSaveStats("1")).rejects.toThrow(
      "missing Riot ID",
    );
  });

  it("fetchAndSaveStats saves new stats", async () => {
    (fs.readFile as any).mockResolvedValue(
      JSON.stringify([{ id: "1", riotId: "u#t" }]),
    );
    mockStats.fetchAccountStats.mockResolvedValue({ rank: "Dia" });
    const stats = await service.fetchAndSaveStats("1");
    expect(stats.rank).toBe("Dia");
    expect(fs.writeJson).toHaveBeenCalled();
  });

  it("refreshAllAccountStats updates multiple accounts", async () => {
    const mock = [
      { id: "1", riotId: "u#t", stats: { rank: "G" } },
      { id: "2" },
    ]; // 2 has no riotId
    (fs.readFile as any).mockResolvedValue(JSON.stringify(mock));
    mockStats.fetchAccountStats.mockResolvedValue({ rank: "P" });

    const win = { isDestroyed: () => false, webContents: { send: vi.fn() } };
    await service.refreshAllAccountStats(win as any);

    expect(fs.writeJson).toHaveBeenCalled();
    expect(win.webContents.send).toHaveBeenCalled();
  });

  it("refreshAllAccountStats handles partial failures", async () => {
    const mock = [{ id: "1", riotId: "u#t" }];
    (fs.readFile as any).mockResolvedValue(JSON.stringify(mock));
    mockStats.fetchAccountStats.mockRejectedValue(new Error("Fail"));

    await service.refreshAllAccountStats(null);
    expect(fs.writeJson).not.toHaveBeenCalled();
  });

  it("refreshAllAccountStats handles destroyed window", async () => {
    const mock = [{ id: "1", riotId: "u#t", stats: { rank: "G" } }];
    (fs.readFile as any).mockResolvedValue(JSON.stringify(mock));
    mockStats.fetchAccountStats.mockResolvedValue({ rank: "P" });

    const win = { isDestroyed: () => true, webContents: { send: vi.fn() } };
    await service.refreshAllAccountStats(win as any);

    expect(fs.writeJson).toHaveBeenCalled();
    expect(win.webContents.send).not.toHaveBeenCalled();
  });
});
