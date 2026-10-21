// src/services/buscar-alimentos.service.js
// Búsqueda de alimentos por TEXTO vía el backend propio:
// GET /api/buscar-alimentos?q=... (netlify/functions/buscar-alimentos.js).
// Requiere sesión (Bearer) — igual que el resto de las funciones.
//
// El servidor consulta Open Food Facts en cascada (search-a-licious, que
// tolera errores de tipeo, y search.pl como respaldo), prioriza productos
// argentinos y devuelve una lista normalizada:
//   { codigo, nombre, marca, imagen, kcal100, p100, c100, g100, porcion_g, fuente }
//
// ANTES de esto, el buscador del dashboard consulta los productos que cargó
// el propio usuario (manual o con IA): ver productos-usuario.service.js.
//
// Caché de búsquedas repetidas: en memoria (Map) y en sessionStorage (sobrevive
// a recargas dentro de la sesión del navegador). Sin IA: el cálculo de macros
// se hace localmente con regla de tres (ver productoDesdeResultado).

import { obtenerToken } from './ai/ia-client.js';

export const ENDPOINT_BUSCAR = '/api/buscar-alimentos';

const TIMEOUT_MS = 12000;
const MIN_Q = 3;
const CLAVE_CACHE = 'coipo_buscar_alimentos_v1';
const MAX_ENTRADAS_CACHE = 40; // por si el usuario busca mucho: no inflar storage

const cacheMemoria = new Map(); // consulta normalizada → resultados

// ── sessionStorage tolerante a fallos (modo privado, cuota llena, etc.) ──────
const leerCacheDisco = () => {
    try {
        const crudo = sessionStorage.getItem(CLAVE_CACHE);
        const datos = crudo ? JSON.parse(crudo) : null;
        return datos && typeof datos === 'object' ? datos : {};
    } catch {
        return {};
    }
};

const escribirCacheDisco = (datos) => {
    try {
        sessionStorage.setItem(CLAVE_CACHE, JSON.stringify(datos));
    } catch {
        // sin storage seguimos igual: solo perdemos persistencia
    }
};

let cacheDisco = null;
const claveNormalizada = (texto) =>
    String(texto || '').trim().toLowerCase().replace(/\s+/g, ' ');

export const limpiarCacheAlimentos = () => {
    cacheMemoria.clear();
    cacheDisco = null;
    try { sessionStorage.removeItem(CLAVE_CACHE); } catch { /* nada */ }
};

/**
 * Busca alimentos por texto.
 * @param {string} texto
 * @returns {Promise<{estado: 'corto'|'ok'|'vacio'|'error', resultados: Array, mensaje?: string}>}
 *   - 'corto': la consulta tiene menos de MIN_Q caracteres (no se busca).
 *   - 'error': hay `mensaje` amigable para mostrar.
 */
export const buscarAlimentos = async (texto) => {
    const consulta = claveNormalizada(texto);
    if (consulta.length < MIN_Q) return { estado: 'corto', resultados: [] };

    // 1) Caché en memoria
    if (cacheMemoria.has(consulta)) {
        return { estado: 'ok', resultados: cacheMemoria.get(consulta) };
    }

    // 2) Caché en sessionStorage (cargada una sola vez)
    if (cacheDisco === null) cacheDisco = leerCacheDisco();
    if (Array.isArray(cacheDisco[consulta])) {
        cacheMemoria.set(consulta, cacheDisco[consulta]);
        return { estado: 'ok', resultados: cacheDisco[consulta] };
    }

    // 3) Red
    const token = await obtenerToken();
    if (!token) {
        return { estado: 'error', resultados: [], mensaje: 'Tu sesión expiró. Entrá de nuevo para continuar.' };
    }

    const controller = new AbortController();
    const reloj = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const respuesta = await fetch(`${ENDPOINT_BUSCAR}?q=${encodeURIComponent(consulta)}`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            signal: controller.signal
        });

        const cuerpo = await respuesta.json().catch(() => null);

        if (respuesta.status === 401) {
            return { estado: 'error', resultados: [], mensaje: 'Tu sesión expiró. Entrá de nuevo para continuar.' };
        }
        if (!respuesta.ok) {
            return {
                estado: 'error',
                resultados: [],
                mensaje: cuerpo?.error || 'No se pudo buscar ahora. Probá de nuevo en unos segundos.'
            };
        }

        const resultados = Array.isArray(cuerpo?.resultados) ? cuerpo.resultados : [];

        // Guardar en caché (incluso "sin resultados": evita repetir la consulta)
        cacheMemoria.set(consulta, resultados);
        if (cacheDisco === null) cacheDisco = leerCacheDisco();
        cacheDisco[consulta] = resultados;
        const claves = Object.keys(cacheDisco);
        if (claves.length > MAX_ENTRADAS_CACHE) {
            for (const vieja of claves.slice(0, claves.length - MAX_ENTRADAS_CACHE)) {
                delete cacheDisco[vieja];
            }
        }
        escribirCacheDisco(cacheDisco);

        return { estado: resultados.length ? 'ok' : 'vacio', resultados };
    } catch (e) {
        if (e?.name === 'AbortError') {
            return { estado: 'error', resultados: [], mensaje: 'La búsqueda tardó demasiado. Probá de nuevo.' };
        }
        return { estado: 'error', resultados: [], mensaje: 'Sin conexión con la base de alimentos.' };
    } finally {
        clearTimeout(reloj);
    }
};

/**
 * Convierte un resultado de la búsqueda al MISMO shape que usa el escáner de
 * código de barras, para reutilizar `calcularPorcion` (regla de tres local,
 * sin IA) y registrar con el flujo existente (crearRegistroComida).
 * `fuente` distingue los productos del usuario ('propio' → base propia) de
 * los de Open Food Facts.
 */
// null = sin dato. Nunca convertir "no hay dato" en 0: los totales y la UI
// distinguen desconocido (—) de consumo cero.
const numeroONull = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

export const productoDesdeResultado = (r) => ({
    barcode: r.codigo || null,
    nombre: r.nombre,
    marca: r.marca || null,
    imagen_url: r.imagen || null,
    porcion_g: numeroONull(r.porcion_g),
    por_100g: {
        calorias: Number(r.kcal100) || 0,
        proteinas: Number(r.p100) || 0,
        carbohidratos: Number(r.c100) || 0,
        grasas: Number(r.g100) || 0,
        fibra: numeroONull(r.fibra100),
        sodio_mg: numeroONull(r.sodio100_mg),
        azucares_g: numeroONull(r.azucares100),
        potasio_mg: null,
        magnesio_mg: null,
        calcio_mg: null,
        hierro_mg: null,
        zinc_mg: null,
        omega3: null
    },
    fuente: r.fuente === 'propio' ? 'base_propia' : 'openfoodfacts'
});
