// tests/resumen-dia.test.mjs
// Lógica pura del recálculo del resumen diario: suma sin tratar `null` como 0,
// día sin comidas, tolerancia de redondeo y conservación de vasos_agua.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
    CAMPOS_RESUMEN,
    VENTANA_PENDIENTE_MS,
    calcularResumenDia,
    diferenciasResumen,
    hayEscriturasPendientes,
    necesitaRecalculoDia,
    prepararResumenParaGuardar,
} from '../src/services/db/resumen-dia.logic.mjs';

const ingesta = (macros = {}, micros = null) => ({
    resumen_macros: macros,
    resumen_micros: micros,
});

test('suma macros, fibra y micros ignorando los null (no los trata como 0)', () => {
    const resumen = calcularResumenDia([
        ingesta(
            { total_calorias: 500, total_proteinas: 20, total_carbohidratos: 50, total_grasas: 15, total_fibra: null },
            { total_sodio_mg: 400, total_potasio_mg: null, total_omega3: { ala_mg: null, epa_dha_mg: 120 } },
        ),
        ingesta(
            { total_calorias: 300, total_proteinas: 10, total_carbohidratos: 30, total_grasas: 8, total_fibra: 4 },
            { total_sodio_mg: null, total_potasio_mg: 600, total_omega3: { ala_mg: 300, epa_dha_mg: null } },
        ),
    ]);

    assert.equal(resumen.acumulado_calorias, 800);
    assert.equal(resumen.acumulado_proteinas, 30);
    assert.equal(resumen.acumulado_carbohidratos, 80);
    assert.equal(resumen.acumulado_grasas, 23);
    // Solo la segunda ingesta trae fibra: 4, no 4 + 0.
    assert.equal(resumen.acumulado_fibra, 4);
    // Sodio y potasio: el null de una comida no aporta.
    assert.equal(resumen.acumulado_sodio_mg, 400);
    assert.equal(resumen.acumulado_potasio_mg, 600);
    assert.equal(resumen.acumulado_omega3_ala_mg, 300);
    assert.equal(resumen.acumulado_omega3_epa_dha_mg, 120);
});

test('si ninguna ingesta trae un micro, el total queda null (desconocido ≠ 0)', () => {
    const resumen = calcularResumenDia([
        ingesta({ total_calorias: 100, total_fibra: null }, { total_sodio_mg: null }),
    ]);

    assert.equal(resumen.acumulado_fibra, null);
    assert.equal(resumen.acumulado_sodio_mg, null);
    assert.equal(resumen.acumulado_potasio_mg, null);
    assert.equal(resumen.acumulado_omega3_ala_mg, null);
});

test('día sin comidas: todos los totales son 0 (dato conocido)', () => {
    const resumen = calcularResumenDia([]);

    for (const campo of CAMPOS_RESUMEN) {
        assert.equal(resumen[campo], 0, `${campo} debería ser 0 en un día vacío`);
    }
});

test('absorbe diferencias de redondeo de hasta 1 kcal', () => {
    const calculado = calcularResumenDia([
        ingesta({ total_calorias: 500.4 }),
        ingesta({ total_calorias: 499.6 }),
    ]);
    assert.equal(calculado.acumulado_calorias, 1000);

    // 1001 kcal es redondeo: no dispara recálculo.
    assert.deepEqual(diferenciasResumen({ ...calculado, acumulado_calorias: 1001 }, calculado), []);

    // 1002 kcal ya es un descuadre real.
    const diferencias = diferenciasResumen({ ...calculado, acumulado_calorias: 1002 }, calculado);
    assert.equal(diferencias.length, 1);
    assert.equal(diferencias[0].campo, 'acumulado_calorias');
});

test('redondea a dos decimales al sumar', () => {
    const resumen = calcularResumenDia([
        ingesta({ total_fibra: 0.1 }),
        ingesta({ total_fibra: 0.2 }),
    ]);
    assert.equal(resumen.acumulado_fibra, 0.3);
});

test('solo cuenta como pendiente una ingesta reciente con micros_completos === false', () => {
    const ahora = new Date('2026-10-21T12:00:00Z').getTime();
    const resumenDescuadrado = { acumulado_calorias: 999 };
    const base = { resumen_macros: { total_calorias: 500 } };

    // Recién creada y sin confirmar → pendiente: no se recalcula.
    const reciente = [{
        ...base,
        micros_completos: false,
        creado_el: new Date(ahora - 30_000),
    }];
    assert.equal(hayEscriturasPendientes(reciente, ahora), true);
    assert.equal(necesitaRecalculoDia(reciente, resumenDescuadrado, 1, ahora), false);

    // Mismo caso con Timestamp de Firestore ({seconds}).
    const recienteTimestamp = [{
        ...base,
        micros_completos: false,
        creado_el: { seconds: Math.floor((ahora - 30_000) / 1000) },
    }];
    assert.equal(hayEscriturasPendientes(recienteTimestamp, ahora), true);

    // Más de 2 minutos: la fase 2 quedó colgada → no bloquea la reparación.
    const vieja = [{
        ...base,
        micros_completos: false,
        creado_el: new Date(ahora - 3 * 60_000),
    }];
    assert.equal(hayEscriturasPendientes(vieja, ahora), false);
    assert.equal(necesitaRecalculoDia(vieja, resumenDescuadrado, 1, ahora), true);

    // Justo en el borde de 2 minutos ya no es pendiente ("menos de 2").
    const borde = [{
        ...base,
        micros_completos: false,
        creado_el: new Date(ahora - VENTANA_PENDIENTE_MS),
    }];
    assert.equal(hayEscriturasPendientes(borde, ahora), false);

    // Sin el campo `micros_completos` no es pendiente (dato viejo).
    const sinCampo = [{ ...base, creado_el: new Date(ahora - 30_000) }];
    assert.equal(hayEscriturasPendientes(sinCampo, ahora), false);
    assert.equal(necesitaRecalculoDia(sinCampo, resumenDescuadrado, 1, ahora), true);

    // Con false pero sin creado_el tampoco se puede afirmar que esté en vuelo.
    const sinCreado = [{ ...base, micros_completos: false }];
    assert.equal(hayEscriturasPendientes(sinCreado, ahora), false);

    // Confirmada: nunca bloquea.
    const confirmadas = [{ ...base, micros_completos: true, creado_el: new Date(ahora - 30_000) }];
    assert.equal(hayEscriturasPendientes(confirmadas, ahora), false);
    const resumenCorrecto = calcularResumenDia(confirmadas);
    assert.equal(necesitaRecalculoDia(confirmadas, resumenDescuadrado, 1, ahora), true);
    assert.equal(necesitaRecalculoDia(confirmadas, resumenCorrecto, 1, ahora), false);
});

test('conserva vasos_agua al preparar el documento a guardar', () => {
    const calculado = calcularResumenDia([ingesta({ total_calorias: 250 })]);

    const conAgua = prepararResumenParaGuardar(calculado, { vasos_agua: 6 });
    assert.equal(conAgua.vasos_agua, 6);
    assert.equal(conAgua.acumulado_calorias, 250);

    // Sin dato previo (o null), arranca en 0; nunca pierde el valor existente.
    assert.equal(prepararResumenParaGuardar(calculado, {}).vasos_agua, 0);
    assert.equal(prepararResumenParaGuardar(calculado, { vasos_agua: null }).vasos_agua, 0);
});
