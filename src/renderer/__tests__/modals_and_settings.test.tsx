import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Settings from "../components/Settings";
import SecurityLock from "../components/SecurityLock";
import { DeleteConfirmModal } from "../components/Modals/DeleteConfirmModal";
import { QuitModal } from "../components/Modals/QuitModal";
import { GPUConfirmModal } from "../components/Modals/GPUConfirmModal";
import { LaunchConfirmModal } from "../components/Modals/LaunchConfirmModal";
import ErrorBoundary from "../components/ErrorBoundary";
import GuideOnboarding from "../components/GuideOnboarding";
import { vi, describe, it, expect } from "vitest";

// Mock des images
vi.mock("@assets/logo.png", () => ({ default: "mock-logo" }));
vi.mock("@assets/valorant.png", () => ({ default: "mock-val" }));
vi.mock("@assets/league.png", () => ({ default: "mock-lol" }));

describe("Settings Component", () => {
  const mockConfig = {
    riotPath: "C:\\Riot",
    theme: "dark",
    autoStart: false,
    startMinimized: false,
    minimizeToTray: false,
    showQuitModal: true,
    security: { enabled: true, pinHash: "hash" },
    hasSeenOnboarding: true,
    enableGPU: true
  };

  it("doit afficher les paramètres et gérer les changements", async () => {
    const onUpdate = vi.fn();
    render(
      <Settings
        config={mockConfig as any}
        onUpdate={onUpdate}
        onSelectRiotPath={vi.fn()}
        onOpenPinModal={vi.fn()}
        onDisablePin={vi.fn()}
        onCheckUpdates={vi.fn()}
        onOpenGPUModal={vi.fn()}
      />
    );

    expect(screen.getByText("Paramètres")).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Définir \/ Modifier le code PIN/i));
  });
});

describe("SecurityLock", () => {
  it("doit permettre de saisir un code PIN", async () => {
    const onVerify = vi.fn().mockResolvedValue(true);
    (window as any).ipc = { invoke: vi.fn().mockResolvedValue(true) };

    render(<SecurityLock mode="verify" onVerify={onVerify} onSet={vi.fn()} />);

    [1, 2, 3, 4].forEach(n => fireEvent.click(screen.getByText(n.toString())));

    await waitFor(() => expect(onVerify).toHaveBeenCalledWith("1234"));
  });
});

describe("Confirmation Modals", () => {
  it("DeleteConfirmModal doit gérer la confirmation", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<DeleteConfirmModal isOpen={true} onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: /Oui, supprimer/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("QuitModal doit gérer les actions", () => {
    const onConfirm = vi.fn();
    render(<QuitModal isOpen={true} onConfirm={onConfirm} onCancel={vi.fn()} onMinimize={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Quitter complètement/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("GPUConfirmModal doit gérer la confirmation", () => {
    const onConfirm = vi.fn();
    render(<GPUConfirmModal isOpen={true} targetValue={true} onConfirm={onConfirm} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Changer et redémarrer/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("LaunchConfirmModal doit gérer le lancement", () => {
    const onConfirm = vi.fn();
    render(<LaunchConfirmModal isOpen={true} onConfirm={onConfirm} onCancel={vi.fn()} gameType="valorant" onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Oui, lancer le jeu/i }));
    expect(onConfirm).toHaveBeenCalled();
  });
});

describe("Onboarding", () => {
  it("doit s'afficher et défiler", async () => {
    const onFinish = vi.fn();
    const onUpdateConfig = vi.fn().mockResolvedValue(undefined);
    const config = { riotPath: "C:\\Riot" }; // Important pour débloquer le bouton Suivant à l'étape 2

    render(
      <GuideOnboarding
        config={config as any}
        onUpdateConfig={onUpdateConfig}
        onSelectRiotPath={vi.fn()}
        onFinish={onFinish}
      />
    );

    expect(screen.getByText(/Bienvenue sur SwitchMaster/i)).toBeInTheDocument();

    // Cliquer sur suivant jusqu'à la fin
    const nextBtn = screen.getByRole("button", { name: /Suivant/i });
    fireEvent.click(nextBtn); // Vers étape 2
    fireEvent.click(nextBtn); // Vers étape 3
    fireEvent.click(nextBtn); // Vers étape 4 (Dernière)

    const startBtn = screen.getByRole("button", { name: /Commencer/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(onUpdateConfig).toHaveBeenCalledWith({ hasSeenOnboarding: true });
      expect(onFinish).toHaveBeenCalled();
    });
  });
});

describe("ErrorBoundary", () => {
  it("doit s'afficher en cas de crash", () => {
    const ThrowError = () => { throw new Error("Crash"); };
    vi.spyOn(console, 'error').mockImplementation(() => { });

    // Mock global window.ipc pour send
    (window as any).ipc = {
      invoke: vi.fn(),
      send: vi.fn()
    };

    render(<ErrorBoundary><ThrowError /></ErrorBoundary>);
    expect(screen.getByText(/Une erreur est survenue/i)).toBeInTheDocument();
  });
});
