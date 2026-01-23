import { describe, it, expect, vi, beforeEach } from "vitest";
import { SecurityService } from "../main/services/SecurityService";
import { ConfigService } from "../main/services/ConfigService";
import { Config } from "../shared/types";

// Mock ConfigService
vi.mock("../main/services/ConfigService");

describe("SecurityService", () => {
  let securityService: SecurityService;
  let mockConfigService: ConfigService;
  let currentConfig: Config;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Mock ConfigService
    currentConfig = {
      riotPath: "",
      theme: "dark",
      minimizeToTray: false,
      showQuitModal: true,
      autoStart: false,
      startMinimized: false,
      lastAccountId: null,
      security: {
        enabled: false,
        pinHash: null,
      },
      hasSeenOnboarding: false,
      enableGPU: false,
    };

    mockConfigService = new ConfigService();
    mockConfigService.getConfig = vi.fn().mockReturnValue(currentConfig);
    mockConfigService.saveConfig = vi
      .fn()
      .mockImplementation(async (newConfig) => {
        // Merge simulation logic for test
        if (newConfig.security && currentConfig.security) {
          currentConfig.security = {
            ...currentConfig.security,
            ...newConfig.security,
          };
        }
        return currentConfig;
      });

    securityService = new SecurityService(mockConfigService);
  });

  it("doit vérifier correctement un PIN avec le nouveau format (sel)", async () => {
    const salt = "salt123";
    const hash = require("crypto")
      .createHmac("sha256", salt)
      .update("1234")
      .digest("hex");
    const storedHash = `${salt}:${hash}`;

    currentConfig.security = {
      enabled: true,
      pinHash: storedHash,
    };

    const result = await securityService.verifyPin("1234");
    expect(result).toBe(true);
  });

  it("doit migrer un ancien PIN vers le nouveau format lors de la vérification", async () => {
    const legacyHash = require("crypto")
      .createHash("sha256")
      .update("1234")
      .digest("hex");
    currentConfig.security = {
      enabled: true,
      pinHash: legacyHash,
    };

    const result = await securityService.verifyPin("1234");
    expect(result).toBe(true);

    expect(mockConfigService.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        security: expect.objectContaining({
          pinHash: expect.stringContaining(":"),
        }),
      }),
    );
  });

  it("doit rejeter un PIN trop court lors de la création", async () => {
    await expect(securityService.setPin("123")).rejects.toThrow(
      "au moins 4 caractères",
    );
  });

  it("doit permettre de définir un nouveau PIN sécurisé", async () => {
    await securityService.setPin("5678");
    expect(mockConfigService.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        security: expect.objectContaining({
          enabled: true,
          pinHash: expect.any(String),
        }),
      }),
    );
  });

  it("doit désactiver le PIN si le code est correct", async () => {
    const salt = "salt123";
    const hash = require("crypto")
      .createHmac("sha256", salt)
      .update("1234")
      .digest("hex");
    const storedHash = `${salt}:${hash}`;

    currentConfig.security = {
      enabled: true,
      pinHash: storedHash,
    };

    const result = await securityService.disablePin("1234");
    expect(result).toBe(true);
    expect(mockConfigService.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        security: { enabled: false, pinHash: null },
      }),
    );
  });

  it("ne doit pas désactiver le PIN si le code est incorrect", async () => {
    const salt = "salt123";
    const hash = require("crypto")
      .createHmac("sha256", salt)
      .update("1234")
      .digest("hex");
    const storedHash = `${salt}:${hash}`;

    currentConfig.security = {
      enabled: true,
      pinHash: storedHash,
    };

    const result = await securityService.disablePin("wrong");
    expect(result).toBe(false);
  });

  it("doit retourner true si on essaie de désactiver un PIN déjà désactivé", async () => {
    currentConfig.security = { enabled: false, pinHash: null };

    const result = await securityService.disablePin("1234");
    expect(result).toBe(true);
    expect(mockConfigService.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ security: { enabled: false, pinHash: null } }),
    );
  });

  it("doit retourner le statut de sécurité", () => {
    currentConfig.security = { enabled: true, pinHash: "hash" };
    expect(securityService.isEnabled()).toBe(true);

    currentConfig.security = { enabled: false, pinHash: null };
    expect(securityService.isEnabled()).toBe(false);
  });
});
