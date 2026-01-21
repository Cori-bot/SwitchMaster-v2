import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QuitModal } from "../components/Modals/QuitModal";

describe("QuitModal - Extended Coverage", () => {
    const defaultProps = {
        isOpen: true,
        onConfirm: vi.fn(),
        onMinimize: vi.fn(),
        onCancel: vi.fn(),
    };

    it("ne doit pas rendre si isOpen est false", () => {
        const { container } = render(<QuitModal {...defaultProps} isOpen={false} />);
        expect(container.firstChild).toBeNull();
    });

    it("doit afficher le modal quand isOpen est true", () => {
        render(<QuitModal {...defaultProps} />);
        expect(screen.getByText("Quitter ?")).toBeDefined();
    });

    it("doit appeler onMinimize avec dontShowAgain au clic sur Réduire", () => {
        render(<QuitModal {...defaultProps} />);

        fireEvent.click(screen.getByText("Réduire dans le tray"));

        expect(defaultProps.onMinimize).toHaveBeenCalledWith(false);
    });

    it("doit appeler onMinimize avec true si dontShowAgain est coché", () => {
        render(<QuitModal {...defaultProps} />);

        // Cocher la case "Ne plus demander"
        const checkbox = screen.getByLabelText(/Ne plus demander/i);
        fireEvent.click(checkbox);

        fireEvent.click(screen.getByText("Réduire dans le tray"));

        expect(defaultProps.onMinimize).toHaveBeenCalledWith(true);
    });

    it("doit appeler onConfirm avec dontShowAgain au clic sur Quitter", () => {
        render(<QuitModal {...defaultProps} />);

        fireEvent.click(screen.getByText("Quitter complètement"));

        expect(defaultProps.onConfirm).toHaveBeenCalledWith(false);
    });

    it("doit appeler onConfirm avec true si dontShowAgain est coché", () => {
        render(<QuitModal {...defaultProps} />);

        const checkbox = screen.getByLabelText(/Ne plus demander/i);
        fireEvent.click(checkbox);

        fireEvent.click(screen.getByText("Quitter complètement"));

        expect(defaultProps.onConfirm).toHaveBeenCalledWith(true);
    });

    it("doit appeler onCancel au clic sur Annuler", () => {
        render(<QuitModal {...defaultProps} />);

        fireEvent.click(screen.getByText("Annuler"));

        expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it("doit toggle la checkbox dontShowAgain", () => {
        render(<QuitModal {...defaultProps} />);

        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).not.toBeChecked();

        fireEvent.click(checkbox);
        expect(checkbox).toBeChecked();

        fireEvent.click(checkbox);
        expect(checkbox).not.toBeChecked();
    });
});
