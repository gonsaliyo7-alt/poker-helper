
import React, { useState } from 'react';
import { HandHistoryReport } from '../types';
import { analyzeHandHistory } from '../services/geminiService';

const HandImporter: React.FC = () => {
  const [rawText, setRawText] = useState('');
  const [report, setReport] = useState<HandHistoryReport | null>(null);
  const [loading, setLoading] = useState(false);

  const handleProcess = async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    try {
      const result = await analyzeHandHistory(rawText);
      setReport(result);
    } catch (e) {
      console.error(e);
      alert("Error analizando el historial. Asegúrate de copiar el formato correctamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto py-6">
      {!report ? (
        <div className="space-y-6">
          <div className="bg-emerald-900/40 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-2xl">📥</div>
              <div>
                <h2 className="text-xl font-black">Importador de Historial</h2>
                <p className="text-xs text-emerald-300/60 font-medium">Pega aquí el texto de tus manos de PokerStars, GGPoker o 888Poker.</p>
              </div>
            </div>
            
            <textarea 
              className="w-full h-64 bg-black/40 border border-white/10 rounded-2xl p-6 text-xs font-mono text-emerald-100/70 focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-emerald-100/20"
              placeholder="PokerStars Hand #23456789... Hero (Ac Ad) raises to 3 BB..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />

            <button 
              onClick={handleProcess}
              disabled={loading || !rawText.trim()}
              className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-2xl transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed uppercase text-xs tracking-widest"
            >
              {loading ? "Procesando Big Data..." : "Analizar Mis Errores"}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center">
              <span className="text-[8px] font-black text-emerald-400 uppercase">Privacidad</span>
              <p className="text-[10px] opacity-50 mt-1">Tus datos no se guardan en el servidor.</p>
            </div>
            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center">
              <span className="text-[8px] font-black text-emerald-400 uppercase">Límite</span>
              <p className="text-[10px] opacity-50 mt-1">Recomendado: 1 a 50 manos por bloque.</p>
            </div>
            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center">
              <span className="text-[8px] font-black text-emerald-400 uppercase">IA</span>
              <p className="text-[10px] opacity-50 mt-1">Análisis basado en lógica GTO moderna.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setReport(null)} className="text-[10px] font-black uppercase text-emerald-400 hover:text-white">← Volver al Importador</button>
            <span className="px-3 py-1 bg-yellow-400 text-emerald-950 text-[10px] font-black rounded-full">INFORME GENERADO</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900 p-8 rounded-[2rem] border border-white/10 space-y-8">
                <div className="text-center space-y-2">
                  <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Estilo de Juego</h3>
                  <div className="text-2xl font-black text-yellow-400">{report.playerStyle}</div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                      <span>Agresividad</span>
                      <span>{report.aggressionFactor}/10</span>
                    </div>
                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${report.aggressionFactor * 10}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                      <span>Frecuencia (VPIP)</span>
                      <span className="text-emerald-400">{report.vpipRating}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-4">
                  <h4 className="text-[10px] font-black text-white/40 uppercase">Tus Fortalezas</h4>
                  <ul className="space-y-2">
                    {report.strengths.map((s, i) => (
                      <li key={i} className="text-xs flex items-start gap-2 text-emerald-100/70">
                        <span className="text-emerald-500">✓</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Detailed Report */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-emerald-900/40 p-8 rounded-[2rem] border border-white/5 space-y-6">
                <h3 className="text-xl font-black text-emerald-400">Análisis Detallado de Fugas (Leaks)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.mainLeaks.map((leak, i) => (
                    <div key={i} className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                      <p className="text-xs font-bold text-rose-300">⚠️ {leak}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-white/5 prose prose-invert prose-emerald max-w-none">
                  <div className="text-xs text-emerald-100/80 leading-relaxed whitespace-pre-line">
                    {report.detailedReport}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 space-y-4">
                  <h4 className="text-[10px] font-black text-yellow-400 uppercase">Plan de Entrenamiento Sugerido</h4>
                  <div className="flex flex-wrap gap-2">
                    {report.suggestedDrills.map((drill, i) => (
                      <span key={i} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold">
                        🎯 {drill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HandImporter;
