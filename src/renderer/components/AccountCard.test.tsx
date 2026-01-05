import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import AccountCard from "./AccountCard";
import { Account } from "../hooks/useAccounts";

// Mock Lucide icons
vi.mock("lucide-react", () => ({
  MoreVertical: () => (
    <span data-testid="icon-more-vertical">MoreVertical</span>
  ),
  Play: () => <span data-testid="icon-play">Play</span>,
  Trash2: () => <span data-testid="icon-trash-2">Trash2</span>,
  Edit2: () => <span data-testid="icon-edit-2">Edit2</span>,
  Star: () => <span data-testid="icon-star">Star</span>,
}));

// Mock assets
vi.mock("@assets/league.png", () => ({ default: "league.png" }));
vi.mock("@assets/valorant.png", () => ({ default: "valorant.png" }));

const mockAccount: Account = {
  id: "123",
  name: "Test Account",
  riotId: "Test#1234",
  username: "testuser",
  password: "password",
  gameType: "valorant",
  isFavorite: false,
  cardImage: "test-image.jpg",
  stats: {
    rank: "Gold 1",
    rankIcon: "rank-icon.png",
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

describe("AccountCard", () => {
  it("renders account information correctly", () => {
    render(<AccountCard {...mockProps} />);

    expect(screen.getByText("Test Account")).toBeInTheDocument();
    expect(screen.getByText("Test#1234")).toBeInTheDocument();
    expect(screen.getByText("Gold 1")).toBeInTheDocument();
  });

  it("shows More options menu buttons in the DOM (initially invisible)", () => {
    render(<AccountCard {...mockProps} />);

    // The buttons should exist in the DOM
    expect(screen.getByText("Modifier")).toBeInTheDocument();
    expect(screen.getByText("Supprimer")).toBeInTheDocument();
  });

  it("calls onToggleFavorite when star icon is clicked", async () => {
    const user = userEvent.setup();
    render(<AccountCard {...mockProps} />);

    // Find the button wrapping the star icon
    const starIcon = screen.getByTestId("icon-star");
    const favoriteBtn = starIcon.closest("button");

    if (favoriteBtn) {
      await user.click(favoriteBtn);
      expect(mockProps.onToggleFavorite).toHaveBeenCalledWith(mockAccount);
    } else {
      throw new Error("Favorite button not found");
    }
  });

  it("has accessible labels for icon-only buttons", () => {
    render(<AccountCard {...mockProps} />);

    // Check for favorite button aria-label
    const starIcon = screen.getByTestId("icon-star");
    const favoriteBtn = starIcon.closest("button");
    // We expect this to fail initially if the label is missing
    expect(favoriteBtn).toHaveAttribute("aria-label");

    // Check for more options button aria-label
    const moreIcon = screen.getByTestId("icon-more-vertical");
    const moreBtn = moreIcon.closest("button");
    // We expect this to fail initially if the label is missing
    expect(moreBtn).toHaveAttribute("aria-label");
  });
});
