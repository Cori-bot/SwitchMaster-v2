import { describe, it, expect, vi, beforeEach } from "vitest";
import { safeHandle } from "../main/ipc/utils";
import { ipcMain } from "electron";

// Mock electron
vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
}));

describe("IPC Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("doit enregistrer un handler IPC", () => {
    const channel = "test-channel";
    const handler = vi.fn();

    safeHandle(channel, handler);

    // Doit d'abord supprimer l'ancien handler pour éviter les doublons (bonne pratique)
    expect(ipcMain.removeHandler).toHaveBeenCalledWith(channel);
    // Puis ajouter le nouveau
    expect(ipcMain.handle).toHaveBeenCalledWith(channel, handler);
  });
});
