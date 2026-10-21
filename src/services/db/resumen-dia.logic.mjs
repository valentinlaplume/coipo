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
 * Ventana durante la que una ingesta con `micros_completos: false` se
 * considera "en vuelo" (fase 2 de micros sin confirmar).
 */
export const VENTANA_PENDIENTE_MS = 2 * 60 * 1000;

const milisegundosDe = (valor) => {
    if (valor == null) return null;
    if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
    if (valor instanceof Date) return valor.getTime();
    if (typeof valor.toMillis === 'function') return valor.toMillis();
    if (typeof valor.toDate === 'function') return valor.toDate().getTime();
    if (typeof valor.seconds === 'number') {
        return valor.seconds * 1000 + (Number(valor.nanoseconds) || 0) / 1e6;
    }
    return null;
};

/**
 * ¿Hay escrituras de comidas todavía sin confirmar? Solo cuenta una ingesta
 * con `micros_completos === false` **y** creada hace menos de 2 minutos. Si es
 * más vieja, o si el campo/`creado_el` no existe, no bloquea el recálculo: se
 * asume que la fase 2 quedó incompleta y el resumen se puede reparar.
 * @param {Array<Object>} ingestas
 * @param {number} ahora milisegundos (inyectable en tests)
 * @returns {boolean}
 */
export const hayEscriturasPendientes = (ingestas = [], ahora = Date.now()) =>
    (Array.isArray(ingestas) ? ingestas : []).some(i => {
        if (i?.micros_completos !== false) return false;
        const creado = milisegundosDe(i?.creado_el);
        if (creado === null) return false;
        return ahora - creado < VENTANA_PENDIENTE_MS;
    });

/**
 * Criterio del chequeo automático al abrir un día: solo recalcular si no hay
 * escrituras recientes pendientes y el total guardado difiere de la suma real.
 * Si hay algo en vuelo se saltea y se reintenta en la próxima apertura.
 * @param {Array<Object>} ingestas
 * @param {Object} resumenGuardado
 * @param {number} tolerancia
 * @param {number} ahora milisegundos (inyectable en tests)
 * @returns {boolean}
 */
export const necesitaRecalculoDia = (
    ingestas = [],
    resumenGuardado = {},
    tolerancia = 1,
    ahora = Date.now(),
) => {
    if (hayEscriturasPendientes(ingestas, ahora)) return false;
    const calculado = calcularResumenDia(ingestas);
    return diferenciasResumen(resumenGuardado, calculado, tolerancia).length > 0;
};
