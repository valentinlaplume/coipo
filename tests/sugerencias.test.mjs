// tests/sugerencias.test.mjs
// Tests unitarios de la función de IA (sin red: no se llama a Groq ni a Google).
// Corre con: npm test  →  node --test tests/

import test from 'node:test';
import assert from 'node:assert/strict';

// Entorno de prueba ANTES de importar la función (ella lee process.env al cargar)
process.env.GROQ_API_KEYS = 'clave_de_prueba_uno, clave_de_prueba_dos ,';
process.env.GROQ_MODELS = 'modelo-uno,modelos-dos';
process.env.FIREBASE_PROJECT_ID = 'proyecto-de-prueba';
process.env.ALLOWED_ORIGIN = 'https://app.ejemplo.com,https://admin.ejemplo.com';

const { handler, _interno } = await import('../netlify/functions/sugerencias.js');

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

const cabeceras = (extra = {}) => ({ ...extra });

test('parsea GROQ_API_KEYS: separa por coma, recorta y descarta vacías', () => {
    assert.equal(_interno.cantidadClaves(), 2);
    assert.equal(_interno.cantidadModelos(), 2);
});

test('POST sin token de Firebase → 401 sin_token', async () => {
    const r = await handler({
        httpMethod: 'POST',
        headers: { origin: 'https://app.ejemplo.com' },
        body: JSON.stringify({ tipo: 'sugerencias', userContent: '{}' })
    });
    assert.equal(r.statusCode, 401);
    assert.equal(JSON.parse(r.body).error, 'sin_token');
});

test('POST con token inválido → 401 token_invalido', async () => {
    const r = await handler({
        httpMethod: 'POST',
        headers: { origin: 'https://app.ejemplo.com', authorization: 'Bearer token-falso' },
        body: JSON.stringify({ tipo: 'sugerencias', userContent: '{}' })
    });
    assert.equal(r.statusCode, 401);
    assert.equal(JSON.parse(r.body).error, 'token_invalido');
});

test('preflight OPTIONS con origen permitido → 204 y CORS correcto', async () => {
    const r = await handler({
        httpMethod: 'OPTIONS',
        headers: { origin: 'https://admin.ejemplo.com' }
    });
    assert.equal(r.statusCode, 204);
    assert.equal(r.headers['Access-Control-Allow-Origin'], 'https://admin.ejemplo.com');
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

test('POST con origen NO permitido → 403', async () => {
    const r = await handler({
        httpMethod: 'POST',
        headers: { origin: 'https://otro-sitio.com', authorization: 'Bearer cualquiera' },
        body: '{}'
    });
    assert.equal(r.statusCode, 403);
    assert.equal(JSON.parse(r.body).error, 'origen_no_permitido');
});

test('401/403 registran en el log el mismo código que devuelven', async () => {
    const casos = [
        {
            evento: { httpMethod: 'POST', headers: { origin: 'https://otro-sitio.com' }, body: '{}' },
            codigo: 'origen_no_permitido'
        },
        {
            evento: {
                httpMethod: 'POST',
                headers: { origin: 'https://app.ejemplo.com' },
                body: JSON.stringify({ tipo: 'sugerencias', userContent: '{}' })
            },
            codigo: 'sin_token'
        },
        {
            evento: {
                httpMethod: 'POST',
                headers: { origin: 'https://app.ejemplo.com', authorization: 'Bearer token-falso' },
                body: JSON.stringify({ tipo: 'sugerencias', userContent: '{}' })
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

test('método distinto de POST/OPTIONS → 405', async () => {
    const r = await handler({ httpMethod: 'GET', headers: {} });
    assert.equal(r.statusCode, 405);
});

test('validarEntrada: tipo desconocido se rechaza', () => {
    assert.ok(_interno.validarEntrada({ tipo: 'cualquiera', userContent: 'hola' }));
    assert.ok(_interno.validarEntrada(null));
    assert.ok(_interno.validarEntrada({}));
});

test('validarEntrada: sugerencias no exige systemPrompt (lo da el servidor)', () => {
    assert.equal(
        _interno.validarEntrada({ tipo: 'sugerencias', userContent: '{"intent":"LIBRE"}' }),
        null
    );
});

test('validarEntrada: el resto de los tipos sí exige systemPrompt', () => {
    assert.ok(_interno.validarEntrada({ tipo: 'analisis_rapido', userContent: 'una avena' }));
    assert.equal(
        _interno.validarEntrada({ tipo: 'analisis_rapido', systemPrompt: 'prompt', userContent: 'una avena' }),
        null
    );
});

test('validarEntrada: userContent demasiado largo se rechaza', () => {
    assert.ok(_interno.validarEntrada({
        tipo: 'sugerencias',
        userContent: 'x'.repeat(20000)
    }));
});

test('validarEntrada: imágenes aceptan solo data:image/ y con límite', () => {
    assert.equal(_interno.validarEntrada({
        tipo: 'imagen',
        systemPrompt: 'prompt',
        userContent: [{ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,AAAA' } }]
    }), null);

    assert.ok(_interno.validarEntrada({
        tipo: 'imagen',
        systemPrompt: 'prompt',
        userContent: [{ type: 'image_url', image_url: { url: 'https://ejemplo.com/foto.jpg' } }]
    }));
    assert.ok(_interno.validarEntrada({
        tipo: 'imagen',
        systemPrompt: 'prompt',
        userContent: [{ type: 'application', name: 'algo' }]
    }));
});

test('extraerJSON: JSON limpio y con fences de markdown', () => {
    assert.deepEqual(_interno.extraerJSON('{"a":1}'), { ok: true, data: { a: 1 } });
    assert.deepEqual(_interno.extraerJSON('```json\n{"a":1}\n```'), { ok: true, data: { a: 1 } });
    assert.deepEqual(_interno.extraerJSON('Acá va: {"a":1} listo'), { ok: true, data: { a: 1 } });
});

test('extraerJSON: JSON cortado o vacío → ok:false (dispara el reintento)', () => {
    assert.equal(_interno.extraerJSON('{"a":1,"b":').ok, false);
    assert.equal(_interno.extraerJSON('').ok, false);
    assert.equal(_interno.extraerJSON(undefined).ok, false);
    assert.equal(_interno.extraerJSON('texto sin json').ok, false);
});

test('obtenerHeader: case-insensitive y con valores en array', () => {
    assert.equal(_interno.obtenerHeader({ Origin: 'https://x.com' }, 'origin'), 'https://x.com');
    assert.equal(_interno.obtenerHeader({ authorization: ['Bearer a', 'Bearer b'] }, 'Authorization'), 'Bearer a');
    assert.equal(_interno.obtenerHeader({}, 'origin'), undefined);
});

test('cabecerasCORS: solo permite los orígenes de ALLOWED_ORIGIN', () => {
    const ok = _interno.cabecerasCORS('https://app.ejemplo.com');
    assert.equal(ok['Access-Control-Allow-Origin'], 'https://app.ejemplo.com');
    const malo = _interno.cabecerasCORS('https://malicioso.com');
    assert.equal(malo['Access-Control-Allow-Origin'], undefined);
});

test('el handler nunca devuelve claves en el cuerpo', async () => {
    const r = await handler({
        httpMethod: 'POST',
        headers: { origin: 'https://app.ejemplo.com' },
        body: JSON.stringify({ tipo: 'sugerencias', userContent: '{}' })
    });
    const cuerpo = String(r.body) + JSON.stringify(r.headers);
    // ninguna key (de prueba ni real) puede aparecer en la respuesta
    assert.equal(cuerpo.includes('clave_de_prueba'), false);
});
