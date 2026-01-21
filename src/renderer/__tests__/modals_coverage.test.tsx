
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GPUConfirmModal } from "../components/Modals/GPUConfirmModal";
import { LaunchConfirmModal } from "../components/Modals/LaunchConfirmModal";

describe("Modals Coverage", () => {
    describe("GPUConfirmModal", () => {
        it("ne doit rien afficher si isOpen est false", () => {
            const { container } = render(
                <GPUConfirmModal
                    isOpen={false}
                    targetValue={true}
                    onConfirm={vi.fn()}
                    onCancel={vi.fn()}
                />
            );
            expect(container.firstChild).toBeNull();
        });

        it("doit afficher le message d'activation", () => {
            render(
                <GPUConfirmModal
                    isOpen={true}
                    targetValue={true}
                    onConfirm={vi.fn()}
                    onCancel={vi.fn()}
                />
            );
            expect(screen.getByText(/L'activation de l'accélération matérielle/)).toBeInTheDocument();
        });

        it("doit afficher le message de désactivation", () => {
            render(
                <GPUConfirmModal
                    isOpen={true}
                    targetValue={false}
                    onConfirm={vi.fn()}
                    onCancel={vi.fn()}
                />
            );
            expect(screen.getByText(/La désactivation de l'accélération matérielle/)).toBeInTheDocument();
        });

        it("doit gérer les clics confirm/cancel", () => {
            const onConfirm = vi.fn();
            const onCancel = vi.fn();
            render(
                <GPUConfirmModal
                    isOpen={true}
                    targetValue={true}
                    onConfirm={onConfirm}
                    onCancel={onCancel}
                />
            );

            fireEvent.click(screen.getByText("Changer et redémarrer"));
            expect(onConfirm).toHaveBeenCalled();

            fireEvent.click(screen.getByText("Annuler"));
            expect(onCancel).toHaveBeenCalled();
        });
    });

    describe("LaunchConfirmModal", () => {
        it("ne doit rien afficher si isOpen est false", () => {
            const { container } = render(
                <LaunchConfirmModal
                    isOpen={false}
                    gameType="valorant"
                    onConfirm={vi.fn()}
                    onCancel={vi.fn()}
                    onClose={vi.fn()}
                />
            );
            expect(container.firstChild).toBeNull();
        });

        it("doit afficher les infos Valorant", () => {
            render(
                <LaunchConfirmModal
                    isOpen={true}
                    gameType="valorant"
                    onConfirm={vi.fn()}
                    onCancel={vi.fn()}
                    onClose={vi.fn()}
                />
            );
            expect(screen.getByText(/Voulez-vous lancer/)).toBeInTheDocument();
            expect(screen.getByText("Valorant")).toBeInTheDocument();
            // Check style specific (optional but confirm branch coverage for styles)
            const button = screen.getByText("Oui, lancer le jeu");
            expect(button.className).toContain("bg-[#ff4655]");
        });

        it("doit afficher les infos League", () => {
            render(
                <LaunchConfirmModal
                    isOpen={true}
                    gameType="league"
                    onConfirm={vi.fn()}
                    onCancel={vi.fn()}
                    onClose={vi.fn()}
                />
            );
            expect(screen.getByText("League of Legends")).toBeInTheDocument();
            const button = screen.getByText("Oui, lancer le jeu");
            expect(button.className).toContain("bg-blue-600");
        });

        it("doit gérer les interactions", () => {
            const onConfirm = vi.fn();
            const onCancel = vi.fn();
            const onClose = vi.fn();

            render(
                <LaunchConfirmModal
                    isOpen={true}
                    gameType="valorant"
                    onConfirm={onConfirm}
                    onCancel={onCancel}
                    onClose={onClose}
                />
            );

            // Confirm
            fireEvent.click(screen.getByText("Oui, lancer le jeu"));
            expect(onConfirm).toHaveBeenCalled();

            // Cancel
            fireEvent.click(screen.getByText("Non, juste changer le compte"));
            expect(onCancel).toHaveBeenCalled();

            // Close (X button, assumes it's the only logic-less button or look for SVG/ARIA)
            // The X button is top-right
            const closeBtn = screen.getAllByRole("button")[0]; // First button typically
            fireEvent.click(closeBtn);
            expect(onClose).toHaveBeenCalled();
        });
    });
});
