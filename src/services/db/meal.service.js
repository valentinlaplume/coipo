import { db } from '../../firebase-config.js';
import { 
    doc, 
    collection, 
    addDoc, 
    setDoc, updateDoc, getDocs,
    increment, 
    serverTimestamp, 
    deleteDoc,
     
} from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';


// ─────────────────────────────────────────────────────────────
// FASE 1: Guardar macros inmediatamente
// Devuelve el docId para que la fase 2 pueda enriquecer el mismo documento
// ─────────────────────────────────────────────────────────────
export const crearRegistroComida = async (userId, datosMacros, fechaISO, foodDescription = '') => {
    try {
        // Usamos la fecha que llega por parámetro, o fallback a hoy
        const dateKey = fechaISO || new Date().toISOString().split('T')[0];
        const ingestasRef = collection(db, 'usuarios', userId, 'ingestas_diarias', dateKey, 'comidas');
        const resumenRef  = doc(db, 'usuarios', userId, 'resumen_diario', dateKey);

        const { items } = datosMacros;

        const redondear = (num) => Number(Math.round(num + "e+2") + "e-2");

        // Suma solo valores conocidos: si NINGÚN ítem trae el dato, el total es
        // null (desconocido ≠ 0). Los macros siempre son numéricos.
        const sumar = (valores) => {
            const nums = valores.filter(v => typeof v === 'number' && isFinite(v));
            return nums.length ? redondear(nums.reduce((a, b) => a + b, 0)) : null;
        };

        const totales = {
            total_calorias:      redondear(items.reduce((s, i) => s + (Number(i.calorias)      || 0), 0)),
            total_proteinas:     redondear(items.reduce((s, i) => s + (Number(i.proteinas)     || 0), 0)),
            total_carbohidratos: redondear(items.reduce((s, i) => s + (Number(i.carbohidratos) || 0), 0)),
            total_grasas:        redondear(items.reduce((s, i) => s + (Number(i.grasas)        || 0), 0)),
            total_fibra:         sumar(items.map(i => i.fibra)),
            confianza_general:   items.some(i => i.confianza === 'baja')  ? 'baja'  :
                                 items.some(i => i.confianza === 'media') ? 'media' : 'alta'
        };

        const hayPorcionReceta = items.some(i => i.porcion_de_receta === true);

        console.log("📊 Totales recalculados:", totales);

        const docRef = await addDoc(ingestasRef, {
            alimentos:          items,
            resumen_macros:     totales,
            resumen_micros:     null,
            micros_completos:   false,
            confianza_general:  totales.confianza_general,
            formato:            "texto",
            // Guardamos el texto original — útil para depurar y para reintentar micros
            descripcion_original: foodDescription,
            // Flag para saber si necesita lógica especial de micros
            es_porcion_receta:  hayPorcionReceta,
            creado_el:          serverTimestamp()
        });

        const acumulados = {
            acumulado_calorias:      increment(totales.total_calorias),
            acumulado_proteinas:     increment(totales.total_proteinas),
            acumulado_carbohidratos: increment(totales.total_carbohidratos),
            acumulado_grasas:        increment(totales.total_grasas),
            ultima_actualizacion:    serverTimestamp()
        };
        // Sin dato de fibra no se toca el acumulado (nunca sumar 0).
        if (totales.total_fibra !== null) {
            acumulados.acumulado_fibra = increment(totales.total_fibra);
        }
        await setDoc(resumenRef, acumulados, { merge: true });

        return docRef.id;

    } catch (error) {
        console.error("Error en crearRegistroComida:", error);
        throw error;
    }
};

// ─────────────────────────────────────────────────────────────
// FASE 2: Enriquecer el mismo documento con micros (background)
// ─────────────────────────────────────────────────────────────
export const enriquecerRegistroConMicros = async (userId, dateKey, docId, datosMicros) => {
    try {
        const ingestaRef = doc(db, 'usuarios', userId, 'ingestas_diarias', dateKey, 'comidas', docId);
        const resumenRef = doc(db, 'usuarios', userId, 'resumen_diario', dateKey);

        const { items_micros } = datosMicros; // Ignoramos totales_micros de la IA
        
        const redondear = (num) => Number(Math.round(num + "e+2") + "e-2");

        // Solo valores conocidos: si ningún ítem trae el micro, queda null
        // (la UI lo muestra como "—"; nunca se suma 0 por desconocido).
        const sumar = (valores) => {
            const nums = valores.filter(v => typeof v === 'number' && isFinite(v));
            return nums.length ? redondear(nums.reduce((a, b) => a + b, 0)) : null;
        };

        // Recalculamos matemáticamente perfectos
        const totalesCalculados = {
            total_sodio_mg:         sumar(items_micros.map(i => i.sodio_mg)),
            total_potasio_mg:       sumar(items_micros.map(i => i.potasio_mg)),
            total_magnesio_mg:      sumar(items_micros.map(i => i.magnesio_mg)),
            total_calcio_mg:        sumar(items_micros.map(i => i.calcio_mg)),
            total_hierro_mg:        sumar(items_micros.map(i => i.hierro_mg)),
            total_zinc_mg:          sumar(items_micros.map(i => i.zinc_mg)),
            total_vitamina_d_ui:    sumar(items_micros.map(i => i.vitamina_d_ui)),
            total_vitamina_b12_mcg: sumar(items_micros.map(i => i.vitamina_b12_mcg)),
            total_omega3: {
                ala_mg:     sumar(items_micros.map(i => i.omega3?.ala_mg)),
                epa_dha_mg: sumar(items_micros.map(i => i.omega3?.epa_dha_mg))
            }
        };

        // 1. Enriquecer la ingesta individual
        await updateDoc(ingestaRef, {
            items_micros:    items_micros, 
            resumen_micros:  totalesCalculados,
            micros_completos: true 
        });

        // 2. Acumular micros en el resumen del día (solo los conocidos)
        const acumulados = { ultima_actualizacion: serverTimestamp() };
        const micros = {
            acumulado_sodio_mg:         totalesCalculados.total_sodio_mg,
            acumulado_potasio_mg:       totalesCalculados.total_potasio_mg,
            acumulado_magnesio_mg:      totalesCalculados.total_magnesio_mg,
            acumulado_calcio_mg:        totalesCalculados.total_calcio_mg,
            acumulado_hierro_mg:        totalesCalculados.total_hierro_mg,
            acumulado_zinc_mg:          totalesCalculados.total_zinc_mg,
            acumulado_vitamina_d_ui:    totalesCalculados.total_vitamina_d_ui,
            acumulado_vitamina_b12_mcg: totalesCalculados.total_vitamina_b12_mcg,
            acumulado_omega3_ala_mg:    totalesCalculados.total_omega3.ala_mg,
            acumulado_omega3_epa_dha_mg:totalesCalculados.total_omega3.epa_dha_mg
        };
        for (const [campo, valor] of Object.entries(micros)) {
            if (valor !== null) acumulados[campo] = increment(valor);
        }
        await setDoc(resumenRef, acumulados, { merge: true });

        console.log("✅ Micros enriquecidos matemáticamente en background para doc:", docId);

    } catch (error) {
        console.warn("⚠️ Error al enriquecer micros (no crítico):", error);
    }
};

// **
//  * Elimina una ingesta y resta los valores del resumen diario
//  */
export const eliminarIngesta = async (userId, dateKey, ingesta) => {
    try {
        // 1. Referencias
        const comidasColeccionRef = collection(db, 'usuarios', userId, 'ingestas_diarias', dateKey, 'comidas');
        const ingestaRef = doc(db, 'usuarios', userId, 'ingestas_diarias', dateKey, 'comidas', ingesta.id);
        const resumenRef = doc(db, 'usuarios', userId, 'resumen_diario', dateKey);

        // 2. Borrar el documento de la comida individual
        await deleteDoc(ingestaRef);

        // 3. Consultar cuántas comidas quedan ahora en el día
        const snapshot = await getDocs(comidasColeccionRef);
        
        // Micros de la ingesta a restar (si los tenía calculados)
        const microsIngesta = (ingesta.micros_completos && ingesta.resumen_micros) ? ingesta.resumen_micros : null;

        if (snapshot.empty) {
            // SI NO QUEDAN COMIDAS: Reseteamos todo a cero absoluto
            await updateDoc(resumenRef, {
                acumulado_calorias: 0,
                acumulado_proteinas: 0,
                acumulado_carbohidratos: 0,
                acumulado_grasas: 0,
                acumulado_fibra: 0,
                acumulado_sodio_mg: 0,
                acumulado_potasio_mg: 0,
                acumulado_magnesio_mg: 0,
                acumulado_calcio_mg: 0,
                acumulado_hierro_mg: 0,
                acumulado_zinc_mg: 0,
                acumulado_vitamina_d_ui: 0,
                acumulado_vitamina_b12_mcg: 0,
                acumulado_omega3_ala_mg: 0,
                acumulado_omega3_epa_dha_mg: 0
            });
            console.log("Última comida eliminada. Resumen reseteado a 0.");
        } else {
            // SI TODAVÍA QUEDAN COMIDAS: Restamos normalmente (macros + micros).
            // Los campos null (sin dato) NO se tocan: no se escribe un 0 falso.
            const macros = ingesta.resumen_macros || {};
            const updates = {
                acumulado_calorias: increment(-(macros.total_calorias || 0)),
                acumulado_proteinas: increment(-(macros.total_proteinas || 0)),
                acumulado_carbohidratos: increment(-(macros.total_carbohidratos || 0)),
                acumulado_grasas: increment(-(macros.total_grasas || 0))
            };
            if (typeof macros.total_fibra === 'number') {
                updates.acumulado_fibra = increment(-macros.total_fibra);
            }

            if (microsIngesta) {
                const micros = {
                    acumulado_sodio_mg: microsIngesta.total_sodio_mg,
                    acumulado_potasio_mg: microsIngesta.total_potasio_mg,
                    acumulado_magnesio_mg: microsIngesta.total_magnesio_mg,
                    acumulado_calcio_mg: microsIngesta.total_calcio_mg,
                    acumulado_hierro_mg: microsIngesta.total_hierro_mg,
                    acumulado_zinc_mg: microsIngesta.total_zinc_mg,
                    acumulado_vitamina_d_ui: microsIngesta.total_vitamina_d_ui,
                    acumulado_vitamina_b12_mcg: microsIngesta.total_vitamina_b12_mcg,
                    acumulado_omega3_ala_mg: microsIngesta.total_omega3?.ala_mg,
                    acumulado_omega3_epa_dha_mg: microsIngesta.total_omega3?.epa_dha_mg
                };
                for (const [campo, valor] of Object.entries(micros)) {
                    if (typeof valor === 'number') updates[campo] = increment(-valor);
                }
            }

            await updateDoc(resumenRef, updates);
        }

        return true;
    } catch (error) {
        console.error("Error al eliminar ingesta:", error);
        throw error;
    }
};

/**
 * DESHACER un borrado: re-crea la ingesta (id nuevo) y devuelve sus macros y
 * micros al resumen del día. Espejo exacto de eliminarIngesta, en positivo.
 */
export const restaurarIngesta = async (userId, dateKey, ingesta) => {
    try {
        const { id, ...datos } = ingesta; // el id viejo no se reutiliza (addDoc genera uno nuevo)
        const comidasRef = collection(db, 'usuarios', userId, 'ingestas_diarias', dateKey, 'comidas');
        const resumenRef = doc(db, 'usuarios', userId, 'resumen_diario', dateKey);

        await addDoc(comidasRef, datos);

        const microsIngesta = (ingesta.micros_completos && ingesta.resumen_micros) ? ingesta.resumen_micros : null;
        // Igual que al eliminar: los null (sin dato) no se suman como 0.
        const macros = ingesta.resumen_macros || {};
        const updates = {
            acumulado_calorias: increment(macros.total_calorias || 0),
            acumulado_proteinas: increment(macros.total_proteinas || 0),
            acumulado_carbohidratos: increment(macros.total_carbohidratos || 0),
            acumulado_grasas: increment(macros.total_grasas || 0)
        };
        if (typeof macros.total_fibra === 'number') {
            updates.acumulado_fibra = increment(macros.total_fibra);
        }

        if (microsIngesta) {
            const micros = {
                acumulado_sodio_mg: microsIngesta.total_sodio_mg,
                acumulado_potasio_mg: microsIngesta.total_potasio_mg,
                acumulado_magnesio_mg: microsIngesta.total_magnesio_mg,
                acumulado_calcio_mg: microsIngesta.total_calcio_mg,
                acumulado_hierro_mg: microsIngesta.total_hierro_mg,
                acumulado_zinc_mg: microsIngesta.total_zinc_mg,
                acumulado_vitamina_d_ui: microsIngesta.total_vitamina_d_ui,
                acumulado_vitamina_b12_mcg: microsIngesta.total_vitamina_b12_mcg,
                acumulado_omega3_ala_mg: microsIngesta.total_omega3?.ala_mg,
                acumulado_omega3_epa_dha_mg: microsIngesta.total_omega3?.epa_dha_mg
            };
            for (const [campo, valor] of Object.entries(micros)) {
                if (typeof valor === 'number') updates[campo] = increment(valor);
            }
        }

        await updateDoc(resumenRef, updates);
        return true;
    } catch (error) {
        console.error("Error al restaurar ingesta:", error);
        throw error;
    }
};

/**
 * Actualiza el contador de vasos de agua
 * @param {string} userId - ID del usuario
 * @param {string} dateKey - Fecha en formato YYYY-MM-DD
 * @param {number} cambio - 1 para sumar, -1 para restar
 */
export const actualizarHidratacion = async (userId, dateKey, cambio) => {
    try {
        const resumenRef = doc(db, 'usuarios', userId, 'resumen_diario', dateKey);

        await setDoc(resumenRef, {
            // Si no existe el campo, increment lo trata como 0
            vasos_agua: increment(cambio),
            ultima_actualizacion: serverTimestamp()
        }, { merge: true });

        return true;
    } catch (error) {
        console.error("Error al actualizar hidratación:", error);
        throw error;
    }
};