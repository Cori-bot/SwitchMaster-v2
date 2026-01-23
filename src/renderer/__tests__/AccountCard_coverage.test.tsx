
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AccountCard from "../components/AccountCard";
import { Account } from "../hooks/useAccounts";

describe("AccountCard Coverage", () => {
    const mockAccount: Account = {
        id: "1",
        name: "TestUser",
        gameType: "valorant",
        riotId: "Test#123",
        username: "user",
        password: "pass",
        stats: {
            rank: "Gold 1",
            rankIcon: "icon-url.png",
            lastUpdate: 0,
        },
        cardImage: "http://image.url/pic.jpg",
        isFavorite: false,
    };

    const props = {
        account: mockAccount,
        isActive: false,
        onSwitch: vi.fn(),
        onDelete: vi.fn(),
        onEdit: vi.fn(),
        onToggleFavorite: vi.fn(),
        onDragStart: vi.fn(),
        onDragOver: vi.fn(),
        onDragEnd: vi.fn(),
        onDragEnter: vi.fn(),
        onDrop: vi.fn(),
    };

    it("gère l'erreur de chargement de l'icône de rang", () => {
        render(<AccountCard {...props} />);
        const rankImg = screen.getByAltText("Gold 1");
        fireEvent.error(rankImg);
        expect(rankImg).toHaveStyle({ display: "none" });
    });

    it("gère l'absence de stats (structure squelette)", () => {
        const noStatsAccount = { ...mockAccount, stats: undefined };
        render(<AccountCard {...props} account={noStatsAccount} />);
        expect(screen.queryByAltText("Gold 1")).toBeNull();
        const skeleton = document.querySelector(".animate-pulse");
        expect(skeleton).toBeInTheDocument();
    });

    it("gère l'absence de riotId", () => {
        const noRiotId = { ...mockAccount, riotId: undefined } as unknown as Account;
        render(<AccountCard {...props} account={noRiotId} />);
        expect(screen.queryByAltText("Gold 1")).toBeNull();
    });

    it("gère les images locales (protocole sm-img)", () => {
        const localImgAccount = { ...mockAccount, cardImage: "C:\\Images\\pic.jpg" };
        render(<AccountCard {...props} account={localImgAccount} />);
    });

    it("gère le bouton toggle favorite avec stopPropagation", () => {
        const onToggle = vi.fn();
        const { container } = render(<AccountCard {...props} onToggleFavorite={onToggle} />);

        // Find the button directly following the name (h3)
        // Structure: h3 + button
        const starButton = container.querySelector("h3 + button");

        if (starButton) {
            fireEvent.click(starButton);
            expect(onToggle).toHaveBeenCalled();
        } else {
            // Fallback: try to find any button with a lucide star inside if structure changed
            const starSvg = container.querySelector(".lucide-star");
            if (starSvg && starSvg.closest("button")) {
                fireEvent.click(starSvg.closest("button")!);
                expect(onToggle).toHaveBeenCalled();
            } else {
                throw new Error("Favorite button not found");
            }
        }
    });

    it("affiche l'état actif", () => {
        render(<AccountCard {...props} isActive={true} />);
        expect(screen.getByText("Connecté")).toBeInTheDocument();
    });
});
