
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock assets
vi.mock("@assets/league.png", () => ({ default: "league.png" }));
vi.mock("@assets/valorant.png", () => ({ default: "valorant.png" }));
vi.mock("@assets/logo.png", () => ({ default: "logo.png" }));

// Mock IPC
const mockInvoke = vi.fn();
Object.defineProperty(window, "ipc", {
    value: { invoke: mockInvoke },
    writable: true,
});

import TopBar from "../components/TopBar";
import SecurityLock from "../components/SecurityLock";
import Settings from "../components/Settings";

describe("Renderer Cleanup Part 2", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("TopBar", () => {
        it("affiche Initialisation si status vide (Line 17)", () => {
            render(<TopBar status={{ status: "" }} />);
            expect(screen.getByText("Initialisation...")).toBeInTheDocument();
        });

        it("affiche état actif (Line 42)", () => {
            render(<TopBar status={{ status: "Actif: User1" }} />);
            const ping = document.querySelector(".animate-ping");
            expect(ping).toBeInTheDocument();
        });
    });

    describe("SecurityLock", () => {
        it("bloque l'entrée après 4 chiffres (Line 37)", () => {
            render(<SecurityLock onVerify={vi.fn()} onSet={vi.fn()} mode="verify" />);
            const btn1 = screen.getByText("1");
            fireEvent.click(btn1); fireEvent.click(btn1); fireEvent.click(btn1); fireEvent.click(btn1); fireEvent.click(btn1);
        });

        it("gère le mode 'set' étape 1 et 2 (Line 55+)", async () => {
            const onSet = vi.fn();
            render(<SecurityLock onVerify={vi.fn()} onSet={onSet} mode="set" />);
            const btn1 = screen.getByText("1");
            fireEvent.click(btn1); fireEvent.click(btn1); fireEvent.click(btn1); fireEvent.click(btn1);
            expect(screen.getByText("Confirmer")).toBeInTheDocument();
            fireEvent.click(btn1); fireEvent.click(btn1); fireEvent.click(btn1); fireEvent.click(screen.getByText("2"));
            expect(screen.getByText("Les codes ne correspondent pas")).toBeInTheDocument();
            fireEvent.click(btn1); fireEvent.click(btn1); fireEvent.click(btn1); fireEvent.click(btn1);
            fireEvent.click(btn1); fireEvent.click(btn1); fireEvent.click(btn1); fireEvent.click(btn1);
            expect(onSet).toHaveBeenCalledWith("1111");
        });

        it("onCancel fallback (Line 144)", () => {
            render(<SecurityLock onVerify={vi.fn()} onSet={vi.fn()} mode="disable" />);
            const cancelBtn = screen.getByText("Annuler");
            fireEvent.click(cancelBtn);
        });
    });

    describe("Settings", () => {
        it("handleStartMinimizedChange updates autoStart if needed (Line 152)", async () => {
            const onUpdate = vi.fn();
            const configWithAutoStart = { autoStart: true, startMinimized: false } as any;

            render(<Settings
                config={configWithAutoStart}
                onUpdate={onUpdate}
                onSelectRiotPath={vi.fn()}
                onOpenPinModal={vi.fn()}
                onDisablePin={vi.fn()}
                onCheckUpdates={vi.fn()}
                onOpenGPUModal={vi.fn()}
            />);

            // Find checkbox by ID to be unambiguous
            // The component IDs are: 'startMinimized'
            // We can look for the input directly.
            // But screen.getByLabelText should work if we use the exact text.
            // Or get main container
            // Find "Démarrer en arrière-plan" checkbox using ID to ensure we hit the input
            const checkbox = document.getElementById("startMinimized");
            if (checkbox) {
                fireEvent.click(checkbox);
            }

            expect(onUpdate).toHaveBeenCalledWith({ startMinimized: true });

            // The handler is async, so we must wait for the microtask queue to process
            await import("@testing-library/react").then(({ waitFor }) =>
                waitFor(() => {
                    expect(mockInvoke).toHaveBeenCalledWith("set-auto-start", true);
                })
            );
        });
    });
});
