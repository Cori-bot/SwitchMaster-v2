import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupIpcHandlers } from "../main/ipc";
import * as accountHandlers from "../main/ipc/accountHandlers";
import * as configHandlers from "../main/ipc/configHandlers";
import * as riotHandlers from "../main/ipc/riotHandlers";
import * as securityHandlers from "../main/ipc/securityHandlers";
import * as miscHandlers from "../main/ipc/miscHandlers";
import * as updateHandlers from "../main/ipc/updateHandlers";
import { BrowserWindow } from "electron";

vi.mock("electron", () => ({
  BrowserWindow: vi.fn(),
}));

vi.mock("../main/ipc/accountHandlers", () => ({
  registerAccountHandlers: vi.fn(),
}));
vi.mock("../main/ipc/configHandlers", () => ({
  registerConfigHandlers: vi.fn(),
}));
vi.mock("../main/ipc/riotHandlers", () => ({
  registerRiotHandlers: vi.fn(),
}));
vi.mock("../main/ipc/securityHandlers", () => ({
  registerSecurityHandlers: vi.fn(),
}));
vi.mock("../main/ipc/miscHandlers", () => ({
  registerMiscHandlers: vi.fn(),
}));
vi.mock("../main/ipc/updateHandlers", () => ({
  registerUpdateHandlers: vi.fn(),
}));

describe("IPC Main", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules(); // Important pour reset l'état du module (singleton)
  });

  it("doit enregistrer tous les handlers et exposer getWin correct", async () => {
    // Pour tester le singleton et l'initialisation, on doit réimporter le module après resetModules
    const { setupIpcHandlers } = await import("../main/ipc");
    const accountHandlers = await import("../main/ipc/accountHandlers");

    const mockWin = { id: 1 } as unknown as BrowserWindow;
    const mockContext = { launchGame: vi.fn(), getStatus: vi.fn() } as any;
    const mockServices = {
      configService: {} as any,
      securityService: {} as any,
      accountService: {} as any,
      riotAutomationService: {} as any,
      sessionService: {} as any,
      systemService: {} as any,
      statsService: {} as any,
    };

    setupIpcHandlers(mockWin, mockContext, mockServices);

    // Verification des appels
    expect(accountHandlers.registerAccountHandlers).toHaveBeenCalled();

    // Verification du helper getWin passé aux handlers
    const getWinCallback = vi.mocked(accountHandlers.registerAccountHandlers)
      .mock.calls[0][0];
    expect(getWinCallback).toBeDefined();
    expect(getWinCallback()).toBe(mockWin); // Couvre la flèche '() => currentMainWindow'
  });

  it("ne doit pas ré-enregistrer si déjà fait (Singleton)", async () => {
    // On importe une seule fois pour garder l'état entre les appels de ce test
    const { setupIpcHandlers } = await import("../main/ipc");
    const accountHandlers = await import("../main/ipc/accountHandlers");

    const mockWin = {} as BrowserWindow;
    const mockContext = { launchGame: vi.fn(), getStatus: vi.fn() } as any;
    const mockServices = {
      configService: {} as any,
      securityService: {} as any,
      accountService: {} as any,
      riotAutomationService: {} as any,
      sessionService: {} as any,
      systemService: {} as any,
      statsService: {} as any,
    };

    // Premier appel
    setupIpcHandlers(mockWin, mockContext, mockServices);
    expect(accountHandlers.registerAccountHandlers).toHaveBeenCalledTimes(1);

    // Deuxième appel
    setupIpcHandlers(mockWin, mockContext, mockServices);
    expect(accountHandlers.registerAccountHandlers).toHaveBeenCalledTimes(1); // Pas d'appel supplémentaire
  });

  it("doit mettre à jour currentMainWindow si fourni", async () => {
    const { setupIpcHandlers } = await import("../main/ipc");
    const accountHandlers = await import("../main/ipc/accountHandlers");

    const mockWin1 = { id: 1 } as unknown as BrowserWindow;
    const mockWin2 = { id: 2 } as unknown as BrowserWindow;
    const mockContext = { launchGame: vi.fn(), getStatus: vi.fn() } as any;
    const mockServices = {
      configService: {} as any,
      securityService: {} as any,
      accountService: {} as any,
      riotAutomationService: {} as any,
      sessionService: {} as any,
      systemService: {} as any,
      statsService: {} as any,
    };

    // Premier appel avec win1
    setupIpcHandlers(mockWin1, mockContext, mockServices);

    let getWinCallback = vi.mocked(accountHandlers.registerAccountHandlers).mock
      .calls[0][0];
    expect(getWinCallback()).toBe(mockWin1);

    // Reset mocks pour simuler "déjà enregistré" mais on veut vérifier la mise à jour de la ref
    // Note: le code actuel a un early return "if (areHandlersRegistered) return;"
    // qui se trouve APRES "if (mainWindow) currentMainWindow = mainWindow;"
    // Donc currentMainWindow DEVRAIT être mis à jour même si handlers déjà registered.

    setupIpcHandlers(mockWin2, mockContext, mockServices);

    // On vérifie que le getWin (qui est une closure sur currentMainWindow) retourne maintenant la nouvelle fenêtre
    expect(getWinCallback()).toBe(mockWin2);
  });
});
