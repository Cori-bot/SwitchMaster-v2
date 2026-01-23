import { app, BrowserWindow } from "electron";
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import { Account } from "../../shared/types";
import { devLog, devError } from "../logger";
import { SecurityService } from "./SecurityService";
import { StatsService } from "./StatsService";

export class AccountService {
  private accountsFile: string;

  constructor(
    private securityService: SecurityService,
    private statsService: StatsService,
  ) {
    const appDataPath = app.getPath("userData");
    this.accountsFile = path.join(appDataPath, "accounts.json");
  }

  public async getAccounts(): Promise<Account[]> {
    try {
      if (await fs.pathExists(this.accountsFile)) {
        const content = await fs.readFile(this.accountsFile, "utf-8");
        if (content && content.trim() !== "") {
          return JSON.parse(content);
        }
      }
    } catch (e) {
      devError("AccountService: Error loading accounts:", e);
    }
    return [];
  }

  private async saveAccounts(accounts: Account[]): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.accountsFile));
      await fs.writeJson(this.accountsFile, accounts, { spaces: 2 });
      devLog("AccountService: Accounts saved successfully");
    } catch (e) {
      devError("AccountService: Error saving accounts:", e);
      throw e;
    }
  }

  public async getCredentials(accountId: string): Promise<Account> {
    const accounts = await this.getAccounts();
    const account = accounts.find((a) => a.id === accountId);

    if (!account) {
      throw new Error("Account not found.");
    }

    return {
      ...account,
      username: this.securityService.decryptData(account.username || "") || "",
      password: this.securityService.decryptData(account.password || "") || "",
    };
  }

  public async addAccount(accountData: Partial<Account>): Promise<Account> {
    const { name, username, password, riotId, gameType, cardImage } =
      accountData;
    const id = crypto.randomUUID();
    const encryptedUsername = this.securityService.encryptData(username || "");
    const encryptedPassword = this.securityService.encryptData(password || "");

    const newAccount: Account = {
      id,
      name: name || "Nouveau Compte",
      username: encryptedUsername,
      password: encryptedPassword,
      riotId: riotId || "",
      gameType: gameType || "valorant",
      cardImage: cardImage || "",
      isFavorite: false,
      timestamp: Date.now(),
      stats: null,
    };

    const accounts = await this.getAccounts();

    if (newAccount.riotId) {
      try {
        newAccount.stats = await this.statsService.fetchAccountStats(
          newAccount.riotId,
          newAccount.gameType,
        );
      } catch (err) {
        devError("AccountService: Error fetching stats on addAccount:", err);
      }
    }

    accounts.push(newAccount);
    await this.saveAccounts(accounts);

    return newAccount;
  }

  public async updateAccount(accountData: Partial<Account>): Promise<Account> {
    const {
      id,
      name,
      username,
      password,
      riotId,
      gameType,
      cardImage,
      isFavorite,
    } = accountData;
    const accounts = await this.getAccounts();
    const index = accounts.findIndex((a) => a.id === id);

    if (index === -1) {
      throw new Error("Compte introuvable");
    }

    const existing = accounts[index];

    // N-encrypter que si les identifiants sont différents de ceux déjà cryptés
    const encryptedUsername =
      username && username !== existing.username
        ? this.securityService.encryptData(username)
        : existing.username;
    const encryptedPassword =
      password && password !== existing.password
        ? this.securityService.encryptData(password)
        : existing.password;

    const updatedAccount: Account = {
      ...existing,
      name: name || existing.name,
      username: encryptedUsername,
      password: encryptedPassword,
      riotId: riotId !== undefined ? riotId : existing.riotId,
      gameType: gameType || existing.gameType,
      cardImage: cardImage !== undefined ? cardImage : existing.cardImage,
      isFavorite: isFavorite !== undefined ? isFavorite : existing.isFavorite,
    };

    const needsStatsRefresh =
      updatedAccount.riotId &&
      (updatedAccount.riotId !== existing.riotId ||
        updatedAccount.gameType !== existing.gameType);

    if (needsStatsRefresh && updatedAccount.riotId) {
      try {
        updatedAccount.stats = await this.statsService.fetchAccountStats(
          updatedAccount.riotId,
          updatedAccount.gameType,
        );
      } catch (err) {
        devError("AccountService: Error fetching stats on updateAccount:", err);
      }
    }

    accounts[index] = updatedAccount;
    await this.saveAccounts(accounts);

    return updatedAccount;
  }

  public async deleteAccount(accountId: string): Promise<boolean> {
    const accounts = await this.getAccounts();
    const filtered = accounts.filter((a) => a.id !== accountId);

    if (filtered.length !== accounts.length) {
      await this.saveAccounts(filtered);
      return true;
    }
    return false;
  }

  public async reorderAccounts(ids: string[]): Promise<boolean> {
    const accounts = await this.getAccounts();
    const accountMap = new Map(accounts.map((a) => [a.id, a]));
    const reordered = ids
      .map((id) => accountMap.get(id))
      .filter((a): a is Account => !!a);

    // Add missing accounts (safety)
    accounts.forEach((a) => {
      if (!ids.includes(a.id)) reordered.push(a);
    });

    await this.saveAccounts(reordered);
    return true;
  }

  public async fetchAndSaveStats(accountId: string): Promise<any> {
    const accounts = await this.getAccounts();
    const acc = accounts.find((a) => a.id === accountId);

    if (!acc || !acc.riotId) {
      throw new Error("Invalid account or missing Riot ID");
    }

    const stats = await this.statsService.fetchAccountStats(
      acc.riotId,
      acc.gameType,
    );
    acc.stats = stats;
    await this.saveAccounts(accounts);
    return stats;
  }

  public async refreshAllAccountStats(
    mainWindow: BrowserWindow | null,
  ): Promise<void> {
    const accounts = await this.getAccounts();
    const results = await Promise.all(
      accounts.map(async (account) => {
        if (!account.riotId) return false;
        try {
          const newStats = await this.statsService.fetchAccountStats(
            account.riotId,
            account.gameType,
          );
          if (JSON.stringify(account.stats) !== JSON.stringify(newStats)) {
            account.stats = newStats;
            return true;
          }
        } catch (err) {
          devError(
            `AccountService: Failed to refresh stats for ${account.name}:`,
            err,
          );
        }
        return false;
      }),
    );

    if (results.some((changed) => changed)) {
      await this.saveAccounts(accounts);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("accounts-updated", accounts);
      }
    }
  }
}
