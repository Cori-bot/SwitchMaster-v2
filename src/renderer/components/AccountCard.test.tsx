import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import AccountCard from './AccountCard';
import '@testing-library/jest-dom';

// Mock the image imports
vi.mock('@assets/league.png', () => ({ default: 'league.png' }));
vi.mock('@assets/valorant.png', () => ({ default: 'valorant.png' }));

// Mock the account data
const mockAccount = {
  id: '1',
  name: 'Test Account',
  riotId: 'Test#123',
  gameType: 'valorant',
  stats: {
    rank: 'Gold 1',
    rankIcon: 'gold.png',
  },
  cardImage: 'test-image.jpg',
  isFavorite: false,
};

const mockHandlers = {
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

describe('AccountCard', () => {
    afterEach(() => {
        cleanup();
    });

  it('renders without crashing', () => {
    render(<AccountCard account={mockAccount as any} {...mockHandlers} />);
    expect(screen.getByText('Test Account')).toBeTruthy();
  });

  it('has accessible buttons', () => {
    render(<AccountCard account={mockAccount as any} {...mockHandlers} />);

    // These queries look for elements by their accessible name (aria-label, aria-labelledby, title, or text content)
    // If these fail, it means the buttons are not accessible.

    // Check for Favorite button
    // "Ajouter aux favoris" is the expected label for a non-favorite account
    const favoriteButton = screen.getByRole('button', { name: /Ajouter aux favoris/i });
    expect(favoriteButton).toBeTruthy();

    // Check for More Actions button
    const moreActionsButton = screen.getByRole('button', { name: /Plus d'actions/i });
    expect(moreActionsButton).toBeTruthy();
  });
});
