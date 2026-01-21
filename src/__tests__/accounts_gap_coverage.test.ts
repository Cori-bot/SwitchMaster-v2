
import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadAccountsMeta, refreshAllAccountStats } from "../main/accounts";
import fs from "fs-extra";
import { fetchAccountStats } from "../main/statsService";

// Mock dependencies
vi.mock("electron", () => ({
    BrowserWindow: vi.fn(),
}));

vi.mock("fs-extra");
vi.mock("../main/config", () => ({
    getPaths: vi.fn(() => ({ ACCOUNTS_FILE: "d:/mock/accounts.json" })),
    encryptData: vi.fn((x) => "enc_" + x),
    decryptData: vi.fn((x) => x.replace("enc_", "")),
}));

vi.mock("../main/statsService", () => ({
    fetchAccountStats: vi.fn(),
}));

vi.mock("../main/logger", () => ({
    devLog: vi.fn(),
    devError: vi.fn(),
}));

describe("accounts.ts Gap Coverage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Coverage for Line 15: Empty file content (Branches: content falsy, content truthy but empty trim)
    it("loadAccountsMeta returns empty array if file content is empty/whitespace/null", async () => {
        (fs.pathExists as any).mockResolvedValue(true);

        // 1. Whitespace
        (fs.readFile as any).mockResolvedValueOnce("   ");
        expect(await loadAccountsMeta()).toEqual([]);

        // 2. null (falsy content)
        (fs.readFile as any).mockResolvedValueOnce(null);
        expect(await loadAccountsMeta()).toEqual([]);

        // 3. empty string
        (fs.readFile as any).mockResolvedValueOnce("");
        expect(await loadAccountsMeta()).toEqual([]);
    });

    // Coverage for Line 169: Stats comparison (Branches: Same stats, Different stats)
    // Coverage for Line 187: mainWindow (Branches: Present, Null)
    it("refreshAllAccountStats handles same and different stats with/without mainWindow", async () => {
        const mockStats1 = { rank: "Gold 1", image: "img" };
        const mockStats2 = { rank: "Gold 2", image: "img2" };
        const mockAccount = {
            id: "1",
            name: "Test",
            riotId: "Test#123",
            gameType: "valorant",
            stats: mockStats1
        };

        // Case 1: Same stats -> No update
        (fs.pathExists as any).mockResolvedValue(true);
        (fs.readFile as any).mockResolvedValue(JSON.stringify([mockAccount]));
        (fetchAccountStats as any).mockResolvedValue(mockStats1);

        const mw = { webContents: { send: vi.fn() } };
        await refreshAllAccountStats(mw as any);
        expect(mw.webContents.send).not.toHaveBeenCalled();
        expect(fs.writeJson).not.toHaveBeenCalled();

        // Case 2: Different stats + mainWindow Present -> Updates and sends
        (fetchAccountStats as any).mockResolvedValueOnce(mockStats2);
        await refreshAllAccountStats(mw as any);
        expect(fs.writeJson).toHaveBeenCalled();
        expect(mw.webContents.send).toHaveBeenCalled();

        // Case 3: Different stats + mainWindow Null -> Updates but does not send
        vi.clearAllMocks();
        (fs.readFile as any).mockResolvedValue(JSON.stringify([mockAccount]));
        (fetchAccountStats as any).mockResolvedValue(mockStats2);
        await refreshAllAccountStats(null);
        expect(fs.writeJson).toHaveBeenCalled();
    });
});
