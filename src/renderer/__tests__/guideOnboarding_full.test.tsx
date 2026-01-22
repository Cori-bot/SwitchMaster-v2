import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import GuideOnboarding from "../components/GuideOnboarding";
import { Config } from "../../shared/types";

vi.mock("@assets/logo.png", () => ({ default: "mock-logo" }));

describe("GuideOnboarding - 100% Coverage", () => {
    const mockConfig: Config = {
        riotPath: "",
        autoStart: false,
        startMinimized: false,
        minimizeToTray: false,
        showQuitModal: true,
        enableGPU: false,
        security: { enabled: false },
        lastAccountId: undefined,
        hasSeenOnboarding: false,
    };

    const defaultProps = {
        config: mockConfig,
        onUpdateConfig: vi.fn().mockResolvedValue(undefined),
        onSelectRiotPath: vi.fn(),
        onFinish: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("doit afficher l'étape de bienvenue au démarrage", () => {
        render(<GuideOnboarding {...defaultProps} />);
        expect(screen.getByText("Bienvenue sur SwitchMaster v2")).toBeDefined();
        expect(screen.getByText("Étape 1 sur 4")).toBeDefined();
    });

    it("doit passer à l'étape suivante au clic sur Suivant", () => {
        render(<GuideOnboarding {...defaultProps} />);

        fireEvent.click(screen.getByText("Suivant"));

        expect(screen.getByText("Configuration de Riot")).toBeDefined();
        expect(screen.getByText("Étape 2 sur 4")).toBeDefined();
    });

    it("doit revenir à l'étape précédente au clic sur Précédent (ligne 62)", () => {
        render(<GuideOnboarding {...defaultProps} />);

        // Aller à l'étape 2
        fireEvent.click(screen.getByText("Suivant"));
        expect(screen.getByText("Étape 2 sur 4")).toBeDefined();

        // Revenir à l'étape 1 - TEST DE LA LIGNE 62
        fireEvent.click(screen.getByText("Précédent"));
        expect(screen.getByText("Étape 1 sur 4")).toBeDefined();
    });

    it("ne doit pas aller en arrière si on est à l'étape 1", () => {
        render(<GuideOnboarding {...defaultProps} />);

        // Le bouton Précédent est invisible à l'étape 1
        const prevButton = screen.getByText("Précédent").closest("button");
        expect(prevButton?.className).toContain("opacity-0");
    });

    it("doit désactiver Suivant à l'étape 2 si riotPath est vide", () => {
        render(<GuideOnboarding {...defaultProps} />);

        fireEvent.click(screen.getByText("Suivant"));

        const nextButton = screen.getByText("Suivant").closest("button");
        expect(nextButton).toHaveProperty("disabled", true);
    });

    it("doit activer Suivant à l'étape 2 si riotPath est défini", () => {
        const configWithPath = { ...mockConfig, riotPath: "/path/to/riot" };
        render(<GuideOnboarding {...defaultProps} config={configWithPath} />);

        fireEvent.click(screen.getByText("Suivant"));

        const nextButton = screen.getByText("Suivant").closest("button");
        expect(nextButton).toHaveProperty("disabled", false);
    });

    it("doit afficher l'étape des astuces", () => {
        const configWithPath = { ...mockConfig, riotPath: "/path/to/riot" };
        render(<GuideOnboarding {...defaultProps} config={configWithPath} />);

        fireEvent.click(screen.getByText("Suivant")); // Étape 2
        fireEvent.click(screen.getByText("Suivant")); // Étape 3

        expect(screen.getByText("Quelques astuces")).toBeDefined();
        expect(screen.getByText("Favoris")).toBeDefined();
        expect(screen.getByText("Changement Rapide")).toBeDefined();
        expect(screen.getByText("Drag & Drop")).toBeDefined();
    });

    it("doit afficher l'étape finale", () => {
        const configWithPath = { ...mockConfig, riotPath: "/path/to/riot" };
        render(<GuideOnboarding {...defaultProps} config={configWithPath} />);

        fireEvent.click(screen.getByText("Suivant")); // Étape 2
        fireEvent.click(screen.getByText("Suivant")); // Étape 3
        fireEvent.click(screen.getByText("Suivant")); // Étape 4

        expect(screen.getByText("Action !")).toBeDefined();
        expect(screen.getByText("Commencer")).toBeDefined();
    });

    it("doit appeler onFinish et onUpdateConfig au clic sur Commencer", async () => {
        const configWithPath = { ...mockConfig, riotPath: "/path/to/riot" };
        render(<GuideOnboarding {...defaultProps} config={configWithPath} />);

        // Aller jusqu'à la dernière étape
        fireEvent.click(screen.getByText("Suivant"));
        fireEvent.click(screen.getByText("Suivant"));
        fireEvent.click(screen.getByText("Suivant"));

        fireEvent.click(screen.getByText("Commencer"));

        await waitFor(() => {
            expect(defaultProps.onUpdateConfig).toHaveBeenCalledWith({ hasSeenOnboarding: true });
            expect(defaultProps.onFinish).toHaveBeenCalled();
        });
    });

    it("doit appeler onSelectRiotPath au clic sur Parcourir", () => {
        render(<GuideOnboarding {...defaultProps} />);

        fireEvent.click(screen.getByText("Suivant")); // Aller à l'étape config
        fireEvent.click(screen.getByText("Parcourir"));

        expect(defaultProps.onSelectRiotPath).toHaveBeenCalled();
    });

    it("doit mettre à jour riotPath via le champ texte", () => {
        render(<GuideOnboarding {...defaultProps} />);

        fireEvent.click(screen.getByText("Suivant"));

        const input = screen.getByPlaceholderText(/Riot Games/i);
        fireEvent.change(input, { target: { value: "/new/path" } });

        expect(defaultProps.onUpdateConfig).toHaveBeenCalledWith({ riotPath: "/new/path" });
    });

    it("doit afficher le message de succès si riotPath est défini", () => {
        const configWithPath = { ...mockConfig, riotPath: "/path/to/riot" };
        render(<GuideOnboarding {...defaultProps} config={configWithPath} />);

        fireEvent.click(screen.getByText("Suivant"));

        expect(screen.getByText("Chemin détecté avec succès")).toBeDefined();
    });
});
