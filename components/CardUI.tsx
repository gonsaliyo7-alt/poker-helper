
import React from 'react';
import { Card, Suit } from '../types';
import { SUIT_SYMBOLS, SUIT_COLORS } from '../constants';

interface CardUIProps {
  card?: Card;
  onClick?: () => void;
  isSelected?: boolean;
  isDisabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const CardUI: React.FC<CardUIProps> = ({ card, onClick, isSelected, isDisabled, size = 'md' }) => {
  if (!card) {
    return (
      <div 
        className={`
          border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center
          ${size === 'sm' ? 'w-10 h-14' : size === 'md' ? 'w-14 h-20' : 'w-20 h-28'}
        `}
      >
        <div className="w-4 h-4 rounded-full border border-white/10" />
      </div>
    );
  }

  const colorClass = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        relative bg-white rounded-lg shadow-lg flex flex-col items-center justify-center transition-all transform
        hover:scale-105 active:scale-95
        ${isSelected ? 'ring-4 ring-yellow-400 opacity-50 scale-95' : 'ring-1 ring-black/10'}
        ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
        ${size === 'sm' ? 'w-10 h-14 text-xs' : size === 'md' ? 'w-14 h-20 text-sm font-bold' : 'w-20 h-28 text-xl font-bold'}
      `}
    >
      <div className={`absolute top-1 left-1 leading-none ${colorClass}`}>
        {card.rank}
      </div>
      <div className={`text-2xl ${colorClass}`}>
        {symbol}
      </div>
      <div className={`absolute bottom-1 right-1 leading-none transform rotate-180 ${colorClass}`}>
        {card.rank}
      </div>
    </button>
  );
};

export default CardUI;
