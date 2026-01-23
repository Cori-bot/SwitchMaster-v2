import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import Settings from "../components/Settings";
import { renderHook } from "@testing-library/react";
import { useConfig } from "../hooks/useConfig";
import { useSecurity } from "../hooks/useSecurity";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock global window.ipc
const mockInvoke = vi.fn();
const mockOn = vi.fn(() => vi.fn()); // Retourne une fonction de cleanup par défaut

beforeEach(() => {
  vi.clearAllMocks();
  (window as any).ipc = { invoke: mockInvoke, on: mockOn };
});

describe("useConfig", () => {
  it("doit charger et mettre à jour la config", async () => {
    mockInvoke.mockResolvedValueOnce({ riotPath: "C:\\Riot" });
    const { result } = renderHook(() => useConfig());

    await waitFor(() => expect(result.current.config?.riotPath).toBe("C:\\Riot"));

    await act(async () => {
      await result.current.updateConfig({ theme: "light" });
    });
    expect(mockInvoke).toHaveBeenCalledWith("save-config", { theme: "light" });
  });
});

describe("useSecurity", () => {
  it("doit permettre de vérifier le statut de sécurité", async () => {
    mockInvoke.mockResolvedValueOnce(true);
    const { result } = renderHook(() => useSecurity());

    await act(async () => {
      const status = await result.current.checkSecurityStatus();
      expect(status).toBe(true);
    });
    expect(result.current.isLocked).toBe(true);
  });
});

describe("Settings Deep Coverage", () => {
  const mockConfig = {
    riotPath: "C:\\Riot",
    theme: "dark",
    autoStart: true,
    startMinimized: true,
    minimizeToTray: true,
    showQuitModal: true,
    security: { enabled: true, pinHash: "somehash" },
    hasSeenOnboarding: true,
    enableGPU: true
  };

  it("doit gérer les actions complexes dans Settings", async () => {
    const onUpdate = vi.fn();
    const onOpenPinModal = vi.fn();
    const onDisablePin = vi.fn();
    const onCheckUpdates = vi.fn();
    const onOpenGPUModal = vi.fn();

    render(
      <Settings
        config={mockConfig as any}
        onUpdate={onUpdate}
        onSelectRiotPath={vi.fn()}
        onOpenPinModal={onOpenPinModal}
        onDisablePin={onDisablePin}
        onCheckUpdates={onCheckUpdates}
        onOpenGPUModal={onOpenGPUModal}
      />
    );

    fireEvent.click(screen.getByText(/Définir \/ Modifier le code PIN/i));
    expect(onOpenPinModal).toHaveBeenCalled();

    fireEvent.click(screen.getByText(/Mettre à jour/i));
    expect(onCheckUpdates).toHaveBeenCalled();

    // Toggle PIN (déjà actif -> désactiver)
    const pinCheckbox = screen.getByLabelText(/Activer la protection par PIN/i);
    fireEvent.click(pinCheckbox);
    expect(onDisablePin).toHaveBeenCalled();

    // Toggle GPU
    const gpuCheckbox = screen.getByLabelText(/Activer l'accélération matérielle/i);
    fireEvent.click(gpuCheckbox);
    expect(onOpenGPUModal).toHaveBeenCalled();
  });
});