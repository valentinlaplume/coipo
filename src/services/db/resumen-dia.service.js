// src/services/db/resumen-dia.service.js
// Reparación del resumen diario: relee TODAS las comidas del día y reescribe
// `resumen_diario` con la suma real. No se usa en el camino caliente (ahí
// mandan los incrementos); sirve para corregir descuadres por escrituras
// interrumpidas o datos viejos.

import { db } from '../../firebase-config.js';
import {
    doc,
    collection,
    getDoc,
    getDocs,
    setDoc,
    serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';
import {
    calcularResumenDia,
    diferenciasResumen,
    prepararResumenParaGuardar,
} from './resumen-dia.logic.mjs';

/**
 * Recalcula y guarda `usuarios/{uid}/resumen_diario/{dateKey}` a partir de
 * `usuarios/{uid}/ingestas_diarias/{dateKey}/comidas`.
 * Conserva `vasos_agua` (no se deriva de las comidas).
 *
 * @param {string} userId
 * @param {string} dateKey YYYY-MM-DD (hora local)
 * @param {{resumenPrevio?: Object, ingestas?: Array}} [opciones]
 *   `ingestas`: comidas ya cargadas en caché; evita el getDocs de la reparación
 *   automática. `resumenPrevio`: evita además el getDoc del resumen.
 * @returns {Promise<{resumen: Object, anterior: Object, diferencias: Array, corregido: boolean}>}
 */
export const recalcularResumenDia = async (
    userId,
    dateKey,
    { resumenPrevio = null, ingestas = null } = {},
) => {
    const comidasRef = collection(db, 'usuarios', userId, 'ingestas_diarias', dateKey, 'comidas');
    const resumenRef = doc(db, 'usuarios', userId, 'resumen_diario', dateKey);
    const ingestasEnCache = Array.isArray(ingestas) ? [...ingestas] : null;

    // El chequeo automático ya tiene las comidas en caché: no se vuelven a leer.
    // El resumen sí se relee (salvo que venga en `resumenPrevio`) para no pisar
    // los vasos de agua con una copia vieja.
    const [comidasSnap, resumenSnap] = await Promise.all([
        ingestasEnCache ? Promise.resolve(null) : getDocs(comidasRef),
        resumenPrevio ? Promise.resolve(null) : getDoc(resumenRef),
    ]);

    const anterior = resumenPrevio ?? (resumenSnap?.exists() ? resumenSnap.data() : {});
    const comidas = ingestasEnCache ?? comidasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const calculado = calcularResumenDia(comidas);
    const resumen = prepararResumenParaGuardar(calculado, anterior);
    const diferencias = diferenciasResumen(anterior, calculado);

    // setDoc completo (sin merge): el resumen es derivable y no debe arrastrar
    // acumulados viejos. Los campos desconocidos quedan en `null`.
    await setDoc(resumenRef, {
        ...resumen,
        // El historial distingue "sin comidas" de un día con comidas de 0 kcal.
        comidas_count: comidas.length,
        ultima_actualizacion: serverTimestamp(),
    });

    return { resumen, anterior, diferencias, corregido: diferencias.length > 0 };
};
