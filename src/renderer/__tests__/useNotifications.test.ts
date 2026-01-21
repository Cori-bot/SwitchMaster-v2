import { renderHook, act } from "@testing-library/react";
import { useNotifications } from "../hooks/useNotifications";
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("useNotifications Hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("doit ajouter une notification et la supprimer automatiquement", () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.showSuccess("Succès");
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toMatchObject({
      type: "success",
      message: "Succès"
    });

    act(() => {
      vi.advanceTimersByTime(6100);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it("doit supprimer une notification manuellement", () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.showSuccess("T");
    });

    const id = result.current.notifications[0].id;

    act(() => {
      result.current.removeNotification(id);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it("doit permettre d'afficher une erreur et une info", () => {
    const { result } = renderHook(() => useNotifications());
    act(() => { result.current.showError("E"); });
    expect(result.current.notifications[0].type).toBe("error");
    act(() => { result.current.showInfo("I"); });
    expect(result.current.notifications[1].type).toBe("info");
    expect(result.current.notifications[1].type).toBe("info");
  });

  it("ne doit pas définir de timeout si la durée est 0", () => {
    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.addNotification("No Timeout", "info", 0);
    });

    expect(result.current.notifications).toHaveLength(1);

    // Advance time significantly
    act(() => {
      vi.advanceTimersByTime(100000);
    });

    // Should still be there
    expect(result.current.notifications).toHaveLength(1);
  });
});