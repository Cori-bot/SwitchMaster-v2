import { render, screen, fireEvent } from "@testing-library/react";
import Dashboard from "../components/Dashboard";
import AddAccountModal from "../components/AddAccountModal";
import AccountCard from "../components/AccountCard";
import GameSelector from "../components/AddAccount/GameSelector";
import ImageSelector from "../components/AddAccount/ImageSelector";
import { vi, describe, it, expect } from "vitest";

// Mock des images
vi.mock("@assets/valorant.png", () => ({ default: "mock-val-icon" }));
vi.mock("@assets/league.png", () => ({ default: "mock-lol-icon" }));

// Mock framer-motion car les animations peuvent gêner les tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("AccountCard", () => {
  const mockAccount = {
    id: "1",
    name: "Test Account",
    gameType: "valorant" as const,
    riotId: "Player#1",
    isFavorite: false,
    stats: { rank: "Gold 1", lastUpdate: Date.now() }
  };

  it("doit afficher les informations et gérer les clics sur tous les boutons", () => {
    const onSwitch = vi.fn();
    const onDelete = vi.fn();
    const onToggleFavorite = vi.fn();
    const onEdit = vi.fn();

    render(
      <AccountCard
        account={mockAccount}
        isActive={false}
        onSwitch={onSwitch}
        onDelete={onDelete}
        onEdit={onEdit}
        onToggleFavorite={onToggleFavorite}
        onDragStart={vi.fn()}
        onDragOver={vi.fn()}
        onDragEnd={vi.fn()}
        onDragEnter={vi.fn()}
        onDrop={vi.fn()}
      />
    );

    expect(screen.getByText("Test Account")).toBeInTheDocument();

    // On clique sur le bouton de connexion principal
    fireEvent.click(screen.getByText(/Se connecter/i));
    expect(onSwitch).toHaveBeenCalledWith("1");

    // On clique sur les autres boutons (on les cherche par rôle ou on clique sur tout)
    const buttons = screen.getAllByRole("button");
    buttons.forEach(btn => fireEvent.click(btn));

    expect(onDelete).toHaveBeenCalledWith("1");
    expect(onEdit).toHaveBeenCalledWith(mockAccount);
    expect(onToggleFavorite).toHaveBeenCalledWith(mockAccount);
  });
});

describe("Dashboard", () => {
  const accounts = [
    { id: "1", name: "Acc 1", gameType: "valorant", riotId: "P#1", isFavorite: true },
    { id: "2", name: "Acc 2", gameType: "league", riotId: "P#2", isFavorite: false }
  ];

  it("doit gérer le filtrage et le Drag & Drop simulé", () => {
    const onReorder = vi.fn();
    const { rerender } = render(
      <Dashboard
        accounts={accounts as any}
        filter="all"
        onSwitch={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        onToggleFavorite={vi.fn()}
        onAddAccount={vi.fn()}
        onReorder={onReorder}
      />
    );

    expect(screen.getByText("Acc 1")).toBeInTheDocument();
    expect(screen.getByText("Acc 2")).toBeInTheDocument();

    // Test Filtrage
    rerender(<Dashboard accounts={accounts as any} filter="favorite" onSwitch={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} onToggleFavorite={vi.fn()} onAddAccount={vi.fn()} onReorder={onReorder} />);
    expect(screen.queryByText("Acc 2")).not.toBeInTheDocument();

    // Revenir à "all" pour Drag & Drop
    rerender(<Dashboard accounts={accounts as any} filter="all" onSwitch={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} onToggleFavorite={vi.fn()} onAddAccount={vi.fn()} onReorder={onReorder} />);

    const dragSource = screen.getByText("Acc 1");
    const dropTarget = screen.getByText("Acc 2");

    const dataTransfer = {
      setData: vi.fn(),
      setDragImage: vi.fn(),
      effectAllowed: "move",
      dropEffect: "move"
    };

    fireEvent.dragStart(dragSource, { dataTransfer });
    fireEvent.dragOver(dropTarget, { dataTransfer, clientX: 100, clientY: 100 });
    fireEvent.drop(dropTarget, { dataTransfer });

    expect(onReorder).toHaveBeenCalled();
  });
});

describe("AddAccountModal", () => {
  it("doit gérer le changement d'onglets et la détection auto", async () => {
    const onAdd = vi.fn();
    render(<AddAccountModal isOpen={true} onClose={vi.fn()} onAdd={onAdd} editingAccount={null} />);

    // Changement d'onglet vers Auto (s'il y en a)
    const tabs = screen.getAllByRole("button");
    const autoTab = tabs.find(t => t.textContent?.includes("Auto"));
    if (autoTab) fireEvent.click(autoTab);

    // Click sur détecter
    const detectBtn = screen.queryByText(/Détecter/i);
    if (detectBtn) fireEvent.click(detectBtn);
  });
});

describe("Selectors", () => {
  it("GameSelector doit permettre de choisir un jeu", () => {
    const setGameType = vi.fn();
    render(<GameSelector gameType="valorant" setGameType={setGameType} animationDuration="duration-200" />);

    fireEvent.click(screen.getByText(/League of Legends/i));
    expect(setGameType).toHaveBeenCalledWith("league");
  });

  it("ImageSelector doit permettre de choisir une image", () => {
    const setCardImage = vi.fn();
    const onSelectLocal = vi.fn();
    render(<ImageSelector cardImage="" setCardImage={setCardImage} onSelectLocal={onSelectLocal} iconSizeMedium={24} iconSizeSmall={16} />);

    // On clique sur le bouton de sélection locale
    fireEvent.click(screen.getByText(/Sélectionner un fichier local/i));
    expect(onSelectLocal).toHaveBeenCalled();

    // On change l'URL manuellement
    const input = screen.getByPlaceholderText(/Entrez l'URL de l'image/i);
    fireEvent.change(input, { target: { value: "http://test.com/img.png" } });
    expect(setCardImage).toHaveBeenCalledWith("http://test.com/img.png");
  });
});
