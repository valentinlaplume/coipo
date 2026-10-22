// tests/analisis-comida.test.mjs
// El canal de micros de analizarComida() no debe quedar como promesa
// rechazada sin manejar cuando falla el análisis rápido (p. ej. sesión).
// Corre con: npm test

import test from 'node:test';
import assert from 'node:assert/strict';

import { iniciarAnalisisComida } from '../src/utils/analisis-comida.mjs';

test('si falla el análisis rápido, los micros quedan manejados y resuelven null', async () => {
    let rechazarRapido;
    const rapido = new Promise((_, rechazar) => { rechazarRapido = rechazar; });
    const microsPromise = rapido.then(() => ({ items_micros: [] }));

    const fallos = [];
    const { rapido: rapidoSeguro, micros } = iniciarAnalisisComida(
        () => ({ rapido, microsPromise }),
        'milanesa',
        error => fallos.push(error.message)
    );

    // El llamador (dashboard) captura el error principal para mostrar el toast.
    const rapidoCapturado = rapidoSeguro.catch(error => error);
    rechazarRapido(new Error('SESION_INVALIDA'));

    assert.equal((await rapidoCapturado).message, 'SESION_INVALIDA');
    assert.equal(await micros, null);
    assert.deepEqual(fallos, ['SESION_INVALIDA']);
});

test('si fallan solo los micros, el análisis rápido sigue disponible', async () => {
    const fallos = [];
    const { rapido, micros } = iniciarAnalisisComida(
        () => ({
            rapido: Promise.resolve({ items: [{ alimento: 'Milanesa' }] }),
            microsPromise: Promise.reject(new Error('MICROS_CAIDOS'))
        }),
        'milanesa',
        error => fallos.push(error.message)
    );

    assert.deepEqual(await rapido, { items: [{ alimento: 'Milanesa' }] });
    assert.equal(await micros, null);
    assert.deepEqual(fallos, ['MICROS_CAIDOS']);
});

test('camino feliz: ambos canales resuelven sus datos', async () => {
    const { rapido, micros } = iniciarAnalisisComida(
        () => ({
            rapido: Promise.resolve({ items: [] }),
            microsPromise: Promise.resolve({ items_micros: [{ sodio_mg: 120 }] })
        }),
        'milanesa'
    );

    assert.deepEqual(await rapido, { items: [] });
    assert.deepEqual(await micros, { items_micros: [{ sodio_mg: 120 }] });
});
