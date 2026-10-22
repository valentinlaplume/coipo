// src/services/ai/ia-client.js
// Única puerta de salida hacia la IA desde el navegador.
//
// Las keys de Groq NUNCA llegan al cliente: el bundle solo hace un POST a
// /api/sugerencias con el ID token de Firebase Auth (Bearer). La rotación de
// keys y modelos vive en netlify/functions/sugerencias.js (servidor).
//
// El servidor reporta saturación con 429 + Retry-After; ese estado se expone
// acá para que la UI (dashboard) pueda mostrar el contador de espera.

import { auth } from '../../firebase-config.js';
import { pedirConSesion, ERROR_SESION } from '../sesion-http.mjs';

export const ENDPOINT_IA = '/api/sugerencias';

// El servidor hace hasta 10s por intento y rota keys/modelos él solo,
// así que al cliente le damos margen de sobra antes de abortar.
const TIMEOUT_MS = 30000;

// ── Estado de saturación (429 reportado por el servidor) ─────────────────────
let saturadoHasta = 0;

export const estadoIA = {
    allOnCooldown: () => saturadoHasta > Date.now(),
    msUntilNextKey: () => Math.max(0, saturadoHasta - Date.now()),
    marcarSaturado: (ms = 60000) => { saturadoHasta = Date.now() + ms; },
    limpiar: () => { saturadoHasta = 0; }
};

// ── Token de sesión ──────────────────────────────────────────────────────────
// Reutilizado por los servicios que van al backend (p. ej. OpenFoodFacts).
// null = sin sesión (el caller decide: en OFF simplemente no se busca).
export const obtenerToken = async () => {
    const usuario = auth.currentUser;
    if (!usuario) return null;
    try {
        return await usuario.getIdToken();
    } catch {
        return null;
    }
};

// ── Extraer JSON tolerante (backticks, texto alrededor) ──────────────────────
const extraerJSON = (texto) => {
    let limpio = String(texto ?? '').trim();
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
 * Llamada a la IA vía backend propio.
 *
 * @param {object}   solicitud
 * @param {string}   solicitud.tipo        tipo de operación (whitelist en el servidor)
 * @param {string}   [solicitud.systemPrompt] prompt del sistema (lo ignora el servidor en 'sugerencias')
 * @param {string|Array} solicitud.userContent mensaje del usuario (string o partes con imagen)
 * @returns {Promise<any>} respuesta JSON ya parseada
 * @throws {Error} con código: SIN_SESION | SESION_INVALIDA | CONFIG_SERVIDOR | SATURADO | RED | TIMEOUT | HTTP_xxx
 */
export const pedirIA = async ({ tipo, systemPrompt, userContent }) => {
    const controller = new AbortController();
    const reloj = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const { respuesta, errorSesion } = await pedirConSesion({
            usuario: auth.currentUser,
            url: ENDPOINT_IA,
            opciones: {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tipo, systemPrompt, userContent }),
                signal: controller.signal
            }
        });

        if (errorSesion === ERROR_SESION.SIN_USUARIO || errorSesion === ERROR_SESION.SIN_TOKEN) {
            throw new Error('SIN_SESION');
        }
        if (errorSesion === ERROR_SESION.CONFIG_SERVIDOR) {
            throw new Error('CONFIG_SERVIDOR');
        }
        if (errorSesion) {
            throw new Error('SESION_INVALIDA');
        }

        if (respuesta.status !== 429) estadoIA.limpiar();

        if (respuesta.status === 429) {
            const segundos = Number(respuesta.headers.get('Retry-After')) || 60;
            estadoIA.marcarSaturado(segundos * 1000);
            throw new Error('SATURADO');
        }
        if (respuesta.status === 403) throw new Error('CONFIG_SERVIDOR');
        if (respuesta.status === 401) throw new Error('SESION_INVALIDA');
        if (!respuesta.ok) throw new Error(`HTTP_${respuesta.status}`);

        const cuerpo = await respuesta.json().catch(() => null);
        if (!cuerpo) throw new Error('RESPUESTA_VACIA');

        // El servidor devuelve el JSON ya parseado; "contenido" es el respaldo
        // crudo por si hubo que parsear en el cliente.
        if (typeof cuerpo.data !== 'undefined' && cuerpo.data !== null) return cuerpo.data;
        if (cuerpo.contenido) return extraerJSON(cuerpo.contenido);
        throw new Error('RESPUESTA_VACIA');
    } catch (e) {
        if (e?.name === 'AbortError') throw new Error('TIMEOUT');
        // fetch red throwe TypeError ("Failed to fetch" / "NetworkError")
        if (e instanceof TypeError) throw new Error('RED');
        throw e;
    } finally {
        clearTimeout(reloj);
    }
};
