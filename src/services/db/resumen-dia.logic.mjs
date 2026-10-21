// src/services/db/resumen-dia.logic.mjs
// Lógica PURA del resumen diario: suma ingestas y detecta desvíos.
// Sin Firestore ni DOM → testeable directo con node --test.
//
// Regla de oro: un valor `null` es "sin dato", NO consumo 0. Se ignora al
// sumar; si ningún ítem trae el dato, el total queda `null`. Un día sin
// comidas es distinto: no hay nada desconocido y todos los totales son 0.

const CAMPOS_MACROS = [
    ['acumulado_calorias',      'total_calorias'],
    ['acumulado_proteinas',     'total_proteinas'],
    ['acumulado_carbohidratos', 'total_carbohidratos'],
    ['acumulado_grasas',        'total_grasas'],
    ['acumulado_fibra',         'total_fibra'],
];

const CAMPOS_MICROS = [
    ['acumulado_sodio_mg',          'total_sodio_mg'],
    ['acumulado_potasio_mg',        'total_potasio_mg'],
    ['acumulado_magnesio_mg',       'total_magnesio_mg'],
    ['acumulado_calcio_mg',         'total_calcio_mg'],
    ['acumulado_hierro_mg',         'total_hierro_mg'],
    ['acumulado_zinc_mg',           'total_zinc_mg'],
    ['acumulado_vitamina_d_ui',     'total_vitamina_d_ui'],
    ['acumulado_vitamina_b12_mcg',  'total_vitamina_b12_mcg'],
];

// Campos que forman el resumen (sin vasos_agua: no se deriva de las comidas).
export const CAMPOS_RESUMEN = Object.freeze([
    ...CAMPOS_MACROS.map(([acumulado]) => acumulado),
    ...CAMPOS_MICROS.map(([acumulado]) => acumulado),
    'acumulado_omega3_ala_mg',
    'acumulado_omega3_epa_dha_mg',
]);

const comoNumero = (valor) =>
    typeof valor === 'number' && Number.isFinite(valor) ? valor : null;

const redondear = (num) => Number(Math.round(num + 'e+2') + 'e-2');

/**
 * Suma solo números finitos. Devuelve `null` si no hay ningún dato conocido.
 * @param {Array<unknown>} valores
 * @returns {number|null}
 */
export const sumarConocidos = (valores) => {
    const numeros = valores.map(comoNumero).filter(v => v !== null);
    if (!numeros.length) return null;
    return redondear(numeros.reduce((a, b) => a + b, 0));
};

/**
 * Resumen esperado de un día a partir de sus ingestas.
 * Usa `resumen_macros` / `resumen_micros` de cada comida (los totales que ya
 * calcula la app al registrar) y devuelve los `acumulado_*` del resumen diario.
 * @param {Array<Object>} ingestas
 * @returns {Object}
 */
export const calcularResumenDia = (ingestas = []) => {
    const lista = Array.isArray(ingestas) ? ingestas : [];
    const vacio = lista.length === 0;

    // Día sin comidas → 0 (conocido). Con comidas, si nadie trae el dato → null.
    const sumarCampo = (selector) => {
        const total = sumarConocidos(lista.map(selector));
        return total === null && vacio ? 0 : total;
    };

    const resumen = {};
    for (const [acumulado, campo] of CAMPOS_MACROS) {
        resumen[acumulado] = sumarCampo(i => i?.resumen_macros?.[campo]);
    }
    for (const [acumulado, campo] of CAMPOS_MICROS) {
        resumen[acumulado] = sumarCampo(i => i?.resumen_micros?.[campo]);
    }
    resumen.acumulado_omega3_ala_mg = sumarCampo(i => i?.resumen_micros?.total_omega3?.ala_mg);
    resumen.acumulado_omega3_epa_dha_mg = sumarCampo(i => i?.resumen_micros?.total_omega3?.epa_dha_mg);

    return resumen;
};

/**
 * Documento a guardar en `resumen_diario`: los totales calculados + los vasos
 * de agua que ya existían (nunca se derivan de las comidas).
 * @param {Object} calculado
 * @param {Object} anterior
 * @returns {Object}
 */
export const prepararResumenParaGuardar = (calculado = {}, anterior = {}) => ({
    ...calculado,
    vasos_agua: comoNumero(anterior?.vasos_agua) ?? 0,
});

/**
 * Campos donde el resumen guardado no coincide con la suma real.
 * La tolerancia (1 por defecto) absorbe diferencias de redondeo; está pensada
 * para kcal, pero se aplica igual a los demás campos numéricos.
 * @param {Object} guardado
 * @param {Object} calculado
 * @param {number} tolerancia
 * @returns {Array<{campo: string, guardado: number|null, calculado: number|null}>}
 */
export const diferenciasResumen = (guardado = {}, calculado = {}, tolerancia = 1) => {
    const diferencias = [];
    for (const campo of CAMPOS_RESUMEN) {
        const guardadoNum = comoNumero(guardado?.[campo]);
        const calculadoNum = comoNumero(calculado?.[campo]);
        if (guardadoNum === null && calculadoNum === null) continue;
        const distinto = guardadoNum === null || calculadoNum === null
            ? true
            : Math.abs(guardadoNum - calculadoNum) > tolerancia;
        if (distinto) {
            diferencias.push({ campo, guardado: guardadoNum, calculado: calculadoNum });
        }
    }
    return diferencias;
};

/**
 * ¿Hay escrituras de comidas todavía sin confirmar? La fase 2 de micros deja
 * `micros_completos: false` hasta que termina (o el campo falta en datos
 * viejos). Mientras eso pase, el resumen puede estar a mitad de camino: no se
 * toca automáticamente.
 * @param {Array<Object>} ingestas
 * @returns {boolean}
 */
export const hayEscriturasPendientes = (ingestas = []) =>
    (Array.isArray(ingestas) ? ingestas : []).some(i => i?.micros_completos !== true);

/**
 * Criterio del chequeo automático al abrir un día: solo recalcular si todas
 * las ingestas están confirmadas y el total guardado difiere de la suma real.
 * Si hay algo pendiente se saltea y se reintenta en la próxima apertura.
 * @param {Array<Object>} ingestas
 * @param {Object} resumenGuardado
 * @param {number} tolerancia
 * @returns {boolean}
 */
export const necesitaRecalculoDia = (ingestas = [], resumenGuardado = {}, tolerancia = 1) => {
    if (hayEscriturasPendientes(ingestas)) return false;
    const calculado = calcularResumenDia(ingestas);
    return diferenciasResumen(resumenGuardado, calculado, tolerancia).length > 0;
};
