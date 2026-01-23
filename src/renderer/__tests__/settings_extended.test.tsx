import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Settings from "../components/Settings";
import { Config } from "../../shared/types";

vi.mock("@assets/logo.png", () => ({ default: "mock-logo" }));

describe("Settings - Extended Coverage", () => {
    const mockConfig: Config = {
        riotPath: "/path/to/riot",
        autoStart: true,
        startMinimized: false,
        minimizeToTray: true,
        showQuitModal: true,
        enableGPU: false,
        security: { enabled: false },
        lastAccountId: undefined,
        hasSeenOnboarding: true,
    };

    const defaultProps = {
        config: mockConfig,
        onUpdate: vi.fn(),
        onSelectRiotPath: vi.fn(),
        onOpenPinModal: vi.fn(),
        onDisablePin: vi.fn(),
        onCheckUpdates: vi.fn(),
        onOpenGPUModal: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (window as any).ipc = {
            invoke: vi.fn(),
        };
    });

    it("doit retourner null si config est null", () => {
        const { container } = render(<Settings {...defaultProps} config={null} />);
        expect(container.firstChild).toBeNull();
    });

    it("doit afficher les paramètres avec une config valide", () => {
        render(<Settings {...defaultProps} />);
        expect(screen.getByText("Paramètres")).toBeDefined();
        expect(screen.getByText("Application")).toBeDefined();
    });

    it("doit mettre à jour showQuitModal", () => {
        render(<Settings {...defaultProps} />);

        const checkbox = screen.getByLabelText(/Confirmation de fermeture/i);
        fireEvent.click(checkbox);

        expect(defaultProps.onUpdate).toHaveBeenCalledWith({ showQuitModal: false });
    });

    it("doit mettre à jour minimizeToTray", () => {
        render(<Settings {...defaultProps} />);

        const checkbox = screen.getByLabelText(/Réduire SwitchMaster/i);
        fireEvent.click(checkbox);

        expect(defaultProps.onUpdate).toHaveBeenCalledWith({ minimizeToTray: false });
    });

    it("doit gérer autoStart et désactiver startMinimized quand autoStart est faux", async () => {
        render(<Settings {...defaultProps} />);

        const checkbox = screen.getByLabelText(/Ouvrir SwitchMaster au démarrage/i);
        fireEvent.click(checkbox);

        await waitFor(() => {
            expect(defaultProps.onUpdate).toHaveBeenCalledWith({
                autoStart: false,
                startMinimized: false
            });
            expect(window.ipc.invoke).toHaveBeenCalledWith("set-auto-start", false);
        });
    });

    it("doit gérer startMinimized quand autoStart est actif", async () => {
        render(<Settings {...defaultProps} />);

        const checkbox = screen.getByLabelText(/Démarrer en arrière-plan/i);
        fireEvent.click(checkbox);

        await waitFor(() => {
            expect(defaultProps.onUpdate).toHaveBeenCalledWith({ startMinimized: true });
            expect(window.ipc.invoke).toHaveBeenCalledWith("set-auto-start", true);
        });
    });

    it("ne doit pas appeler set-auto-start si autoStart est désactivé lors de startMinimized", () => {
        const configWithoutAutoStart = { ...mockConfig, autoStart: false };
        render(<Settings {...defaultProps} config={configWithoutAutoStart} />);

        // startMinimized devrait être disabled
        const checkbox = screen.getByLabelText(/Démarrer en arrière-plan/i);
        expect(checkbox).toHaveProperty("disabled", true);
    });

    it("appelle set-auto-start quand startMinimized change et autoStart est actif", async () => {
        // Setup config with autoStart true
        const configWithAutoStart = { ...mockConfig, autoStart: true, startMinimized: false };
        render(<Settings {...defaultProps} config={configWithAutoStart} />);

        const checkbox = screen.getByLabelText(/Démarrer en arrière-plan/i);
        // Initially enabled because autoStart is true
        expect(checkbox).not.toHaveProperty("disabled", true);

        // Click to enable startMinimized
        fireEvent.click(checkbox);

        await waitFor(() => {
            // Check update called with startMinimized: true
            expect(defaultProps.onUpdate).toHaveBeenCalledWith({ startMinimized: true });

            // Check ipc invoke called. The logic says: if (config.autoStart) set-auto-start true
            // Since we passed autoStart: true in props, this branch should be taken
            expect(window.ipc.invoke).toHaveBeenCalledWith("set-auto-start", true);
        });
    });

    it("doit appeler onOpenGPUModal quand enableGPU change", () => {
        render(<Settings {...defaultProps} />);

        const checkbox = screen.getByLabelText(/Activer l'accélération matérielle/i);
        fireEvent.click(checkbox);

        expect(defaultProps.onOpenGPUModal).toHaveBeenCalledWith(true);
    });

    it("doit appeler onSelectRiotPath au clic sur Parcourir", () => {
        render(<Settings {...defaultProps} />);

        fireEvent.click(screen.getByText("Parcourir"));

        expect(defaultProps.onSelectRiotPath).toHaveBeenCalled();
    });

    it("doit mettre à jour riotPath via le champ texte", () => {
        render(<Settings {...defaultProps} />);

        const input = screen.getByPlaceholderText(/Riot Games/i);
        fireEvent.change(input, { target: { value: "/new/path" } });

        expect(defaultProps.onUpdate).toHaveBeenCalledWith({ riotPath: "/new/path" });
    });

    it("doit appeler onOpenPinModal quand on active la sécurité", () => {
        render(<Settings {...defaultProps} />);

        const checkbox = screen.getByLabelText(/Activer la protection par PIN/i);
        fireEvent.click(checkbox);

        expect(defaultProps.onOpenPinModal).toHaveBeenCalled();
    });

    it("doit appeler onDisablePin quand on désactive la sécurité", () => {
        const configWithSecurity = {
            ...mockConfig,
            security: { enabled: true, pinHash: "hash" }
        };
        render(<Settings {...defaultProps} config={configWithSecurity} />);

        const checkbox = screen.getByLabelText(/Activer la protection par PIN/i);
        fireEvent.click(checkbox);

        expect(defaultProps.onDisablePin).toHaveBeenCalled();
    });

    it("doit afficher le bouton Modifier le PIN si la sécurité est activée", () => {
        const configWithSecurity = {
            ...mockConfig,
            security: { enabled: true, pinHash: "hash" }
        };
        render(<Settings {...defaultProps} config={configWithSecurity} />);

        const modifyButton = screen.getByText(/Définir \/ Modifier le code PIN/i);
        expect(modifyButton).toBeDefined();

        fireEvent.click(modifyButton);
        expect(defaultProps.onOpenPinModal).toHaveBeenCalled();
    });

    it("doit appeler onCheckUpdates au clic sur Mettre à jour", () => {
        render(<Settings {...defaultProps} />);

        fireEvent.click(screen.getByText("Mettre à jour"));

        expect(defaultProps.onCheckUpdates).toHaveBeenCalled();
    });
});
