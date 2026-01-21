
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import GuideOnboarding from "../components/GuideOnboarding";

// Mock framer-motion to avoid animation delays
vi.mock("framer-motion", () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("@assets/logo.png", () => ({ default: "logo.png" }));

describe("GuideOnboarding", () => {
    const defaultProps = {
        config: { riotPath: "" } as any,
        onUpdateConfig: vi.fn(),
        onSelectRiotPath: vi.fn(),
        onFinish: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("doit afficher la première étape au démarrage", () => {
        render(<GuideOnboarding {...defaultProps} />);
        expect(screen.getByText("Bienvenue sur SwitchMaster v2")).toBeInTheDocument();
        expect(screen.getByText("Étape 1 sur 4")).toBeInTheDocument();
    });

    it("doit naviguer vers l'étape suivante", () => {
        render(<GuideOnboarding {...defaultProps} />);
        const nextBtn = screen.getByText("Suivant");

        fireEvent.click(nextBtn); // Step 2 (Config)
        expect(screen.getByText("Configuration de Riot")).toBeInTheDocument();
    });

    it("doit désactiver le bouton Suivant à l'étape config si pas de riotPath", () => {
        render(<GuideOnboarding {...defaultProps} />);
        fireEvent.click(screen.getByText("Suivant")); // Go to Step 2

        const nextBtn = screen.getByText("Suivant");
        expect(nextBtn).toBeDisabled();
    });

    it("doit activer le bouton Suivant à l'étape config si riotPath présent", () => {
        const props = { ...defaultProps, config: { riotPath: "C:/Riot" } as any };
        render(<GuideOnboarding {...props} />);
        fireEvent.click(screen.getByText("Suivant")); // Go to Step 2

        const nextBtn = screen.getByText("Suivant");
        expect(nextBtn).not.toBeDisabled();
    });

    it("doit naviguer vers l'étape précédente", () => {
        render(<GuideOnboarding {...defaultProps} />);
        fireEvent.click(screen.getByText("Suivant")); // Step 2

        const prevBtn = screen.getByText("Précédent");
        fireEvent.click(prevBtn); // Back to Step 1

        expect(screen.getByText("Bienvenue sur SwitchMaster v2")).toBeInTheDocument();
    });

    it("doit appeler onUpdateConfig et onFinish à la fin", async () => {
        const props = { ...defaultProps, config: { riotPath: "C:/Riot" } as any };
        render(<GuideOnboarding {...props} />);

        // Step 1 -> 2
        fireEvent.click(screen.getByText("Suivant"));
        // Step 2 -> 3
        fireEvent.click(screen.getByText("Suivant"));
        // Step 3 -> 4
        fireEvent.click(screen.getByText("Suivant"));

        expect(screen.getByText("Vous êtes prêt !")).toBeInTheDocument();

        // Finish
        const finishBtn = screen.getByText("Commencer");
        fireEvent.click(finishBtn);

        await vi.waitFor(() => {
            expect(defaultProps.onUpdateConfig).toHaveBeenCalledWith({ hasSeenOnboarding: true });
            expect(defaultProps.onFinish).toHaveBeenCalled();
        });
    });

    it("doit gérer la saisie manuelle du chemin Riot", () => {
        render(<GuideOnboarding {...defaultProps} />);
        fireEvent.click(screen.getByText("Suivant")); // Step 2

        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "C:/NewPath" } });

        expect(defaultProps.onUpdateConfig).toHaveBeenCalledWith({ riotPath: "C:/NewPath" });
    });
});
