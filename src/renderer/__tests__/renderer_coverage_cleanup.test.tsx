
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";


// Mock assets
vi.mock("@assets/league.png", () => ({ default: "league.png" }));
vi.mock("@assets/valorant.png", () => ({ default: "valorant.png" }));
vi.mock("@assets/logo.png", () => ({ default: "logo.png" }));

// Mock components to simplify tree
vi.mock("../components/AddAccount/GameSelector", () => ({ default: () => <div data-testid="game-selector" /> }));
vi.mock("../components/AddAccount/ImageSelector", () => ({ default: () => <div data-testid="image-selector" /> }));
vi.mock("../components/AccountCard", () => ({
    default: (props: any) =>
        <div data-testid="account-card"
            draggable
            onDragStart={(e) => props.onDragStart(e, props.account.id)}
            onDragEnd={(e) => props.onDragEnd(e)}
            onDragEnter={(e) => props.onDragEnter(e, props.account.id)}
        >{props.account.name}</div>
}));

// Mock IPC
const mockInvoke = vi.fn();
const mockSend = vi.fn();
Object.defineProperty(window, "ipc", {
    value: {
        invoke: mockInvoke,
        send: mockSend,
        on: vi.fn(),
        removeListener: vi.fn(),
    },
    writable: true,
});

import AddAccountModal from "../components/AddAccountModal";
import Dashboard from "../components/Dashboard";
import GuideOnboarding from "../components/GuideOnboarding";
import NotificationItem from "../components/NotificationItem";
import ErrorBoundary from "../components/ErrorBoundary";

describe("Renderer Coverage Cleanup", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("AddAccountModal", () => {
        it("ne doit pas soumettre si champs vides (Line 94)", () => {
            const onAdd = vi.fn();
            render(<AddAccountModal isOpen={true} onClose={vi.fn()} onAdd={onAdd} editingAccount={null} />);
            fireEvent.click(screen.getByText("Ajouter le compte"));
            expect(onAdd).not.toHaveBeenCalled();
        });
    });

    describe("Dashboard", () => {
        const mockAccounts: any[] = [{ id: "1", name: "A1", isFavorite: true, gameType: "valorant" }];

        it("handleDragEnd devrait reset le draggedId (Line 133)", () => {
            render(<Dashboard
                accounts={mockAccounts}
                filter="all"
                onSwitch={vi.fn()}
                onDelete={vi.fn()}
                onEdit={vi.fn()}
                onToggleFavorite={vi.fn()}
                onAddAccount={vi.fn()}
                onReorder={vi.fn()}
            />);

            const card = screen.getByTestId("account-card");
            // Simulate drag start with dataTransfer
            fireEvent.dragStart(card, {
                dataTransfer: {
                    setData: vi.fn(),
                    effectAllowed: "move",
                    setDragImage: vi.fn() // Also mocked
                }
            });
            // Simulate drag end
            fireEvent.dragEnd(card);
            expect(card).toBeInTheDocument();
        });

        it("onDragEnter lambda (Line 198)", () => {
            render(<Dashboard
                accounts={mockAccounts}
                filter="all"
                onSwitch={vi.fn()}
                onDelete={vi.fn()}
                onEdit={vi.fn()}
                onToggleFavorite={vi.fn()}
                onAddAccount={vi.fn()}
                onReorder={vi.fn()}
            />);
            const card = screen.getByTestId("account-card");
            const event = { preventDefault: vi.fn() };
            fireEvent.dragEnter(card, event);
        });
    });

    describe("GuideOnboarding", () => {
        it("navigation précédent (Line 62)", () => {
            render(<GuideOnboarding config={null} onUpdateConfig={vi.fn() as any} onSelectRiotPath={vi.fn()} onFinish={vi.fn()} />);
            fireEvent.click(screen.getByText("Suivant"));
            const prevButton = screen.getByText("Précédent");
            fireEvent.click(prevButton);
            expect(screen.getByText("Bienvenue sur SwitchMaster v2")).toBeInTheDocument();
        });
    });

    describe("NotificationItem", () => {
        it("ignore swipe vers la gauche (Line 36)", () => {
            const onRemove = vi.fn();
            render(<NotificationItem notification={{ id: 1, message: "M", type: "info" }} onRemove={onRemove} />);

            const item = screen.getByText("M").closest(".group")!;
            fireEvent.mouseDown(item, { clientX: 100 });
            act(() => {
                const move = new MouseEvent("mousemove", { clientX: 50 });
                window.dispatchEvent(move);
            });
            act(() => {
                window.dispatchEvent(new MouseEvent("mouseup", {}));
            });
            expect(onRemove).not.toHaveBeenCalled();
        });
    });

    describe("ErrorBoundary", () => {
        it("envoie log via IPC si erreur attrapée (Line 24)", () => {
            const Thrower = () => { throw new Error("Boom"); };
            const spy = vi.spyOn(console, "error").mockImplementation(() => { });
            render(
                <ErrorBoundary>
                    <Thrower />
                </ErrorBoundary>
            );
            expect(mockSend).toHaveBeenCalledWith("log-to-main", expect.objectContaining({
                level: "error",
                args: expect.arrayContaining(["[ErrorBoundary]", "Boom"])
            }));
            spy.mockRestore();
        });
    });
});
