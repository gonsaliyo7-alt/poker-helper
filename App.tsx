
import React, { useState, useEffect, useCallback } from 'react';
import { Card, GameState, AnalysisResponse, Position, AppMode, OpponentProfile } from './types';
import { FULL_DECK } from './constants';
import CardUI from './components/CardUI';
import TrainingMode from './components/TrainingMode';
import HandImporter from './components/HandImporter';
import { analyzePokerHand, QuotaError } from './services/geminiService';

const POSITIONS_INFO: Record<string, string> = {
  dealer: "Botón: La mejor posición. Eres el último en actuar en todas las rondas post-flop.",
  smallBlind: "Ciega Pequeña: Posición difícil. Pagas media ciega pero hablas primero post-flop.",
  bigBlind: "Ciega Grande: Defiendes tu apuesta obligatoria. Hablas último pre-flop.",
  early: "UTG / Temprana: Hablas de los primeros. Necesitas manos muy fuertes para entrar.",
  middle: "Media: Tienes algo de información, pero aún queda gente por detrás.",
  late: "Late / Cutoff: Excelente para intentar robar las ciegas si nadie ha entrado."
};

const PROFILE_INFO: Record<string, string> = {
  standard: "Juega de forma lógica. No regala fichas pero sabe cuándo presionar.",
  aggressive: "Apuesta y sube con rangos amplios. Busca que foldees por miedo.",
  passive: "Paga casi todo pero rara vez sube. Si apuesta fuerte, ¡corre!",
  bluffer: "Le encanta representar manos que no tiene. Un call aquí tiene más valor."
};

const PROFILE_ICONS: Record<string, string> = {
  standard: "🧠",
  aggressive: "🔥",
  passive: "🛡️",
  bluffer: "🎭"
};

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode>('calculator');
  const [showGlossary, setShowGlossary] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [state, setState] = useState<GameState>({
    hand: [],
    board: [],
    position: null,
    playerCount: 6,
    stackSize: 100,
    opponentProfile: 'standard',
    isAnalyzing: false,
    analysis: null
  });

  const [errorStatus, setErrorStatus] = useState<'quota' | 'generic' | 'auth' | null>(null);

  const handlePlayerCountChange = (count: number) => {
    setState(prev => ({ ...prev, playerCount: count }));
  };

  const handleStackSizeChange = (size: number) => {
    setState(prev => ({ ...prev, stackSize: size }));
  };

  const clearTable = () => {
    setState(prev => ({
      ...prev,
      hand: [],
      board: [],
      analysis: null
    }));
  };

  useEffect(() => {
    const checkKey = async () => {
      const storedKey = localStorage.getItem('GEMINI_API_KEY');
      console.log('🔹 checkKey: storedKey found?', !!storedKey);
      if (storedKey) {
        setHasKey(true);
      } else {
        setHasKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSaveKey = (key: string) => {
    console.log('🔹 handleSaveKey called with length:', key.length);
    if (key.trim().length > 0) {
      localStorage.setItem('GEMINI_API_KEY', key.trim());
      setHasKey(true);
      setErrorStatus(null);
      console.log('✅ API Key saved to localStorage and hasKey set to true');
    } else {
      console.warn('⚠️ handleSaveKey received empty string');
    }
  };

  const clearKey = () => {
    localStorage.removeItem('GEMINI_API_KEY');
    setHasKey(false);
  };

  const handleOpenKey = () => {
    const key = prompt("Por favor ingresa tu Gemini API Key:");
    if (key) handleSaveKey(key);
  };

  const toggleCardSelection = (card: Card) => {
    console.log('🔹 toggleCardSelection:', card);
    const isInHand = state.hand.some(c => c.id === card.id);
    const isInBoard = state.board.some(c => c.id === card.id);
    if (isInHand) {
      console.log('   Removing from hand');
      setState(prev => ({ ...prev, hand: prev.hand.filter(c => c.id !== card.id) }));
      return;
    }
    if (isInBoard) {
      console.log('   Removing from board');
      setState(prev => ({ ...prev, board: prev.board.filter(c => c.id !== card.id) }));
      return;
    }
    if (state.hand.length < 2) {
      console.log('   Adding to hand');
      setState(prev => ({ ...prev, hand: [...prev.hand, card] }));
    } else if (state.board.length < 5) {
      console.log('   Adding to board');
      setState(prev => ({ ...prev, board: [...prev.board, card] }));
    }
    setErrorStatus(null);
  };

  const runAnalysis = useCallback(async () => {
    console.log('🔹 runAnalysis triggering...');
    if (state.hand.length < 2) {
      console.log('   Hand not full yet');
      return;
    }
    const apiKey = localStorage.getItem('GEMINI_API_KEY');
    if (!apiKey) {
      console.warn('   No API Key found in localStorage during runAnalysis');
      setHasKey(false);
      return;
    }

    console.log('   Starting analysis with API Key (masked):', apiKey.substring(0, 4) + '...');
    setState(prev => ({ ...prev, isAnalyzing: true }));
    setErrorStatus(null);
    try {
      const result = await analyzePokerHand(
        state.hand,
        state.board,
        state.position,
        state.playerCount,
        state.stackSize,
        state.opponentProfile,
        apiKey
      );
      console.log('✅ Analysis success:', result);
      setState(prev => ({ ...prev, analysis: result, isAnalyzing: false }));
    } catch (error: any) {
      console.error("Error en análisis:", error);
      setState(prev => ({ ...prev, isAnalyzing: false }));
      if (error?.message?.includes("Requested entity was not found") || error?.message?.includes("API Key is required")) {
        setHasKey(false);
        setErrorStatus('auth');
      } else if (error instanceof QuotaError) {
        setErrorStatus('quota');
      } else {
        setErrorStatus('generic');
      }
    }
  }, [state.hand, state.board, state.position, state.playerCount, state.stackSize, state.opponentProfile]);

  useEffect(() => {
    if (state.hand.length === 2 && hasKey && activeMode === 'calculator') {
      console.log('🔹 EFFECT TRIGGER: Hand full, calling runAnalysis');
      runAnalysis();
    } else {
      // Clear analysis if hand is cleared (optional, or keep generic state clear)
      if (state.hand.length < 2) {
        setState(prev => ({ ...prev, analysis: null }));
      }
    }
  }, [state.hand, state.board, state.position, state.playerCount, state.stackSize, state.opponentProfile, runAnalysis, hasKey, activeMode]);

  if (hasKey === false) {
    return (
      <div className="min-h-screen bg-emerald-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-yellow-400/30 rounded-[3rem] p-10 shadow-2xl space-y-8 animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-yellow-400 rounded-2xl flex items-center justify-center mx-auto text-emerald-950 font-black text-3xl shadow-xl shadow-yellow-400/20">A♠</div>
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-white">Configuración Requerida</h2>
            <p className="text-emerald-300/60 text-sm leading-relaxed">
              Para utilizar la IA de Poker Genius, necesitas configurar tu propia API Key de Google Gemini.
              <br /><br />
              Tu clave se guardará localmente en tu navegador.
            </p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-yellow-400/50 hover:text-yellow-400 underline uppercase tracking-widest font-bold block"
            >
              Obtener API Key Gratis ↗
            </a>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            const input = (e.currentTarget.elements.namedItem('apiKey') as HTMLInputElement).value;
            handleSaveKey(input);
          }} className="space-y-4">
            <input
              type="password"
              name="apiKey"
              placeholder="Pegar API Key aquí..."
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:border-yellow-400/50"
            />
            <button
              type="submit"
              className="w-full py-5 bg-yellow-400 text-emerald-950 font-black rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all uppercase text-xs tracking-widest"
            >
              Guardar y Continuar
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isHeadsUp = state.playerCount === 2;
  const boardPhase = state.board.length === 0 ? 'PRE-FLOP' : state.board.length === 3 ? 'FLOP' : state.board.length === 4 ? 'TURN' : state.board.length === 5 ? 'RIVER' : 'POST-FLOP';

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center text-emerald-950 font-black text-2xl shadow-lg shadow-yellow-400/20">A♠</div>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">POKER GENIUS <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-emerald-300 font-mono">v3.0</span></h1>
            <p className="text-emerald-300/60 text-xs font-medium">Mentor de Estrategia e IA GTO</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={clearKey} className="p-2 text-emerald-300 hover:text-white transition-colors text-xs font-bold mr-2" title="Cambiar API Key">
            🔑 Key
          </button>
          <button onClick={() => setShowGlossary(!showGlossary)} className="p-2 text-emerald-300 hover:text-white transition-colors" title="Ayuda y Glosario">
            <span className="text-xl">📖</span>
          </button>
          <nav className="flex bg-black/30 p-1 rounded-xl border border-white/5">
            <button onClick={() => setActiveMode('calculator')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeMode === 'calculator' ? 'bg-yellow-400 text-emerald-950' : 'text-emerald-100 hover:bg-white/5'}`}>Calculadora</button>
            <button onClick={() => setActiveMode('training')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeMode === 'training' ? 'bg-yellow-400 text-emerald-950' : 'text-emerald-100 hover:bg-white/5'}`}>Entrenamiento</button>
            <button onClick={() => setActiveMode('importer')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeMode === 'importer' ? 'bg-yellow-400 text-emerald-950' : 'text-emerald-100 hover:bg-white/5'}`}>Analista</button>
          </nav>
        </div>
      </header>

      {activeMode === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <section className="bg-emerald-900/40 p-4 sm:p-6 rounded-3xl border border-white/5 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80">Baraja de Selección</h2>
              </div>
              <div className="poker-grid">
                {FULL_DECK.map(card => {
                  const isSelected = [...state.hand, ...state.board].some(c => c.id === card.id);
                  return <CardUI key={card.id} card={card} isSelected={isSelected} onClick={() => toggleCardSelection(card)} size="md" />;
                })}
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <section className="bg-emerald-800/20 p-5 rounded-3xl border border-white/5 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Variables de Mesa</h3>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Jugadores: <span className="text-yellow-400">{state.playerCount}</span></span>
                  </div>
                  <input type="range" min="2" max="9" step="1" value={state.playerCount} onChange={(e) => handlePlayerCountChange(parseInt(e.target.value))} className="w-full h-1.5 bg-emerald-900 rounded-lg appearance-none cursor-pointer accent-yellow-400" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Stack: <span className="text-yellow-400">{state.stackSize} BB</span></span>
                  </div>
                  <input type="range" min="1" max="250" step="1" value={state.stackSize} onChange={(e) => handleStackSizeChange(parseInt(e.target.value))} className="w-full h-1.5 bg-emerald-900 rounded-lg appearance-none cursor-pointer accent-yellow-400" />
                </div>

                <div className="pt-2">
                  <div className="grid grid-cols-3 gap-2">
                    {(isHeadsUp ? ['dealer', 'bigBlind'] : ['early', 'middle', 'late', 'dealer', 'smallBlind', 'bigBlind']).map(p => (
                      <button key={p} onClick={() => setState(s => ({ ...s, position: s.position === p ? null : p as Position }))} className={`py-2 rounded-xl text-[9px] font-bold border transition-all ${state.position === p ? 'bg-yellow-400 text-emerald-950 border-yellow-300 shadow-lg' : 'bg-white/5 border-white/10 text-emerald-100/60'}`}>
                        {p.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="bg-emerald-800/20 p-5 rounded-3xl border border-white/5 space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 mb-2">Perfil del Oponente</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(PROFILE_INFO).map(prof => (
                    <button
                      key={prof}
                      onClick={() => setState(s => ({ ...s, opponentProfile: prof as OpponentProfile }))}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all group ${state.opponentProfile === prof ? 'bg-emerald-500 border-emerald-400 shadow-lg' : 'bg-white/5 border-white/10 opacity-60 hover:opacity-100'}`}
                    >
                      <span className="text-2xl transition-transform group-hover:scale-110">{PROFILE_ICONS[prof]}</span>
                      <span className="text-[10px] font-black uppercase text-white">{prof}</span>
                    </button>
                  ))}
                </div>
                {state.opponentProfile && (
                  <p className="text-[10px] text-emerald-300/70 italic text-center px-2">
                    {PROFILE_INFO[state.opponentProfile]}
                  </p>
                )}
              </section>
            </div>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/20 p-6 rounded-3xl border border-white/5">
              <div className="text-center">
                <h3 className="text-[10px] font-black uppercase text-emerald-400/50 mb-4">Tus Cartas</h3>
                <div className="flex gap-4 justify-center">
                  <CardUI size="lg" card={state.hand[0]} onClick={() => state.hand[0] && toggleCardSelection(state.hand[0])} />
                  <CardUI size="lg" card={state.hand[1]} onClick={() => state.hand[1] && toggleCardSelection(state.hand[1])} />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-[10px] font-black uppercase text-emerald-400/50 mb-4">Mesa ({boardPhase})</h3>
                <div className="flex gap-2 justify-center flex-wrap">
                  {[0, 1, 2, 3, 4].map(i => <CardUI key={i} size="md" card={state.board[i]} onClick={() => state.board[i] && toggleCardSelection(state.board[i])} />)}
                </div>
              </div>
            </section>
          </div>

          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 border border-white/10 shadow-2xl min-h-[550px] flex flex-col relative overflow-hidden">
              <h2 className="text-lg font-black text-yellow-400 mb-8 tracking-tighter">ANÁLISIS GTO</h2>

              {errorStatus && (
                <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-xl mb-6 text-center animate-in fade-in slide-in-from-top-2">
                  <p className="text-red-200 text-xs font-bold">
                    {errorStatus === 'quota' ? '⚠️ Cuota agotada. Intenta más tarde.' :
                      errorStatus === 'auth' ? '⚠️ Error de autenticación. Verifica tu API Key.' :
                        '⚠️ Ocurrió un error al analizar la mano. Intenta de nuevo.'}
                  </p>
                </div>
              )}

              {state.isAnalyzing ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                  <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                  <p className="text-emerald-500 font-black text-[10px] uppercase tracking-widest animate-pulse">Consultando Oráculo...</p>
                </div>
              ) : state.analysis ? (
                <div className="flex-1 space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 relative z-10">
                  <div className="relative flex justify-center">
                    <div className="text-center">
                      <span className="text-5xl font-black text-white">{Math.round(state.analysis.probability * 100)}%</span>
                      <p className="text-[10px] font-bold text-emerald-400 uppercase mt-1">Equity Estimada</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                      <span className="text-[8px] font-black text-white/40 uppercase block mb-1">Acción</span>
                      <span className="text-sm font-black text-yellow-400">{state.analysis.suggestedAction}</span>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                      <span className="text-[8px] font-black text-white/40 uppercase block mb-1">Tamaño</span>
                      <span className="text-sm font-black text-white">{state.analysis.betSize}</span>
                    </div>
                  </div>
                  <div className={`py-3 px-6 rounded-xl text-center font-black text-sm transition-all ${state.analysis.advice === 'CONTINUE' ? 'bg-emerald-600' : state.analysis.advice === 'FOLD' ? 'bg-rose-600' : 'bg-amber-500 text-black'}`}>
                    {state.analysis.advice}
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-[11px] text-emerald-100/70 italic leading-relaxed text-center">"{state.analysis.reasoning}"</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 gap-4">
                  <span className="text-4xl">🂠</span>
                  <p className="text-xs font-medium max-w-[180px]">Selecciona tus cartas para empezar el cálculo de probabilidades.</p>
                </div>
              )}
              <button onClick={clearTable} className="mt-8 py-3 w-full bg-white/5 hover:bg-white/10 text-[9px] font-black text-white/40 rounded-xl uppercase tracking-widest border border-white/5 transition-colors">Limpiar Mesa</button>
            </div>
          </aside>
        </div>
      )}

      {activeMode === 'training' && <TrainingMode onOpenKey={handleOpenKey} />}
      {activeMode === 'importer' && <HandImporter />}
    </div>
  );
};

export default App;
