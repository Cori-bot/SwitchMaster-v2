import { renderHook, act, waitFor } from "@testing-library/react";
import { useAccounts } from "../hooks/useAccounts";
import { useAppIpc } from "../hooks/useAppIpc";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Mock logger
vi.mock("../utils/logger", () => ({
  devError: vi.fn(),
  devLog: vi.fn(),
}));

// Mock global window.ipc
const mockInvoke = vi.fn();
const mockOn = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  // Reset window.ipc
  (window as any).ipc = {
    invoke: mockInvoke,
    on: mockOn,
  };
});

afterEach(() => {
  delete (window as any).ipc;
});

describe("useAccounts", () => {
  it("doit charger les comptes au montage", async () => {
    mockInvoke.mockResolvedValueOnce([{ id: "1", name: "Test" }]);
    mockOn.mockReturnValue(() => {}); // Unsubscribe mock

    const { result } = renderHook(() => useAccounts());

    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.accounts).toEqual([{ id: "1", name: "Test" }]);
    expect(mockInvoke).toHaveBeenCalledWith("get-accounts");
  });

  it("doit gérer les erreurs de chargement des comptes", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("Fetch error"));
    
    const { result } = renderHook(() => useAccounts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.accounts).toEqual([]);
  });

  it("doit mettre à jour les comptes lors de l'événement accounts-updated", async () => {
    mockInvoke.mockResolvedValueOnce([]);
    let eventCallback: any;
    mockOn.mockImplementation((event, cb) => {
      if (event === "accounts-updated") eventCallback = cb;
      return vi.fn();
    });

    const { result } = renderHook(() => useAccounts());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      if (eventCallback) eventCallback(null, [{ id: "2", name: "Updated" }]);
    });

    expect(result.current.accounts).toEqual([{ id: "2", name: "Updated" }]);
  });

  it("doit appeler les méthodes CRUD", async () => {
    mockInvoke.mockResolvedValue([]);
    mockOn.mockReturnValue(() => {});
    const { result } = renderHook(() => useAccounts());

    await act(async () => {
      await result.current.addAccount({ name: "New" });
    });
    expect(mockInvoke).toHaveBeenCalledWith("add-account", { name: "New" });

    await act(async () => {
      await result.current.updateAccount({ id: "1", name: "Up" } as any);
    });
    expect(mockInvoke).toHaveBeenCalledWith("update-account", { id: "1", name: "Up" });

    await act(async () => {
      await result.current.deleteAccount("1");
    });
    expect(mockInvoke).toHaveBeenCalledWith("delete-account", "1");

    await act(async () => {
      await result.current.reorderAccounts(["1", "2"]);
    });
    expect(mockInvoke).toHaveBeenCalledWith("reorder-accounts", ["1", "2"]);
  });
});

describe("useAppIpc", () => {
  it("doit initialiser le statut", async () => {
    mockInvoke.mockResolvedValueOnce({ status: "Active", accountName: "Player" });
    mockOn.mockReturnValue(() => {});

    const handleSwitch = vi.fn();
    const { result } = renderHook(() => useAppIpc(handleSwitch));

    await waitFor(() => {
      expect(result.current.status.status).toContain("Actif: Player");
    });
  });

  it("doit gérer les événements système (riot-closed, quit-modal)", async () => {
    mockInvoke.mockResolvedValue({ status: "Prêt" });
    const callbacks: Record<string, Function> = {};
    mockOn.mockImplementation((event, cb) => {
      callbacks[event] = cb;
      return vi.fn();
    });

    const { result, unmount } = renderHook(() => useAppIpc(vi.fn()));

    // Riot Closed -> Refresh Status
    act(() => {
      callbacks["riot-client-closed"](null);
    });
    
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("get-status");
    });

    // Quit Modal
    act(() => {
      callbacks["show-quit-modal"](null);
    });
    expect(result.current.isQuitModalOpen).toBe(true);
    
    unmount();
  });

  it("doit gérer les événements de mise à jour", () => {
    mockInvoke.mockResolvedValue({ status: "Prêt" });
    const callbacks: Record<string, Function> = {};
    mockOn.mockImplementation((event, cb) => {
      callbacks[event] = cb;
      return vi.fn();
    });

    const { result } = renderHook(() => useAppIpc(vi.fn()));

    // Update status - Available
    act(() => {
      callbacks["update-status"](null, { status: "available", version: "2.0" });
    });
    expect(result.current.updateInfo.status).toBe("available");
    expect(result.current.updateInfo.isOpen).toBe(true);

    // Update status - Not Available (should not open)
    act(() => {
      callbacks["update-status"](null, { status: "not-available" });
    });
    expect(result.current.updateInfo.status).toBe("not-available");
    expect(result.current.updateInfo.isOpen).toBe(false);

    // Progress
    act(() => {
      callbacks["update-progress"](null, { percent: 50 });
    });
    expect(result.current.updateInfo.progress).toBe(50);

    // Downloaded
    act(() => {
      callbacks["update-downloaded"](null);
    });
    expect(result.current.updateInfo.status).toBe("downloaded");
  });

  it("doit déclencher quick-connect", () => {
    mockInvoke.mockResolvedValue({ status: "Prêt" });
    const callbacks: Record<string, Function> = {};
    mockOn.mockImplementation((event, cb) => {
      callbacks[event] = cb;
      return vi.fn();
    });

    const handleSwitch = vi.fn();
    renderHook(() => useAppIpc(handleSwitch));

    act(() => {
      callbacks["quick-connect-triggered"](null, "acc-1");
    });

    expect(handleSwitch).toHaveBeenCalledWith("acc-1", false);
  });
});