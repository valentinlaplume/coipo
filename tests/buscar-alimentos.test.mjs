// tests/buscar-alimentos.test.mjs
// Tests de la búsqueda de alimentos por texto (sin red: no se llama a OFF ni
// a Google). Corre con: npm test  →  node --test tests/

import test from 'node:test';
import assert from 'node:assert/strict';

// Entorno de prueba ANTES de importar la función (ella lee process.env al cargar)
process.env.FIREBASE_PROJECT_ID = 'proyecto-de-prueba';
process.env.ALLOWED_ORIGIN = 'https://app.ejemplo.com';

const { handler, _interno } = await import('../netlify/functions/buscar-alimentos.js');

// ── Handler: CORS, sesión y validación (sin red) ─────────────────────────────

test('preflight OPTIONS con origen permitido → 204 con CORS', async () => {
    const r = await handler({
        httpMethod: 'OPTIONS',
        headers: { origin: 'https://app.ejemplo.com' }
    });
    assert.equal(r.statusCode, 204);
    assert.equal(r.headers['Access-Control-Allow-Origin'], 'https://app.ejemplo.com');
    assert.match(r.headers['Access-Control-Allow-Methods'], /GET/);
    assert.match(r.headers['Access-Control-Allow-Headers'], /Authorization/i);
});

test('preflight OPTIONS con origen NO permitido → 403 sin CORS', async () => {
    const r = await handler({
        httpMethod: 'OPTIONS',
        headers: { origin: 'https://otro-sitio.com' }
    });
    assert.equal(r.statusCode, 403);
    assert.equal(r.headers['Access-Control-Allow-Origin'], undefined);
});

test('POST → 405 (solo GET/OPTIONS)', async () => {
    const r = await handler({ httpMethod: 'POST', headers: {}, body: '{}' });
    assert.equal(r.statusCode, 405);
});

test('GET con origen NO permitido → 403', async () => {
    const r = await handler({
        httpMethod: 'GET',
        headers: { origin: 'https://otro-sitio.com' },
        queryStringParameters: { q: 'avena' }
    });
    assert.equal(r.statusCode, 403);
});

test('GET sin token → 401 con mensaje amigable', async () => {
    const r = await handler({
        httpMethod: 'GET',
        headers: { origin: 'https://app.ejemplo.com' },
        queryStringParameters: { q: 'avena' }
    });
    assert.equal(r.statusCode, 401);
    assert.equal(JSON.parse(r.body).error, 'Tu sesión expiró. Entrá de nuevo para continuar.');
});

test('GET con token inválido → 401 (no pasa la verificación)', async () => {
    const r = await handler({
        httpMethod: 'GET',
        headers: { origin: 'https://app.ejemplo.com', authorization: 'Bearer token-falso' },
        queryStringParameters: { q: 'avena' }
    });
    assert.equal(r.statusCode, 401);
});

test('validación de la consulta: mínimo 3 y máximo 80 caracteres', () => {
    // La sesión se verifica ANTES que la consulta (no se filtra comportamiento
    // a desconocidos); la validación se testea por el helper:
    assert.ok(_interno.validarConsulta('').error);
    assert.match(_interno.validarConsulta('av').error, /al menos 3/);
    assert.match(_interno.validarConsulta('   ').error, /al menos 3/);
    assert.match(_interno.validarConsulta('x'.repeat(81)).error, /80 caracteres/);
    assert.equal(_interno.validarConsulta('ave').error, undefined);
    assert.equal(_interno.validarConsulta('ave').consulta, 'ave');
    // espacios repetidos se colapsan y se recortan
    assert.equal(_interno.validarConsulta('  harina   de  arveja ').consulta, 'harina de arveja');
});

test('handler: sin sesión nunca llega a buscar (401) pase lo que pase con q', async () => {
    const conTokenFalso = { origin: 'https://app.ejemplo.com', authorization: 'Bearer x' };
    for (const q of ['', 'av', 'x'.repeat(81), 'avena']) {
        const r = await handler({ httpMethod: 'GET', headers: conTokenFalso, queryStringParameters: { q } });
        assert.equal(r.statusCode, 401);
    }
});

// ── Normalización de la consulta y variantes en cascada ─────────────────────

test('normalizarTexto: minúsculas, sin signos y espacios simples', () => {
    assert.equal(_interno.normalizarTexto('  Chocolate   Águila! '), 'chocolate águila');
    assert.equal(_interno.normalizarTexto('sin-tacc (70%)'), 'sin tacc 70');
    assert.equal(_interno.normalizarTexto(null), '');
});

test('quitarTildes y palabraDistintiva (la más larga, o la última si hay empate)', () => {
    assert.equal(_interno.quitarTildes('chocolate águila'), 'chocolate aguila');
    assert.equal(_interno.palabraDistintiva('harina de arveja'), 'arveja');
    assert.equal(_interno.palabraDistintiva('avena y avena'), 'avena'); // empate → la última
    assert.equal(_interno.palabraDistintiva('de la'), '');              // nada con ≥ 3 letras
});

test('variantesDeTexto: texto completo → sin tildes → palabra más distintiva', () => {
    assert.deepEqual(_interno.variantesDeTexto('Harina de Arveja'), ['harina de arveja', 'arveja']);
    // con tildes: se prueban AMBAS (con y sin)
    assert.deepEqual(_interno.variantesDeTexto('chocolate águila'), ['chocolate águila', 'chocolate aguila', 'chocolate']);
    // la variante sin tildes repetida no se agrega dos veces
    assert.deepEqual(_interno.variantesDeTexto('avena avena'), ['avena avena', 'avena']);
});

test('intentosDeBusqueda: primero CON filtro de Argentina y después SIN el país', () => {
    const intentos = _interno.intentosDeBusqueda('chocolate águila');
    assert.deepEqual(intentos, [
        { texto: 'chocolate águila', conArgentina: true },
        { texto: 'chocolate aguila', conArgentina: true },
        { texto: 'chocolate', conArgentina: true },
        { texto: 'chocolate águila', conArgentina: false },
        { texto: 'chocolate aguila', conArgentina: false },
        { texto: 'chocolate', conArgentina: false }
    ]);
});

// El filtro de país aparece como cláusula Lucene (SAL) o como query (search.pl);
// ojo con no confundirlo con el campo "countries_tags" del listado de fields
const conFiltroPais = (url) =>
    /countries_tags(%3A%22en%3Aargentina%22|=en%3Aargentina)/.test(url);

// ── URLs: search-a-licious (principal) y search.pl (respaldo) ───────────────

test('construirURLSal: search.openfoodfacts.org con el filtro Lucene de Argentina', () => {
    const url = _interno.construirURLSal('chocolate aguila', true);
    assert.ok(url.startsWith('https://search.openfoodfacts.org/search?'));
    assert.ok(url.includes(`q=${encodeURIComponent('countries_tags:"en:argentina" chocolate aguila')}`));
    assert.ok(url.includes('page_size=20'));
    assert.ok(url.includes('langs=es,en'));
    assert.ok(url.includes(`fields=${_interno.CAMPOS}`));

    // sin filtro de país: no aparece la cláusula de Lucene
    assert.equal(conFiltroPais(_interno.construirURLSal('avena', false)), false);
});

test('construirURL (search.pl): page_size, fields y filtro de Argentina', () => {
    const url = _interno.construirURL('es', 'harina de arveja', false);
    assert.ok(url.startsWith('https://es.openfoodfacts.org/cgi/search.pl?'));
    assert.ok(url.includes('search_terms=harina%20de%20arveja'));
    assert.ok(url.includes('search_simple=1'));
    assert.ok(url.includes('action=process'));
    assert.ok(url.includes('json=1'));
    assert.ok(url.includes('page_size=20'));
    assert.ok(url.includes(`fields=${_interno.CAMPOS}`));
    assert.ok(_interno.CAMPOS.includes('serving_quantity'));
    assert.ok(_interno.CAMPOS.includes('image_front_small_url'));
    assert.ok(_interno.CAMPOS.includes('nutriments'));
    // countries_tags hace falta para ordenar Argentina primero
    assert.ok(_interno.CAMPOS.includes('countries_tags'));
    assert.equal(conFiltroPais(url), false);

    const urlAr = _interno.construirURL('es', 'avena', true);
    assert.ok(urlAr.includes('countries_tags=en%3Aargentina'));
});

// ── Normalización de resultados ─────────────────────────────────────────────

// Formato de search-a-licious (marcas en array, sin serving)
const productoSAL = (extra = {}) => ({
    code: '77912345',
    product_name: 'chocolate Aguila',
    brands: ['Aguila'],
    countries_tags: ['en:argentina'],
    image_front_small_url: 'https://x/img.jpg',
    nutriments: {
        'energy-kcal_100g': 503,
        proteins_100g: 6,
        carbohydrates_100g: 55,
        fat_100g: 25
    },
    ...extra
});

// Formato de search.pl (marcas en texto, con serving)
const productoBase = (extra = {}) => ({
    code: '77912345',
    product_name: 'Copos de avena',
    brands: 'Marca X',
    image_front_small_url: 'https://x/img.jpg',
    serving_quantity: 40,
    countries_tags: ['en:argentina'],
    nutriments: {
        'energy-kcal_100g': 375,
        'proteins_100g': 13,
        'carbohydrates_100g': 60,
        'fat_100g': 7
    },
    ...extra
});

test('normalizarResultados: devuelve SOLO los campos pedidos (y la fuente)', () => {
    const [r] = _interno.normalizarResultados([productoBase()]);
    assert.deepEqual(Object.keys(r).sort(), [
        'c100', 'codigo', 'fuente', 'g100', 'imagen', 'kcal100', 'marca', 'nombre', 'p100', 'porcion_g'
    ]);
    assert.deepEqual(r, {
        codigo: '77912345',
        nombre: 'Copos de avena',
        marca: 'Marca X',
        imagen: 'https://x/img.jpg',
        kcal100: 375,
        p100: 13,
        c100: 60,
        g100: 7,
        porcion_g: 40,
        fuente: 'openfoodfacts'
    });
    // nada de texto largo ni campos OFF crudos
    assert.equal(JSON.stringify(r).includes('ingredients'), false);
});

test('normalizarResultados: acepta el formato de search-a-licious (brands en array)', () => {
    const [r] = _interno.normalizarResultados([productoSAL()]);
    assert.equal(r.marca, 'Aguila');
    assert.equal(r.kcal100, 503);
    assert.equal(r.porcion_g, null); // SAL no indexa la porción
    assert.equal(r.fuente, 'openfoodfacts');
});

test('normalizarResultados: descarta productos sin nombre o sin kcal/100 g', () => {
    const salida = _interno.normalizarResultados([
        productoBase({ product_name: '', code: '1' }),                          // sin nombre
        productoBase({ product_name: 'Sin kcal', nutriments: { proteins_100g: 5 }, code: '2' }), // sin kcal
        productoBase({ product_name: 'Kcal cero', nutriments: { 'energy-kcal_100g': 0 }, code: '3' }),
        productoBase({ product_name: 'Kcal string', nutriments: { 'energy-kcal_100g': '375' }, code: '4' }), // no-numérica
        productoBase({ code: '5' })                                            // válido
    ]);
    assert.equal(salida.length, 1);
    assert.equal(salida[0].codigo, '5');
});

test('normalizarResultados: sin marca o imagen → null (y macros faltantes → 0)', () => {
    const [r] = _interno.normalizarResultados([productoBase({
        brands: '', image_front_small_url: null,
        nutriments: { 'energy-kcal_100g': 100 }
    })]);
    assert.equal(r.marca, null);
    assert.equal(r.imagen, null);
    assert.equal(r.p100, 0);
    assert.equal(r.c100, 0);
    assert.equal(r.g100, 0);
});

test('normalizarResultados: sin código sigue devolviendo el producto (codigo null)', () => {
    const [r] = _interno.normalizarResultados([productoBase({ code: undefined })]);
    assert.equal(r.codigo, null);
    assert.equal(r.nombre, 'Copos de avena');
});

test('normalizarResultados: deduplica por código entre pasos/fuentes/mirrors', () => {
    const salida = _interno.normalizarResultados([
        productoBase(), productoBase(), productoBase({ code: '77912346' })
    ]);
    assert.equal(salida.length, 2);
});

test('porcion_g: de serving_quantity, si no de serving_size ("30 g"), si no null', () => {
    assert.equal(_interno.porcionDe({ serving_quantity: 29 }), 29);
    assert.equal(_interno.porcionDe({ serving_size: '30 g' }), 30);
    assert.equal(_interno.porcionDe({ serving_size: '100g' }), 100);
    assert.equal(_interno.porcionDe({ serving_size: 'una pizca' }), null);
    assert.equal(_interno.porcionDe({}), null);
});

test('gramosDeServingSize: coma decimal y basura', () => {
    assert.equal(_interno.gramosDeServingSize('33,5 g'), 33.5);
    assert.equal(_interno.gramosDeServingSize('33.5'), 33.5);
    assert.equal(_interno.gramosDeServingSize(null), null);
    assert.equal(_interno.gramosDeServingSize(''), null);
});

// ── Orden: productos argentinos primero ─────────────────────────────────────

test('ordenarPorArgentina: los de Argentina primero, sin romper el orden de relevancia', () => {
    const ar1 = productoSAL({ code: '1', product_name: 'ar 1' });
    const ar2 = productoSAL({ code: '2', product_name: 'ar 2' });
    const us = productoSAL({ code: '3', product_name: 'us', countries_tags: ['en:united-states'] });
    const ordenados = _interno.ordenarPorArgentina([ar1, us, ar2]);
    assert.deepEqual(ordenados.map(p => p.code), ['1', '2', '3']);
});

// ── Cascada + fallback con fetch simulado (sin red) ─────────────────────────

// Stub por URL (más claro que por orden de llamada): responde según el host /
// parámetros. `responder(url, numeroDeLlamada)` devuelve { json } o null/fallo.
const stubFetch = (responder) => {
    const llamadas = [];
    globalThis.fetch = async (url, options = {}) => {
        llamadas.push({ url, options });
        const r = await responder(url, llamadas.length);
        if (!r) throw new TypeError('Failed to fetch');
        return {
            ok: r.ok !== false,
            status: r.status || 200,
            headers: { get: (h) => (h.toLowerCase() === 'content-type' ? (r.tipo || 'application/json') : null) },
            json: async () => r.json
        };
    };
    return llamadas;
};

const originalFetch = globalThis.fetch;

test('cascada: el primer paso (texto + Argentina) con resultados corta todo', async () => {
    const llamadas = stubFetch(() => ({ json: { hits: [productoSAL()] } }));

    const r = await _interno.buscarAlimentosEnCascada('chocolate aguila');
    assert.equal(llamadas.length, 1); // una sola consulta a la red
    assert.ok(llamadas[0].url.includes('//search.openfoodfacts.org/search?'));
    assert.ok(llamadas[0].url.includes(encodeURIComponent('countries_tags:"en:argentina" chocolate aguila')));
    // User-Agent identificando la app (pedido por OFF), sin Origin
    assert.equal(llamadas[0].options.headers['User-Agent'], 'CoachNutricional/1.0');
    assert.equal(llamadas[0].options.headers.Accept, 'application/json');
    assert.equal(llamadas[0].options.headers.Origin, undefined);

    assert.equal(r.fuente, 'search-alicious');
    assert.equal(r.argentina, true);
    assert.equal(r.respondio, true);
    assert.equal(r.resultados.length, 1);
    assert.equal(r.resultados[0].fuente, 'openfoodfacts');
});

test('cascada: sin resultados con tildes → repite SIN tildes', async () => {
    const llamadas = stubFetch((url) => (url.includes('%C3%A1') // "á" codificada
        ? { json: { hits: [] } }
        : { json: { hits: [productoSAL()] } }));

    const r = await _interno.buscarAlimentosEnCascada('chocolate águila');
    // paso 1 (con tildes): search-a-licious vacío y search.pl también
    assert.ok(llamadas[0].url.includes('chocolate%20%C3%A1guila'));
    assert.ok(llamadas[1].url.includes('search_terms=chocolate%20%C3%A1guila'));
    // paso 2: la misma consulta SIN tildes, ya da resultados y corta la cascada
    assert.ok(llamadas[2].url.includes('chocolate%20aguila'));
    assert.equal(llamadas.length, 3);
    assert.equal(r.resultados.length, 1);
    assert.equal(r.consulta_usada, 'chocolate aguila');
});

test('cascada: sigue con la palabra más distintiva cuando lo completo no da nada', async () => {
    const llamadas = stubFetch((url) => (url.includes('harina%20de%20arveja')
        ? { json: { hits: [] } }
        : { json: { hits: [productoSAL()] } }));

    const r = await _interno.buscarAlimentosEnCascada('Harina de Arveja');
    // "arveja" gana el desempate de longitud con "harina" → paso 3 de la cascada
    assert.equal(r.consulta_usada, 'arveja');
    assert.ok(llamadas.at(-1).url.includes('q=countries_tags%3A%22en%3Aargentina%22%20arveja'));
    assert.equal(r.resultados.length, 1);
});

test('cascada: sin resultados con el país → paso 4 SIN filtro de país', async () => {
    const llamadas = stubFetch((url) => (conFiltroPais(url)
        ? { json: { hits: [] } }                              // todo lo argentino: vacío
        : { json: { hits: [productoSAL({ countries_tags: ['en:united-states'] })] } }));

    const r = await _interno.buscarAlimentosEnCascada('chocolate aguila');
    assert.equal(r.argentina, false);
    assert.equal(conFiltroPais(llamadas.at(-1).url), false);
    assert.equal(r.resultados.length, 1);
});

test('cascada: resultados sin kcal no cortan el paso (se sigue buscando)', async () => {
    const llamadas = stubFetch(() => ({
        json: { hits: [productoSAL({ nutriments: {}, product_name: 'sin datos' })] }
    }));

    const r = await _interno.buscarAlimentosEnCascada('avena');
    // 2 variantes × 2 pasos (con y sin Argentina) = 4 consultas, ninguna corta
    assert.equal(llamadas.length, 4);
    assert.equal(r.respondio, true);   // respondió, pero...
    assert.equal(r.resultados.length, 0); // ...no había nada utilizable
    assert.equal(r.fuente, null);
});

test('cascada: search-a-licious caído → respaldo en search.pl (mirrors)', async () => {
    const llamadas = stubFetch((url) => (url.includes('search.openfoodfacts.org')
        ? { ok: false, status: 503, tipo: 'text/html' }      // SAL no responde
        : { json: { products: [productoBase()] } }));        // search.pl (es) sí

    const r = await _interno.buscarAlimentosEnCascada('avena');
    assert.equal(llamadas.length, 2);
    assert.ok(llamadas[0].url.includes('//search.openfoodfacts.org/'));
    assert.ok(llamadas[1].url.includes('//es.openfoodfacts.org/cgi/search.pl'));
    assert.equal(r.fuente, 'search-pl');
    assert.equal(r.resultados.length, 1);
});

test('cascada: SAL caído y es en 503 → sigue con el siguiente mirror de search.pl', async () => {
    const llamadas = stubFetch((url) => {
        if (url.includes('search.openfoodfacts.org')) return { ok: false, status: 503, tipo: 'text/html' };
        if (url.includes('//es.')) return { ok: false, status: 503, tipo: 'text/html' };
        return { json: { products: [productoBase()] } };
    });

    const r = await _interno.buscarAlimentosEnCascada('avena');
    assert.equal(r.fuente, 'search-pl');
    assert.equal(r.resultados.length, 1);
    assert.ok(llamadas.at(-1).url.includes('//us.'));
});

test('cascada: los productos argentinos quedan primero en los resultados', async () => {
    stubFetch((url) => (conFiltroPais(url)
        ? { json: { hits: [] } }
        : {
            json: {
                hits: [
                    productoSAL({ code: '1', product_name: 'de otro país', countries_tags: ['en:spain'] }),
                    productoSAL({ code: '2', product_name: 'nuestro 1' }),
                    productoSAL({ code: '3', product_name: 'nuestro 2' })
                ]
            }
        }));

    const r = await _interno.buscarAlimentosEnCascada('chocolate aguila');
    assert.deepEqual(r.resultados.map(x => x.codigo), ['2', '3', '1']);
});

test('cascada: ningún mira responde → respondio false (el handler responde 502 amable)', async () => {
    stubFetch(() => null); // todo falla
    const r = await _interno.buscarAlimentosEnCascada('avena');
    assert.equal(r.respondio, false);
    assert.deepEqual(r.resultados, []);
});

test('el presupuesto de tiempo corta la cascada antes de consultar', async () => {
    const llamadas = stubFetch(() => ({ json: { hits: [] } }));
    const estado = { restanteMs: 0 };
    const r = await _interno.pedirSal('https://search.openfoodfacts.org/search?q=avena', { estado });
    assert.equal(r, null);
    assert.equal(llamadas.length, 0);

    // idem para search.pl
    const llamadas2 = stubFetch(() => ({ json: { products: [] } }));
    const r2 = await _interno.pedirOFF((m) => _interno.construirURL(m, 'avena', false), { estado });
    assert.equal(r2, null);
    assert.equal(llamadas2.length, 0);
});

test('el handler nunca devuelve el token en el cuerpo', async () => {
    const r = await handler({
        httpMethod: 'GET',
        headers: { origin: 'https://app.ejemplo.com', authorization: 'Bearer super-secreto' },
        queryStringParameters: { q: 'avena' }
    });
    assert.equal(String(r.body).includes('super-secreto'), false);
});

// Restaurar el fetch real para el resto del proceso de test
globalThis.fetch = originalFetch;
