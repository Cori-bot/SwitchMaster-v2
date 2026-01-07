import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerVisperHandlers } from "../main/ipc/visperHandlers";
import { RiotService } from "../main/visper/riotService";

// Mock safeHandle to capture handlers
const handlers: Record<string, Function> = {};
vi.mock("../main/ipc/utils", () => ({
    safeHandle: (channel: string, handler: Function) => {
        handlers[channel] = handler;
    }
}));

// Mock RiotService
vi.mock("../main/visper/riotService", () => ({
    RiotService: {
        getPregameMatchId: vi.fn(),
        selectAgent: vi.fn(),
        lockAgent: vi.fn(),
        getPartyState: vi.fn(),
        setReady: vi.fn(),
        changeQueue: vi.fn(),
        setPreferredPods: vi.fn(),
        refreshPings: vi.fn(),
        setAccessibility: vi.fn(),
        startMatchmaking: vi.fn(),
        stopMatchmaking: vi.fn(),
        leaveParty: vi.fn(),
        generatePartyCode: vi.fn(),
        removePartyCode: vi.fn(),
        inviteByDisplayName: vi.fn(),
        joinPartyByCode: vi.fn(),
        getFriends: vi.fn(),
    }
}));

describe("Visper Handlers", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear handlers map
        for (const key in handlers) delete handlers[key];
        registerVisperHandlers(() => null);
    });

    it("should register agent selection handlers", () => {
        expect(handlers["visper-get-pregame-match"]).toBeDefined();
        expect(handlers["visper-select-agent"]).toBeDefined();
        expect(handlers["visper-lock-agent"]).toBeDefined();
    });

    it("should call RiotService.getPregameMatchId", async () => {
        const mockSession = { puuid: "test" };
        await handlers["visper-get-pregame-match"]({}, mockSession);
        expect(RiotService.getPregameMatchId).toHaveBeenCalledWith(mockSession);
    });

    it("should call RiotService.selectAgent", async () => {
        const mockSession = { puuid: "test" };
        await handlers["visper-select-agent"]({}, mockSession, "match1", "agent1");
        expect(RiotService.selectAgent).toHaveBeenCalledWith(mockSession, "match1", "agent1");
    });

    it("should call RiotService.lockAgent", async () => {
        const mockSession = { puuid: "test" };
        await handlers["visper-lock-agent"]({}, mockSession, "match1", "agent1");
        expect(RiotService.lockAgent).toHaveBeenCalledWith(mockSession, "match1", "agent1");
    });
});
