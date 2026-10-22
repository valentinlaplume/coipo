// tests/sesion-http.test.mjs
// Reintento único ante 401 (sin navegador ni Firebase): se inyectan el usuario,
// el fetch y las respuestas. Corre con: npm test

import test from 'node:test';
import assert from 'node:assert/strict';

import { pedirConSesion, ERROR_SESION } from '../src/services/sesion-http.mjs';

const respuesta = (status, cuerpo = {}) => ({
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    json: async () => cuerpo,
    clone: () => ({ json: async () => cuerpo })
});

const crearUsuario = (...tokens) => {
    const llamadas = [];
    return {
        llamadas,
        getIdToken: async (forzar = false) => {
            llamadas.push(Boolean(forzar));
            const siguiente = tokens.shift();
            if (siguiente instanceof Error) throw siguiente;
            return siguiente;
        }
    };
};

const crearFetch = (...respuestas) => {
    const llamadas = [];
    const impl = async (url, opciones) => {
        llamadas.push({ url, opciones });
        return respuestas.shift();
    };
    impl.llamadas = llamadas;
    return impl;
};

test('sin usuario logueado: no pide token ni llama a fetch', async () => {
    const fetchImpl = crearFetch(respuesta(200));
    const r = await pedirConSesion({
        usuario: null,
        url: '/api/prueba',
        fetchImpl
    });

    assert.equal(r.errorSesion, ERROR_SESION.SIN_USUARIO);
    assert.equal(r.respuesta, null);
    assert.equal(r.reintentado, false);
    assert.equal(fetchImpl.llamadas.length, 0);
});

test('usuario sin token: sesión rechazada sin llamar a fetch', async () => {
    const usuario = crearUsuario(null);
    const fetchImpl = crearFetch(respuesta(200));
    const r = await pedirConSesion({
        usuario,
        url: '/api/prueba',
        fetchImpl
    });

    assert.equal(r.errorSesion, ERROR_SESION.TOKEN_RECHAZADO);
    assert.equal(r.respuesta, null);
    assert.deepEqual(usuario.llamadas, [false]);
    assert.equal(fetchImpl.llamadas.length, 0);
});

test('200 en el primer intento: no renueva el token ni reintenta', async () => {
    const usuario = crearUsuario('token-1');
    const fetchImpl = crearFetch(respuesta(200, { ok: true }));
    const r = await pedirConSesion({
        usuario,
        url: '/api/prueba',
        fetchImpl
    });

    assert.equal(r.errorSesion, null);
    assert.equal(r.reintentado, false);
    assert.deepEqual(usuario.llamadas, [false]);
    assert.equal(fetchImpl.llamadas.length, 1);
    assert.equal(fetchImpl.llamadas[0].opciones.headers.Authorization, 'Bearer token-1');
});

test('401 → fuerza getIdToken(true) y reintenta UNA vez con el token nuevo', async () => {
    const usuario = crearUsuario('token-viejo', 'token-nuevo');
    const fetchImpl = crearFetch(
        respuesta(401, { error: 'token_invalido' }),
        respuesta(200, { ok: true })
    );
    const r = await pedirConSesion({
        usuario,
        url: '/api/prueba',
        opciones: {
            method: 'POST',
            body: '{"hola":1}',
            headers: { 'Content-Type': 'application/json' }
        },
        fetchImpl
    });

    assert.equal(r.errorSesion, null);
    assert.equal(r.reintentado, true);
    assert.deepEqual(usuario.llamadas, [false, true]);
    assert.equal(fetchImpl.llamadas.length, 2);

    const [primera, segunda] = fetchImpl.llamadas;
    assert.equal(primera.opciones.headers.Authorization, 'Bearer token-viejo');
    assert.equal(segunda.opciones.headers.Authorization, 'Bearer token-nuevo');
    // El resto de las opciones se conserva entre intentos
    assert.equal(segunda.opciones.method, 'POST');
    assert.equal(segunda.opciones.body, '{"hola":1}');
    assert.equal(segunda.opciones.headers['Content-Type'], 'application/json');
});

test('401 dos veces con token_invalido: sesión inválida y sin tercer intento', async () => {
    const usuario = crearUsuario('token-viejo', 'token-nuevo', 'token-de-mas');
    const fetchImpl = crearFetch(
        respuesta(401, { error: 'token_invalido' }),
        respuesta(401, { error: 'token_invalido' }),
        respuesta(200)
    );
    const r = await pedirConSesion({
        usuario,
        url: '/api/prueba',
        fetchImpl
    });

    assert.equal(r.errorSesion, ERROR_SESION.TOKEN_INVALIDO);
    assert.equal(r.reintentado, true);
    assert.deepEqual(usuario.llamadas, [false, true]);
    assert.equal(fetchImpl.llamadas.length, 2);
});

test('401 dos veces con sin_token: pide login y no hace un tercer intento', async () => {
    const usuario = crearUsuario('token-viejo', 'token-nuevo');
    const fetchImpl = crearFetch(
        respuesta(401, { error: 'sin_token' }),
        respuesta(401, { error: 'sin_token' })
    );
    const r = await pedirConSesion({
        usuario,
        url: '/api/prueba',
        fetchImpl
    });

    assert.equal(r.errorSesion, ERROR_SESION.SIN_TOKEN);
    assert.equal(r.reintentado, true);
    assert.deepEqual(usuario.llamadas, [false, true]);
    assert.equal(fetchImpl.llamadas.length, 2);
});

test('401 sin código conocido: queda como sesión rechazada genérica', async () => {
    const usuario = crearUsuario('token-viejo', 'token-nuevo');
    const fetchImpl = crearFetch(respuesta(401), respuesta(401));
    const r = await pedirConSesion({
        usuario,
        url: '/api/prueba',
        fetchImpl
    });

    assert.equal(r.errorSesion, ERROR_SESION.TOKEN_RECHAZADO);
});

test('401 y la renovación falla: sesión inválida sin segundo fetch', async () => {
    const usuario = crearUsuario('token-viejo', new Error('sin red'));
    const fetchImpl = crearFetch(respuesta(401, { error: 'token_invalido' }));
    const r = await pedirConSesion({
        usuario,
        url: '/api/prueba',
        fetchImpl
    });

    assert.equal(r.errorSesion, ERROR_SESION.TOKEN_INVALIDO);
    assert.equal(r.reintentado, true);
    assert.equal(r.respuesta.status, 401);
    assert.deepEqual(usuario.llamadas, [false, true]);
    assert.equal(fetchImpl.llamadas.length, 1);
});

test('403 origen_no_permitido: configuración del servidor, sin reintento', async () => {
    const usuario = crearUsuario('token-1');
    const fetchImpl = crearFetch(respuesta(403, { error: 'origen_no_permitido' }));
    const r = await pedirConSesion({
        usuario,
        url: '/api/prueba',
        fetchImpl
    });

    assert.equal(r.errorSesion, ERROR_SESION.CONFIG_SERVIDOR);
    assert.equal(r.reintentado, false);
    assert.equal(r.respuesta.status, 403);
    assert.deepEqual(usuario.llamadas, [false]);
    assert.equal(fetchImpl.llamadas.length, 1);
});

test('403 token_invalido: se trata como sesión inválida', async () => {
    const usuario = crearUsuario('token-1');
    const fetchImpl = crearFetch(respuesta(403, { error: 'token_invalido' }));
    const r = await pedirConSesion({
        usuario,
        url: '/api/prueba',
        fetchImpl
    });

    assert.equal(r.errorSesion, ERROR_SESION.TOKEN_INVALIDO);
    assert.equal(r.reintentado, false);
    assert.equal(fetchImpl.llamadas.length, 1);
});
