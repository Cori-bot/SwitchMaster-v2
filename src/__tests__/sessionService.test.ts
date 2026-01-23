import { describe, it, expect, vi, beforeEach } from "vitest";
import { SessionService } from "../main/services/SessionService";
import path from "path";

describe("SessionService", () => {
  let sessionService: SessionService;
  let mockAccountService: any;
  let mockAutomationService: any;
  let mockConfigService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAccountService = {
      getCredentials: vi.fn().mockResolvedValue({
        username: "testuser",
        password: "testpassword",
      }),
    };

    mockAutomationService = {
      killProcesses: vi.fn().mockResolvedValue(undefined),
      launchClient: vi.fn().mockResolvedValue(undefined),
      login: vi.fn().mockResolvedValue(undefined),
    };

    mockConfigService = {
      getConfig: vi.fn().mockReturnValue({
        riotPath: "C:\\Riot Games",
      }),
      saveConfig: vi.fn().mockResolvedValue(undefined),
    };

    sessionService = new SessionService(
      mockAccountService,
      mockAutomationService,
      mockConfigService,
    );
  });

  it("doit orchestrer le changement de compte correctement", async () => {
    const result = await sessionService.switchAccount("acc1");

    expect(result).toBe(true);
    expect(mockAccountService.getCredentials).toHaveBeenCalledWith("acc1");
    expect(mockAutomationService.killProcesses).toHaveBeenCalled();

    // Vérifie que le chemin a été complété par .exe
    const expectedPath = path.join("C:\\Riot Games", "RiotClientServices.exe");
    expect(mockAutomationService.launchClient).toHaveBeenCalledWith(
      expectedPath,
    );

    expect(mockAutomationService.login).toHaveBeenCalledWith(
      "testuser",
      "testpassword",
    );
    expect(mockConfigService.saveConfig).toHaveBeenCalledWith({
      lastAccountId: "acc1",
    });
  });

  it("doit utiliser le chemin tel quel s'il finit déjà par .exe", async () => {
    mockConfigService.getConfig.mockReturnValue({
      riotPath: "C:\\Riot Games\\RiotClientServices.exe",
    });

    await sessionService.switchAccount("acc1");

    expect(mockAutomationService.launchClient).toHaveBeenCalledWith(
      "C:\\Riot Games\\RiotClientServices.exe",
    );
  });

  it("doit propager les erreurs", async () => {
    mockAccountService.getCredentials.mockRejectedValue(
      new Error("Account not found"),
    );

    await expect(sessionService.switchAccount("bad_acc")).rejects.toThrow(
      "Account not found",
    );
  });
});
