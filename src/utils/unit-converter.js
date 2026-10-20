// src/utils/unit-converter.js
// ÚNICA fuente de verdad para convertir cantidades + unidades a gramos.
// Firma: convertirAGramos(ingrediente, cantidad, unidad, nombreIngrediente)
//   - cantidad puede ser number o string ("2", "1/2", "1.5")
//   - devuelve gramos (number) o null si no se pudo convertir

const conversiones = {
    // Pesos
    'g': 1,
    'gr': 1,
    'grs': 1,
    'kg': 1000,
    'mg': 0.001,

    // Volumen (aprox. agua = 1 g/ml)
    'ml': 1,
    'cc': 1,
    'l': 1000,

    // Cucharas
    'cucharada': 15,
    'cucharadita': 5,
    'cda': 15,
    'cdta': 5,
    'cdita': 5,
    'tbsp': 15,
    'tsp': 5,

    // Tazas
    'taza': 240,
    'tazas': 240,
    'cup': 240,

    // Sobres (edulcorante: ~1,5g c/u)
    'sobre': 1.5,
    'sobres': 1.5,
};

// Estimaciones para unidad "según ingrediente" (g por unidad)
// El orden importa: coincidencias más largas primero ("claras de huevo" antes que "huevo")
// Pesos reales de referencia (USDA, huevo grande): clara ≈ 33 g, yema ≈ 17 g, entero ≈ 50 g.
const estimacionesPorUnidad = {
    'clara de huevo': 33,
    'claras de huevo': 33,
    'huevo entero': 50,
    'rodaja de pan': 30,
    'diente': 5,          // ajo
    'puñado': 30,
    'pizca': 1,
    'huevo': 50,          // cubre "huevo" y "huevos" (evita el fallback de 100g)
    'sobre': 1.5,         // edulcorante en sobres (unidad "unidad" + nombre con "sobre")
    'edulcorante': 1.5,   // si la IA lo nombra solo "edulcorante" (sobre dosificado ≈ 1,5g)
};

// Densidades calóricas típicas (kcal/100g) para convertir "500 kcal" → gramos.
// Es solo una ESTIMACIÓN INICIAL: procesarReceta corrige los gramos con los datos
// reales del producto (OFF/IA) vía corregirGramosPorKcal() → kcal exactas.
const densidadesCaloricas = {
    'tapa de tarta hojaldrada': 500,
    'tapa de tarta': 300,   // tapas integrales/meanas (~280-320 kcal/100g)
    'masa hojaldrada': 500,
    'aceite': 900,
    'azúcar': 400,
    'manteca': 720,
};

/**
 * Parsea una cantidad que puede ser número, string decimal o fracción ("1/2").
 * @returns {number|null}
 */
const parsearCantidad = (cantidad) => {
    if (typeof cantidad === 'number') return isNaN(cantidad) ? null : cantidad;

    if (typeof cantidad !== 'string') return null;
    const texto = cantidad.trim().replace(',', '.');

    if (texto.includes('/')) {
        const [numerador, denominador] = texto.split('/').map(n => parseFloat(n.trim()));
        if (isNaN(numerador) || isNaN(denominador) || denominador === 0) return null;
        return numerador / denominador;
    }

    const valor = parseFloat(texto);
    return isNaN(valor) ? null : valor;
};

/**
 * Convierte cantidad + unidad a gramos.
 * @param {string} ingrediente - objeto ingrediente (por compatibilidad; no se usa)
 * @param {number|string} cantidad - Ej: "2", "1/2", 1.5, "700"
 * @param {string} unidad - Ej: "g", "kg", "ml", "taza", "unidad", "kcal"
 * @param {string} nombreIngrediente - Para estimaciones por ingrediente y logs
 * @returns {number|null} Gramos, o null si no se pudo convertir
 */
export const convertirAGramos = (ingrediente, cantidad, unidad, nombreIngrediente = "") => {
    const n = parsearCantidad(cantidad);
    if (n === null || n <= 0) {
        console.warn(`⚠️ Cantidad inválida: "${cantidad}"`);
        return null;
    }

    const unidadNormalizada = (unidad || '').toLowerCase().trim();
    const nombre = (nombreIngrediente || '').toLowerCase().trim();

    if (!unidadNormalizada) {
        console.warn(`⚠️ Unidad vacía para "${nombreIngrediente}"`);
        return null;
    }

    // 1. Unidades directas a gramos/ml
    if (unidadNormalizada in conversiones) {
        return Math.round(n * conversiones[unidadNormalizada] * 100) / 100;
    }

    // 2. "unidad" / "unidades" → estimar según ingrediente
    if (unidadNormalizada === 'unidad' || unidadNormalizada === 'unidades') {
        for (const [clave, gramos] of Object.entries(estimacionesPorUnidad)) {
            if (nombre.includes(clave)) return Math.round(n * gramos * 100) / 100;
        }
        return Math.round(n * 100 * 100) / 100; // fallback conservador: 100g por unidad
    }

    // 3. "kcal" → gramos según densidad calórica
    if (unidadNormalizada === 'kcal') {
        let densidad = 200; // kcal/100g por defecto
        for (const [clave, kcal] of Object.entries(densidadesCaloricas)) {
            if (nombre.includes(clave)) { densidad = kcal; break; }
        }
        return Math.round((n / densidad) * 100 * 100) / 100;
    }

    console.warn(`⚠️ Unidad no reconocida: "${unidad}" para "${nombreIngrediente}"`);
    return null;
};

/**
 * CORRECCIÓN MILIMÉTRICA para ingredientes escritos en kcal ("500 kcal de tapa").
 * La densidad inicial es una estimación; una vez conocidos los datos REALES del
 * producto (por_100g de OFF/IA), los gramos exactos son: kcal_pedidas / kcal_100g × 100.
 * Así el ingrediente aporta EXACTAMENTE las kcal que pidió el usuario y los gramos
 * quedan realistas (no los de una densidad genérica).
 *
 * @param {number} gramosEstimados - gramos calculados con la densidad típica
 * @param {number} kcalPedidas - kcal escritas por el usuario (ej: 500)
 * @param {number} kcalPor100g - calorías reales por 100 g del producto encontrado
 * @returns {number} gramos corregidos (o los estimados si no se puede corregir
 *                   o la diferencia es menor al 1%)
 */
export const corregirGramosPorKcal = (gramosEstimados, kcalPedidas, kcalPor100g) => {
    const kcal = Number(kcalPedidas);
    const p100  = Number(kcalPor100g);
    if (!(kcal > 0) || !(p100 > 0)) return gramosEstimados;

    const exactos = (kcal / p100) * 100;
    if (!(exactos > 0)) return gramosEstimados;

    const base = Math.max(exactos, Number(gramosEstimados) || 0);
    const diferencia = base > 0 ? Math.abs(exactos - gramosEstimados) / base : 0;
    return diferencia > 0.01 ? Math.round(exactos * 100) / 100 : gramosEstimados;
};
