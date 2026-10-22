// tests/openfoodfacts.test.mjs
// Tests del proxy de OpenFoodFacts (sin red: no se llama a OFF ni a Google).
// Corre con: npm test  →  node --test tests/

import test from 'node:test';
import assert from 'node:assert/strict';

// Entorno de prueba ANTES de importar la función (ella lee process.env al cargar)
process.env.FIREBASE_PROJECT_ID = 'proyecto-de-prueba';
process.env.ALLOWED_ORIGIN = 'https://app.ejemplo.com';

const { handler, _interno } = await import('../netlify/functions/openfoodfacts.js');

const conLogs = async (fn) => {
    const original = console.error;
    const lineas = [];
    console.error = (...args) => lineas.push(args.map(a => String(a)).join(' '));
    try {
        return { resultado: await fn(), lineas };
    } finally {
        console.error = original;
    }
};

// ── Handler: CORS y sesión (sin red) ─────────────────────────────────────────

test('preflight OPTIONS con origen permitido → 204 y CORS correcto', async () => {
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
    assert.equal(JSON.parse(r.body).error, 'origen_no_permitido');
});

test('GET con origen NO permitido → 403', async () => {
    const r = await handler({
        httpMethod: 'GET',
        headers: { origin: 'https://otro-sitio.com' },
        queryStringParameters: { q: 'avena' }
    });
    assert.equal(r.statusCode, 403);
    assert.equal(JSON.parse(r.body).error, 'origen_no_permitido');
});

test('método distinto de GET/OPTIONS → 405', async () => {
    const r = await handler({ httpMethod: 'POST', headers: {}, body: '{}' });
    assert.equal(r.statusCode, 405);
});

test('GET sin token → 401 sin_token', async () => {
    const r = await handler({
        httpMethod: 'GET',
        headers: { origin: 'https://app.ejemplo.com' },
        queryStringParameters: { q: 'avena' }
    });
    assert.equal(r.statusCode, 401);
    assert.equal(JSON.parse(r.body).error, 'sin_token');
});

test('GET con token inválido → 401 token_invalido (no pasa la verificación)', async () => {
    const r = await handler({
        httpMethod: 'GET',
        headers: { origin: 'https://app.ejemplo.com', authorization: 'Bearer token-falso' },
        queryStringParameters: { q: 'avena' }
    });
    assert.equal(r.statusCode, 401);
    assert.equal(JSON.parse(r.body).error, 'token_invalido');
});

test('401/403 registran en el log el mismo código que devuelven', async () => {
    const casos = [
        {
            evento: { httpMethod: 'GET', headers: { origin: 'https://otro-sitio.com' }, queryStringParameters: { q: 'avena' } },
            codigo: 'origen_no_permitido'
        },
        {
            evento: { httpMethod: 'GET', headers: { origin: 'https://app.ejemplo.com' }, queryStringParameters: { q: 'avena' } },
            codigo: 'sin_token'
        },
        {
            evento: {
                httpMethod: 'GET',
                headers: { origin: 'https://app.ejemplo.com', authorization: 'Bearer token-falso' },
                queryStringParameters: { q: 'avena' }
            },
            codigo: 'token_invalido'
        }
    ];

    for (const { evento, codigo } of casos) {
        const { resultado, lineas } = await conLogs(() => handler(evento));
        assert.equal(JSON.parse(resultado.body).error, codigo);
        assert.ok(lineas.some(l => l.includes(codigo)), `falta el log de ${codigo}`);
    }
});

test('cabecerasCORS: solo permite los orígenes de ALLOWED_ORIGIN', () => {
    const ok = _interno.cabecerasCORS('https://app.ejemplo.com');
    assert.equal(ok['Access-Control-Allow-Origin'], 'https://app.ejemplo.com');
    const malo = _interno.cabecerasCORS('https://malicioso.com');
    assert.equal(malo['Access-Control-Allow-Origin'], undefined);
});

test('CORS: normaliza barra final y acepta el mismo host del deploy', async () => {
    assert.equal(_interno.normalizarOrigen('https://app.ejemplo.com/'), 'https://app.ejemplo.com');
    assert.equal(_interno.origenPermitido('https://app.ejemplo.com/', 'app.ejemplo.com'), true);
    assert.equal(_interno.origenPermitido('https://malicioso.com', 'app.ejemplo.com'), false);

    const propio = await handler({
        httpMethod: 'OPTIONS',
        headers: { origin: 'https://mi-deploy.netlify.app', host: 'mi-deploy.netlify.app' }
    });
    assert.equal(propio.statusCode, 204);
    assert.equal(propio.headers['Access-Control-Allow-Origin'], 'https://mi-deploy.netlify.app');

    const ajeno = await handler({
        httpMethod: 'OPTIONS',
        headers: { origin: 'https://malicioso.com', host: 'mi-deploy.netlify.app' }
    });
    assert.equal(ajeno.statusCode, 403);
});

// ── URLs (host fijo de OFF + paths validados → sin SSRF) ────────────────────

test('construirURLBusqueda: URL exacta con el texto codificado', () => {
    assert.equal(
        _interno.construirURLBusqueda('es', 'harina de arveja', 1),
        'https://es.openfoodfacts.org/cgi/search.pl'
        + '?search_terms=harina%20de%20arveja&search_simple=1&action=process&json=1&page_size=1'
    );
    // caracteres hostiles quedan codificados (no rompen la URL)
    const url = _interno.construirURLBusqueda('us', 'a&b=c#d', 20);
    assert.ok(url.includes('search_terms=a%26b%3Dc%23d'));
    assert.ok(!url.includes('#d'));
});

test('esBarcodeValido: solo dígitos, 6 a 14 (bloquea path traversal)', () => {
    assert.equal(_interno.esBarcodeValido('3017620422003'), true);
    assert.equal(_interno.esBarcodeValido('7891000100103'), true);
    assert.equal(_interno.esBarcodeValido('78910'), false);            // muy corto
    assert.equal(_interno.esBarcodeValido('78910001001034567'), false); // muy largo
    assert.equal(_interno.esBarcodeValido('../../etc/passwd'), false);
    assert.equal(_interno.esBarcodeValido('1234<script>'), false);
    assert.equal(_interno.esBarcodeValido(''), false);
    assert.equal(_interno.esBarcodeValido(null), false);
});

test('construirURLProducto: path fijo por mirror', () => {
    assert.equal(
        _interno.construirURLProducto('es', '3017620422003'),
        'https://es.openfoodfacts.org/api/v0/product/3017620422003.json'
    );
});

// ── Proyección del payload (solo los campos que la app lee) ─────────────────

test('proyectarNutriments: conserva solo las claves usadas y numéricas', () => {
    const salida = _interno.proyectarNutriments({
        'energy-kcal_100g': 539,
        'proteins_100g': 6.3,
        'saturated-fat_100g': 10.6,
        'sugars_100g': 56.3,
        'ingredients_text': 'no debe pasar',          // clave no usada
        'proteins_100g_value': 99,                    // clave no usada
        'fat_100g': 'no-numerico'                     // basura de OFF
    });
    assert.deepEqual(salida, {
        'energy-kcal_100g': 539,
        'proteins_100g': 6.3,
        'saturated-fat_100g': 10.6,
        'sugars_100g': 56.3
    });
    assert.deepEqual(_interno.proyectarNutriments(null), {});
});

test('proyectarProductoBusqueda: campos permitidos y nada más', () => {
    const p = _interno.proyectarProductoBusqueda({
        code: '3017620422003',
        product_name: 'Nutella',
        product_name_es: 'Nutella',
        brands: 'Ferrero',
        countries: 'Italia',
        ingredients_text: 'AZUCAR, PALMA...',
        image_front_url: 'https://x/img.jpg',   // no pertenece al modo búsqueda
        nutriments: { 'energy-kcal_100g': 539, ingredients_text: 'x' }
    });
    assert.deepEqual(Object.keys(p).sort(), [
        'brands', 'countries', 'nutriments', 'product_name', 'product_name_es'
    ]);
    assert.equal(p.brands, 'Ferrero');
    assert.deepEqual(p.nutriments, { 'energy-kcal_100g': 539 });
});

test('proyectarProductoBusqueda: ausencias → null/string vacío (como el JSON crudo)', () => {
    const p = _interno.proyectarProductoBusqueda({ product_name: 'Avena' });
    assert.equal(p.product_name, 'Avena');
    assert.equal(p.product_name_es, '');
    assert.equal(p.brands, null);       // el cliente hace `p.brands ?? null`
    assert.equal(p.countries, null);
    assert.deepEqual(p.nutriments, {});
});

test('proyectarProductoCodigo: además conserva image_front_url', () => {
    const p = _interno.proyectarProductoCodigo({
        product_name: 'Nutella',
        brands: 'Ferrero',
        image_front_url: 'https://x/img.jpg',
        nutriments: { 'energy-kcal_100g': 539 }
    });
    assert.equal(p.image_front_url, 'https://x/img.jpg');
    assert.equal(p.product_name, 'Nutella');
});

test('proyectarProductoCodigo: conserva la porción de la etiqueta', () => {
    const p = _interno.proyectarProductoCodigo({
        serving_size: '30 g',
        serving_quantity: '30',
        nutriments: {}
    });
    assert.equal(p.serving_size, '30 g');
    assert.equal(p.serving_quantity, 30);

    const sinPorcion = _interno.proyectarProductoCodigo({ nutriments: {} });
    assert.equal(sinPorcion.serving_size, null);
    assert.equal(sinPorcion.serving_quantity, null);
});

// ── pedirOFF: fallback entre mirrors con fetch simulado (sin red) ───────────

const stubFetch = (respuestas) => {
    const llamadas = [];
    globalThis.fetch = async (url, options = {}) => {
        llamadas.push({ url, options });
        const r = respuestas[Math.min(llamadas.length - 1, respuestas.length - 1)];
        if (r.fallo) throw new TypeError('Failed to fetch');
        return {
            ok: r.ok,
            status: r.status,
            headers: { get: (h) => (h.toLowerCase() === 'content-type' ? r.tipo : null) },
            json: async () => r.json
        };
    };
    return llamadas;
};

const originalFetch = globalThis.fetch;
test('pedirOFF: el primer mirror responde JSON → una sola llamada (es primero)', async () => {
    const llamadas = stubFetch([{ ok: true, status: 200, tipo: 'application/json', json: { products: [] } }]);
    const data = await _interno.pedirOFF((m) => _interno.construirURLBusqueda(m, 'avena', 20));
    assert.deepEqual(data, { products: [] });
    assert.equal(llamadas.length, 1);
    assert.ok(llamadas[0].url.startsWith('https://es.openfoodfacts.org/'));
    // Sin header Origin ni User-Agent: Cloudflare responde 503 con Origin (medido)
    assert.equal(llamadas[0].options.headers.Origin, undefined);
    assert.equal(llamadas[0].options.headers['User-Agent'], undefined);
    assert.equal(llamadas[0].options.headers.Accept, 'application/json');
});

test('pedirOFF: 503 del es → sigue con us y responde', async () => {
    const llamadas = stubFetch([
        { ok: false, status: 503, tipo: 'text/html' },
        { ok: true, status: 200, tipo: 'application/json', json: { products: [1] } }
    ]);
    const data = await _interno.pedirOFF((m) => _interno.construirURLProducto(m, '3017620422003'));
    assert.deepEqual(data, { products: [1] });
    assert.equal(llamadas.length, 2);
    assert.ok(llamadas[0].url.includes('//es.'));
    assert.ok(llamadas[1].url.includes('//us.'));
});

test('pedirOFF: 200 con HTML (challenge de Cloudflare) también pasa al siguiente', async () => {
    const llamadas = stubFetch([
        { ok: true, status: 200, tipo: 'text/html', json: {} },
        { ok: true, status: 200, tipo: 'application/json', json: { status: 0 } }
    ]);
    const data = await _interno.pedirOFF((m) => _interno.construirURLProducto(m, '12345678'));
    assert.deepEqual(data, { status: 0 });
    assert.equal(llamadas.length, 2);
});

test('pedirOFF: todos los mirrors caídos o en red caída → null', async () => {
    stubFetch([{ ok: false, status: 503, tipo: 'text/html' }]);
    assert.equal(await _interno.pedirOFF((m) => _interno.construirURLBusqueda(m, 'x', 1)), null);
    assert.equal(_interno.MIRRORS.length >= 2, true);

    stubFetch([{ fallo: true }]);
    assert.equal(await _interno.pedirOFF((m) => _interno.construirURLBusqueda(m, 'x', 1)), null);
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
