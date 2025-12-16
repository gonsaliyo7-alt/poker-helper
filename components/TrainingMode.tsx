
import React, { useState, useCallback } from 'react';
import { Card, Position, AnalysisResponse, OpponentProfile } from '../types';
import { FULL_DECK } from '../constants';
import CardUI from './CardUI';
import { analyzePokerHand, QuotaError } from '../services/geminiService';

interface TrainingModeProps {
  onOpenKey: () => void;
}

const POSITIONS_LABELS: Record<string, string> = {
  dealer: 'Dealer (Botón)',
  smallBlind: 'Small Blind',
  bigBlind: 'Big Blind',
  early: 'Posición Temprana',
  middle: 'Posición Media',
  late: 'Posición Tardía'
};

const TrainingMode: React.FC<TrainingModeProps> = ({ onOpenKey }) => {
  const [scenario, setScenario] = useState<{
    hand: Card[];
    board: Card[];
    position: Position;
    playerCount: number;
    stackSize: number;
    opponentProfile: OpponentProfile;
  } | null>(null);

  const [userGuess, setUserGuess] = useState<number>(50);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [errorStatus, setErrorStatus] = useState<'quota' | 'generic' | null>(null);

  const generateScenario = () => {
    setAnalysis(null);
    setErrorStatus(null);
    setUserGuess(50);
    const deck = [...FULL_DECK].sort(() => Math.random() - 0.5);
    const hand = [deck[0], deck[1]];
    const boardSizes = [0, 3, 4, 5];
    const boardSize = boardSizes[Math.floor(Math.random() * boardSizes.length)];
    const board = deck.slice(2, 2 + boardSize);
    const playerCount = Math.floor(Math.random() * 8) + 2; 
    const stackSize = Math.floor(Math.random() * 140) + 10; // 10 to 150 BB
    const possiblePositions: Position[] = playerCount === 2 ? ['dealer', 'bigBlind'] : ['early', 'middle', 'late', 'dealer', 'smallBlind', 'bigBlind'];
    const position = possiblePositions[Math.floor(Math.random() * possiblePositions.length)];
    const opponentProfile = (['standard', 'aggressive', 'passive', 'bluffer'] as OpponentProfile[])[Math.floor(Math.random() * 4)];
    setScenario({ hand, board, position, playerCount, stackSize, opponentProfile });
  };

  const handleVerify = async () => {
    if (!scenario) return;
    setIsAnalyzing(true);
    setErrorStatus(null);
    try {
      const result = await analyzePokerHand(
        scenario.hand, 
        scenario.board, 
        scenario.position, 
        scenario.playerCount, 
        scenario.stackSize,
        scenario.opponentProfile
      );
      setAnalysis(result);
      setIsAnalyzing(false);
    } catch (error) {
      setIsAnalyzing(false);
      setErrorStatus(error instanceof QuotaError ? 'quota' : 'generic');
    }
  };

  const isHeadsUp = scenario?.playerCount === 2;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {!scenario ? (
        <div className="bg-emerald-900/40 border border-white/5 rounded-[3rem] p-12 text-center space-y-8 max-w-2xl mx-auto mt-20">
          <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center mx-auto text-4xl shadow-xl shadow-yellow-400/20">🧠</div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black">Escuela de Poker GTO</h2>
            <p className="text-emerald-300/60 text-sm max-w-xs mx-auto font-medium">Adivina tu probabilidad real considerando tu stack y posición.</p>
          </div>
          <button onClick={generateScenario} className="px-12 py-5 bg-yellow-400 text-emerald-950 font-black rounded-2xl transition-all shadow-xl hover:scale-105 active:scale-95 uppercase text-xs tracking-widest">Generar Escenario</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <div className="bg-emerald-900/40 border border-white/5 rounded-[2.5rem] p-8 space-y-8">
            <div className="flex flex-wrap gap-2">
                <span className={`px-4 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest ${isHeadsUp ? 'bg-rose-500 border-rose-400' : 'bg-white/5 border-white/10'}`}>
                    {isHeadsUp ? '🔥 DUELO' : `${scenario.playerCount} JUGADORES`}
                </span>
                <span className="px-4 py-1 bg-yellow-400/20 text-yellow-300 border border-yellow-400/20 rounded-full text-[9px] font-black uppercase tracking-widest">
                    STACK: {scenario.stackSize} BB
                </span>
                <span className="px-4 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/20 rounded-full text-[9px] font-black uppercase tracking-widest">
                    {POSITIONS_LABELS[scenario.position || '']?.toUpperCase()}
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-emerald-400/50 uppercase text-center sm:text-left">Tu Mano</h3>
                    <div className="flex gap-4 justify-center sm:justify-start">
                        <CardUI size="lg" card={scenario.hand[0]} />
                        <CardUI size="lg" card={scenario.hand[1]} />
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-emerald-400/50 uppercase text-center sm:text-left">Mesa</h3>
                    <div className="flex gap-2 justify-center sm:justify-start flex-wrap">
                        {[0,1,2,3,4].map(i => <CardUI key={i} size="md" card={scenario.board[i]} />)}
                    </div>
                </div>
            </div>

            <div className="pt-8 border-t border-white/5 space-y-6">
                <h4 className="text-center font-black text-sm uppercase tracking-widest">Estimación de Equity</h4>
                <div className="space-y-4">
                    <div className="text-center text-6xl font-black text-yellow-400">{userGuess}%</div>
                    <input type="range" min="0" max="100" value={userGuess} disabled={!!analysis} onChange={(e) => setUserGuess(parseInt(e.target.value))} className="w-full h-2 bg-black/40 rounded-lg appearance-none cursor-pointer accent-yellow-400" />
                </div>
                {!analysis && (
                    <button onClick={handleVerify} disabled={isAnalyzing} className="w-full py-5 bg-emerald-500 text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 uppercase text-xs">
                        {isAnalyzing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'COMPROBAR'}
                    </button>
                )}
            </div>
          </div>

          <div className="relative min-h-[400px]">
            {analysis ? (
              <div className="h-full bg-slate-900 rounded-[2.5rem] p-8 border border-white/5 flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95 duration-500">
                 <div className="text-center space-y-2">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Realidad IA</span>
                    <div className="text-8xl font-black text-white">{Math.round(analysis.probability * 100)}%</div>
                    <div className="flex gap-4 text-[10px] font-bold justify-center pt-2">
                        <span className={`uppercase ${Math.abs(userGuess - Math.round(analysis.probability * 100)) <= 10 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            Error: {Math.abs(userGuess - Math.round(analysis.probability * 100))}%
                        </span>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                        <span className="text-[8px] font-black text-white/40 uppercase block mb-1">Acción Óptima</span>
                        <span className="text-xs font-black text-yellow-400">{analysis.suggestedAction}</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                        <span className="text-[8px] font-black text-white/40 uppercase block mb-1">Tamaño GTO</span>
                        <span className="text-xs font-black text-white">{analysis.betSize}</span>
                    </div>
                 </div>

                 <div className="bg-white/5 p-6 rounded-2xl w-full border border-white/5 space-y-4">
                    <p className="text-xs text-center text-emerald-100/70 italic leading-relaxed">"{analysis.reasoning}"</p>
                 </div>

                 <button onClick={generateScenario} className="w-full py-5 bg-white text-emerald-950 font-black rounded-2xl shadow-xl transition-all uppercase text-xs tracking-widest">Siguiente Escenario</button>
              </div>
            ) : isAnalyzing ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                  <p className="text-emerald-500 font-black text-[10px] uppercase tracking-widest animate-pulse">Consultando al mentor...</p>
              </div>
            ) : (
              <div className="h-full border-2 border-dashed border-white/5 rounded-[2.5rem] flex items-center justify-center p-12 text-center opacity-30">
                  <p className="text-sm font-medium">Haz tu estimación para ver la línea óptima recomendada por la IA.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingMode;
