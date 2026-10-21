// src/utils/diario.logic.mjs
// Lógica PURA del Diario (historial semanal): semanas, promedios y rango.
// Sin Firestore ni DOM → testeable directo con node --test.
//
// Regla de oro del historial: un día SIN registro no es un día de 0 kcal.
// Los promedios y el "en rango" se calculan SOLO sobre días con registro.

/** Días que muestra una semana (lunes a domingo). */
export const DIAS_SEMANA = 7;

/** ±10 % respecto de la meta calórica para considerar un día "en rango". */
export const TOLERANCIA_RANGO = 0.10;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

const dos = (n) => String(n).padStart(2, '0');

const comoFecha = (fecha) => {
    if (fecha instanceof Date) {
        const d = new Date(fecha);
        d.setHours(12, 0, 0, 0);
        return d;
    }
    const clave = String(fecha ?? '');
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clave);
    if (!m) throw new Error(`Fecha inválida: ${clave}`);
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
};

/** Fecha local → YYYY-MM-DD (sin pasar por UTC). */
export const aClaveFecha = (fecha = new Date()) => {
    const d = comoFecha(fecha);
    return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
};

/** Lunes (YYYY-MM-DD) de la semana que contiene la fecha. */
export const lunesDe = (fecha = new Date()) => {
    const d = comoFecha(fecha);
    const dia = d.getDay(); // 0 = domingo
    d.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1));
    return aClaveFecha(d);
};

/** Suma (o resta) días a una clave YYYY-MM-DD. */
export const sumarDias = (clave, dias) => {
    const d = comoFecha(clave);
    d.setDate(d.getDate() + Number(dias || 0));
    return aClaveFecha(d);
};

/** Las 7 claves de la semana, de lunes a domingo. */
export const diasDeSemana = (lunes) =>
    Array.from({ length: DIAS_SEMANA }, (_, i) => sumarDias(lunes, i));

/** Una semana futura no se puede abrir en el Diario. */
export const esSemanaFutura = (lunes, hoy = new Date()) =>
    String(lunes) > lunesDe(hoy);

export const semanaAnterior = (lunes) => sumarDias(lunes, -DIAS_SEMANA);
export const semanaSiguiente = (lunes) => sumarDias(lunes, DIAS_SEMANA);

/** "13 – 19 oct" (mismo mes) o "29 sep – 5 oct" (cambio de mes). */
export const rangoSemanaTexto = (lunes) => {
    const inicio = comoFecha(lunes);
    const fin = comoFecha(sumarDias(lunes, DIAS_SEMANA - 1));
    const mesInicio = MESES[inicio.getMonth()];
    const mesFin = MESES[fin.getMonth()];
    const anioInicio = inicio.getFullYear();
    const anioFin = fin.getFullYear();

    if (anioInicio !== anioFin) {
        return `${inicio.getDate()} ${mesInicio} ${anioInicio} – ${fin.getDate()} ${mesFin} ${anioFin}`;
    }
    if (mesInicio !== mesFin) {
        return `${inicio.getDate()} ${mesInicio} – ${fin.getDate()} ${mesFin}`;
    }
    return `${inicio.getDate()} – ${fin.getDate()} ${mesFin}`;
};

/** Etiqueta corta de un día: "lun 13 oct". */
export const etiquetaDia = (clave) => {
    const d = comoFecha(clave);
    return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`;
};

/** Inicial de 3 letras para el gráfico: "lun". */
export const etiquetaCortaDia = (clave) => DIAS[comoFecha(clave).getDay()];

const numero = (valor) => {
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
};

const redondear = (n, decimales = 0) => {
    const factor = 10 ** decimales;
    return Math.round(n * factor) / factor;
};

/**
 * ¿Un día con registro cae dentro de ±tolerancia de la meta?
 * Sin meta válida no hay forma de evaluar: false.
 */
export const estaEnRango = (kcal, metaKcal, tolerancia = TOLERANCIA_RANGO) => {
    const meta = Number(metaKcal);
    if (!Number.isFinite(meta) || meta <= 0) return false;
    const valor = Number(kcal);
    if (!Number.isFinite(valor)) return false;
    return valor >= meta * (1 - tolerancia) && valor <= meta * (1 + tolerancia);
};

/**
 * Resumen de la semana.
 *
 * @param {Array<{fecha: string, kcal: number, proteina: number, tieneRegistro: boolean}>} dias
 * @param {number} metaKcal meta calórica diaria del usuario
 * @param {number} tolerancia margen de "en rango" (por defecto ±10 %)
 * @returns {{
 *   diasConRegistro: number,
 *   totalDias: number,
 *   promedioKcal: number|null,
 *   promedioProteina: number|null,
 *   diasEnRango: number,
 * }}
 */
export const calcularResumenSemana = (
    dias = [],
    metaKcal = 0,
    tolerancia = TOLERANCIA_RANGO,
) => {
    const lista = Array.isArray(dias) ? dias : [];
    const conRegistro = lista.filter(d => d?.tieneRegistro === true);

    // Un día sin registro NO entra al promedio (no vale 0).
    const promedio = (selector, decimales) => {
        if (!conRegistro.length) return null;
        const total = conRegistro.reduce((acc, d) => acc + numero(selector(d)), 0);
        return redondear(total / conRegistro.length, decimales);
    };

    return {
        diasConRegistro: conRegistro.length,
        totalDias: lista.length,
        promedioKcal: promedio(d => d.kcal, 0),
        promedioProteina: promedio(d => d.proteina, 1),
        diasEnRango: conRegistro.filter(d => estaEnRango(d.kcal, metaKcal, tolerancia)).length,
    };
};

/**
 * Compatibilidad con resúmenes viejos: `comidas_count` es el dato canónico.
 * Si falta (documentos anteriores), se infiere por macros > 0. Un día con
 * agua y sin comidas queda fuera; uno con comidas de 0 kcal también, pero
 * esos documentos ya no se generan sin `comidas_count`.
 */
export const resumenTieneComidas = (resumen = {}) => {
    if (!resumen || typeof resumen !== 'object') return false;
    if (typeof resumen.comidas_count === 'number') return resumen.comidas_count > 0;
    return ['acumulado_calorias', 'acumulado_proteinas', 'acumulado_carbohidratos', 'acumulado_grasas']
        .some(campo => numero(resumen[campo]) > 0);
};
