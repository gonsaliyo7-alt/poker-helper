
import React, { useState, useEffect, useCallback } from 'react';
import { Card, OpponentProfile, AnalysisResponse } from '../types';
import { FULL_DECK } from '../constants';
import CardUI from './CardUI';
import { analyze3PlayerHand, QuotaError } from '../services/geminiService';

const PROFILE_INFO: Record<string, string> = {
    standard: "Lógico y equilibrado.",
    aggressive: "Presiona y botea mucho.",
    passive: "Solo paga, rara vez sube.",
    bluffer: "Miente con frecuencia.",
    loose: "Juega demasiadas manos."
};

const PROFILE_ICONS: Record<string, string> = {
    standard: "🧠",
    aggressive: "🔥",
    passive: "🛡️",
    bluffer: "🎭",
    loose: "🎲"
};

interface PlayerState {
    stack: number;
    profile: OpponentProfile;
    position: 'BTN' | 'SB' | 'BB';
    isHero: boolean;
}

const ThreeVSMode: React.FC = () => {
    const [hand, setHand] = useState<Card[]>([]);
    const [board, setBoard] = useState<Card[]>([]);
    const [players, setPlayers] = useState<PlayerState[]>([
        { stack: 100, profile: 'standard', position: 'BTN', isHero: true },
        { stack: 100, profile: 'aggressive', position: 'SB', isHero: false },
        { stack: 100, profile: 'passive', position: 'BB', isHero: false },
    ]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
    const [errorStatus, setErrorStatus] = useState<'quota' | 'generic' | 'auth' | null>(null);

    const toggleCardSelection = (card: Card) => {
        const isInHand = hand.some(c => c.id === card.id);
        const isInBoard = board.some(c => c.id === card.id);

        if (isInHand) {
            setHand(prev => prev.filter(c => c.id !== card.id));
            return;
        }
        if (isInBoard) {
            setBoard(prev => prev.filter(c => c.id !== card.id));
            return;
        }

        if (hand.length < 2) {
            setHand(prev => [...prev, card]);
        } else if (board.length < 5) {
            setBoard(prev => [...prev, card]);
        }
    };

    const updatePlayer = (index: number, updates: Partial<PlayerState>) => {
        setPlayers(prev => prev.map((p, i) => i === index ? { ...p, ...updates } : p));
    };

    const runAnalysis = useCallback(async () => {
        if (hand.length < 2) return;

        const apiKey = localStorage.getItem('GEMINI_API_KEY');
        if (!apiKey) return;

        setIsAnalyzing(true);
        setErrorStatus(null);
        try {
            const result = await analyze3PlayerHand(hand, board, players, apiKey);
            setAnalysis(result);
            setIsAnalyzing(false);
        } catch (error: any) {
            console.error("Error en análisis 3VS:", error);
            setIsAnalyzing(false);
            if (error instanceof QuotaError) {
                setErrorStatus('quota');
            } else {
                setErrorStatus('generic');
            }
        }
    }, [hand, board, players]);

    useEffect(() => {
        if (hand.length === 2) {
            runAnalysis();
        } else {
            setAnalysis(null);
        }
    }, [hand, board, players, runAnalysis]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-500">
            {/* Columna Izquierda: Selección de Cartas y Jugadores */}
            <div className="lg:col-span-8 space-y-6">

                {/* Jugadores 3VS */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {players.map((player, idx) => (
                        <div key={idx} className={`p-5 rounded-[2rem] border transition-all ${player.isHero ? 'bg-emerald-900/40 border-yellow-400/30' : 'bg-slate-900/50 border-white/5'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <span className={`text-[10px] font-black px-2 py-1 rounded ${player.isHero ? 'bg-yellow-400 text-emerald-950' : 'bg-white/10 text-white/60'}`}>
                                    {player.isHero ? 'HERO (TÚ)' : `OPONENTE ${idx}`}
                                </span>
                                <select
                                    value={player.position}
                                    onChange={(e) => updatePlayer(idx, { position: e.target.value as any })}
                                    className="bg-black/40 border-none text-[10px] font-bold rounded px-2 py-1 text-yellow-400 focus:ring-0"
                                >
                                    <option value="BTN">BTN</option>
                                    <option value="SB">SB</option>
                                    <option value="BB">BB</option>
                                </select>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-bold text-emerald-300/80">
                                        <span>STACK:</span>
                                        <span className="text-yellow-400">{player.stack} BB</span>
                                    </div>
                                    <input
                                        type="range" min="1" max="250" value={player.stack}
                                        onChange={(e) => updatePlayer(idx, { stack: parseInt(e.target.value) })}
                                        className="w-full h-1 bg-black/40 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                                    />
                                </div>

                                <div className="grid grid-cols-5 gap-1">
                                    {Object.keys(PROFILE_ICONS).map(prof => (
                                        <button
                                            key={prof}
                                            onClick={() => updatePlayer(idx, { profile: prof as OpponentProfile })}
                                            className={`p-1.5 rounded-lg border transition-all ${player.profile === prof ? 'bg-yellow-400 border-yellow-400 scale-110' : 'bg-white/5 border-white/10 opacity-40'}`}
                                            title={PROFILE_INFO[prof]}
                                        >
                                            <span className="text-sm">{PROFILE_ICONS[prof]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Baraja */}
                <section className="bg-emerald-900/20 p-6 rounded-[2.5rem] border border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80 mb-4">Selección de Cartas</h3>
                    <div className="poker-grid-compact">
                        {FULL_DECK.map(card => {
                            const isSelected = [...hand, ...board].some(c => c.id === card.id);
                            return <CardUI key={card.id} card={card} isSelected={isSelected} onClick={() => toggleCardSelection(card)} size="sm" />;
                        })}
                    </div>
                </section>

                {/* Mesa y Mano Visual */}
                <section className="bg-black/20 p-6 rounded-[2.5rem] border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="text-center">
                        <h3 className="text-[10px] font-black uppercase text-emerald-400/50 mb-4">Tu Mano</h3>
                        <div className="flex gap-4 justify-center">
                            <CardUI size="lg" card={hand[0]} onClick={() => hand[0] && toggleCardSelection(hand[0])} />
                            <CardUI size="lg" card={hand[1]} onClick={() => hand[1] && toggleCardSelection(hand[1])} />
                        </div>
                    </div>
                    <div className="text-center">
                        <h3 className="text-[10px] font-black uppercase text-emerald-400/50 mb-4">Comunidad (Mesa)</h3>
                        <div className="flex gap-2 justify-center flex-wrap">
                            {[0, 1, 2, 3, 4].map(i => <CardUI key={i} size="md" card={board[i]} onClick={() => board[i] && toggleCardSelection(board[i])} />)}
                        </div>
                    </div>
                </section>

            </div>

            {/* Columna Derecha: Análisis */}
            <aside className="lg:col-span-4">
                <div className="bg-slate-900 rounded-[3rem] p-8 border border-white/10 shadow-2xl h-full flex flex-col min-h-[500px]">
                    <h2 className="text-xl font-black text-yellow-400 mb-8 tracking-tighter">ANÁLISIS 3-MAX</h2>

                    {isAnalyzing ? (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                            <div className="w-16 h-16 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
                            <p className="text-yellow-400 font-black text-[10px] uppercase tracking-widest animate-pulse">Calculando Rangos...</p>
                        </div>
                    ) : analysis ? (
                        <div className="flex-1 space-y-8 animate-in zoom-in-95 duration-500">
                            <div className="text-center">
                                <span className="text-6xl font-black text-white">{Math.round(analysis.probability * 100)}%</span>
                                <p className="text-[10px] font-bold text-emerald-400 uppercase mt-2">Equity de Victoria</p>
                            </div>

                            <div className="space-y-4">
                                <div className={`py-4 px-6 rounded-2xl text-center font-black text-lg ${analysis.advice === 'CONTINUE' ? 'bg-emerald-600 shadow-lg shadow-emerald-600/20' :
                                    analysis.advice === 'FOLD' ? 'bg-rose-600 shadow-lg shadow-rose-600/20' :
                                        'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                                    }`}>
                                    {analysis.suggestedAction.toUpperCase()}
                                </div>

                                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
                                    <p className="text-xs text-emerald-100/70 italic leading-relaxed text-center">
                                        "{analysis.reasoning}"
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-center">
                                    <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                                        <span className="text-[8px] text-white/30 uppercase block font-bold mb-1">Mano Estimada</span>
                                        <span className="text-[10px] font-bold text-white">{analysis.expectedHand}</span>
                                    </div>
                                    <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                                        <span className="text-[8px] text-white/30 uppercase block font-bold mb-1">Apuesta</span>
                                        <span className="text-[10px] font-bold text-yellow-400">{analysis.betSize || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => { setHand([]); setBoard([]); setAnalysis(null); }}
                                className="w-full py-4 bg-white/5 hover:bg-white/10 text-[10px] font-black text-white/40 rounded-2xl uppercase tracking-widest transition-all mt-auto"
                            >
                                Nueva Mano
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 gap-6">
                            <div className="w-24 h-32 border-2 border-dashed border-white/30 rounded-xl flex items-center justify-center text-4xl">?</div>
                            <p className="text-xs font-medium max-w-[200px]">Selecciona tus cartas y configura a los rivales para recibir asesoría GTO en tiempo real.</p>
                        </div>
                    )}

                    {errorStatus && (
                        <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-center">
                            <p className="text-red-200 text-[10px] font-bold uppercase">Error: {errorStatus === 'quota' ? 'Cuota Agotada' : 'Error de Conexión'}</p>
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
};

export default ThreeVSMode;
