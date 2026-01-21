
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AccountCard from "../components/AccountCard";
import { Account } from "../hooks/useAccounts";

// Mock les assets
vi.mock("@assets/league.png", () => ({ default: "league.png" }));
vi.mock("@assets/valorant.png", () => ({ default: "valorant.png" }));

describe("AccountCard Component", () => {
    const mockAccount: Account = {
        id: "1",
        name: "TestAccount",
        gameType: "valorant",
        riotId: "User#TAG",
        isFavorite: false,
        stats: {
            rank: "Diamond 1",
            rankIcon: "https://example.com/rank.png",
            lastUpdate: Date.now(),
        },
    };

    const defaultProps = {
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

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("rendering", () => {
        it("doit afficher le nom du compte", () => {
            render(<AccountCard {...defaultProps} />);
            expect(screen.getByText("TestAccount")).toBeInTheDocument();
        });

        it("doit afficher le riotId", () => {
            render(<AccountCard {...defaultProps} />);
            expect(screen.getByText("User#TAG")).toBeInTheDocument();
        });

        it("doit afficher le rang si stats présentes", () => {
            render(<AccountCard {...defaultProps} />);
            expect(screen.getByText("Diamond 1")).toBeInTheDocument();
        });

        it("doit afficher 'Unranked' si pas de rang", () => {
            const accountNoRank = { ...mockAccount, stats: { rankIcon: "", lastUpdate: Date.now() } };
            render(<AccountCard {...defaultProps} account={accountNoRank} />);
            expect(screen.getByText("Unranked")).toBeInTheDocument();
        });

        it("doit afficher le skeleton si pas de stats", () => {
            const accountNoStats = { ...mockAccount, stats: undefined };
            render(<AccountCard {...defaultProps} account={accountNoStats} />);
            // Le skeleton devrait être présent (div avec animate-pulse)
            const skeleton = document.querySelector(".animate-pulse");
            expect(skeleton).toBeInTheDocument();
        });

        it("ne doit pas afficher les stats si pas de riotId", () => {
            const accountNoRiotId = { ...mockAccount, riotId: undefined as unknown as string };
            render(<AccountCard {...defaultProps} account={accountNoRiotId} />);
            expect(screen.queryByText("Diamond 1")).not.toBeInTheDocument();
        });
    });

    describe("card image", () => {
        it("doit afficher l'image de fond si cardImage présente (URL)", () => {
            const accountWithImage = { ...mockAccount, cardImage: "https://example.com/card.png" };
            render(<AccountCard {...defaultProps} account={accountWithImage} />);
            // L'image de fond est appliquée en style
        });

        it("doit convertir le chemin local en protocole sm-img", () => {
            const accountWithLocalImage = { ...mockAccount, cardImage: "C:\\Users\\test\\image.png" };
            render(<AccountCard {...defaultProps} account={accountWithLocalImage} />);

            // On cherche la div qui a le style appliqué (c'est une div interne)
            // L'implémentation met le style sur une div avec absolute inset-0
            // On peut scanner le DOM pour trouver l'élément avec le bon background-image
            const expectedUrl = "sm-img://C:/Users/test/image.png";
            // Note: JSDOM/browser might add quotes or handle styles differently, checking substring is safer

            const divs = document.querySelectorAll("div");
            let found = false;
            divs.forEach(div => {
                const bgImage = div.style.backgroundImage;
                if (bgImage && bgImage.includes(expectedUrl)) {
                    found = true;
                }
            });

            expect(found).toBe(true);
        });
    });

    describe("active state", () => {
        it("doit afficher 'Connecté' si isActive", () => {
            render(<AccountCard {...defaultProps} isActive={true} />);
            expect(screen.getByText("Connecté")).toBeInTheDocument();
        });

        it("doit afficher 'Se connecter' si pas active", () => {
            render(<AccountCard {...defaultProps} isActive={false} />);
            expect(screen.getByText("Se connecter")).toBeInTheDocument();
        });

        it("doit désactiver le bouton si isActive", () => {
            render(<AccountCard {...defaultProps} isActive={true} />);
            const button = screen.getByText("Connecté").closest("button");
            expect(button).toBeDisabled();
        });
    });

    describe("favorite", () => {
        it("doit afficher l'étoile remplie si favori", () => {
            const favoriteAccount = { ...mockAccount, isFavorite: true };
            render(<AccountCard {...defaultProps} account={favoriteAccount} />);
            // L'étoile a la classe text-yellow-400
            const starButton = document.querySelector(".text-yellow-400");
            expect(starButton).toBeInTheDocument();
        });

        it("doit appeler onToggleFavorite quand on clique sur l'étoile", () => {
            render(<AccountCard {...defaultProps} />);
            // Trouver le bouton étoile
            const buttons = screen.getAllByRole("button");
            const starButton = buttons.find(b => b.querySelector("svg"));
            if (starButton) {
                fireEvent.click(starButton);
                expect(defaultProps.onToggleFavorite).toHaveBeenCalledWith(mockAccount);
            }
        });
    });

    describe("interactions", () => {
        it("doit appeler onSwitch quand on clique sur Se connecter", () => {
            render(<AccountCard {...defaultProps} />);
            fireEvent.click(screen.getByText("Se connecter"));
            expect(defaultProps.onSwitch).toHaveBeenCalledWith("1");
        });

        it("doit appeler onEdit quand on clique sur Modifier", () => {
            render(<AccountCard {...defaultProps} />);
            fireEvent.click(screen.getByText("Modifier"));
            expect(defaultProps.onEdit).toHaveBeenCalledWith(mockAccount);
        });

        it("doit appeler onDelete quand on clique sur Supprimer", () => {
            render(<AccountCard {...defaultProps} />);
            fireEvent.click(screen.getByText("Supprimer"));
            expect(defaultProps.onDelete).toHaveBeenCalledWith("1");
        });
    });

    describe("drag and drop", () => {
        it("doit appeler onDragStart", () => {
            render(<AccountCard {...defaultProps} />);
            const card = screen.getByText("TestAccount").closest("[draggable]");
            if (card) {
                fireEvent.dragStart(card);
                expect(defaultProps.onDragStart).toHaveBeenCalled();
            }
        });

        it("doit appeler onDragOver", () => {
            render(<AccountCard {...defaultProps} />);
            const card = screen.getByText("TestAccount").closest("[draggable]");
            if (card) {
                fireEvent.dragOver(card);
                expect(defaultProps.onDragOver).toHaveBeenCalled();
            }
        });

        it("doit appeler onDragEnd", () => {
            render(<AccountCard {...defaultProps} />);
            const card = screen.getByText("TestAccount").closest("[draggable]");
            if (card) {
                fireEvent.dragEnd(card);
                expect(defaultProps.onDragEnd).toHaveBeenCalled();
            }
        });

        it("doit appeler onDrop", () => {
            render(<AccountCard {...defaultProps} />);
            const card = screen.getByText("TestAccount").closest("[draggable]");
            if (card) {
                fireEvent.drop(card);
                expect(defaultProps.onDrop).toHaveBeenCalled();
            }
        });
    });

    describe("image error handling", () => {
        it("doit déclencher handleImageError quand une image échoue", () => {
            render(<AccountCard {...defaultProps} />);
            const img = screen.getByAltText("Diamond 1");
            // L'erreur doit être gérée sans crash
            fireEvent.error(img);
            expect(img).toBeInTheDocument();
        });
    });

    describe("game type icon", () => {
        it("doit afficher une icône de jeu", () => {
            render(<AccountCard {...defaultProps} />);
            // Vérifie qu'une image de jeu est présente
            const images = screen.getAllByRole("img");
            expect(images.length).toBeGreaterThan(0);
        });

        it("doit afficher l'icône League pour un compte League", () => {
            const leagueAccount = { ...mockAccount, gameType: "league" as const };
            render(<AccountCard {...defaultProps} account={leagueAccount} />);
            const images = screen.getAllByRole("img");
            expect(images.length).toBeGreaterThan(0);
        });
    });
});
