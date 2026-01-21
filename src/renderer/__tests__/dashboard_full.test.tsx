
import { render, screen, fireEvent, act, createEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Dashboard from "../components/Dashboard";
import { Account } from "../hooks/useAccounts";

// Mock framer-motion
vi.mock("framer-motion", () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock AccountCard
vi.mock("../components/AccountCard", () => ({
    default: ({ account, onSwitch, onDelete, onEdit, onToggleFavorite, onDragStart, onDragOver, onDragEnd, onDragEnter, onDrop }: any) => (
        <div
            data-testid={`account-card-${account.id}`}
            draggable
            onDragStart={(e) => onDragStart(e, account.id)}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragEnter={(e) => onDragEnter(e)}
            onDrop={(e) => onDrop(e)}
        >
            <span>{account.name}</span>
            <button onClick={() => onSwitch(account.id)}>Switch</button>
            <button onClick={() => onDelete(account.id)}>Delete</button>
            <button onClick={() => onEdit(account)}>Edit</button>
            <button onClick={() => onToggleFavorite(account)}>Favorite</button>
        </div>
    ),
}));

const mockAccounts: Account[] = [
    { id: "1", name: "Account 1", gameType: "valorant", riotId: "User1#TAG1", isFavorite: true },
    { id: "2", name: "Account 2", gameType: "league", riotId: "User2#TAG2", isFavorite: false },
    { id: "3", name: "Account 3", gameType: "valorant", riotId: "User3#TAG3", isFavorite: false },
];

describe("Dashboard Component", () => {
    const defaultProps = {
        accounts: mockAccounts,
        filter: "all" as const,
        activeAccountId: undefined,
        onSwitch: vi.fn(),
        onDelete: vi.fn(),
        onEdit: vi.fn(),
        onToggleFavorite: vi.fn(),
        onAddAccount: vi.fn(),
        onReorder: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    describe("rendering", () => {
        it("doit afficher tous les comptes", () => {
            render(<Dashboard {...defaultProps} />);
            expect(screen.getByTestId("account-card-1")).toBeInTheDocument();
        });

        it("doit afficher l'état vide quand aucun compte", () => {
            render(<Dashboard {...defaultProps} accounts={[]} />);
            expect(screen.getByText("Aucun compte trouvé")).toBeInTheDocument();
        });

        it("doit appeler onAddAccount quand on clique sur le bouton d'ajout (état vide)", () => {
            render(<Dashboard {...defaultProps} accounts={[]} />);
            fireEvent.click(screen.getByText("Ajouter mon premier compte"));
            expect(defaultProps.onAddAccount).toHaveBeenCalled();
        });
    });

    describe("filtering", () => {
        it("doit filtrer par favoris", () => {
            render(<Dashboard {...defaultProps} filter="favorite" />);
            expect(screen.getByTestId("account-card-1")).toBeInTheDocument();
            expect(screen.queryByTestId("account-card-2")).not.toBeInTheDocument();
        });

        it("doit filtrer par valorant", () => {
            render(<Dashboard {...defaultProps} filter="valorant" />);
            expect(screen.getByTestId("account-card-1")).toBeInTheDocument();
            expect(screen.queryByTestId("account-card-2")).not.toBeInTheDocument();
        });

        it("doit filtrer par league", () => {
            render(<Dashboard {...defaultProps} filter="league" />);
            expect(screen.queryByTestId("account-card-1")).not.toBeInTheDocument();
            expect(screen.getByTestId("account-card-2")).toBeInTheDocument();
        });
    });

    describe("drag and drop", () => {
        it("doit échanger les items et appeler onReorder au drop", async () => {
            render(<Dashboard {...defaultProps} accounts={mockAccounts} />);

            // Mock getBoundingClientRect
            Element.prototype.getBoundingClientRect = vi.fn(() => ({
                width: 100,
                height: 100,
                top: 0,
                left: 0,
                bottom: 100,
                right: 100,
                x: 0,
                y: 0,
                toJSON: () => { }
            }));

            // Start dragging ID '1' (Index 0)
            const card1 = screen.getByTestId("account-card-1");
            await act(async () => {
                fireEvent.dragStart(card1, { dataTransfer: { setDragImage: vi.fn(), setData: vi.fn() } });
            });

            // Drag over ID '2' (Index 1) - Target Index > Source Index
            const card2 = screen.getByTestId("account-card-2");

            // Should swap if relativeY > 0.33. Using clientY=80 (0.8) to be safe
            await act(async () => {
                // Use createEvent to ensure clientX/Y are correctly set on the event object
                const dragOverEvent = createEvent.dragOver(card2, {
                    clientX: 0,
                    clientY: 80,
                    dataTransfer: { dropEffect: "" }
                });

                // Explicitly define properties if JSDOM/React Event system needs help
                Object.defineProperty(dragOverEvent, 'clientX', { value: 0 });
                Object.defineProperty(dragOverEvent, 'clientY', { value: 80 });

                fireEvent(card2, dragOverEvent);
                vi.runAllTimers();
            });

            // Re-query (ensure fresh handler)
            const refreshedCard2 = screen.getByTestId("account-card-2");

            await act(async () => {
                fireEvent.drop(refreshedCard2, { preventDefault: vi.fn() });
            });

            // Verify onReorder called with swapped IDs
            expect(defaultProps.onReorder).toHaveBeenCalled();
            const calledIds = defaultProps.onReorder.mock.calls[0][0];
            expect(calledIds[0]).toBe("2");
            expect(calledIds[1]).toBe("1");
        });

        it("ne doit pas échanger si les conditions de position ne sont pas remplies", async () => {
            render(<Dashboard {...defaultProps} accounts={mockAccounts} />);
            Element.prototype.getBoundingClientRect = vi.fn(() => ({
                width: 100, height: 100, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0, toJSON: () => { }
            }));

            const card1 = screen.getByTestId("account-card-1");
            await act(async () => {
                fireEvent.dragStart(card1, { dataTransfer: { setDragImage: vi.fn(), setData: vi.fn() } });
            });

            const card2 = screen.getByTestId("account-card-2");

            // Should NOT swap if relativeY < 0.33. Using clientY=10 (0.1)
            await act(async () => {
                const dragOverEvent = createEvent.dragOver(card2, {
                    clientX: 0,
                    clientY: 10,
                    dataTransfer: { dropEffect: "" }
                });
                Object.defineProperty(dragOverEvent, 'clientX', { value: 0 });
                Object.defineProperty(dragOverEvent, 'clientY', { value: 10 });

                fireEvent(card2, dragOverEvent);
                vi.runAllTimers();
            });

            const refreshedCard2 = screen.getByTestId("account-card-2");
            await act(async () => {
                fireEvent.drop(refreshedCard2, { preventDefault: vi.fn() });
            });

            expect(defaultProps.onReorder).toHaveBeenCalled();
            // Should match original order or no swap
            const calledIds = defaultProps.onReorder.mock.calls[defaultProps.onReorder.mock.calls.length - 1][0];
            expect(calledIds[0]).toBe("1");
            expect(calledIds[1]).toBe("2");
        });

        it("doit gérer le début du drag", () => {
            render(<Dashboard {...defaultProps} />);
            const card = screen.getByTestId("account-card-1");

            const dataTransfer = {
                setData: vi.fn(),
                setDragImage: vi.fn(),
                effectAllowed: "",
            };

            fireEvent.dragStart(card, { dataTransfer });
            expect(dataTransfer.setData).toHaveBeenCalledWith("accountId", "1");
            vi.runAllTimers();
        });
    });

    describe("interactions", () => {
        it("doit appeler onSwitch quand on clique sur switch", () => {
            render(<Dashboard {...defaultProps} />);
            fireEvent.click(screen.getAllByText("Switch")[0]);
            expect(defaultProps.onSwitch).toHaveBeenCalledWith("1");
        });

        it("doit appeler onDelete quand on clique sur delete", () => {
            render(<Dashboard {...defaultProps} />);
            fireEvent.click(screen.getAllByText("Delete")[0]);
            expect(defaultProps.onDelete).toHaveBeenCalledWith("1");
        });

        it("doit appeler onEdit quand on clique sur edit", () => {
            render(<Dashboard {...defaultProps} />);
            fireEvent.click(screen.getAllByText("Edit")[0]);
            expect(defaultProps.onEdit).toHaveBeenCalledWith(mockAccounts[0]);
        });

        it("doit appeler onToggleFavorite quand on clique sur favorite", () => {
            render(<Dashboard {...defaultProps} />);
            fireEvent.click(screen.getAllByText("Favorite")[0]);
            expect(defaultProps.onToggleFavorite).toHaveBeenCalledWith(mockAccounts[0]);
        });
    });
});
