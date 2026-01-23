import { describe, it, expect, vi, beforeEach } from "vitest";
import { AccountService } from "../main/services/AccountService";
import { SecurityService } from "../main/services/SecurityService";
import { ConfigService } from "../main/services/ConfigService";
import fs from "fs-extra";
import path from "path";
import { app } from "electron";
import { StatsService } from "../main/services/StatsService";

vi.mock("fs-extra");
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("TEST_USER_DATA"),
  },
}));
vi.mock("../main/services/StatsService", () => ({
  StatsService: vi.fn().mockImplementation(() => ({
    fetchAccountStats: vi.fn(),
  })),
}));

describe("AccountService", () => {
  let accountService: AccountService;
  let mockSecurityService: SecurityService;
  let mockStatsService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock ConfigService first as SecurityService needs it
    const mockConfigService = new ConfigService() as any;

    // Mock SecurityService
    mockSecurityService = new SecurityService(mockConfigService) as any;
    mockSecurityService.encryptData = vi.fn((data) => `encrypted_${data}`);
    mockSecurityService.decryptData = vi.fn((data) =>
      data.replace("encrypted_", ""),
    );

    mockStatsService = {
      fetchAccountStats: vi.fn(),
    };

    accountService = new AccountService(mockSecurityService, mockStatsService);
  });

  it("doit charger les comptes depuis le fichier", async () => {
    const mockAccounts = [{ id: "1", name: "Test" }];
    (fs.pathExists as any).mockResolvedValue(true);
    (fs.readFile as any).mockResolvedValue(JSON.stringify(mockAccounts));

    const accounts = await accountService.getAccounts();
    expect(accounts).toEqual(mockAccounts);
  });

  it("doit retourner un tableau vide si le fichier n'existe pas", async () => {
    (fs.pathExists as any).mockResolvedValue(false);
    const accounts = await accountService.getAccounts();
    expect(accounts).toEqual([]);
  });

  it("doit ajouter un compte avec cryptage", async () => {
    (fs.pathExists as any).mockResolvedValue(false); // Pas de comptes existants
    mockStatsService.fetchAccountStats.mockResolvedValue(null);

    const newAccount = await accountService.addAccount({
      name: "New",
      username: "user",
      password: "pass",
    });

    expect(newAccount.username).toBe("encrypted_user");
    expect(newAccount.password).toBe("encrypted_pass");
    expect(fs.writeJson).toHaveBeenCalledWith(
      expect.stringContaining("accounts.json"),
      expect.arrayContaining([expect.objectContaining({ id: newAccount.id })]),
      expect.anything(),
    );
  });

  it("doit charger les comptes depuis le fichier", async () => {
    const mockAccounts = [{ id: "1", name: "Test" }];
    (fs.pathExists as any).mockResolvedValue(true);
    (fs.readFile as any).mockResolvedValue(JSON.stringify(mockAccounts));

    const accounts = await accountService.getAccounts();
    expect(accounts).toEqual(mockAccounts);
  });

  it("doit retourner un tableau vide si le fichier n'existe pas", async () => {
    (fs.pathExists as any).mockResolvedValue(false);
    const accounts = await accountService.getAccounts();
    expect(accounts).toEqual([]);
  });

  it("doit ajouter un compte avec cryptage", async () => {
    (fs.pathExists as any).mockResolvedValue(false); // Pas de comptes existants
    mockStatsService.fetchAccountStats.mockResolvedValue(null);

    const newAccount = await accountService.addAccount({
      name: "New",
      username: "user",
      password: "pass",
    });

    expect(newAccount.username).toBe("encrypted_user");
    expect(newAccount.password).toBe("encrypted_pass");
    expect(fs.writeJson).toHaveBeenCalledWith(
      expect.stringContaining("accounts.json"),
      expect.arrayContaining([expect.objectContaining({ id: newAccount.id })]),
      expect.anything(),
    );
  });

  it("doit décrypter les credentials", async () => {
    const mockAccounts = [
      {
        id: "1",
        username: "encrypted_user",
        password: "encrypted_pass",
      },
    ];
    (fs.pathExists as any).mockResolvedValue(true);
    (fs.readFile as any).mockResolvedValue(JSON.stringify(mockAccounts));

    const account = await accountService.getCredentials("1");
    expect(account.username).toBe("user");
    expect(account.password).toBe("pass");
  });

  it("doit mettre à jour un compte", async () => {
    const mockAccounts = [{ id: "1", name: "Old", username: "encrypted_old" }];
    (fs.pathExists as any).mockResolvedValue(true);
    (fs.readFile as any).mockResolvedValue(JSON.stringify(mockAccounts));

    await accountService.updateAccount({
      id: "1",
      name: "New Name",
      username: "new_user",
    });

    expect(fs.writeJson).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({
          name: "New Name",
          username: "encrypted_new_user",
        }),
      ]),
      expect.anything(),
    );
  });

  it("doit supprimer un compte", async () => {
    const mockAccounts = [{ id: "1" }, { id: "2" }];
    (fs.pathExists as any).mockResolvedValue(true);
    (fs.readFile as any).mockResolvedValue(JSON.stringify(mockAccounts));

    const success = await accountService.deleteAccount("1");
    expect(success).toBe(true);
    expect(fs.writeJson).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining([{ id: "2" }]), // Il ne reste que le 2
      expect.anything(),
    );
    expect(fs.writeJson).toHaveBeenCalledWith(
      expect.anything(),
      expect.not.arrayContaining([{ id: "1" }]),
      expect.anything(),
    );
  });

  it("doit réordonner les comptes", async () => {
    const mockAccounts = [{ id: "1" }, { id: "2" }, { id: "3" }];
    (fs.pathExists as any).mockResolvedValue(true);
    (fs.readFile as any).mockResolvedValue(JSON.stringify(mockAccounts));

    await accountService.reorderAccounts(["3", "1", "2"]);

    expect(fs.writeJson).toHaveBeenCalledWith(
      expect.anything(),
      [
        expect.objectContaining({ id: "3" }),
        expect.objectContaining({ id: "1" }),
        expect.objectContaining({ id: "2" }),
      ],
      expect.anything(),
    );
  });
});
