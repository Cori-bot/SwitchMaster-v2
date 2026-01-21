
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ErrorBoundary from "../components/ErrorBoundary";

// Component that crashes
const Bomb = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
        throw new Error("Boom!");
    }
    return <div>Safe</div>;
};

// Mock console.error to avoid cluttering test output
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => { });

describe("ErrorBoundary", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock window.location.reload
        Object.defineProperty(window, "location", {
            writable: true,
            value: { reload: vi.fn() },
        });
        // Mock window.ipc
        (window as any).ipc = { send: vi.fn() };
    });

    afterEach(() => {
        consoleErrorSpy.mockClear();
    });

    it("doit rendre les enfants quand il n'y a pas d'erreur", () => {
        render(
            <ErrorBoundary>
                <Bomb shouldThrow={false} />
            </ErrorBoundary>
        );
        expect(screen.getByText("Safe")).toBeInTheDocument();
    });

    it("doit capturer l'erreur et afficher l'UI de fallback", () => {
        render(
            <ErrorBoundary>
                <Bomb shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText("Une erreur est survenue")).toBeInTheDocument();
        expect(screen.getByText(/Boom!/)).toBeInTheDocument();

        // Check main process logging
        expect((window as any).ipc.send).toHaveBeenCalledWith('log-to-main', expect.objectContaining({
            level: 'error',
            args: expect.arrayContaining(['[ErrorBoundary]', 'Boom!'])
        }));
    });

    it("doit recharger la page au clic sur le bouton", () => {
        render(
            <ErrorBoundary>
                <Bomb shouldThrow={true} />
            </ErrorBoundary>
        );

        const reloadBtn = screen.getByText("Recharger l'application");
        fireEvent.click(reloadBtn);

        expect(window.location.reload).toHaveBeenCalled();
    });
});
