import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerUpdateHandlers } from "../main/ipc/updateHandlers";
import { handleUpdateCheck, simulateUpdateCheck } from "../main/updater";
import { BrowserWindow } from "electron";
import { safeHandle } from "../main/ipc/utils";

vi.mock("../main/updater", () => ({
  handleUpdateCheck: vi.fn(),
  simulateUpdateCheck: vi.fn(),
  downloadUpdate: vi.fn(),
  installUpdate: vi.fn(),
}));

vi.mock("../main/ipc/utils", () => ({
  safeHandle: vi.fn((channel, handler) => {
    // Store handlers to call them later if needed,
    // or we can just verify safeHandle calls.
    // For this test, we want to execute the callback passed to safeHandle.
    (registerUpdateHandlers as any).__handlers =
      (registerUpdateHandlers as any).__handlers || {};
    (registerUpdateHandlers as any).__handlers[channel] = handler;
  }),
}));

describe("updateHandlers", () => {
  let handlers: Record<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = {};
    (registerUpdateHandlers as any).__handlers = handlers;
  });

  it("check-updates appelle handleUpdateCheck si la fenêtre existe", async () => {
    const mockWin = { id: 1 } as unknown as BrowserWindow;
    registerUpdateHandlers(() => mockWin);

    const handler = handlers["check-updates"];
    expect(handler).toBeDefined();
    await handler();

    expect(handleUpdateCheck).toHaveBeenCalledWith(mockWin, true);
  });

  it("check-updates ne fait rien si la fenêtre n'existe pas", async () => {
    registerUpdateHandlers(() => null);

    const handler = handlers["check-updates"];
    expect(handler).toBeDefined();
    await handler();

    expect(handleUpdateCheck).not.toHaveBeenCalled();
  });

  it("simulate-update appelle simulateUpdateCheck si la fenêtre existe", async () => {
    const mockWin = { id: 1 } as unknown as BrowserWindow;
    registerUpdateHandlers(() => mockWin);

    const handler = handlers["simulate-update"];
    expect(handler).toBeDefined();
    await handler();

    expect(simulateUpdateCheck).toHaveBeenCalledWith(mockWin, true);
  });

  it("simulate-update ne fait rien si la fenêtre n'existe pas", async () => {
    registerUpdateHandlers(() => null);

    const handler = handlers["simulate-update"];
    expect(handler).toBeDefined();
    await handler();

    expect(simulateUpdateCheck).not.toHaveBeenCalled();
  });
});
