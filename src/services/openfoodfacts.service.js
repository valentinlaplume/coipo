// src/services/openfoodfacts.service.js
// Buscador de productos en OpenFoodFacts con SIMILITUD (mejor coincidencia).
// Sin dependencias de Firebase → utilizable desde cualquier servicio (Groq, etc.).
//
// El navegador NO puede llamar a OFF directamente (sin CORS + 503 de
// Cloudflare), así que la búsqueda va por el backend propio:
// GET /api/openfoodfacts?q=... (netlify/functions/openfoodfacts.js), que
// aguanta el Bearer de Firebase Auth y hace fallback entre mirrors.
//
// Flujo: recibe un texto tipo "Fideos Matarazzo Proteína Plus (cocidos)",
// lo limpia (paréntesis, estado de cocción, stopwords), busca en OFF y
// devuelve el producto cuyo nombre+marca más se parezca (score de tokens),
// SOLO si la coincidencia es suficiente y trae macros completas.
// Si no hay buena coincidencia → null (el llamador mantiene su estimación).

import { obtenerToken } from './ai/ia-client.js';

export const ENDPOINT_OFF = '/api/openfoodfacts';

const TIMEOUT_MS = 5000;
// Mínimo de palabras clave del usuario que deben aparecer en el producto OFF.
// 0.66 ≈ 2 de 3, 3 de 4... (con 2 palabras exige ambas: 1/2 = 0.5 < 0.66)
const UMBRAL_SIMILITUD = 0.66;

const STOPWORDS = new Set([
    'de', 'del', 'la', 'el', 'los', 'las', 'con', 'y', 'en', 'al', 'un', 'una',
    'porcion', 'x'
]);
// Palabras de estado de cocción: no identifican al producto
const PALABRAS_COCION = new Set([
    'crudo', 'cruda', 'cocido', 'cocida', 'frito', 'frita', 'hervido', 'hervida',
    'natural', 'dorado', 'dorada', 'salteado', 'salteada', 'plancha', 'horno', 'caliente'
]);

const normalizar = (t) => String(t ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const tokenizar = (t) => normalizar(t)
    .replace(/\([^)]*\)/g, ' ')        // quita paréntesis — ej. "(cocidos)"
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOPWORDS.has(w) && !PALABRAS_COCION.has(w));

// Igualdad tolerante: plural/singular y variantes cortas ("protein" ≈ "proteina")
const palabrasIguales = (a, b) =>
    a === b ||
    a.replace(/s$/, '') === b.replace(/s$/, '') ||
    (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)));

const num = (v) => (typeof v === 'number' && !isNaN(v) ? v : 0);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Fetch JSON con timeout vía el backend propio. Devuelve null ante error,
// sin sesión o respuesta no-JSON (OFF responde 503/HTML cuando está saturado
// o limita consultas seguidas): en 429/5xx reintenta UNA vez tras 1,2s;
// timeout/red no se reintenta (no queremos demorar el registro de una comida).
const fetchJSON = async (consulta) => {
    const token = await obtenerToken();
    if (!token) return null; // sin sesión no gastamos la cuota del proxy

    const url = `${ENDPOINT_OFF}?q=${encodeURIComponent(consulta)}&page_size=20`;

    for (let intento = 0; intento < 2; intento++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
            const res = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const contentType = res.headers.get('content-type') || '';
            if (res.ok && contentType.includes('json')) {
                return await res.json();
            }
            if (res.status === 429 || res.status >= 500) {
                await sleep(1200); // OFF saturado → un reintento
                continue;
            }
            return null;
        } catch {
            return null; // timeout o red caída
        } finally {
            clearTimeout(timeoutId);
        }
    }
    return null;
};

// Score de un producto contra las palabras clave del usuario
const puntuar = (producto, queryTokens) => {
    const n = producto.nutriments || {};
    const textoProducto = `${producto.product_name || producto.product_name_es || ''} ${producto.brands || ''}`;
    const tokensProducto = tokenizar(textoProducto);

    const coinciden = queryTokens.filter(q => tokensProducto.some(p => palabrasIguales(q, p)));
    const score = queryTokens.length ? coinciden.length / queryTokens.length : 0;

    // Palabras del producto que NO pidió el usuario (penaliza variantes de más)
    const extras = tokensProducto.filter(p => !queryTokens.some(q => palabrasIguales(q, p))).length;

    // Macros por 100g deben venir completas
    const completo =
        typeof n['proteins_100g'] === 'number' &&
        typeof n['carbohydrates_100g'] === 'number' &&
        typeof n['fat_100g'] === 'number' &&
        Number(n['energy-kcal_100g']) > 0;

    return { score, extras, completo };
};

/**
 * Busca el producto de OpenFoodFacts que MÁS SE PAREZCA al texto.
 * @param {string} texto - ej: "Fideos Matarazzo Proteína Plus (cocidos)"
 * @param {string|null} marca - marca detectada por la IA (ej: "Dicomere", "One Fit
 *   Nutrition"). Si el producto CON marca no está en OFF, se reintenta con el
 *   producto BASE sin la marca ("harina de arveja") y se marca `es_generica: true`.
 * @returns {Promise<{nombre, marca, por_100g, fuente, es_generica}|null>} null si no hay coincidencia suficiente
 */
export const buscarProductoPorNombreSimilar = async (texto, marca = null) => {
    if (!texto || typeof texto !== 'string') return null;

    const queryTokens = tokenizar(texto);
    if (queryTokens.length === 0) return null;

    // Tokens de la marca y del producto base (texto sin la marca)
    const marcaTokens = marca ? tokenizar(marca) : [];
    const baseTokens = marcaTokens.length
        ? queryTokens.filter(t => !marcaTokens.some(m => palabrasIguales(t, m)))
        : queryTokens;

    const limpio = normalizar(texto).replace(/\([^)]*\)/g, ' ').trim();

    // Consultas (en orden):
    // 1) completa — con marca: busca el producto REAL envasado
    // 2) base sin la marca — fallback si la marca no está en la base ("harina de arveja")
    // 3) sin la primera palabra (a menudo el género genérico, ej. "fideos matarazzo proteina plus")
    const fases = [{ consulta: limpio, tokens: queryTokens, base: false }];
    if (marcaTokens.length && baseTokens.length > 0 && baseTokens.length < queryTokens.length) {
        fases.push({ consulta: baseTokens.join(' '), tokens: baseTokens, base: true });
    }
    if (queryTokens.length >= 3) {
        // La relajada se puntúa SIEMPRE contra los tokens completos (como antes)
        fases.push({ consulta: queryTokens.slice(1).join(' '), tokens: queryTokens, base: false });
    }
    // Sin consultas repetidas
    const vistas = new Set();
    const fasesUnicas = fases.filter(f => (vistas.has(f.consulta) ? false : (vistas.add(f.consulta), true)));

    for (let qi = 0; qi < fasesUnicas.length; qi++) {
        const fase = fasesUnicas[qi];
        // OFF limita ráfagas: pausamos entre consultas
        if (qi > 0) await sleep(600);

        const data = await fetchJSON(fase.consulta);
        if (!data?.products?.length) continue; // probamos con la consulta relajada

        const evaluados = data.products
            .filter(p => p.product_name || p.product_name_es)
            .map(p => ({ p, ...puntuar(p, fase.tokens) }))
            .filter(c => c.completo && c.score >= UMBRAL_SIMILITUD)
            // mejor score; a igual score, el nombre más "conciso" (menos extras)
            .sort((a, b) => (b.score - a.score) || (a.extras - b.extras));

        if (evaluados.length === 0) continue; // había productos pero ninguno se parece lo suficiente

        const mejor = evaluados[0].p;
        const n = mejor.nutriments || {};

        // ¿El producto encontrado trae la marca pedida? Si no, es un match GENÉRICO
        const tokensMarcaProd = tokenizar(mejor.brands || '');
        const marcaEnProducto = marcaTokens.some(m => tokensMarcaProd.some(p => palabrasIguales(m, p)));
        const esGenerica = marcaTokens.length > 0 && !marcaEnProducto;

        return {
            nombre: mejor.product_name || mejor.product_name_es,
            marca: mejor.brands || null,
            por_100g: {
                calorias: num(n['energy-kcal_100g']),
                proteinas: num(n['proteins_100g']),
                carbohidratos: num(n['carbohydrates_100g']),
                grasas: num(n['fat_100g']),
                fibra: num(n['fiber_100g']),
                sodio_mg: num(n['sodium_100g']) * 1000, // OFF da gramos → mg
                potasio_mg: num(n['potassium_100g']),
                magnesio_mg: num(n['magnesium_100g']),
                calcio_mg: num(n['calcium_100g']),
                hierro_mg: num(n['iron_100g']),
                zinc_mg: num(n['zinc_100g']),
                omega3: {
                    ala_mg: num(n['alpha-linolenic-acid_100g']),
                    epa_dha_mg: num(n['epa_100g']) + num(n['dha_100g'])
                }
            },
            fuente: 'openfoodfacts',
            es_generica: esGenerica
        };
    }

    return null;
};
