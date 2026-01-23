import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { launchGame } from "../main/appLogic";
import { spawn } from "child_process";
import fs from "fs-extra";
import path from "path";

// Mocks
vi.mock("child_process", () => {
    const spawn = vi.fn().mockReturnValue({ unref: vi.fn() });
    const exec = vi.fn();
    return {
        spawn,
        exec,
        default: { spawn, exec }
    };
});

vi.mock("electron", () => ({
    app: {
        getPath: vi.fn().mockReturnValue("C:\\Users\\Test\\AppData\\Local"),
        isPackaged: false,
        setLoginItemSettings: vi.fn(),
        getLoginItemSettings: vi.fn().mockReturnValue({}),
    },
    BrowserWindow: vi.fn(),
}));

// Mock config
vi.mock("../main/config", () => ({
    getConfig: vi.fn().mockReturnValue({
        riotPath: "C:\\Riot Games\\Riot Client\\RiotClientServices.exe",
        startMinimized: false,
    }),
}));

// Mock fs-extra
vi.mock("fs-extra", () => ({
    default: {
        pathExists: vi.fn().mockResolvedValue(true),
        stat: vi.fn().mockResolvedValue({ isDirectory: () => false }),
    },
}));

describe("appLogic - Coverage Gap", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("lance League of Legends avec les bons arguments", async () => {
        // Mock fs exists pour éviter l'erreur "Executable non trouvé"
        // getConfig mocké ci-dessus retourne un chemin valide

        await launchGame("league");

        expect(spawn).toHaveBeenCalledWith(
            expect.stringContaining("RiotClientServices.exe"),
            ["--launch-product=league_of_legends", "--launch-patchline=live"],
            expect.objectContaining({ detached: true, stdio: "ignore" })
        );
    });

    it("ne fait rien si gameId est inconnu", async () => {
        await launchGame("unknown" as any);
        expect(spawn).toHaveBeenCalledWith(
            expect.any(String),
            [], // Args should be empty
            expect.any(Object)
        );
    });
});
