// netlify/functions/buscar-alimentos.js
// Búsqueda de alimentos por TEXTO en Open Food Facts, para que el usuario elija
// entre varios resultados (a diferencia de /api/openfoodfacts, que devuelve el
// mejor match y lo usa la IA).
//
// FUENTES (misma base de datos de Open Food Facts, dos caminos):
//   1. Search-a-licious (search.openfoodfacts.org) — índice Elasticsearch con
//      búsqueda full-text real: tolera typos ("choclate aguila" → "chocolate
//      Aguila") y rankea por relevancia. Medido: para "chocolate aguila"
//      devuelve 20 productos argentinos con kcal; search.pl devolvía 7 y a
//      veces 503.
//   2. search.pl (es → us → world) — el clásico, queda como respaldo si la
//      primera fuente no responde.
//
// Reutiliza la integración existente (netlify/functions/openfoodfacts.js):
//   - verificación del ID token de Firebase Auth (jose + JWKS de Google)
//   - CORS restringido a ALLOWED_ORIGIN
//   - pedirOFF con fallback entre mirrors (es → us → world)
//
// BÚSQUEDA EN CASCADA (corta en el primer paso con resultados utilizables):
//   1. texto completo normalizado (minúsculas, trim, espacios simples)
//   2. variante sin tildes (y también con tildes si el original las tenía)
//   3. solo la palabra más distintiva (la más larga, o la última si hay empate)
//   4. sin filtro de país (se repiten las variantes anteriores sin
//      countries_tags=en:argentina)
// Además, los resultados SIEMPRE salen ordenados priorizando los que tienen
// Argentina en countries_tags.
//
// User-Agent identificando la app (pedido por OFF): CoachNutricional/1.0
// (medido: funciona bien junto a Accept: application/json; los 503 son del
// mirror y los cubre el fallback).
//
// Uso:
//   GET /api/buscar-alimentos?q=<texto>   (Bearer de Firebase Auth)
//   → { ok: true, argentina: true|false, fuente, resultados: [ {codigo, nombre,
//       marca, imagen, kcal100, p100, c100, g100, porcion_g, fuente }, ... ] }
//
// El servidor devuelve SOLO esos campos (proyección): sin ingredientes ni
// texto largo. Se descartan productos sin nombre o sin kcal por 100 g.
// Los productos que la app cargó por su cuenta (base propia) los busca el
// cliente ANTES de llamar a esta función (ver
// src/services/productos-usuario.service.js): acá solo llega Open Food Facts.

'use strict';

const { _interno } = require('./openfoodfacts.js');
const {
    pedirOFF,
    obtenerHeader,
    cabecerasCORS,
    origenPermitido,
    responder,
    verificarToken
} = _interno;

const USER_AGENT = 'CoachNutricional/1.0';

const MIN_Q = 3;
const MAX_Q = 80;
const PAGE_SIZE = 20; // 20 porque muchos hits de OFF traen datos incompletos

// Campos que la app usa (menos payload y parseos previsibles). Los piden las
// DOS fuentes: search-a-licious ignora los que no tiene en su índice.
const CAMPOS = 'code,product_name,product_name_es,brands,quantity,serving_size,'
    + 'serving_quantity,countries_tags,nutriments,image_front_small_url';

// Presupuesto TOTAL compartido por TODOS los pasos de la cascada
// (Netlify corta a ~10s)
const PRESUPUESTO_MS = 8000;
const TIMEOUT_SAL_MS = 3000;       // search-a-licious (un solo host, sin mirrors)
const TIMEOUT_MIRROR_MS = 3000;    // search.pl (por mirror: es → us → world)

const HOST_SAL = 'search.openfoodfacts.org'; // Search-a-licious (Elasticsearch)
const FILTRO_ARGENTINA = 'countries_tags:"en:argentina"';

// ── Texto: normalización y variantes en cascada ─────────────────────────────
// Minúsculas + cualquier signo/símbolo pasa a espacio (colapsa espacios).
// Además de normalizar, deja el texto inocuo para la sintaxis Lucene que
// soporta search-a-licious (sin `:` ni `"` no hay filtros inesperados).
const normalizarTexto = (texto) => String(texto || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const quitarTildes = (texto) =>
    String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// La palabra más distintiva: la más larga (o la última si hay empate)
const palabraDistintiva = (texto) => {
    const palabras = String(texto || '').split(' ').filter(p => p.length >= MIN_Q);
    if (!palabras.length) return '';
    return palabras.reduce((mejor, p) => (p.length >= mejor.length ? p : mejor), palabras[0]);
};

// Variantes de la consulta (pasos 1, 2 y 3 de la cascada):
//   1. texto completo normalizado (con tildes, si el usuario las escribió)
//   2. variante sin tildes
//   3. solo la palabra más distintiva
const variantesDeTexto = (consulta) => {
    const base = normalizarTexto(consulta);
    const sinTildes = quitarTildes(base);
    const salida = [];
    const agregar = (v) => {
        if (v && v.length >= MIN_Q && !salida.includes(v)) salida.push(v);
    };
    agregar(base);
    agregar(sinTildes);
    agregar(palabraDistintiva(sinTildes));
    return salida;
};

// Pasos completos de la cascada: primero CON el filtro de Argentina y después
// (paso 4) SIN el filtro de país, con las mismas variantes de texto.
const intentosDeBusqueda = (consulta) => {
    const variantes = variantesDeTexto(consulta);
    return [
        ...variantes.map(texto => ({ texto, conArgentina: true })),
        ...variantes.map(texto => ({ texto, conArgentina: false }))
    ];
};

// ── URLs (hosts fijos y conocidos → sin SSRF) ───────────────────────────────
// Search-a-licious: GET /search con sintaxis Lucene. El filtro de país se
// agrega como cláusula; el texto del usuario ya vino saneado.
const construirURLSal = (texto, conArgentina) =>
    `https://${HOST_SAL}/search`
    + `?q=${encodeURIComponent(conArgentina ? `${FILTRO_ARGENTINA} ${texto}` : texto)}`
    + `&page_size=${PAGE_SIZE}&langs=es,en&fields=${CAMPOS}`;

// search.pl (clásico) con fallback entre mirrors, igual que antes
const construirURL = (mirror, texto, conArgentina) =>
    `https://${mirror}.openfoodfacts.org/cgi/search.pl`
    + `?search_terms=${encodeURIComponent(texto)}`
    + `&search_simple=1&action=process&json=1&page_size=${PAGE_SIZE}`
    + `&fields=${CAMPOS}`
    + (conArgentina ? '&countries_tags=en%3Aargentina' : '');

// ── Normalización de resultados ─────────────────────────────────────────────
const numero = (v) => (typeof v === 'number' && isFinite(v) ? v : null);

// "30 g" / "100 ml" / "30g" → 30 (la app trabaja en gramos)
const gramosDeServingSize = (texto) => {
    if (typeof texto !== 'string') return null;
    const m = /^\s*(\d+(?:[.,]\d+)?)\s*g?\s*$/i.exec(texto);
    return m ? Number(m[1].replace(',', '.')) : null;
};

const porcionDe = (p) => {
    const cantidad = numero(p.serving_quantity);
    if (cantidad && cantidad > 0) return cantidad;
    return gramosDeServingSize(p.serving_size);
};

// search.pl manda `brands` como texto ("Coca Cola, Fanta") y
// search-a-licious como array (["Coca Cola"]) → un solo formato de salida
const marcaDe = (brands) => {
    const valor = Array.isArray(brands)
        ? brands.filter(b => typeof b === 'string' && b.trim()).join(', ')
        : (typeof brands === 'string' ? brands.trim() : '');
    return valor || null;
};

// Argentina primero: estable (mantiene el orden de relevancia dentro de cada
// grupo), para que un producto argentino nunca quede debajo de uno de otro país
const esArgentino = (p) => Array.isArray(p && p.countries_tags)
    && p.countries_tags.some(t => String(t).toLowerCase() === 'en:argentina');

const ordenarPorArgentina = (productos) => {
    const lista = (Array.isArray(productos) ? productos : [])
        .filter(p => p && typeof p === 'object');
    return [
        ...lista.filter(esArgentino),
        ...lista.filter(p => !esArgentino(p))
    ];
};

// Un resultado por CÓDIGO (evita duplicados entre pasos/fuentes/mirrors)
const normalizarResultados = (productos) => {
    const vistos = new Set();
    const salida = [];

    for (const p of Array.isArray(productos) ? productos : []) {
        if (!p || typeof p !== 'object') continue;

        const nombre = typeof p.product_name === 'string' && p.product_name.trim()
            ? p.product_name.trim()
            : (typeof p.product_name_es === 'string' ? p.product_name_es.trim() : '');

        const n = p.nutriments || {};
        const kcal100 = numero(n['energy-kcal_100g']);

        // Sin nombre o sin kcal/100g → descartado
        if (!nombre || kcal100 === null || kcal100 <= 0) continue;

        const codigo = String(p.code || '').trim();
        if (codigo) {
            if (vistos.has(codigo)) continue;
            vistos.add(codigo);
        }

        salida.push({
            codigo: codigo || null,
            nombre,
            marca: marcaDe(p.brands),
            imagen: typeof p.image_front_small_url === 'string' ? p.image_front_small_url : null,
            kcal100,
            p100: numero(n['proteins_100g']) ?? 0,
            c100: numero(n['carbohydrates_100g']) ?? 0,
            g100: numero(n['fat_100g']) ?? 0,
            porcion_g: porcionDe(p),
            fuente: 'openfoodfacts' // la app usa esto para el crédito en la UI
        });
    }

    return salida;
};

// ── Consulta (mínimo 3, máximo 80 caracteres) ──
const validarConsulta = (cruda) => {
    const consulta = String(cruda || '').trim().replace(/\s+/g, ' ');
    if (consulta.length < MIN_Q) {
        return { error: `Escribí al menos ${MIN_Q} letras para buscar.` };
    }
    if (consulta.length > MAX_Q) {
        return { error: `La búsqueda supera los ${MAX_Q} caracteres.` };
    }
    return { consulta };
};

// ── Fetch a un solo host con presupuesto compartido (search-a-licious) ──────
const pedirSal = async (url, opciones = {}) => {
    const { timeoutMs = TIMEOUT_SAL_MS, headers = null, estado = null } = opciones;
    if (estado && !(estado.restanteMs > 0)) return null; // presupuesto agotado

    const limite = estado ? Math.min(timeoutMs, estado.restanteMs) : timeoutMs;
    const inicio = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), limite);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { Accept: 'application/json', ...(headers || {}) }
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('json')) return await res.json();
    } catch {
        // timeout o red caída → el caller sigue con la siguiente fuente
    } finally {
        clearTimeout(timer);
        if (estado) estado.restanteMs -= (Date.now() - inicio);
    }
    return null;
};

// ── Las dos fuentes: devuelven el listado crudo, o null si NO respondieron ──
// (null = "no pude consultar"; [] = "consulté y no había nada")
const buscarEnSAL = async (texto, conArgentina, opciones = {}) => {
    const data = await pedirSal(construirURLSal(texto, conArgentina), opciones);
    return data && Array.isArray(data.hits) ? data.hits : null;
};

const buscarEnOFF = async (texto, conArgentina, opciones = {}) => {
    const estado = opciones.estado || { restanteMs: PRESUPUESTO_MS };
    const data = await pedirOFF(
        (m) => construirURL(m, texto, conArgentina),
        {
            timeoutMs: opciones.timeoutMs || TIMEOUT_MIRROR_MS,
            headers: opciones.headers,
            estado
        }
    );
    return data && Array.isArray(data.products) ? data.products : null;
};

// Orden de preferencia: primero el índice full-text (tolerante a errores) y,
// si no responde, search.pl con sus mirrors.
const FUENTES = [
    { nombre: 'search-alicious', buscar: buscarEnSAL },
    { nombre: 'search-pl', buscar: buscarEnOFF }
];

// ── Cascada: corta en el PRIMER paso que da resultados utilizables ──────────
const buscarAlimentosEnCascada = async (consulta) => {
    const estado = { restanteMs: PRESUPUESTO_MS };
    const opciones = {
        estado,
        headers: { 'User-Agent': USER_AGENT },
        timeoutMs: TIMEOUT_SAL_MS
    };

    let respondio = false; // ¿alguna fuente respondió? (si no → 502 amable)

    for (const intento of intentosDeBusqueda(consulta)) {
        for (const fuente of FUENTES) {
            if (!(estado.restanteMs > 0)) break;

            const crudos = await fuente.buscar(intento.texto, intento.conArgentina, opciones);
            if (crudos === null) continue; // la fuente no respondió → probamos la otra
            respondio = true;

            const resultados = normalizarResultados(ordenarPorArgentina(crudos));
            if (resultados.length > 0) {
                return {
                    respondio: true,
                    fuente: fuente.nombre,
                    argentina: intento.conArgentina,
                    consulta_usada: intento.texto,
                    resultados
                };
            }
        }
    }

    return { respondio, fuente: null, argentina: null, consulta_usada: null, resultados: [] };
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
    const origen = obtenerHeader(event && event.headers, 'origin');
    const cors = cabecerasCORS(origen);
    const metodo = String((event && event.httpMethod) || 'GET').toUpperCase();

    if (metodo === 'OPTIONS') {
        if (origen && !origenPermitido(origen)) {
            return { statusCode: 403, headers: cors, body: '' };
        }
        return { statusCode: 204, headers: cors, body: '' };
    }

    if (metodo !== 'GET') {
        return responder(405, { error: 'Método no permitido.' }, cors);
    }

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

    // ── Consulta ──
    const validacion = validarConsulta((event && event.queryStringParameters && event.queryStringParameters.q) || '');
    if (validacion.error) {
        return responder(400, { error: validacion.error }, cors);
    }

    // ── Cascada (texto → sin tildes → palabra clave → sin país) ──
    const busqueda = await buscarAlimentosEnCascada(validacion.consulta);

    if (!busqueda.respondio) {
        // Ni search-a-licious ni search.pl respondieron: mensaje amigable; el
        // cliente muestra las alternativas (IA / manual).
        return responder(502, {
            error: 'La base de alimentos no responde ahora. Probá de nuevo en unos segundos.'
        }, cors);
    }

    return responder(200, {
        ok: true,
        argentina: busqueda.argentina,
        fuente: busqueda.fuente,
        resultados: busqueda.resultados
    }, cors);
};

// Auxiliares para tests (no forman parte de la API pública)
exports._interno = {
    construirURL,
    construirURLSal,
    normalizarResultados,
    ordenarPorArgentina,
    esArgentino,
    gramosDeServingSize,
    porcionDe,
    marcaDe,
    validarConsulta,
    normalizarTexto,
    quitarTildes,
    palabraDistintiva,
    variantesDeTexto,
    intentosDeBusqueda,
    buscarAlimentosEnCascada,
    buscarEnSAL,
    buscarEnOFF,
    pedirOFF,
    pedirSal,
    CAMPOS,
    PAGE_SIZE,
    USER_AGENT,
    HOST_SAL,
    FILTRO_ARGENTINA
};
