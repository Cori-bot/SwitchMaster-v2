import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerSecurityHandlers } from "../main/ipc/securityHandlers";
import * as configModule from "../main/config";
import * as utilsModule from "../main/ipc/utils";

vi.mock("../main/config");
vi.mock("../main/ipc/utils");

describe("Security Handlers", () => {
  let handlers: Record<string, Function> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};
    (utilsModule.safeHandle as any).mockImplementation((name: string, fn: Function) => {
      handlers[name] = fn;
    });
    registerSecurityHandlers();
  });

  it("doit vérifier correctement un PIN avec le nouveau format (sel)", async () => {
    // Hash HMAC-SHA256 de "1234" avec sel "salt123"
    const salt = "salt123";
    const hash = require("crypto").createHmac("sha256", salt).update("1234").digest("hex");
    const storedHash = `${salt}:${hash}`;

    const mockConfig = {
      security: {
        enabled: true,
        pinHash: storedHash
      }
    };
    (configModule.getConfig as any).mockReturnValue(mockConfig);

    const result = await handlers["verify-pin"](null, "1234");
    expect(result).toBe(true);
  });

  it("doit migrer un ancien PIN vers le nouveau format lors de la vérification", async () => {
    const legacyHash = require("crypto").createHash("sha256").update("1234").digest("hex");
    const mockConfig = {
      security: {
        enabled: true,
        pinHash: legacyHash
      }
    };
    (configModule.getConfig as any).mockReturnValue(mockConfig);

    const result = await handlers["verify-pin"](null, "1234");
    expect(result).toBe(true);
    
    // Vérifier que saveConfig a été appelé pour la migration
    expect(configModule.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        security: expect.objectContaining({
          pinHash: expect.stringContaining(":")
        })
      })
    );
  });

  it("doit rejeter un PIN trop court", async () => {
    await expect(handlers["set-pin"](null, "123")).rejects.toThrow("au moins 4 caractères");
  });

  it("doit permettre de définir un nouveau PIN sécurisé", async () => {
    await handlers["set-pin"](null, "5678");
    expect(configModule.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        security: expect.objectContaining({
          enabled: true,
          pinHash: expect.any(String)
        })
      })
    );
  });

  it("doit désactiver le PIN si le code est correct", async () => {
    const salt = "salt123";
    const hash = require("crypto").createHmac("sha256", salt).update("1234").digest("hex");
    const storedHash = `${salt}:${hash}`;

    const mockConfig = {
      security: {
        enabled: true,
        pinHash: storedHash
      }
    };
    (configModule.getConfig as any).mockReturnValue(mockConfig);

    const result = await handlers["disable-pin"](null, "1234");
    expect(result).toBe(true);
    expect(configModule.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        security: { enabled: false, pinHash: null }
      })
    );
  });

  it("ne doit pas désactiver le PIN si le code est incorrect", async () => {
    const salt = "salt123";
    const hash = require("crypto").createHmac("sha256", salt).update("1234").digest("hex");
    const storedHash = `${salt}:${hash}`;

    const mockConfig = {
      security: {
        enabled: true,
        pinHash: storedHash
      }
    };
    (configModule.getConfig as any).mockReturnValue(mockConfig);

    const result = await handlers["disable-pin"](null, "wrong");
    expect(result).toBe(false);
  });

  it("doit retourner true si on essaie de désactiver un PIN déjà désactivé", async () => {
    (configModule.getConfig as any).mockReturnValue({ security: { enabled: false } });
    const result = await handlers["disable-pin"](null, "1234");
    expect(result).toBe(true);
    expect(configModule.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ security: { enabled: false, pinHash: null } })
    );
  });

  it("doit gérer les entrées non-string pour disable-pin", async () => {
    expect(await handlers["disable-pin"](null, 1234)).toBe(false);
  });

  it("doit retourner le statut de sécurité", () => {
    (configModule.getConfig as any).mockReturnValue({ security: { enabled: true } });
    expect(handlers["get-security-status"]()).toBe(true);

    (configModule.getConfig as any).mockReturnValue({ security: { enabled: false } });
    expect(handlers["get-security-status"]()).toBe(false);

    (configModule.getConfig as any).mockReturnValue({});
    expect(handlers["get-security-status"]()).toBe(false);
  });

  it("doit gérer les entrées non-string pour verify-pin", async () => {
    expect(await handlers["verify-pin"](null, 1234)).toBe(false);
    expect(await handlers["verify-pin"](null, null)).toBe(false);
  });
});
