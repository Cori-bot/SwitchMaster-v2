import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  loadAccountsMeta,
  saveAccountsMeta,
  addAccount,
  updateAccount,
  deleteAccount,
  getAccountCredentials,
  refreshAllAccountStats,
} from "../main/accounts";
import fs from "fs-extra";
import * as configModule from "../main/config";
import * as statsServiceModule from "../main/statsService";

// Mock des dépendances
vi.mock("fs-extra", () => ({
  default: {
    pathExists: vi.fn(),
    readFile: vi.fn(),
    writeJson: vi.fn(),
    ensureDir: vi.fn(),
  },
}));

vi.mock("../main/config");
vi.mock("../main/statsService");
vi.mock("../main/logger");

describe("Accounts Module", () => {
  const mockAccounts = [
    {
      id: "1",
      name: "Compte 1",
      riotId: "Player#1",
      username: "enc_user1",
      password: "enc_pass1",
      gameType: "valorant",
      isFavorite: false,
    },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    
    (configModule.getPaths as any).mockReturnValue({ ACCOUNTS_FILE: "mock/accounts.json" });
    (configModule.encryptData as any).mockImplementation((data: string) => `enc_${data}`);
    (configModule.decryptData as any).mockImplementation((data: string) => data.replace("enc_", ""));
    
    // Mock fs par défaut
    (fs.pathExists as any).mockResolvedValue(true);
    (fs.readFile as any).mockResolvedValue(JSON.stringify(mockAccounts));
    (fs.writeJson as any).mockResolvedValue(undefined);
    (fs.ensureDir as any).mockResolvedValue(undefined);
  });

  describe("loadAccountsMeta", () => {
    it("doit charger les comptes si le fichier existe", async () => {
      const accounts = await loadAccountsMeta();
      expect(accounts).toEqual(mockAccounts);
    });

    it("doit retourner vide si le fichier n'existe pas", async () => {
      (fs.pathExists as any).mockResolvedValue(false);
      const accounts = await loadAccountsMeta();
      expect(accounts).toEqual([]);
    });

    it("doit gérer les erreurs de lecture", async () => {
      (fs.readFile as any).mockRejectedValue(new Error("Read error"));
      const accounts = await loadAccountsMeta();
      expect(accounts).toEqual([]);
    });
  });

  describe("saveAccountsMeta", () => {
    it("doit sauvegarder les comptes", async () => {
      await saveAccountsMeta(mockAccounts as any);
      expect(fs.writeJson).toHaveBeenCalledWith("mock/accounts.json", mockAccounts, expect.anything());
    });

    it("doit propager les erreurs de sauvegarde", async () => {
      (fs.writeJson as any).mockRejectedValue(new Error("Write error"));
      await expect(saveAccountsMeta(mockAccounts as any)).rejects.toThrow("Write error");
    });
  });

  describe("addAccount", () => {
    it("doit gérer les erreurs de récupération des stats à l'ajout", async () => {
      (statsServiceModule.fetchAccountStats as any).mockRejectedValue(new Error("Stats error"));
      
      const newAccData = {
        name: "Nouveau",
        riotId: "New#1",
      };
      
      const added = await addAccount(newAccData as any);
      expect(added.stats).toBeNull();
      // On pourrait vérifier que devError a été appelé si on mockait logger
    });
    it("doit ajouter un compte et crypter les identifiants", async () => {
      const newAccData = {
        name: "Nouveau",
        username: "user",
        password: "pass",
        riotId: "New#1",
        gameType: "league",
      };
      
      const added = await addAccount(newAccData as any);
      
      expect(added.id).toBeDefined();
      expect(added.username).toBe("enc_user");
      expect(added.password).toBe("enc_pass");
      expect(statsServiceModule.fetchAccountStats).toHaveBeenCalledWith("New#1", "league");
      expect(fs.writeJson).toHaveBeenCalled();
    });
  });

  describe("updateAccount", () => {
    it("doit gérer les erreurs de récupération des stats à la mise à jour", async () => {
      (statsServiceModule.fetchAccountStats as any).mockRejectedValue(new Error("Stats error"));
      const updateData = {
        id: "1",
        riotId: "Changed#1",
      };
      
      const updated = await updateAccount(updateData as any);
      expect(updated.riotId).toBe("Changed#1");
      // Stats non mises à jour (null ou anciennes si existantes)
    });

    it("doit mettre à jour un compte existant", async () => {
      const updateData = {
        id: "1",
        name: "Compte 1 Modifié",
        isFavorite: true,
      };
      
      const updated = await updateAccount(updateData as any);
      expect(updated.name).toBe("Compte 1 Modifié");
      expect(updated.isFavorite).toBe(true);
      // Ne doit pas avoir re-crypté car pas de changement de credentials
      expect(updated.username).toBe("enc_user1");
    });

    it("doit re-crypter si mot de passe change", async () => {
      const updateData = {
        id: "1",
        password: "new_pass",
      };
      
      const updated = await updateAccount(updateData as any);
      expect(updated.password).toBe("enc_new_pass");
    });

    it("doit rafraîchir les stats si Riot ID change", async () => {
      const updateData = {
        id: "1",
        riotId: "Changed#1",
      };
      
      await updateAccount(updateData as any);
      expect(statsServiceModule.fetchAccountStats).toHaveBeenCalledWith("Changed#1", "valorant");
    });

    it("doit échouer si le compte n'existe pas", async () => {
      await expect(updateAccount({ id: "999" })).rejects.toThrow("Compte introuvable");
    });
  });

  describe("deleteAccount", () => {
    it("doit supprimer un compte", async () => {
      const success = await deleteAccount("1");
      expect(success).toBe(true);
      expect(fs.writeJson).toHaveBeenCalledWith(
        expect.any(String),
        [], // Plus de comptes
        expect.anything()
      );
    });

    it("doit retourner false si le compte n'existe pas", async () => {
      const success = await deleteAccount("999");
      expect(success).toBe(false);
    });
  });

  describe("getAccountCredentials", () => {
    it("doit retourner les identifiants décryptés", async () => {
      const creds = await getAccountCredentials("1");
      expect(creds.username).toBe("user1");
      expect(creds.password).toBe("pass1");
    });

    it("doit échouer si le compte n'existe pas", async () => {
      await expect(getAccountCredentials("999")).rejects.toThrow("Account not found");
    });
  });

  describe("refreshAllAccountStats", () => {
    it("doit ignorer les comptes sans Riot ID", async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify([
            { id: "1", name: "NoRiotId" }
        ]));
        
        const mainWindow = { webContents: { send: vi.fn() } };
        
        await refreshAllAccountStats(mainWindow as any);
        expect(statsServiceModule.fetchAccountStats).not.toHaveBeenCalled();
    });

    it("doit gérer les erreurs de rafraîchissement individuel", async () => {
        (fs.readFile as any).mockResolvedValue(JSON.stringify([
            { id: "1", name: "Compte 1", riotId: "Player#1", gameType: "valorant" }
        ]));
        (statsServiceModule.fetchAccountStats as any).mockRejectedValue(new Error("Refresh error"));
        
        const mainWindow = { webContents: { send: vi.fn() } };
        
        await refreshAllAccountStats(mainWindow as any);
        // Ne doit pas planter, et ne pas appeler send car rien n'a changé (erreur catchée)
        expect(mainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it("doit rafraîchir les stats de tous les comptes", async () => {
      (statsServiceModule.fetchAccountStats as any).mockResolvedValue({ rank: "Gold" });
      const mainWindow = { webContents: { send: vi.fn() } };
      
      await refreshAllAccountStats(mainWindow as any);
      
      expect(statsServiceModule.fetchAccountStats).toHaveBeenCalled();
      expect(fs.writeJson).toHaveBeenCalled();
      expect(mainWindow.webContents.send).toHaveBeenCalledWith("accounts-updated", expect.anything());
    });
  });
});
