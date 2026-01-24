import { describe, it, expect, vi, beforeEach } from "vitest";
import { SecurityService } from "../main/services/SecurityService";
import { safeStorage } from "electron";
import crypto from "crypto";

vi.mock("electron", () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn(),
    encryptString: vi.fn(),
    decryptString: vi.fn(),
  },
}));

vi.mock("../main/logger", () => ({ devLog: vi.fn(), devError: vi.fn() }));

describe("SecurityService", () => {
  let service: SecurityService;
  let mockConfig: any;
  let mockConfigService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = { security: { enabled: true, pinHash: "salt:hash" } };
    mockConfigService = {
      getConfig: vi.fn(() => mockConfig),
      saveConfig: vi.fn().mockResolvedValue({}),
    };
    service = new SecurityService(mockConfigService as any);
  });

  it("verifyPin cases (Line 33, 36, 44)", async () => {
    expect(await service.verifyPin(123 as any)).toBe(false);
    mockConfig.security.enabled = false;
    expect(await service.verifyPin("any")).toBe(true);
    mockConfig.security.enabled = true;
    mockConfig.security.pinHash = crypto
      .createHash("sha256")
      .update("1234")
      .digest("hex");
    expect(await service.verifyPin("1234")).toBe(true);
    expect(mockConfigService.saveConfig).toHaveBeenCalled();
  });

  it("setPin success and fail", async () => {
    await expect(service.setPin("123")).rejects.toThrow();
    expect(await service.setPin("1234")).toBe(true);
  });

  it("disablePin cases (Line 71, 75, 82)", async () => {
    expect(await service.disablePin(null as any)).toBe(false);
    mockConfig.security.enabled = false;
    expect(await service.disablePin("any")).toBe(true);
    const salt = "s";
    const hash = crypto.createHmac("sha256", salt).update("1234").digest("hex");
    mockConfig.security.enabled = true;
    mockConfig.security.pinHash = `${salt}:${hash}`;
    expect(await service.disablePin("1234")).toBe(true);
    expect(await service.disablePin("wrong")).toBe(false);
  });

  it("isEnabled coverage", () => {
    expect(service.isEnabled()).toBe(true);
  });

  it("encryption success with safeStorage", () => {
    (safeStorage.isEncryptionAvailable as any).mockReturnValue(true);
    (safeStorage.encryptString as any).mockReturnValue(Buffer.from("cipher"));
    (safeStorage.decryptString as any).mockReturnValue("plain");
    expect(service.encryptData("plain")).toBe(
      Buffer.from("cipher").toString("base64"),
    );
    expect(service.decryptData(Buffer.from("cipher").toString("base64"))).toBe(
      "plain",
    );
  });

  it("encryption fallback when safeStorage unavailable", () => {
    (safeStorage.isEncryptionAvailable as any).mockReturnValue(false);
    expect(service.encryptData("p")).toBe(Buffer.from("p").toString("base64"));
    expect(service.decryptData(Buffer.from("p").toString("base64"))).toBe("p");
  });

  it("decryptData handles error", () => {
    (safeStorage.isEncryptionAvailable as any).mockReturnValue(true);
    (safeStorage.decryptString as any).mockImplementation(() => {
      throw new Error();
    });
    expect(service.decryptData("any")).toBeNull();
  });
});
