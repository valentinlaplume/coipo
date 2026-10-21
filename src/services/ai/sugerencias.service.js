// src/services/ai/sugerencias.service.js
// ÚNICO punto de llamada a la IA para el asistente de sugerencias.
// Aislado del resto de la app: la vista solo llama a `consultarSugerencias(payload)`.
//
// Sin keys ni llamadas directas a Groq en el cliente: la consulta sale a
// /api/sugerencias con el ID token de Firebase Auth (ver ia-client.js). El
// servidor usa el system prompt de prompts/sugerencias_system.txt, rota
// keys/modelos y devuelve el JSON ya parseado.
//
// Nota sobre max_tokens (histórica): openai/gpt-oss-20b "razona" antes de
// responder y esas razonas consumen los tokens de salida; con presupuestos
// chicos el JSON venía truncado. El servidor reintenta una vez con más
// presupuesto si la respuesta viene vacía o cortada.

import { pedirIA, estadoIA } from './ia-client.js';
import { parsearRespuestaIA, claveCache } from '../../utils/sugerencias-logic.js';

const MAX_REINTENTOS_API = 3;          // errores transitorios de red/timeout (la rotación de keys la hace el servidor)
const MAX_INTENTOS_JSON = 2;           // original + 1 reintento si el JSON no valida
const ENFRIAMIENTO_MS = 3000;          // rate limit por usuario (cliente)
const CACHE_MAX = 20;

const cache = new Map();               // mismo intent + mismo restante (50 kcal) → reusar
let ultimaLlamada = 0;

// ── Mensajes amables (nunca errores crudos) ──────────────────────────────
const MSJ = {
    saturado:  'El asistente está saturado. Probá de nuevo en un minuto.',
    conexion:  'No pude conectar con el asistente. Revisá tu conexión y probá de nuevo.',
    respuesta: 'No pude entender la respuesta. Probá una vez más.',
    limitado:  'Demasiadas consultas por ahora. Esperá un momento y volvé a intentar.',
    sesion:    'Tu sesión expiró. Entrá de nuevo para continuar.'
};

// ── Llamada al backend /api/sugerencias (Bearer = ID token de Firebase Auth) ──
// El servidor rota keys/modelos y aplica el timeout; acá solo reintentamos
// ante errores transitorios de red.
const llamarIA = async (contenidoUsuario) => {
    if (estadoIA.allOnCooldown()) throw new Error('SATURADO');

    let ultimoError = null;
    for (let i = 0; i < MAX_REINTENTOS_API; i++) {
        try {
            return await pedirIA({ tipo: 'sugerencias', userContent: contenidoUsuario });
        } catch (e) {
            ultimoError = e.message;
            // 429 (sin keys disponibles), sesión inválida o sin sesión:
            // reintentar al instante no resuelve nada.
            if (e.message === 'SATURADO' ||
                e.message === 'SIN_SESION' ||
                e.message === 'SESION_INVALIDA') break;
        }
    }
    throw new Error(ultimoError || 'RED');
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
            respuesta = await llamarIA(contenido); // JSON ya parseado por el servidor
        } catch (e) {
            if (e.message === 'SATURADO') throw new Error(MSJ.limitado);
            if (e.message === 'SIN_SESION' || e.message === 'SESION_INVALIDA') throw new Error(MSJ.sesion);
            if (estadoIA.allOnCooldown()) throw new Error(MSJ.saturado);
            throw new Error(MSJ.conexion);
        }
        try {
            resultado = parsearRespuestaIA(
                typeof respuesta === 'object' && respuesta !== null ? respuesta : extraerJSON(respuesta)
            );
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
