
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ipcMain } from "electron";
import { registerRiotHandlers } from "../main/ipc/riotHandlers";
import * as accountsModule from "../main/accounts";
import * as automationModule from "../main/automation";

vi.mock("electron", () => ({
    ipcMain: { handle: vi.fn(), removeHandler: vi.fn() },
    dialog: { showOpenDialog: vi.fn() }
}));

vi.mock("../main/config", () => ({
    getConfig: vi.fn().mockReturnValue({ riotPath: "path" }),
    saveConfig: vi.fn()
}));

vi.mock("../main/accounts", () => ({
    getAccountCredentials: vi.fn()
}));

vi.mock("../main/automation", () => ({
    killRiotProcesses: vi.fn(),
    launchRiotClient: vi.fn(),
    performAutomation: vi.fn(),
    autoDetectPaths: vi.fn()
}));

vi.mock("../main/ipc/utils", () => ({
    safeHandle: (channel: string, handler: Function) => {
        (ipcMain.handle as any)(channel, handler);
    }
}));

describe("riotHandlers coverage", () => {
    let handlers: Record<string, Function> = {};

    beforeEach(() => {
        handlers = {};
        (ipcMain.handle as any).mockImplementation((c: string, h: Function) => {
            handlers[c] = h;
        });
    });

    it("switch-account handles missing credentials (empty strings)", async () => {
        registerRiotHandlers(() => null, vi.fn(), vi.fn());

        // Mock empty credentials
        (accountsModule.getAccountCredentials as any).mockResolvedValue({});

        const handler = handlers["switch-account"];
        await handler({}, "id");

        // Verify performAutomation called with empty strings
        expect(automationModule.performAutomation).toHaveBeenCalledWith("", "");
    });
});
