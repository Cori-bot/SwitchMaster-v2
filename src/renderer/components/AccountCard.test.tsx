/**
 * @vitest-environment jsdom
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import AccountCard from "./AccountCard";
// Mocking the interface to avoid dependency issues during test setup if we don't have full environment
interface Account {
  id: string;
  name: string;
  gameType: "league" | "valorant";
  riotId: string;
  username?: string;
  password?: string;
  cardImage?: string;
  isFavorite?: boolean;
  lastUsed?: string;
  stats?: any | null;
  timestamp?: number;
}

// Mock assets
vi.mock("@assets/league.png", () => ({ default: "league.png" }));
vi.mock("@assets/valorant.png", () => ({ default: "valorant.png" }));

// Mock constants
vi.mock("@/constants/ui", () => ({
  ICON_SIZE_SMALL: 16,
  ICON_SIZE_MEDIUM: 24,
  ANIMATION_DURATION_LONG: "duration-300",
  ACTIVE_SCALE: "scale-100",
}));

// Mock icons to avoid complex SVG rendering in test
vi.mock("lucide-react", () => ({
  MoreVertical: () => <div data-testid="icon-more-vertical" />,
  Play: () => <div data-testid="icon-play" />,
  Trash2: () => <div data-testid="icon-trash" />,
  Edit2: () => <div data-testid="icon-edit" />,
  Star: () => <div data-testid="icon-star" />,
}));

describe("AccountCard", () => {
  let container: HTMLDivElement;
  let root: any;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  const mockAccount: Account = {
    id: "1",
    name: "Test Account",
    username: "testuser",
    password: "password",
    riotId: "Test#TAG",
    gameType: "valorant",
    isFavorite: false,
    cardImage: "",
    stats: {
      rank: "Gold 1",
      rankIcon: "rank.png",
      level: 100,
      lastUpdate: 0,
    },
  };

  const mockProps = {
    account: mockAccount,
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

  it("renders account name and riot ID", () => {
    act(() => {
      root.render(<AccountCard {...mockProps} />);
    });

    expect(container.textContent).toContain("Test Account");
    expect(container.textContent).toContain("Test#TAG");
  });

  it("renders stats correctly", () => {
    act(() => {
      root.render(<AccountCard {...mockProps} />);
    });
    expect(container.textContent).toContain("Gold 1");
  });

  it("has accessible buttons", () => {
    act(() => {
      root.render(<AccountCard {...mockProps} />);
    });

    // Check for favorite button aria-label
    const favButton = container.querySelector(
      'button[aria-label="Ajouter aux favoris"]',
    );
    expect(favButton).toBeTruthy();

    // Check for options button aria-label
    const optionsButton = container.querySelector(
      'button[aria-label="Options du compte"]',
    );
    expect(optionsButton).toBeTruthy();
  });
});
