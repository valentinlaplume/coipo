import { db } from '../../firebase-config.js';
import {
    doc,
    collection,
    addDoc,
    setDoc, updateDoc, getDoc, getDocs,
    increment,
    serverTimestamp,
    deleteDoc,
} from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';
import { obtenerIngrediente } from '../product-scanner.service.js';
import { convertirAGramos, corregirGramosPorKcal } from '../../utils/unit-converter.js';
import { estimarNutrientesPor100g } from '../ai/groq.service.js';
import { construirIngestaCompleta, obtenerPesoTotalReceta } from '../../utils/receta-math.js';
// Construye los campos canónicos de una receta — compartido por guardar y actualizar
const construirCamposReceta = (datosReceta) => {
    const nombre = datosReceta.nombre_receta ?? datosReceta.nombre;
    const porciones = Number(datosReceta.porciones_totales ?? datosReceta.porciones_sugeridas) || 1;

    if (!nombre) throw new Error("Falta el nombre de la receta");
    if (!datosReceta.ingredientes?.length) throw new Error("Faltan los ingredientes");

    // Macros: aceptar forma "completa" o "porción" y derivar la otra
    const macrosCompleta = datosReceta.totales_macros_completa
        ?? (datosReceta.totales_macros_porcion
            ? Object.fromEntries(Object.entries(datosReceta.totales_macros_porcion).map(([k, v]) => [k, (v || 0) * porciones]))
            : null);
    const macrosPorcion = datosReceta.totales_macros_porcion
        ?? (macrosCompleta
            ? Object.fromEntries(Object.entries(macrosCompleta).map(([k, v]) => [k, (v || 0) / porciones]))
            : null);

    if (!macrosPorcion) throw new Error("Faltan los macros de la receta");

    // Peso total → clave para la regla de 3 por gramos de "Usar Receta"
    const pesoTotal = obtenerPesoTotalReceta(datosReceta);

    const camposMacro = ['calorias', 'proteinas', 'carbohidratos', 'grasas', 'fibra'];
    const tomarMacro = (fuente, campo) => fuente?.[campo] || 0;

    return {
        nombre,
        porciones_totales: porciones,
        descripcion: datosReceta.descripcion || '',
        peso_total_g: pesoTotal,
        peso_por_porcion_g: pesoTotal > 0 ? Math.round((pesoTotal / porciones) * 100) / 100 : 0,
        // Macros por 100g de la preparación (base de la regla de 3 y de la vista previa)
        valores_por_100g: datosReceta.valores_por_100g || null,
        ingredientes: (datosReceta.ingredientes || []).map(ing => {
            // Soporta { cantidad_g, nutrientes_por_100g: {...} } y forma plana { cantidad, calorias, ... }
            const por100 = ing.nutrientes_por_100g || {};
            return {
                nombre: ing.nombre,
                marca: ing.marca || null,
                cantidad_g: ing.cantidad_g ?? ing.cantidad ?? 0,
                nutrientes_por_100g: {
                    calorias: por100.calorias ?? ing.calorias ?? 0,
                    proteinas: por100.proteinas ?? ing.proteinas ?? 0,
                    carbohidratos: por100.carbohidratos ?? ing.carbohidratos ?? 0,
                    grasas: por100.grasas ?? ing.grasas ?? 0,
                    fibra: por100.fibra ?? ing.fibra ?? 0,
                    // Micros
                    sodio_mg: por100.sodio_mg ?? ing.sodio_mg ?? 0,
                    potasio_mg: por100.potasio_mg ?? ing.potasio_mg ?? 0,
                    magnesio_mg: por100.magnesio_mg ?? ing.magnesio_mg ?? 0,
                    calcio_mg: por100.calcio_mg ?? ing.calcio_mg ?? 0,
                    hierro_mg: por100.hierro_mg ?? ing.hierro_mg ?? 0,
                    zinc_mg: por100.zinc_mg ?? ing.zinc_mg ?? 0,
                    vitamina_d_ui: por100.vitamina_d_ui ?? ing.vitamina_d_ui ?? 0,
                    vitamina_b12_mcg: por100.vitamina_b12_mcg ?? ing.vitamina_b12_mcg ?? 0,
                    omega3_ala_mg: por100.omega3_ala_mg ?? ing.omega3_ala_mg ?? 0,
                    omega3_epa_dha_mg: por100.omega3_epa_dha_mg ?? ing.omega3_epa_dha_mg ?? 0
                }
            };
        }),
        totales_macros_completa: Object.fromEntries(camposMacro.map(c => [c, tomarMacro(macrosCompleta, c)])),
        totales_macros_porcion: Object.fromEntries(camposMacro.map(c => [c, tomarMacro(macrosPorcion, c)])),
        // ✅ Micros por porción
        totales_micros_porcion: datosReceta.totales_micros_porcion || {
            sodio_mg: 0, potasio_mg: 0, magnesio_mg: 0, calcio_mg: 0,
            hierro_mg: 0, zinc_mg: 0, vitamina_d_ui: 0, vitamina_b12_mcg: 0,
            omega3_ala_mg: 0, omega3_epa_dha_mg: 0
        }
    };
};

// Guardar una receta creada por el usuario (template)
// Acepta ambos formatos de entrada:
//   - { nombre_receta, porciones_totales, totales_macros_porcion, ... }
//   - { nombre, porciones_sugeridas, totales_macros_completa, ... } (prepararRecetaParaGuardar)
export const guardarReceta = async (userId, datosReceta) => {
    const docRef = await addDoc(collection(db, 'usuarios', userId, 'recetas'), {
        ...construirCamposReceta(datosReceta),
        creado_el: serverTimestamp()
    });
    return docRef.id;
};

// Actualizar una receta existente (editar descripción → recalcular macros)
// Sobrescribe todos los campos con los valores RECALCULADOS; conserva creado_el.
export const actualizarReceta = async (userId, recetaId, datosReceta) => {
    if (!userId || !recetaId) {
        throw new Error('Faltan datos para actualizar la receta');
    }
    await updateDoc(doc(db, 'usuarios', userId, 'recetas', recetaId), {
        ...construirCamposReceta(datosReceta),
        actualizado_el: serverTimestamp()
    });
    return true;
};

// Obtener todas las recetas del usuario
export const obtenerRecetas = async (userId) => {
    const recetasRef = collection(db, 'usuarios', userId, 'recetas');
    const snapshot = await getDocs(recetasRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Obtener una receta por ID
export const obtenerRecetaPorId = async (userId, recetaId) => {
    const recetaRef = doc(db, 'usuarios', userId, 'recetas', recetaId);
    const snap = await getDoc(recetaRef);
    if (snap.exists()) return { id: snap.id, ...snap.data() };
    return null;
};

// Eliminar una receta del usuario (las ingestas ya registradas conservan sus datos)
export const eliminarReceta = async (userId, recetaId) => {
    if (!userId || !recetaId) {
        throw new Error('Faltan datos para eliminar la receta');
    }
    await deleteDoc(doc(db, 'usuarios', userId, 'recetas', recetaId));
    return true;
};

// DESHACER una eliminación de receta: la re-crea tal cual (con id nuevo)
export const restaurarReceta = async (userId, receta) => {
    if (!userId || !receta) {
        throw new Error('Faltan datos para restaurar la receta');
    }
    const { id, ...datos } = receta; // el id viejo no se reutiliza
    const ref = await addDoc(collection(db, 'usuarios', userId, 'recetas'), datos);
    return { id: ref.id, ...datos };
};

// Registrar una ingesta a partir de una receta — REGLA DE 3 SIMPLE por GRAMOS
// gramosConsumidos: peso de la porción comida (misma base que la receta: en crudo)
// extras (opcional): salida de prepararExtrasParaIngesta() — ingredientes extra
export const registrarIngestaDesdeReceta = async (userId, dateKey, receta, gramosConsumidos, extras = null) => {
    // Porción (regla de 3) + extras opcionales → alimentos, macros y micros combinados
    const { alimentos, macros, micros } = construirIngestaCompleta(receta, gramosConsumidos, extras);

    // Los acumuladores del resumen diario usan el prefijo total_*
    const acumularMicro = (campo) => micros[campo] || 0;

    // Guardado sin IA (mismo esquema que crearRegistroComida)
    const ingestasRef = collection(db, 'usuarios', userId, 'ingestas_diarias', dateKey, 'comidas');
    const resumenRef = doc(db, 'usuarios', userId, 'resumen_diario', dateKey);

    const docRef = await addDoc(ingestasRef, {
        alimentos,
        resumen_macros: macros,
        resumen_micros: micros,
        micros_completos: true,
        confianza_general: 'alta',
        formato: "receta",
        // El nombre propio de la receta: la tarjeta del dashboard lo muestra como título
        descripcion: (receta.nombre || 'Receta').trim(),
        creado_el: serverTimestamp()
    });

    // Actualizar resumen diario
    await setDoc(resumenRef, {
        acumulado_calorias: increment(macros.total_calorias),
        acumulado_proteinas: increment(macros.total_proteinas),
        acumulado_carbohidratos: increment(macros.total_carbohidratos),
        acumulado_grasas: increment(macros.total_grasas),
        acumulado_fibra: increment(macros.total_fibra),
        acumulado_sodio_mg: increment(acumularMicro('total_sodio_mg')),
        acumulado_potasio_mg: increment(acumularMicro('total_potasio_mg')),
        acumulado_magnesio_mg: increment(acumularMicro('total_magnesio_mg')),
        acumulado_calcio_mg: increment(acumularMicro('total_calcio_mg')),
        acumulado_hierro_mg: increment(acumularMicro('total_hierro_mg')),
        acumulado_zinc_mg: increment(acumularMicro('total_zinc_mg')),
        acumulado_vitamina_d_ui: increment(acumularMicro('total_vitamina_d_ui')),
        acumulado_vitamina_b12_mcg: increment(acumularMicro('total_vitamina_b12_mcg')),
        acumulado_omega3_ala_mg: increment(micros.total_omega3.ala_mg),
        acumulado_omega3_epa_dha_mg: increment(micros.total_omega3.epa_dha_mg),
        comidas_count: increment(1),
        ultima_actualizacion: serverTimestamp()
    }, { merge: true });

    return docRef.id;
};

// ═══════════════════════════════════════════════════════════════
// UTILIDADES PARA CONVERTIR UNIDADES
// (movido a src/utils/unit-converter.js — única fuente de verdad)
// Se re-importa arriba: import { convertirAGramos } from '../../utils/unit-converter.js'
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// ENRIQUECER INGREDIENTE CON DATOS NUTRICIONALES
// ═══════════════════════════════════════════════════════════════

/**
 * Obtiene info nutricional de un ingrediente y lo escala a la cantidad dada
 * @param {Object} ingrediente - {nombre, cantidad, unidad}
 * @param {number} gramos - Gramos totales
 * @returns {Promise<Object|null>}
 */
export const enriquecerIngrediente = async (ingrediente, gramos) => {
    if (!ingrediente?.nombre || !gramos || gramos <= 0) {
        console.warn('❌ Ingrediente o gramos inválido');
        return null;
    }

    try {
        // 1. Buscar en BD local / OpenFoodFacts (datos reales del producto)
        //    La marca detectada por la IA ("harina de arveja Dicomere" → "Dicomere")
        //    permite buscar el producto real y, si la marca no está en OFF,
        //    hacer fallback al producto base genérico.
        let info = await obtenerIngrediente(ingrediente.nombre, ingrediente.marca);
        let fuente = info?.fuente || null;

        // 2. Fallback: si OFF/local no lo tiene, la IA estima los valores por 100g
        //    (el flujo nunca se corta por un ingrediente que la base no tenga)
        if (!info) {
            console.log(`🤖 "${ingrediente.nombre}" sin dato en OFF — pidiendo estimación a la IA...`);
            try {
                info = await estimarNutrientesPor100g(ingrediente.nombre);
                fuente = 'ia_estimado';
            } catch (e) {
                console.warn(`⚠️ Estimación IA falló para "${ingrediente.nombre}":`, e.message);
            }
        }

        if (!info) {
            console.warn(`⚠️ No se encontró: "${ingrediente.nombre}"`);
            return null;
        }

        // Escalar nutrientes a la cantidad específica
        const factor = gramos / 100;
        const nutrientes_totales = {};
        
        for (const [key, valor] of Object.entries(info.por_100g)) {
            if (typeof valor === 'number') {
                nutrientes_totales[key] = Math.round(valor * factor * 100) / 100;
            } else if (key === 'omega3' && valor && typeof valor === 'object') {
                // OFF devuelve omega3 anidado ({ ala_mg, epa_dha_mg }) — lo aplanamos
                // para que sumarNutrientes() pueda sumarlo como el resto
                nutrientes_totales.omega3_ala_mg = Math.round((valor.ala_mg || 0) * factor * 100) / 100;
                nutrientes_totales.omega3_epa_dha_mg = Math.round((valor.epa_dha_mg || 0) * factor * 100) / 100;
            }
        }

        return {
            // Conserva el nombre ORIGINAL del usuario (con su marca) — info.nombre
            // puede ser el producto genérico que OFF devolvió ("Harina de arveja Nativo")
            nombre: ingrediente.nombre,
            marca: ingrediente.marca || null,
            cantidad_g: gramos,
            nutrientes_por_100g: info.por_100g,
            nutrientes_totales,
            fuente: fuente || 'desconocida'
        };
    } catch (error) {
        console.error(`Error enriqueciendo ${ingrediente.nombre}:`, error);
        return null;
    }
};

// ═══════════════════════════════════════════════════════════════
// SUMAR NUTRIENTES DE MÚLTIPLES INGREDIENTES
// ═══════════════════════════════════════════════════════════════

export const sumarNutrientes = (ingredientesEnriquecidos) => {
    const totales = {};

    // Inicializar todos los nutrientes en 0
    if (ingredientesEnriquecidos.length > 0) {
        const primerIng = ingredientesEnriquecidos[0].nutrientes_totales;
        for (const key of Object.keys(primerIng)) {
            totales[key] = 0;
        }
    }

    // Sumar
    ingredientesEnriquecidos.forEach(ing => {
        for (const [key, valor] of Object.entries(ing.nutrientes_totales)) {
            totales[key] = (totales[key] || 0) + valor;
        }
    });

    return totales;
};

// ═══════════════════════════════════════════════════════════════
// CALCULAR NUTRIENTES POR 100G DE RECETA
// ═══════════════════════════════════════════════════════════════

export const calcularValoresPor100g = (totales, pesoTotalGramos) => {
    if (pesoTotalGramos <= 0) return {};

    const valoresPor100g = {};
    const factor = 100 / pesoTotalGramos;

    for (const [key, valor] of Object.entries(totales)) {
        valoresPor100g[key] = Math.round(valor * factor * 100) / 100;
    }

    return valoresPor100g;
};

// ═══════════════════════════════════════════════════════════════
// PROCESAR RECETA COMPLETA
// ═══════════════════════════════════════════════════════════════

/**
 * Procesa una lista de ingredientes extraídos y enriquecidos
 * @param {Array} datosExtraidos - {ingredientes[], nombre_receta}
 * @returns {Promise<Object|null>}
 */
export const procesarReceta = async (datosExtraidos) => {
    if (!datosExtraidos?.ingredientes || datosExtraidos.ingredientes.length === 0) {
        throw new Error('No hay ingredientes para procesar');
    }

    const ingredientesEnriquecidos = [];
    let pesoTotalGramos = 0;
    const ingredientesFallidos = [];

    console.log(`📋 Procesando ${datosExtraidos.ingredientes.length} ingredientes...`);

    for (const ing of datosExtraidos.ingredientes) {
        // Convertir a gramos (firma: ingrediente, cantidad, unidad, nombre)
        const gramos = convertirAGramos(ing, ing.cantidad, ing.unidad, ing.nombre);
        
        if (!gramos || gramos <= 0) {
            ingredientesFallidos.push({
                nombre: ing.nombre,
                razon: `No se pudo convertir "${ing.cantidad} ${ing.unidad}"`
            });
            continue;
        }

        // Enriquecer con info nutricional
        const enriquecido = await enriquecerIngrediente(ing, gramos);
        
        if (!enriquecido) {
            ingredientesFallidos.push({
                nombre: ing.nombre,
                razon: 'No se encontró en OpenFoodFacts'
            });
            continue;
        }

        // CORRECCIÓN MILIMÉTRICA: "500 kcal de tapa de tarta" → los gramos salen
        // de la densidad ESTIMADA, pero una vez conocidos los datos REALES del
        // producto (OFF/IA) se reescalan para que el ingrediente aporte EXACTAS
        // esas 500 kcal (y los gramos queden realistas).
        if (String(ing.unidad || '').toLowerCase() === 'kcal') {
            const kcal100 = Number(enriquecido.nutrientes_por_100g?.calorias) || 0;
            const gramosCorregidos = corregirGramosPorKcal(enriquecido.cantidad_g, ing.cantidad, kcal100);
            if (gramosCorregidos !== enriquecido.cantidad_g) {
                const f = gramosCorregidos / 100;
                for (const [k, v] of Object.entries(enriquecido.nutrientes_por_100g || {})) {
                    if (typeof v === 'number') {
                        enriquecido.nutrientes_totales[k] = Math.round(v * f * 100) / 100;
                    } else if (k === 'omega3' && v && typeof v === 'object') {
                        enriquecido.nutrientes_totales.omega3_ala_mg = Math.round((v.ala_mg || 0) * f * 100) / 100;
                        enriquecido.nutrientes_totales.omega3_epa_dha_mg = Math.round((v.epa_dha_mg || 0) * f * 100) / 100;
                    }
                }
                enriquecido.cantidad_g = gramosCorregidos;
                console.log(`🎯 kcal exactas: "${ing.nombre}" → ${gramosCorregidos}g para ${ing.cantidad} kcal (${kcal100} kcal/100g reales)`);
            }
        }

        ingredientesEnriquecidos.push(enriquecido);
        // Se usa cantidad_g (posiblemente corregida) y no el gramo de densidad inicial
        pesoTotalGramos += enriquecido.cantidad_g;
    }

    // Si no hay ingredientes válidos, fallar
    if (ingredientesEnriquecidos.length === 0) {
        throw new Error('No se pudieron procesar ingredientes válidos');
    }

    // Avisar de ingredientes faltantes
    if (ingredientesFallidos.length > 0) {
        console.warn('⚠️ Ingredientes no procesados:', ingredientesFallidos);
    }

    // Calcular totales
    const totales = sumarNutrientes(ingredientesEnriquecidos);
    const valoresPor100g = calcularValoresPor100g(totales, pesoTotalGramos);

    return {
        ingredientesEnriquecidos,
        pesoTotalGramos,
        totales,
        valoresPor100g,
        ingredientesFallidos,
        precisacionProcesamiento: `${ingredientesEnriquecidos.length}/${datosExtraidos.ingredientes.length} ingredientes`
    };
};

// ═══════════════════════════════════════════════════════════════
// CREAR OBJETO PARA GUARDAR EN FIRESTORE
// ═══════════════════════════════════════════════════════════════

export const prepararRecetaParaGuardar = (recetaProcesada, descripcion, nombreReceta, porciones = 1) => {
    if (!recetaProcesada || !nombreReceta) {
        throw new Error('Datos insuficientes para guardar receta');
    }

    const { ingredientesEnriquecidos, pesoTotalGramos, totales, valoresPor100g } = recetaProcesada;
    const numPorciones = Math.max(1, Number(porciones) || 1);

    const camposMacro = ['calorias', 'proteinas', 'carbohidratos', 'grasas', 'fibra'];
    const camposMicro = [
        'sodio_mg', 'potasio_mg', 'magnesio_mg', 'calcio_mg', 'hierro_mg', 'zinc_mg',
        'vitamina_d_ui', 'vitamina_b12_mcg', 'omega3_ala_mg', 'omega3_epa_dha_mg'
    ];

    // Totales de macros de la receta COMPLETA (redondeados)
    const totalesCompleta = Object.fromEntries(
        camposMacro.map(c => [c, c === 'calorias'
            ? Math.round(totales[c] || 0)
            : Math.round((totales[c] || 0) * 10) / 10])
    );

    // Macros por porción = completas / porciones
    const totalesPorcion = Object.fromEntries(
        camposMacro.map(c => [c, Math.round((totalesCompleta[c] / numPorciones) * 10) / 10])
    );

    // Micros por porción (con omega3 aplanado desde el formato OFF o plano)
    const microsCompleta = {
        sodio_mg: totales.sodio_mg || 0,
        potasio_mg: totales.potasio_mg || 0,
        magnesio_mg: totales.magnesio_mg || 0,
        calcio_mg: totales.calcio_mg || 0,
        hierro_mg: totales.hierro_mg || 0,
        zinc_mg: totales.zinc_mg || 0,
        vitamina_d_ui: totales.vitamina_d_ui || 0,
        vitamina_b12_mcg: totales.vitamina_b12_mcg || 0,
        omega3_ala_mg: totales.omega3_ala_mg ?? totales.omega3?.ala_mg ?? 0,
        omega3_epa_dha_mg: totales.omega3_epa_dha_mg ?? totales.omega3?.epa_dha_mg ?? 0
    };
    const microsPorcion = Object.fromEntries(
        camposMicro.map(c => [c, Math.round((microsCompleta[c] / numPorciones) * 10) / 10])
    );

    return {
        nombre: nombreReceta.trim(),
        porciones_totales: numPorciones,
        descripcion: (descripcion || '').trim(),

        // Peso
        peso_total_g: pesoTotalGramos,
        peso_por_porcion_g: Math.round((pesoTotalGramos / numPorciones) * 100) / 100,

        // Ingredientes (formato canónico: cantidad_g + nutrientes_por_100g planos)
        ingredientes: ingredientesEnriquecidos.map(ing => {
            const por100 = ing.nutrientes_por_100g || {};
            return {
                nombre: ing.nombre,
                marca: ing.marca || null,
                cantidad_g: ing.cantidad_g,
                fuente: ing.fuente,
                nutrientes_por_100g: {
                    ...por100,
                    // Aplanamos omega3 si viene anidado (formato OpenFoodFacts)
                    omega3_ala_mg: por100.omega3_ala_mg ?? por100.omega3?.ala_mg ?? 0,
                    omega3_epa_dha_mg: por100.omega3_epa_dha_mg ?? por100.omega3?.epa_dha_mg ?? 0
                }
            };
        }),

        // Totales (macros) — completa y porción
        totales_macros_completa: totalesCompleta,
        totales_macros_porcion: totalesPorcion,

        // Totales (micros) por porción
        totales_micros_porcion: microsPorcion,

        // Por 100g (regla de 3)
        valores_por_100g: valoresPor100g,
        valores_por_porcion: Object.entries(valoresPor100g).reduce((acc, [key, valor]) => {
            acc[key] = Math.round(valor * (pesoTotalGramos / numPorciones) * 100) / 100;
            return acc;
        }, {}),

        // Metadata
        version: 1
    };
};

