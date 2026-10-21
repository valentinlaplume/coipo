// tests/diario.test.mjs
// Lógica pura del Diario: promedios sin días vacíos, rango ±10 %, semanas
// (límites y futuro) y semanas vacías sin división por cero.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
    DIAS_SEMANA,
    TOLERANCIA_RANGO,
    aClaveFecha,
    calcularResumenSemana,
    diasDeSemana,
    esSemanaFutura,
    estaEnRango,
    etiquetaDia,
    lunesDe,
    rangoSemanaTexto,
    semanaAnterior,
    semanaSiguiente,
    sumarDias,
} from '../src/utils/diario.logic.mjs';

const dia = (fecha, kcal, proteina, tieneRegistro = true) => ({
    fecha, kcal, proteina, tieneRegistro,
});

test('el promedio ignora los días sin registro (no los cuenta como 0 kcal)', () => {
    const resumen = calcularResumenSemana([
        dia('2026-10-13', 1000, 80),
        dia('2026-10-14', 0, 0, false), // sin registro: no divide
        dia('2026-10-15', 2000, 120),
    ], 2000);

    assert.equal(resumen.diasConRegistro, 2);
    assert.equal(resumen.promedioKcal, 1500);
    assert.equal(resumen.promedioProteina, 100);
    assert.equal(resumen.diasEnRango, 1); // solo 2000 cae en ±10 %
});

test('semana vacía: promedios null y ningún día en rango (sin dividir por cero)', () => {
    const resumen = calcularResumenSemana([
        dia('2026-10-13', 0, 0, false),
        dia('2026-10-14', 0, 0, false),
    ], 2000);

    assert.equal(resumen.diasConRegistro, 0);
    assert.equal(resumen.promedioKcal, null);
    assert.equal(resumen.promedioProteina, null);
    assert.equal(resumen.diasEnRango, 0);
    assert.ok(!Number.isNaN(resumen.promedioKcal));
});

test('"en rango" usa ±10 % con los bordes incluidos', () => {
    assert.equal(TOLERANCIA_RANGO, 0.10);
    assert.equal(estaEnRango(1800, 2000), true);  // borde inferior
    assert.equal(estaEnRango(2200, 2000), true);  // borde superior
    assert.equal(estaEnRango(1799, 2000), false);
    assert.equal(estaEnRango(2201, 2000), false);
    assert.equal(estaEnRango(2000, 0), false);    // sin meta no se evalúa
});

test('los límites de semana van de lunes a domingo (7 días)', () => {
    // Domingo 18-oct-2026 pertenece a la semana que arranca el lunes 12.
    assert.equal(lunesDe('2026-10-18'), '2026-10-12');
    assert.equal(lunesDe('2026-10-12'), '2026-10-12');
    assert.equal(lunesDe('2026-10-13'), '2026-10-12');

    const dias = diasDeSemana('2026-10-12');
    assert.equal(dias.length, DIAS_SEMANA);
    assert.equal(dias[0], '2026-10-12');
    assert.equal(dias[6], '2026-10-18');
    assert.equal(sumarDias('2026-10-18', 1), '2026-10-19');
});

test('la semana actual no es futura; la siguiente sí', () => {
    const hoy = '2026-10-21';
    const actual = lunesDe(hoy);
    assert.equal(esSemanaFutura(actual, hoy), false);
    assert.equal(esSemanaFutura(semanaAnterior(actual), hoy), false);
    assert.equal(esSemanaFutura(semanaSiguiente(actual), hoy), true);
});

test('rango y etiquetas de fecha son estables en es-AR', () => {
    assert.equal(aClaveFecha('2026-10-13'), '2026-10-13');
    assert.equal(rangoSemanaTexto('2026-10-12'), '12 – 18 oct');
    assert.equal(rangoSemanaTexto('2026-09-28'), '28 sep – 4 oct');
    assert.equal(rangoSemanaTexto('2026-12-28'), '28 dic 2026 – 3 ene 2027');
    assert.equal(etiquetaDia('2026-10-13'), 'mar 13 oct');
});
