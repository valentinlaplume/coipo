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
 * @param {{resumenPrevio?: Object}} [opciones] resumenPrevio evita el getDoc
 * @returns {Promise<{resumen: Object, anterior: Object, diferencias: Array, corregido: boolean}>}
 */
export const recalcularResumenDia = async (userId, dateKey, { resumenPrevio = null } = {}) => {
    const comidasRef = collection(db, 'usuarios', userId, 'ingestas_diarias', dateKey, 'comidas');
    const resumenRef = doc(db, 'usuarios', userId, 'resumen_diario', dateKey);

    const [comidasSnap, resumenSnap] = await Promise.all([
        getDocs(comidasRef),
        resumenPrevio ? Promise.resolve(null) : getDoc(resumenRef),
    ]);

    const anterior = resumenPrevio ?? (resumenSnap?.exists() ? resumenSnap.data() : {});
    const ingestas = comidasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const calculado = calcularResumenDia(ingestas);
    const resumen = prepararResumenParaGuardar(calculado, anterior);
    const diferencias = diferenciasResumen(anterior, calculado);

    // setDoc completo (sin merge): el resumen es derivable y no debe arrastrar
    // acumulados viejos. Los campos desconocidos quedan en `null`.
    await setDoc(resumenRef, {
        ...resumen,
        ultima_actualizacion: serverTimestamp(),
    });

    return { resumen, anterior, diferencias, corregido: diferencias.length > 0 };
};
