// tests/resumen-dia.test.mjs
// Lógica pura del recálculo del resumen diario: suma sin tratar `null` como 0,
// día sin comidas, tolerancia de redondeo y conservación de vasos_agua.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
    CAMPOS_RESUMEN,
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

test('no recalcula mientras haya escrituras pendientes (micros_completos ≠ true)', () => {
    const pendiente = [{
        resumen_macros: { total_calorias: 500 },
        micros_completos: false,
    }];
    const resumenDescuadrado = { acumulado_calorias: 999 };

    assert.equal(hayEscriturasPendientes(pendiente), true);
    // Aunque el total no coincida, se saltea: la fase 2 todavía puede cambiarlo.
    assert.equal(necesitaRecalculoDia(pendiente, resumenDescuadrado), false);

    // Sin el flag también cuenta como pendiente (datos a medio escribir).
    const sinFlag = [{ resumen_macros: { total_calorias: 500 } }];
    assert.equal(hayEscriturasPendientes(sinFlag), true);
    assert.equal(necesitaRecalculoDia(sinFlag, resumenDescuadrado), false);

    // Con todas confirmadas, el descuadre sí dispara el recálculo.
    const confirmadas = [{ resumen_macros: { total_calorias: 500 }, micros_completos: true }];
    const resumenCorrecto = calcularResumenDia(confirmadas);
    assert.equal(hayEscriturasPendientes(confirmadas), false);
    assert.equal(necesitaRecalculoDia(confirmadas, resumenDescuadrado), true);
    assert.equal(necesitaRecalculoDia(confirmadas, resumenCorrecto), false);
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
