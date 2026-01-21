
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Dashboard from "../components/Dashboard";
import { Account } from "../hooks/useAccounts";

// Mock framer-motion
vi.mock("framer-motion", () => ({
    motion: {
        div: ({ children, initial, animate, exit, variants, transition, whileHover, whileTap, layout, ...props }: any) => (
            <div {...props}>{children}</div>
        ),
        button: ({ children, initial, animate, exit, variants, transition, whileHover, whileTap, layout, ...props }: any) => (
            <button {...props}>{children}</button>
        ),
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
            expect(screen.getByTestId("account-card-2")).toBeInTheDocument();
            expect(screen.getByTestId("account-card-3")).toBeInTheDocument();
        });

        it("doit afficher l'état vide quand aucun compte", () => {
            render(<Dashboard {...defaultProps} accounts={[]} />);
            expect(screen.getByText("Aucun compte trouvé")).toBeInTheDocument();
            expect(screen.getByText("Ajouter mon premier compte")).toBeInTheDocument();
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
            expect(screen.getByTestId("account-card-3")).toBeInTheDocument();
        });

        it("doit filtrer par league", () => {
            render(<Dashboard {...defaultProps} filter="league" />);
            expect(screen.queryByTestId("account-card-1")).not.toBeInTheDocument();
            expect(screen.getByTestId("account-card-2")).toBeInTheDocument();
        });
    });

    describe("drag and drop", () => {
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

        it("doit gérer le dragOver", () => {
            render(<Dashboard {...defaultProps} />);
            const card = screen.getByTestId("account-card-2");

            fireEvent.dragOver(card, { preventDefault: vi.fn() });
        });

        it("doit gérer le dragEnd", () => {
            render(<Dashboard {...defaultProps} />);
            const card = screen.getByTestId("account-card-1");

            // Start drag first
            const dataTransfer = { setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: "" };
            fireEvent.dragStart(card, { dataTransfer });
            vi.runAllTimers();

            // Then end drag
            fireEvent.dragEnd(card);
        });

        it("doit gérer le drop et appeler onReorder", () => {
            render(<Dashboard {...defaultProps} />);
            const card = screen.getByTestId("account-card-2");

            fireEvent.drop(card, { preventDefault: vi.fn() });
            expect(defaultProps.onReorder).toHaveBeenCalled();
        });

        it("ne doit pas permettre le drag si le filtre n'est pas 'all'", () => {
            render(<Dashboard {...defaultProps} filter="favorite" />);
            const card = screen.getByTestId("account-card-1");

            const dataTransfer = { setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: "" };
            fireEvent.dragStart(card, { dataTransfer });

            // setData shouldn't be called because filter is not 'all'
            expect(dataTransfer.setData).not.toHaveBeenCalled();
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
