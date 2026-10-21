// netlify/functions/openfoodfacts.js
// Proxy de OpenFoodFacts (OFF).
//
// Por qué existe: el navegador NO puede llamar a OFF directamente — el dominio
// no manda cabeceras CORS y Cloudflare responde 503 a gran parte de las
// requests que llevan header Origin (medido: world ≈ 2/9 OK, es ≈ 8/9 OK).
// Acá la llamada se hace desde el servidor (sin Origin), con fallback entre
// mirrors de la misma base global y con una PROYECCIÓN acotada de cada
// producto: solo los campos que la app realmente lee.
//
// Seguridad:
//   - Requiere ID token de Firebase Auth (Bearer), igual que /api/sugerencias,
//     para no regalar cuota de Netlify/OFF a desconocidos.
//   - CORS restringido a ALLOWED_ORIGIN (mismo criterio que la función de IA).
//   - Host y path son fijos (solo el mirror varía entre la lista permitida) y
//     el código de barras se valida con regex → sin SSRF.
//   - Nunca se reenvían headers del cliente ni se muestran claves.
//
// Uso (desde el cliente, con Bearer):
//   GET /api/openfoodfacts?q=<texto>&page_size=20   → { products: [...] }
//   GET /api/openfoodfacts?barcode=3017620422003    → { status: 1, product: {...} }
//
// En dev/preview lo ejecuta el plugin api-local de vite.config.mjs (mismo
// código, mismo event shape); en producción, Netlify vía redirect /api/*.

'use strict';

const { createRemoteJWKSet, jwtVerify } = require('jose');

const PROYECTO_FIREBASE = String(process.env.FIREBASE_PROJECT_ID || '').trim();

const ORIGENES_PERMITIDOS = String(process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

// Mirrors oficiales (misma base global sincronizada). El orden importa:
// medido desde producción local, es ≈ 8/9 respuestas OK, us ≈ 4/9, world ≈ 2/9.
// Ajustable con OFF_MIRRORS (coma-separada) sin tocar código.
const MIRRORS = String(process.env.OFF_MIRRORS || 'es,us,world')
    .split(',')
    .map(m => m.trim().toLowerCase())
    .filter(m => /^[a-z]{2,8}$/.test(m));

const TIMEOUT_MS = 3000;   // por mirror: 3 × 3s < el timeout de 10s de Netlify
const MAX_Q = 120;
const PAGE_SIZE_DEFECTO = 20;
const PAGE_SIZE_MAX = 25;

const URL_JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

// Nutriments que la app lee en algún servicio (proyección del payload OFF):
// openfoodfacts.service / ingredient-lookup / product-scanner.
const NUTRIMENTOS = [
    'energy-kcal_100g', 'proteins_100g', 'carbohydrates_100g', 'fat_100g',
    'saturated-fat_100g', 'sugars_100g', 'fiber_100g', 'sodium_100g',
    'potassium_100g', 'magnesium_100g', 'calcium_100g', 'iron_100g', 'zinc_100g',
    'alpha-linolenic-acid_100g', 'epa_100g', 'dha_100g'
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS (mismos criterios que sugerencias.js)
// ─────────────────────────────────────────────────────────────────────────────
const obtenerHeader = (headers, nombre) => {
    if (!headers) return undefined;
    const clave = Object.keys(headers).find(k => k.toLowerCase() === nombre.toLowerCase());
    if (!clave) return undefined;
    const valor = headers[clave];
    return Array.isArray(valor) ? valor[0] : valor;
};

const origenPermitido = (origen) =>
    Boolean(origen) && ORIGENES_PERMITIDOS.includes(origen);

const cabecerasCORS = (origen) => {
    const cors = {
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin'
    };
    if (origen && origenPermitido(origen)) cors['Access-Control-Allow-Origin'] = origen;
    else if (ORIGENES_PERMITIDOS.includes('*')) cors['Access-Control-Allow-Origin'] = '*';
    return cors;
};

const responder = (statusCode, cuerpo, cabecerasExtra = {}) => ({
    statusCode,
    headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...cabecerasExtra
    },
    body: JSON.stringify(cuerpo)
});

// ── Token de Firebase Auth (issuer/audience = proyecto) ──
const jwks = createRemoteJWKSet(new URL(URL_JWKS), {
    cooldownDuration: 30000,
    cacheMaxAge: 600000
});

const verificarToken = async (token) => {
    if (!PROYECTO_FIREBASE) {
        console.error('❌ [OFF] Falta FIREBASE_PROJECT_ID: no se puede verificar la sesión');
        return null;
    }
    try {
        const { payload } = await jwtVerify(token, jwks, {
            issuer: `https://securetoken.google.com/${PROYECTO_FIREBASE}`,
            audience: PROYECTO_FIREBASE
        });
        return payload && payload.sub ? payload : null;
    } catch {
        return null;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// URLs (host de OFF + path fijo/validado → sin SSRF)
// ─────────────────────────────────────────────────────────────────────────────
const construirURLBusqueda = (mirror, q, pageSize) =>
    `https://${mirror}.openfoodfacts.org/cgi/search.pl`
    + `?search_terms=${encodeURIComponent(q)}`
    + `&search_simple=1&action=process&json=1&page_size=${pageSize}`;

const construirURLProducto = (mirror, barcode) =>
    `https://${mirror}.openfoodfacts.org/api/v0/product/${barcode}.json`;

// 6 a 14 dígitos (EAN-8/EAN-13/UPC): además evita inyección de path (SSRF)
const esBarcodeValido = (barcode) => /^\d{6,14}$/.test(String(barcode || ''));

// ─────────────────────────────────────────────────────────────────────────────
// PROYECCIÓN: solo los campos que la app lee (el JSON crudo de OFF pesa MBs)
// ─────────────────────────────────────────────────────────────────────────────
const proyectarNutriments = (nutriments) => {
    const salida = {};
    if (!nutriments || typeof nutriments !== 'object') return salida;
    for (const clave of NUTRIMENTOS) {
        const valor = nutriments[clave];
        if (typeof valor === 'number' && !isNaN(valor)) salida[clave] = valor;
    }
    return salida;
};

const textoOSiNo = (valor) => (typeof valor === 'string' ? valor : null);

const numeroOSiNo = (valor) => {
    if (valor === null || valor === undefined || valor === '') return null;
    const n = Number(valor);
    return Number.isFinite(n) ? n : null;
};

const proyectarProductoBusqueda = (p) => ({
    product_name: typeof p.product_name === 'string' ? p.product_name : '',
    product_name_es: typeof p.product_name_es === 'string' ? p.product_name_es : '',
    brands: textoOSiNo(p.brands),
    countries: textoOSiNo(p.countries),
    nutriments: proyectarNutriments(p.nutriments)
});

const proyectarProductoCodigo = (p) => ({
    ...proyectarProductoBusqueda(p),
    image_front_url: textoOSiNo(p.image_front_url),
    // Porción de la etiqueta: el modal de gramos la usa como valor inicial.
    serving_size: textoOSiNo(p.serving_size),
    serving_quantity: numeroOSiNo(p.serving_quantity)
});

// ─────────────────────────────────────────────────────────────────────────────
// FETCH A OFF CON FALLBACK ENTRE MIRRORS
// ─────────────────────────────────────────────────────────────────────────────
// Opciones (todas opcionales):
//   timeoutMs  → timeout por mirror (default TIMEOUT_MS)
//   mirrors    → lista de mirrors a probar (default MIRRORS)
//   headers    → cabeceras extra (p. ej. User-Agent de la app)
//   estado     → { restanteMs } compartido entre varias llamadas: al agotarse,
//                se corta el bucle (la Netlify function vive ~10s)
// Sin header Origin: Cloudflare responde 503 a requests con Origin (medido).
// 503/HTML o timeout → siguiente mirror; JSON no-OK (status 0) lo devuelve tal
// cual para que el caller decida.
const pedirOFF = async (construirURL, opciones = {}) => {
    const {
        timeoutMs = TIMEOUT_MS,
        mirrors = MIRRORS,
        headers = null,
        estado = null
    } = opciones;

    for (const mirror of mirrors) {
        if (estado && !(estado.restanteMs > 0)) return null; // presupuesto agotado
        const limite = estado ? Math.min(timeoutMs, estado.restanteMs) : timeoutMs;
        const inicio = Date.now();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), limite);
        try {
            const res = await fetch(construirURL(mirror), {
                signal: controller.signal,
                headers: { Accept: 'application/json', ...(headers || {}) }
            });
            const contentType = res.headers.get('content-type') || '';
            if (res.ok && contentType.includes('json')) return await res.json();
        } catch {
            // timeout o red caída → probamos el siguiente mirror
        } finally {
            clearTimeout(timer);
            if (estado) estado.restanteMs -= (Date.now() - inicio);
        }
    }
    return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
    const origen = obtenerHeader(event && event.headers, 'origin');
    const cors = cabecerasCORS(origen);
    const metodo = String((event && event.httpMethod) || 'GET').toUpperCase();

    // Preflight
    if (metodo === 'OPTIONS') {
        if (origen && !origenPermitido(origen)) {
            return { statusCode: 403, headers: cors, body: '' };
        }
        return { statusCode: 204, headers: cors, body: '' };
    }

    if (metodo !== 'GET') {
        return responder(405, { error: 'Método no permitido.' }, cors);
    }

    // CORS restringido a ALLOWED_ORIGIN (sin header Origin → no es una request
    // de navegador, así que pasa igual)
    if (origen && !origenPermitido(origen)) {
        return responder(403, { error: 'Origen no permitido.' }, cors);
    }

    // ── Sesión ──
    const autorizacion = obtenerHeader(event && event.headers, 'authorization');
    const token = typeof autorizacion === 'string' && /^Bearer\s+\S+/i.test(autorizacion.trim())
        ? autorizacion.replace(/^Bearer\s+/i, '').trim()
        : '';
    const sesion = token ? await verificarToken(token) : null;
    if (!sesion) {
        return responder(401, { error: 'Tu sesión expiró. Entrá de nuevo para continuar.' }, cors);
    }

    // ── Parámetros ──
    const qs = (event && event.queryStringParameters) || {};
    const barcode = String(qs.barcode || '').trim();
    const consulta = String(qs.q || '').trim();
    const pageSize = Math.min(
        PAGE_SIZE_MAX,
        Math.max(1, parseInt(qs.page_size, 10) || PAGE_SIZE_DEFECTO)
    );

    // Modo producto por código de barras
    if (barcode) {
        if (!esBarcodeValido(barcode)) {
            return responder(400, { error: 'Código de barras inválido.' }, cors);
        }
        const data = await pedirOFF(m => construirURLProducto(m, barcode));
        if (!data || data.status !== 1 || !data.product) {
            return responder(200, { status: 0 }, cors); // no existe en OFF
        }
        return responder(200, { status: 1, product: proyectarProductoCodigo(data.product) }, cors);
    }

    // Modo búsqueda por nombre
    if (!consulta || consulta.length > MAX_Q) {
        return responder(400, { error: 'Falta la consulta (q) o supera el máximo de caracteres.' }, cors);
    }

    const data = await pedirOFF(m => construirURLBusqueda(m, consulta, pageSize));
    if (!data || !Array.isArray(data.products)) {
        // OFF (o todos los mirrors) sin responder: el cliente mantiene sus
        // valores estimados — mismo manejo que cuando no hay coincidencia.
        return responder(502, { error: 'La base de productos no responde. Probá de nuevo en un momento.' }, cors);
    }

    return responder(200, {
        products: data.products
            .slice(0, pageSize)
            .filter(p => p && typeof p === 'object')
            .map(proyectarProductoBusqueda)
    }, cors);
};

// Auxiliares para tests (no forman parte de la API pública)
exports._interno = {
    construirURLBusqueda,
    construirURLProducto,
    esBarcodeValido,
    proyectarNutriments,
    proyectarProductoBusqueda,
    proyectarProductoCodigo,
    pedirOFF,
    obtenerHeader,
    cabecerasCORS,
    origenPermitido,
    responder,
    verificarToken,
    MIRRORS
};
