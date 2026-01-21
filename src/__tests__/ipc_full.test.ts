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
    });

    it("doit enregistrer tous les handlers", () => {
        const mockWin = {} as BrowserWindow;
        const mockContext = { launchGame: vi.fn(), getStatus: vi.fn() } as any;

        setupIpcHandlers(mockWin, mockContext);

        expect(accountHandlers.registerAccountHandlers).toHaveBeenCalled();
        expect(configHandlers.registerConfigHandlers).toHaveBeenCalled();
        expect(riotHandlers.registerRiotHandlers).toHaveBeenCalled();
        expect(securityHandlers.registerSecurityHandlers).toHaveBeenCalled();
        expect(miscHandlers.registerMiscHandlers).toHaveBeenCalled();
        expect(updateHandlers.registerUpdateHandlers).toHaveBeenCalled();
    });

    it("ne doit pas ré-enregistrer si déjà fait", () => {
        const mockWin = {} as BrowserWindow;
        const mockContext = { launchGame: vi.fn(), getStatus: vi.fn() } as any;

        // Un appel a déjà été fait dans le test précédent, mais comme node cache les modules, 
        // la variable locale 'areHandlersRegistered' est true.
        // Cependant en test unitaire isolé, l'état peut être reset si on utilise isolateModules,
        // mais ici on teste le comportement singleton.

        // On reset les mocks pour vérifier qu'ils ne sont PAS appelés la 2ème fois
        vi.clearAllMocks();

        setupIpcHandlers(mockWin, mockContext);

        expect(accountHandlers.registerAccountHandlers).not.toHaveBeenCalled();
    });
});
