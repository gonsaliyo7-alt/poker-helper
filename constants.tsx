
import { Suit, Rank, Card } from './types';

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
};

export const SUIT_COLORS: Record<Suit, string> = {
  hearts: 'text-red-500',
  diamonds: 'text-blue-500',
  clubs: 'text-green-800',
  spades: 'text-gray-900'
};

export const FULL_DECK: Card[] = SUITS.flatMap(suit => 
  RANKS.map(rank => ({
    suit,
    rank,
    id: `${rank}-${suit}`
  }))
);
