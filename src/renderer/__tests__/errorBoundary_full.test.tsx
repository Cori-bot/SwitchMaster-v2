import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ErrorBoundary from "../components/ErrorBoundary";

// Composant qui lance une erreur pour tester ErrorBoundary
const ProblematicComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
    if (shouldThrow) {
        throw new Error("Test error message");
    }
    return <div>Normal content</div>;
};

describe("ErrorBoundary - 100% Coverage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Supprimer console.error pour éviter les logs pendant les tests
        vi.spyOn(console, "error").mockImplementation(() => { });
    });

    it("doit afficher les enfants quand il n'y a pas d'erreur", () => {
        render(
            <ErrorBoundary>
                <div>Children content</div>
            </ErrorBoundary>
        );
        expect(screen.getByText("Children content")).toBeDefined();
    });

    it("doit afficher le message d'erreur quand un enfant lance une exception", () => {
        render(
            <ErrorBoundary>
                <ProblematicComponent shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText("Une erreur est survenue")).toBeDefined();
        expect(screen.getByText(/Test error message/)).toBeDefined();
        expect(screen.getByText("Recharger l'application")).toBeDefined();
    });

    it("doit gérer le cas où window.ipc existe", () => {
        const mockSend = vi.fn();
        (window as any).ipc = { send: mockSend };

        render(
            <ErrorBoundary>
                <ProblematicComponent shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(mockSend).toHaveBeenCalledWith("log-to-main", expect.objectContaining({
            level: "error",
            args: expect.arrayContaining(["[ErrorBoundary]", "Test error message"])
        }));
    });

    it("doit gérer le cas où window.ipc n'existe pas", () => {
        // Supprimer window.ipc pour couvrir la branche ligne 24
        delete (window as any).ipc;

        // Devrait ne pas crasher même sans ipc
        render(
            <ErrorBoundary>
                <ProblematicComponent shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText("Une erreur est survenue")).toBeDefined();
    });

    it("doit recharger la page au clic sur le bouton", () => {
        const mockReload = vi.fn();
        Object.defineProperty(window, "location", {
            value: { reload: mockReload },
            writable: true,
        });

        render(
            <ErrorBoundary>
                <ProblematicComponent shouldThrow={true} />
            </ErrorBoundary>
        );

        fireEvent.click(screen.getByText("Recharger l'application"));
        expect(mockReload).toHaveBeenCalled();
    });
});
