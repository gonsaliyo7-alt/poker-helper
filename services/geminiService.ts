
import { GoogleGenAI, Type } from "@google/genai";
import { Card, AnalysisResponse, Position, OpponentProfile, HandHistoryReport } from "../types";

export class QuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaError";
  }
}

export const analyzeHandHistory = async (rawText: string, apiKey?: string): Promise<HandHistoryReport> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });

  const prompt = `
    Eres un analista de datos de poker de élite. Analiza el siguiente historial de manos (PokerStars/GG format) y extrae conclusiones estadísticas profundas sobre el "Hero" (el jugador principal).
    
    TEXTO DEL HISTORIAL:
    ${rawText}

    TAREAS:
    1. Identifica el estilo del jugador (ej: Tight-Aggressive, Loose-Passive).
    2. Estima su agresividad y tendencia a entrar en botes.
    3. Encuentra "LEAKS" (errores recurrentes, ej: over-folding en river, over-calling preflop).
    4. Identifica fortalezas.
    5. Escribe un reporte educativo exhaustivo.

    RESPONDE EN ESPAÑOL (JSON):
    - playerStyle: Nombre del estilo.
    - vpipRating: Comentario sobre su frecuencia de juego (Baja/Media/Alta).
    - aggressionFactor: Escala del 1 al 10.
    - mainLeaks: Lista de strings con los errores encontrados.
    - strengths: Lista de strings con los puntos fuertes.
    - detailedReport: Texto largo en Markdown con análisis detallado.
    - suggestedDrills: Lista de ejercicios para mejorar.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            playerStyle: { type: Type.STRING },
            vpipRating: { type: Type.STRING },
            aggressionFactor: { type: Type.NUMBER },
            mainLeaks: { type: Type.ARRAY, items: { type: Type.STRING } },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            detailedReport: { type: Type.STRING },
            suggestedDrills: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["playerStyle", "vpipRating", "aggressionFactor", "mainLeaks", "strengths", "detailedReport", "suggestedDrills"]
        }
      }
    });

    return JSON.parse(response.text || '{}') as HandHistoryReport;
  } catch (error: any) {
    if (error?.message?.includes("Requested entity was not found")) throw new Error("Requested entity was not found");
    throw error;
  }
};

export const analyzePokerHand = async (
  hand: Card[],
  board: Card[],
  position: Position,
  playerCount: number,
  stackSize: number,
  opponentProfile: OpponentProfile = 'standard',
  apiKey?: string,
  userAction?: string // Optional user choice to critique
): Promise<AnalysisResponse> => {
  console.log('🔹 SERVICE: analyzePokerHand called. Has API Key?', !!apiKey);
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });

  const handString = hand.map(c => `${c.rank} of ${c.suit}`).join(', ');
  const boardString = board.length > 0 ? board.map(c => `${c.rank} of ${c.suit}`).join(', ') : 'Pre-flop (sin cartas)';

  const isHeadsUp = playerCount === 2;

  let positionDetail = '';
  if (isHeadsUp) {
    positionDetail = position === 'dealer'
      ? 'Dealer / Ciega Pequeña (Habla primero pre-flop, último post-flop).'
      : 'Ciega Grande (Habla último pre-flop, primero post-flop).';
  } else {
    const posMap: Record<string, string> = {
      dealer: 'Button/Dealer',
      smallBlind: 'Ciega Pequeña',
      bigBlind: 'Ciega Grande',
      early: 'Posición Temprana (UTG)',
      middle: 'Posición Media',
      late: 'Posición Tardía (Cutoff)'
    };
    positionDetail = posMap[position || 'early'] || 'Desconocida';
  }

  const prompt = `
    Eres un mentor experto en Poker Texas Hold'em enfocado en teoría GTO (Game Theory Optimal).
    
    CONTEXTO DE LA MANO:
    - Jugadores: ${playerCount} ${isHeadsUp ? '(Heads-Up)' : '(Mesa Llena)'}
    - Mi Stack: ${stackSize} BB (Ciegas Grandes)
    - Mi Mano: ${handString}
    - Mesa (Board): ${boardString}
    - Mi Posición: ${positionDetail}
    - Perfil del Rival: ${opponentProfile}
    ${userAction ? `- Acción elegida por el usuario: ${userAction}` : ''}

    INSTRUCCIONES ESTRATÉGICAS:
    1. Ajusta la agresividad según el stack. Con < 15 BB busca All-in o Fold. Con > 100 BB juega más post-flop.
    2. Sugiere una ACCIÓN específica (Check, Bet, Raise, Fold, All-in).
    3. Si sugieres apostar/subir, indica un TAMAÑO (ej. 33% pot, 2.5 BB, 75% pot).
    4. Explica brevemente la lógica matemática o de rango detrás de la decisión.
    ${userAction ? `5. EXPLICA ESPECÍFICAMENTE si la acción "${userAction}" del usuario fue correcta o incorrecta según GTO y por qué.` : ''}

    RESPONDE EN ESPAÑOL (JSON):
    - probability: (0.0 a 1.0 de victoria)
    - advice: 'CONTINUE', 'FOLD', o 'CAUTION'
    - suggestedAction: Acción recomendada (ej: "Subir / 3-Bet", "Pasar / Llamar")
    - betSize: Tamaño recomendado (ej: "3.5 BB" o "1/2 del Bote")
    - reasoning: Explicación didáctica ${userAction ? 'incluyendo la crítica a la acción del usuario.' : ''}
    - expectedHand: Mejor jugada actual o proyecto.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            probability: { type: Type.NUMBER },
            advice: { type: Type.STRING },
            suggestedAction: { type: Type.STRING },
            betSize: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            expectedHand: { type: Type.STRING }
          },
          required: ["probability", "advice", "suggestedAction", "betSize", "reasoning", "expectedHand"]
        }
      }
    });

    return JSON.parse(response.text || '{}') as AnalysisResponse;
  } catch (error: any) {
    if (error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
      throw new QuotaError("Cuota agotada.");
    }
    if (error?.message?.includes("Requested entity was not found") || error?.message?.includes("API_KEY_INVALID")) {
      throw new Error("Requested entity was not found");
    }
    throw error;
  }
};
