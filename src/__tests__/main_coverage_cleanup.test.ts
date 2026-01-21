
import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs-extra";

const { mocks } = vi.hoisted(() => {
    return {
        mocks: {
            exec: vi.fn(),
            spawn: vi.fn(() => ({ unref: vi.fn() })),
        }
    };
});

vi.mock("child_process", () => {
    return {
        default: {
            exec: (cmd: any, cb: any) => mocks.exec(cmd, cb),
            spawn: (...args: any[]) => mocks.spawn(...args),
        },
        exec: (cmd: any, cb: any) => mocks.exec(cmd, cb),
        spawn: (...args: any[]) => mocks.spawn(...args),
    };
});

vi.mock("util", async () => {
    const actual = await vi.importActual<any>("util");
    const result = {
        ...actual,
        promisify: (fn: any) => {
            return mocks.exec;
        }
    };
    return {
        default: result,
        ...result
    };
});

vi.mock("fs-extra");
vi.mock("electron", () => ({
    app: { getPath: vi.fn(() => "d:/fake"), isPackaged: false, setLoginItemSettings: vi.fn(), getLoginItemSettings: vi.fn() },
    safeStorage: { isEncryptionAvailable: vi.fn(() => false) },
    BrowserWindow: vi.fn(),
}));

vi.mock("../main/logger", () => ({
    devLog: vi.fn(),
    devError: vi.fn(),
    devDebug: vi.fn(),
}));

vi.mock("../main/statsService", () => ({
    fetchAccountStats: vi.fn(),
}));

// Imports must be after mocks
import * as accountsModule from "../main/accounts";
import * as appLogicModule from "../main/appLogic";
import * as configModule from "../main/config";
import { fetchAccountStats } from "../main/statsService";

describe("Main Process Cleanup", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (fs.pathExists as any).mockResolvedValue(true);
        (fs.readFile as any).mockResolvedValue("[]");
        (fs.writeJson as any).mockResolvedValue(undefined);
        (fs.ensureDir as any).mockResolvedValue(undefined);
        (fs.stat as any).mockResolvedValue({ isDirectory: () => false });
    });

    describe("accounts.ts", () => {
        it("addAccount defaults", async () => {
            const newAcc = await accountsModule.addAccount({ username: "u" });
            expect(newAcc.name).toBe("Nouveau Compte");
            expect(newAcc.riotId).toBe("");
        });

        it("addAccount with riotId", async () => {
            (fetchAccountStats as any).mockResolvedValue({ rank: "G" });
            await accountsModule.addAccount({ username: "u", riotId: "T#1" });
            expect(fetchAccountStats).toHaveBeenCalled();
        });

        it("updateAccount partials", async () => {
            const mockAccounts = [{ id: "1", username: "dXNlcg==", password: "cHc=", riotId: "R#1", gameType: "valorant" }];
            (fs.readFile as any).mockResolvedValue(JSON.stringify(mockAccounts));

            await accountsModule.updateAccount({ id: "1", cardImage: "i.png" });
            expect(fs.writeJson).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining([
                expect.objectContaining({ cardImage: "i.png" })
            ]), expect.any(Object));

            await accountsModule.updateAccount({ id: "1", username: "new" });
            expect(fs.writeJson).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining([
                expect.objectContaining({ username: "bmV3" })
            ]), expect.any(Object));
        });

        it("getAccountCredentials empty", async () => {
            (fs.readFile as any).mockResolvedValue(JSON.stringify([{ id: "1" }]));
            const c = await accountsModule.getAccountCredentials("1");
            expect(c.username).toBe("");
        });

        it("refreshAllAccountStats", async () => {
            (fs.readFile as any).mockResolvedValue(JSON.stringify([{ id: "1", riotId: "R#1", Stats: { r: 1 } }]));
            (fetchAccountStats as any).mockResolvedValue({ r: 2 });
            await accountsModule.refreshAllAccountStats({ webContents: { send: vi.fn() } } as any);
            expect(fs.writeJson).toHaveBeenCalled();
        });
    });

    describe("appLogic.ts", () => {
        it("launchGame league", async () => {
            vi.spyOn(configModule, "getConfig").mockReturnValue({ riotPath: "C:\\Riot.exe" } as any);
            await appLogicModule.launchGame("league");
            expect(mocks.spawn).toHaveBeenCalledWith(
                expect.stringContaining("RiotClientServices.exe"),
                expect.arrayContaining(["--launch-product=league_of_legends"]),
                expect.anything()
            );
        });

        it("monitorRiotProcess", async () => {
            vi.useFakeTimers();
            const onClosed = vi.fn();
            const mockWin = { webContents: { send: vi.fn() } } as any;

            appLogicModule.monitorRiotProcess(mockWin, onClosed);

            // Mock success (proc not found)
            mocks.exec.mockResolvedValueOnce({ stdout: "notepad.exe" });
            await vi.advanceTimersByTimeAsync(31000);
            expect(onClosed).toHaveBeenCalled();

            // Mock error
            mocks.exec.mockRejectedValueOnce(new Error("err"));
            await vi.advanceTimersByTimeAsync(31000);
        });
    });

    describe("config.ts", () => {
        it("ensureAppData", async () => {
            await configModule.ensureAppData();
            expect(fs.ensureDir).toHaveBeenCalled();
        });
        it("loadConfigSync default", () => {
            (fs.existsSync as any).mockReturnValue(false);
            const c = configModule.loadConfigSync();
            expect(c.theme).toBe("dark");
        });
    });
});
