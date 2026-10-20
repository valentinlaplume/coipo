// src/services/ai/sugerencias.service.js
// ÚNICO punto de llamada a la IA para el asistente de sugerencias.
// Aislado del resto de la app: la vista solo llama a `consultarSugerencias(payload)`.
// Usa las mismas GROQ keys gratis y el mismo key manager que groq.service.js.
//
// Nota sobre max_tokens: el spec pedía 200–300, pero openai/gpt-oss-20b "razona"
// antes de responder y esas razonas consumen los tokens de salida (ver comentario
// en groq.service.js sendGroqRequest). Con 300 el JSON queda truncado. Usamos un
// presupuesto chico pero suficiente; la respuesta real sigue siendo corta.

import { groqKeyManager } from './groq.service.js';
import { PROMPT_SUGERENCIAS } from './prompts-sugerencias.js';
import { parsearRespuestaIA, claveCache } from '../../utils/sugerencias-logic.js';

const MODELO = 'openai/gpt-oss-20b';   // rápido, gratis, JSON confiable
const TEMPERATURA = 0.2;               // baja: respuestas consistentes
const MAX_TOKENS = 1500;
const TIMEOUT_MS = 12000;
const MAX_REINTENTOS_API = 3;          // rotación de keys / 429 / timeout
const MAX_INTENTOS_JSON = 2;           // original + 1 reintento si el JSON es inválido
const ENFRIAMIENTO_MS = 3000;          // rate limit por usuario (cliente)
const CACHE_MAX = 20;

const cache = new Map();               // mismo intent + mismo restante (50 kcal) → reusar
let ultimaLlamada = 0;

// ── Mensajes amables (nunca errores crudos) ──────────────────────────────
const MSJ = {
    saturado:  'El asistente está saturado. Probá de nuevo en un minuto.',
    conexion:  'No pude conectar con el asistente. Revisá tu conexión y probá de nuevo.',
    respuesta: 'No pude entender la respuesta. Probá una vez más.',
    limitado:  'Demasiadas consultas por ahora. Esperá un momento y volvé a intentar.'
};

// ── Llamada HTTP a Groq con rotación de keys (patrón de groq.service.js) ──
const llamarGroq = async (contenidoUsuario) => {
    let ultimoError = null;

    for (let i = 0; i < MAX_REINTENTOS_API; i++) {
        if (groqKeyManager.allOnCooldown()) break;
        const key = groqKeyManager.getCurrentKey();
        if (!key) break;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: MODELO,
                    temperature: TEMPERATURA,
                    max_tokens: MAX_TOKENS,
                    messages: [
                        { role: 'system', content: PROMPT_SUGERENCIAS },
                        { role: 'user', content: contenidoUsuario }
                    ]
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.status === 429) {
                groqKeyManager.markRateLimited(key);
                ultimoError = 'rate_limit';
                continue;
            }
            if (response.status === 401 || response.status === 403) {
                groqKeyManager.markPermanentFail(key);
                ultimoError = 'auth';
                continue;
            }
            if (!response.ok) {
                const body = await response.text().catch(() => '');
                console.warn(`⚠️ [Sugerencias] Groq ${response.status}:`, body.slice(0, 200));
                ultimoError = `http_${response.status}`;
                continue;
            }

            const json = await response.json();
            groqKeyManager.incrementRequest();
            const contenido = json?.choices?.[0]?.message?.content;
            if (!contenido || !String(contenido).trim()) {
                ultimoError = 'vacia';
                continue;
            }
            return String(contenido);
        } catch (e) {
            ultimoError = e?.name === 'AbortError' ? 'timeout' : 'red';
        }
    }

    if (ultimoError === 'rate_limit') throw new Error('RATE_LIMIT');
    throw new Error('SIN_RESPUESTA');
};

// ── Extraer JSON tolerante (backticks, texto alrededor) ──────────────────
const extraerJSON = (texto) => {
    let limpio = String(texto || '').trim();
    // Quitar fences ```json ... ```
    limpio = limpio.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    try {
        return JSON.parse(limpio);
    } catch {
        const i = limpio.indexOf('{');
        const f = limpio.lastIndexOf('}');
        if (i === -1 || f === -1 || f <= i) throw new Error('RESPUESTA_INVALIDA');
        return JSON.parse(limpio.slice(i, f + 1));
    }
};

/**
 * Consulta principal.
 * @param {object} payload — salida de construirPayloadIA()
 * @returns {{sugerencias?: Array, libre?: object, nota?: string, error?: string, desdeCache?: boolean}}
 * @throws {Error} con mensaje amable listo para mostrar (MSJ)
 */
export const consultarSugerencias = async (payload) => {
    const restanteKcal = Number(payload?.restante?.kcal);
    // Guardia extra: jamás llamar a la IA sin restante positivo
    if (!(restanteKcal > 0)) {
        return { error: 'completado', mensaje: 'Ya completaste tus calorías de hoy' };
    }

    // Caché: intent + restante redondeado a 50 kcal (+ texto para LIBRE/GUSTO/ALTERNATIVA)
    const texto = String(payload?.texto_libre || '').trim();
    const clave = claveCache(payload.intent, restanteKcal) + (texto ? `§${texto}` : '');
    if (cache.has(clave)) return { ...cache.get(clave), desdeCache: true };

    // Rate limit por usuario (cliente): espaciar consultas
    const espera = ENFRIAMIENTO_MS - (Date.now() - ultimaLlamada);
    if (espera > 0) await new Promise(r => setTimeout(r, espera));
    ultimaLlamada = Date.now();

    const contenido = JSON.stringify(payload);
    let parseOk = false;
    let resultado = null;

    // Reintento: 2 intentos si el JSON viene inválido
    for (let intento = 0; intento < MAX_INTENTOS_JSON && !parseOk; intento++) {
        let respuesta;
        try {
            respuesta = await llamarGroq(contenido);
        } catch (e) {
            if (e.message === 'RATE_LIMIT') throw new Error(MSJ.limitado);
            if (groqKeyManager.allOnCooldown()) throw new Error(MSJ.saturado);
            throw new Error(MSJ.conexion);
        }
        try {
            resultado = parsearRespuestaIA(extraerJSON(respuesta));
            parseOk = true;
        } catch {
            console.warn(`⚠️ [Sugerencias] JSON inválido (intento ${intento + 1})`);
        }
    }

    if (!parseOk) throw new Error(MSJ.respuesta);

    // Errores temáticos de la IA NO se cachean (el usuario puede corregir el texto)
    if (!resultado.error) {
        if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
        cache.set(clave, resultado);
    }
    return resultado;
};

export const limpiarCacheSugerencias = () => cache.clear();
