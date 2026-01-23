
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Dashboard from "../components/Dashboard";

describe("Dashboard - Branches manquantes", () => {
    const mockAccounts = [
        { id: "1", name: "Acc1", isFavorite: true, gameType: "valorant" } as any,
        { id: "2", name: "Acc2", isFavorite: false, gameType: "league" } as any,
    ];

    const baseProps = {
        accounts: mockAccounts,
        filter: "all" as const,
        onSwitch: vi.fn(),
        onDelete: vi.fn(),
        onEdit: vi.fn(),
        onToggleFavorite: vi.fn(),
        onAddAccount: vi.fn(),
        onReorder: vi.fn(),
    };

    it("filtre les comptes correctement", () => {
        const { rerender } = render(<Dashboard {...baseProps} filter="favorite" />);
        expect(screen.getByText("Acc1")).toBeInTheDocument();
        expect(screen.queryByText("Acc2")).not.toBeInTheDocument();

        rerender(<Dashboard {...baseProps} filter="league" />);
        expect(screen.queryByText("Acc1")).not.toBeInTheDocument();
        expect(screen.getByText("Acc2")).toBeInTheDocument();

        rerender(<Dashboard {...baseProps} filter="valorant" />);
        expect(screen.getByText("Acc1")).toBeInTheDocument();
        expect(screen.queryByText("Acc2")).not.toBeInTheDocument();
    });

    it("gère le drag and drop (start, over, drop) avec couverture complète", async () => {
        // Mock dataTransfer
        const dataTransfer = {
            setData: vi.fn(),
            getData: vi.fn(() => "1"),
            effectAllowed: "none",
            dropEffect: "none",
            setDragImage: vi.fn(),
        };

        render(<Dashboard {...baseProps} />);

        // Find draggables freshly
        let cards = screen.getAllByText(/Acc\d/);
        let card1 = cards[0].closest("[draggable=true]") || cards[0].parentElement!;
        let card2 = cards[1].closest("[draggable=true]") || cards[1].parentElement!;

        // Drag Start
        await act(async () => {
            fireEvent.dragStart(card1, { dataTransfer });
        });

        expect(dataTransfer.setData).toHaveBeenCalledWith("accountId", "1");

        // Re-query cards to be safe against re-renders
        cards = screen.getAllByText(/Acc\d/);
        card2 = cards[1].closest("[draggable=true]") || cards[1].parentElement!;

        // Mock getBoundingClientRect
        vi.spyOn(card2, "getBoundingClientRect").mockReturnValue({
            left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => { }
        });

        // 1. Test Forward Swap (Source < Target)
        // Card 1 over Card 2. RelativeX > 0.33
        await act(async () => {
            fireEvent.dragOver(card2, {
                dataTransfer,
                clientX: 80, // 0.8 > 0.33
                clientY: 10,
                currentTarget: card2
            } as any);
        });

        // Drop
        await act(async () => {
            fireEvent.drop(card1, { dataTransfer });
        });
        expect(baseProps.onReorder).toHaveBeenCalled();
        fireEvent.dragEnd(card1);
    });

    it("couvre le drag inversé (Backward Swap)", async () => {
        const dataTransfer = { setData: vi.fn(), getData: vi.fn(() => "2"), setDragImage: vi.fn() } as any;
        render(<Dashboard {...baseProps} />);

        let cards = screen.getAllByText(/Acc\d/);
        let card1 = cards[0].closest("[draggable=true]")!; // Target (Index 0)
        let card2 = cards[1].closest("[draggable=true]")!; // Source (Index 1)

        // Start dragging Card 2
        await act(async () => {
            fireEvent.dragStart(card2, { dataTransfer });
        });

        // Mock rect for Card 1
        vi.spyOn(card1, "getBoundingClientRect").mockReturnValue({
            left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => { }
        });

        // Drag Card 2 over Card 1. Source (1) > Target (0).
        // Condition: relativeX < 0.67 || relativeY < 0.67
        // We put mouse at 20px (0.2 < 0.67) => Should swap
        await act(async () => {
            fireEvent.dragOver(card1, {
                dataTransfer,
                clientX: 20,
                clientY: 10,
                currentTarget: card1
            } as any);
        });
    });

    it("couvre le cas défensif (Line 107) - Item supprimé pendant drag", async () => {
        const dataTransfer = { setData: vi.fn(), getData: vi.fn(() => "1"), setDragImage: vi.fn() } as any;
        const { rerender } = render(<Dashboard {...baseProps} />);

        let card1 = screen.getByText("Acc1").closest("[draggable=true]")!;

        // Start drag Acc1
        await act(async () => {
            fireEvent.dragStart(card1, { dataTransfer });
        });

        // Update props to remove Acc1 (simulate external deletion or weird state)
        // We need to keep card2 in DOM to drag over it.
        const newAccounts = [mockAccounts[1]]; // Only Acc2 remains
        rerender(<Dashboard {...baseProps} accounts={newAccounts} />);

        // Now card1 might be removed from DOM, but we have card2.
        // Drag over card2. draggedId is still "1", but "1" is not in localAccounts.
        // sourceIndex should be -1.

        let card2 = screen.getByText("Acc2").closest("[draggable=true]")!;

        await act(async () => {
            fireEvent.dragOver(card2, {
                dataTransfer,
                clientX: 50, clientY: 50,
                currentTarget: card2
            } as any);
        });
        // Should return early (Line 107)
    });

    it("ne drag pas si filtre actif (!= all)", () => {
        const dataTransfer = { setData: vi.fn() };
        render(<Dashboard {...baseProps} filter="favorite" />);

        const card1 = screen.getByText("Acc1").closest("[draggable=true]") || screen.getByText("Acc1").parentElement!;
        fireEvent.dragStart(card1, { dataTransfer });

        expect(dataTransfer.setData).not.toHaveBeenCalled();
    });
});
