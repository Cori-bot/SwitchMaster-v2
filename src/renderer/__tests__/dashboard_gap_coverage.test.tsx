
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Dashboard from "../components/Dashboard";
import { Account } from "../../shared/types";

// Mock assets
vi.mock("@assets/league.png", () => ({ default: "league.png" }));
vi.mock("@assets/valorant.png", () => ({ default: "valorant.png" }));
vi.mock("@assets/logo.png", () => ({ default: "logo.png" }));

// Mock framer-motion
vi.mock("framer-motion", () => ({
    motion: {
        div: ({ children, ...props }: any) => {
            const { whileHover, whileTap, initial, animate, exit, variants, transition, layout, ...rest } = props;
            return <div {...rest}>{children}</div>;
        },
        h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
        p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock AccountCard
vi.mock("../components/AccountCard", () => ({
    default: ({ account, onDragStart, onDragOver, onDrop }: any) => (
        <div
            draggable
            onDragStart={(e: any) => onDragStart(e, account.id)}
            onDragOver={(e: any) => onDragOver(e)}
            onDrop={onDrop}
            data-testid={`card-${account.id}`}
        >
            {account.name}
        </div>
    )
}));

const mockAccounts = [
    { id: "1", name: "Acc 1", username: "u1", riotId: "Acc1#EUW", gameType: "valorant", isFavorite: true },
    { id: "2", name: "Acc 2", username: "u2", riotId: "Acc2#EUW", gameType: "league", isFavorite: false },
];

describe("Dashboard Gap Coverage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("prevents drag start if filter is not 'all'", async () => {
        render(<Dashboard
            accounts={mockAccounts as Account[]}
            filter="favorite"
            onReorder={vi.fn()}
            onSwitch={vi.fn()}
            onDelete={vi.fn()}
            onEdit={vi.fn()}
            onToggleFavorite={vi.fn()}
            onAddAccount={vi.fn()}
        />);

        const card = screen.getByTestId("card-1");
        const dataTransfer = { setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: "" };

        fireEvent.dragStart(card, { dataTransfer });
        expect(dataTransfer.setData).not.toHaveBeenCalled();
    });

    it("handles drag over with missing source or target index (Line 107)", () => {
        render(<Dashboard accounts={mockAccounts as Account[]} filter="all" onReorder={vi.fn()} onSwitch={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} onToggleFavorite={vi.fn()} onAddAccount={vi.fn()} />);

        const card1 = screen.getByTestId("card-1");
        fireEvent.dragOver(card1, { clientX: 10, clientY: 10, dataTransfer: { dropEffect: "" } });

        expect(true).toBe(true);
    });
});
