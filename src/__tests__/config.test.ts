import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getConfig, saveConfig, loadConfig, decryptData, encryptData, resetConfigForTests, loadConfigSync } from "../main/config";
import fs from "fs-extra";
import { app, safeStorage } from "electron";
import path from "path";

// Mock Electron
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("C:\\Mock\\UserData"),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn().mockReturnValue(true),
    encryptString: vi.fn().mockImplementation((str) => Buffer.from(`encrypted_${str}`)),
    decryptString: vi.fn().mockImplementation((buf) => buf.toString().replace("encrypted_", "")),
  },
}));

// Mock fs-extra
vi.mock("fs-extra", () => {
  return {
    default: {
      existsSync: vi.fn(),
      readJsonSync: vi.fn(),
      writeJson: vi.fn(),
      readJson: vi.fn(),
      pathExists: vi.fn(),
      ensureDir: vi.fn(),
      readFile: vi.fn(),
      readFileSync: vi.fn(),
    },
  };
});

describe("Config Module", () => {
  const mockConfigPath = path.join("C:\\Mock\\UserData", "config.json");

  beforeEach(() => {
    vi.clearAllMocks();
    resetConfigForTests();
    // Reset config state if possible (requires exposing reset or relying on loadConfig)
    (fs.existsSync as any).mockReturnValue(false); // Default: config does not exist
    (fs.pathExists as any).mockResolvedValue(false);
    
    // Restaurer les mocks par défaut importants qui pourraient être écrasés
    (app.getPath as any).mockReturnValue("C:\\Mock\\UserData");
  });

  it("doit retourner la configuration par défaut si le fichier n'existe pas", async () => {
    await loadConfig();
    const config = getConfig();
    expect(config.autoStart).toBe(false);
    expect(config.minimizeToTray).toBe(false);
    expect(config.startMinimized).toBe(false);
    expect(config.showQuitModal).toBe(true); // Default true
    expect(config.riotPath).toBe("C:\\Riot Games\\Riot Client\\RiotClientServices.exe");
  });

  it("doit charger la configuration depuis le fichier si existant", async () => {
    (fs.pathExists as any).mockResolvedValue(true);
    (fs.readFile as any).mockResolvedValue(JSON.stringify({
      autoStart: true,
      riotPath: "D:\\Games\\Riot",
    }));

    await loadConfig();
    const config = getConfig();
    expect(config.autoStart).toBe(true);
    expect(config.riotPath).toBe("D:\\Games\\Riot");
  });

  it("doit gérer les erreurs de lecture du fichier de configuration (corrompu)", async () => {
    (fs.pathExists as any).mockResolvedValue(true);
    (fs.readFile as any).mockResolvedValue("Invalid JSON");

    // Devrait charger les valeurs par défaut et logger l'erreur (mock logger si nécessaire)
    await loadConfig();
    const config = getConfig();
    expect(config.autoStart).toBe(false); // Fallback default
  });

  it("doit sauvegarder la configuration", async () => {
    await saveConfig({ autoStart: true });
    expect(fs.ensureDir).toHaveBeenCalledWith(path.dirname(mockConfigPath));
    expect(fs.writeJson).toHaveBeenCalledWith(
      mockConfigPath,
      expect.objectContaining({ autoStart: true }),
      { spaces: 2 }
    );
    expect(getConfig().autoStart).toBe(true); // Update in memory
  });

  it("doit gérer les erreurs de sauvegarde", async () => {
    (fs.writeJson as any).mockRejectedValueOnce(new Error("Write error"));
    await expect(saveConfig({ autoStart: true })).rejects.toThrow("Write error");
  });

  it("doit charger la configuration de manière synchrone (loadConfigSync)", () => {
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(JSON.stringify({
      theme: "light"
    }));
    
    loadConfigSync();
    expect(getConfig().theme).toBe("light");
  });

  it("doit gérer les erreurs dans loadConfigSync", () => {
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockImplementation(() => { throw new Error("Sync read error"); });
    
    loadConfigSync();
    // Doit rester sur les valeurs par défaut ou précédentes
    // Pas de crash
  });

  it("doit merger correctement la configuration de sécurité partielle", async () => {
    // État initial
    await saveConfig({ security: { enabled: true, pinHash: "oldHash" } });
    
    // Mise à jour partielle (juste enabled)
    await saveConfig({ security: { enabled: false } as any });
    
    const config = getConfig();
    expect(config.security?.enabled).toBe(false);
    expect(config.security?.pinHash).toBe("oldHash"); // Doit être préservé
  });

  it("doit ignorer un fichier de configuration vide ou avec seulement des espaces", async () => {
    (fs.pathExists as any).mockResolvedValue(true);
    
    // Cas 1: Chaîne vide exacte
    (fs.readFile as any).mockResolvedValueOnce("");
    await loadConfig();
    expect(getConfig().autoStart).toBe(false);

    // Cas 2: Uniquement des espaces
    (fs.readFile as any).mockResolvedValueOnce("   ");
    await loadConfig();
    expect(getConfig().autoStart).toBe(false);
  });

  it("doit gérer saveConfig quand la config actuelle n'a pas de sécurité", async () => {
    // Force l'absence de sécurité dans la config actuelle
    resetConfigForTests(true); 
    
    // Essaye de sauver avec une nouvelle sécurité
    await saveConfig({ security: { enabled: true, pinHash: "new" } });
    
    const config = getConfig();
    expect(config.security?.enabled).toBe(true);
    expect(config.security?.pinHash).toBe("new");
  });

  describe("Encryption / Decryption", () => {
    it("doit utiliser safeStorage si disponible", () => {
      const secret = "mySecret";
      const encrypted = encryptData(secret);
      expect(encrypted).not.toBe(secret);
      expect(safeStorage.encryptString).toHaveBeenCalledWith(secret);

      const decrypted = decryptData(encrypted);
      expect(decrypted).toBe(secret);
      expect(safeStorage.decryptString).toHaveBeenCalled();
    });

    it("doit utiliser un fallback si safeStorage n'est pas disponible", () => {
      (safeStorage.isEncryptionAvailable as any).mockReturnValue(false);
      
      const secret = "fallbackSecret";
      const encrypted = encryptData(secret);
      expect(encrypted).not.toBe(secret);
      // Devrait utiliser le chiffrement base64 custom (legacy)
      
      const decrypted = decryptData(encrypted);
      expect(decrypted).toBe(secret);
    });
    
    it("doit retourner null si le déchiffrement échoue (safeStorage)", () => {
       (safeStorage.isEncryptionAvailable as any).mockReturnValue(true);
       (safeStorage.decryptString as any).mockImplementationOnce(() => {
         throw new Error("Decryption error");
       });
       
       const result = decryptData("some-data");
       expect(result).toBeNull();
    });
  });
});
