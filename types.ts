
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export type Position = 'dealer' | 'smallBlind' | 'bigBlind' | 'early' | 'middle' | 'late' | null;
export type AppMode = 'calculator' | 'training' | 'importer';
export type OpponentProfile = 'standard' | 'aggressive' | 'passive' | 'bluffer' | 'loose';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface AnalysisResponse {
  probability: number;
  advice: 'CONTINUE' | 'FOLD' | 'CAUTION';
  suggestedAction: string;
  betSize: string;
  reasoning: string;
  expectedHand: string;
}

export interface HandHistoryReport {
  playerStyle: string;
  vpipRating: string; // Voluntarily Put In Pot
  aggressionFactor: number;
  mainLeaks: string[];
  strengths: string[];
  detailedReport: string;
  suggestedDrills: string[];
}

export interface GameState {
  hand: Card[];
  board: Card[];
  position: Position;
  playerCount: number;
  stackSize: number; // In Big Blinds
  opponentProfile: OpponentProfile;
  isAnalyzing: boolean;
  analysis: AnalysisResponse | null;
}
