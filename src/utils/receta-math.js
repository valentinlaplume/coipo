// src/utils/receta-math.js
// Matemática PURA de recetas — regla de 3 por gramos.
// Sin dependencias (ni Firebase ni IA) → testeable directamente en Node.

/**
 * Peso total en gramos de una receta.
 * Prioridad: peso_total_g guardado → suma de ingredientes (cantidad_g) → 0
 * @param {Object} receta
 * @returns {number} gramos (0 si no se puede determinar)
 */
export const obtenerPesoTotalReceta = (receta) => {
    const guardado = Number(receta?.peso_total_g);
    if (Number.isFinite(guardado) && guardado > 0) return Math.round(guardado * 100) / 100;

    // Fallback: suma de ingredientes (cantidad_g; `cantidad` = formato viejo)
    const suma = (receta?.ingredientes || []).reduce(
        (s, i) => s + (Number(i?.cantidad_g ?? i?.cantidad) || 0),
        0
    );
    return Math.round(suma * 100) / 100;
};

/**
 * REGLA DE 3 SIMPLE: proporción de la receta consumida según los gramos indicados.
 *
 *   factor = gramos_consumidos / peso_total_receta
 *   macros = totales_receta_completa × factor
 *   micros = (micros_porción × porciones_totales) × factor
 *
 * Los gramos deben estar en la MISMA BASE que la receta (ingrediente en crudo).
 *
 * @param {Object} receta - receta guardada en Firestore
 * @param {number} gramosConsumidos - gramos de la porción que se comió
 * @returns {{factor:number, gramos:number, peso_total_g:number, macros:Object, micros:Object}}
 */
export const calcularIngestaDesdeGramos = (receta, gramosConsumidos) => {
    const gramos = Number(gramosConsumidos);
    if (!Number.isFinite(gramos) || gramos <= 0) {
        throw new Error('Los gramos consumidos deben ser mayores a 0');
    }

    const pesoTotal = obtenerPesoTotalReceta(receta);
    if (pesoTotal <= 0) {
        throw new Error('La receta no tiene peso registrado. Volvé a crearla con "Nueva Receta".');
    }

    const factor = gramos / pesoTotal;
    const r2 = v => Math.round(v * 100) / 100;

    // ── MACROS: totales de la receta COMPLETA × factor ──
    const baseMacro = receta.totales_macros_completa || receta.totales_macros;
    const porcionMacro = receta.totales_macros_porcion;
    const escalarMacro = (campo) => {
        if (baseMacro) return (Number(baseMacro[campo]) || 0) * factor;
        // Fallback (recetas viejas sin totales completos): porción × (gramos / peso porción)
        if (porcionMacro) {
            const porciones = Number(receta.porciones_totales) || 1;
            const pesoPorcion = pesoTotal / porciones;
            return (Number(porcionMacro[campo]) || 0) * (pesoPorcion > 0 ? gramos / pesoPorcion : 0);
        }
        return 0;
    };

    const macros = {
        total_calorias: r2(escalarMacro('calorias')),
        total_proteinas: r2(escalarMacro('proteinas')),
        total_carbohidratos: r2(escalarMacro('carbohidratos')),
        total_grasas: r2(escalarMacro('grasas')),
        total_fibra: r2(escalarMacro('fibra'))
    };

    // ── MICROS: guardados POR PORCIÓN → total = porción × porciones × factor ──
    const porciones = Number(receta.porciones_totales) || 1;
    const microsPorcion = receta.totales_micros_porcion || receta.totales_micros || {};
    const escalarMicro = (campo) => r2((Number(microsPorcion[campo]) || 0) * porciones * factor);

    const micros = {
        total_sodio_mg: escalarMicro('sodio_mg'),
        total_potasio_mg: escalarMicro('potasio_mg'),
        total_magnesio_mg: escalarMicro('magnesio_mg'),
        total_calcio_mg: escalarMicro('calcio_mg'),
        total_hierro_mg: escalarMicro('hierro_mg'),
        total_zinc_mg: escalarMicro('zinc_mg'),
        total_vitamina_d_ui: escalarMicro('vitamina_d_ui'),
        total_vitamina_b12_mcg: escalarMicro('vitamina_b12_mcg'),
        total_omega3: {
            ala_mg: escalarMicro('omega3_ala_mg'),
            epa_dha_mg: escalarMicro('omega3_epa_dha_mg')
        }
    };

    return {
        factor: Math.round(factor * 1e6) / 1e6,
        gramos,
        peso_total_g: pesoTotal,
        macros,
        micros
    };
};

/**
 * Convierte la salida de analizarComida() en un bloque de extras sumable:
 * items (para mostrar en la ingesta) + macros y micros totales.
 *
 * @param {Object} datosExtras - resultado de `await rapido` de analizarComida()
 * @param {Object|null} microsExtras - resultado de `await microsPromise` (puede fallar)
 * @returns {{items, macros, micros, con_micros}}
 */
export const prepararExtrasParaIngesta = (datosExtras, microsExtras) => {
    const items = Array.isArray(datosExtras?.items) ? datosExtras.items : [];
    if (items.length === 0) {
        throw new Error('No se pudieron analizar los ingredientes extra');
    }

    const r2 = v => Math.round(v * 100) / 100;
    const sumaItem = campo => r2(items.reduce((s, i) => s + (Number(i[campo]) || 0), 0));

    const macros = {
        total_calorias: sumaItem('calorias'),
        total_proteinas: sumaItem('proteinas'),
        total_carbohidratos: sumaItem('carbohidratos'),
        total_grasas: sumaItem('grasas'),
        total_fibra: sumaItem('fibra')
    };

    // Micros: pueden no estar (fase 2 falló) → en ese caso solo suman los macros
    const itemsMicros = Array.isArray(microsExtras?.items_micros) ? microsExtras.items_micros : [];
    const sumaMicro = campo => r2(itemsMicros.reduce((s, m) => s + (Number(m[campo]) || 0), 0));

    const micros = {
        total_sodio_mg: sumaMicro('sodio_mg'),
        total_potasio_mg: sumaMicro('potasio_mg'),
        total_magnesio_mg: sumaMicro('magnesio_mg'),
        total_calcio_mg: sumaMicro('calcio_mg'),
        total_hierro_mg: sumaMicro('hierro_mg'),
        total_zinc_mg: sumaMicro('zinc_mg'),
        total_vitamina_d_ui: sumaMicro('vitamina_d_ui'),
        total_vitamina_b12_mcg: sumaMicro('vitamina_b12_mcg'),
        total_omega3: {
            ala_mg: r2(itemsMicros.reduce((s, m) => s + (Number(m?.omega3?.ala_mg) || 0), 0)),
            epa_dha_mg: r2(itemsMicros.reduce((s, m) => s + (Number(m?.omega3?.epa_dha_mg) || 0), 0))
        }
    };

    return { items, macros, micros, con_micros: itemsMicros.length > 0 };
};

/**
 * Arma la ingesta COMPLETA de "Usar Receta": porción de la receta (regla de 3)
 * + ingredientes extras opcionales, todo en un solo registro.
 *
 * @param {Object} receta - receta guardada
 * @param {number} gramos - gramos consumidos de la receta (misma base que la receta)
 * @param {Object|null} extras - salida de prepararExtrasParaIngesta()
 * @returns {{alimentos: Array, macros: Object, micros: Object}}
 */
export const construirIngestaCompleta = (receta, gramos, extras = null) => {
    const ingesta = calcularIngestaDesdeGramos(receta, gramos);
    const r2 = v => Math.round(v * 100) / 100;
    const factor = ingesta.factor;

    const macros = { ...ingesta.macros };
    const micros = { ...ingesta.micros, total_omega3: { ...ingesta.micros.total_omega3 } };

    // ── DESGLOSE: cada ingrediente de la receta escalado al factor de porción ──
    // Así la ingesta guardada muestra ingrediente por ingrediente (con su marca),
    // no un bloque único "Receta X g".
    const ingredientes = Array.isArray(receta.ingredientes) ? receta.ingredientes : [];
    const alimentos = ingredientes.map(ing => {
        const p100 = ing.nutrientes_por_100g || {};
        const gProporcion = r2((Number(ing.cantidad_g ?? ing.cantidad) || 0) * factor);
        const escalar = k => r2((Number(p100[k]) || 0) * gProporcion / 100);
        return {
            alimento: ing.nombre,
            ...(ing.marca ? { marca: ing.marca } : {}),
            gramos_estimados: gProporcion,
            calorias: escalar('calorias'),
            proteinas: escalar('proteinas'),
            carbohidratos: escalar('carbohidratos'),
            grasas: escalar('grasas'),
            fibra: escalar('fibra'),
            es_ingrediente_receta: true,
            receta_id: receta.id
        };
    });

    // Compatibilidad: recetas viejas sin desglose de ingredientes → ítem único
    if (alimentos.length === 0) {
        alimentos.push({
            alimento: receta.nombre,
            gramos_estimados: ingesta.gramos,
            calorias: macros.total_calorias,
            proteinas: macros.total_proteinas,
            carbohidratos: macros.total_carbohidratos,
            grasas: macros.total_grasas,
            fibra: macros.total_fibra,
            es_receta: true,
            receta_id: receta.id
        });
    }

    if (extras?.items?.length) {
        // Los extras entran como ítems propios (con su gramo, macros y marca)
        for (const it of extras.items) {
            alimentos.push({
                alimento: it.alimento,
                ...(it.marca ? { marca: it.marca } : {}),
                gramos_estimados: it.gramos_estimados || 0,
                calorias: it.calorias || 0,
                proteinas: it.proteinas || 0,
                carbohidratos: it.carbohidratos || 0,
                grasas: it.grasas || 0,
                fibra: it.fibra || 0
            });
        }

        // Macros: porción + extras
        for (const k of Object.keys(macros)) {
            macros[k] = r2(macros[k] + (Number(extras.macros?.[k]) || 0));
        }

        // Micros: solo si la fase 2 de extras respondió
        if (extras.con_micros) {
            for (const k of Object.keys(micros)) {
                if (k === 'total_omega3') {
                    micros.total_omega3.ala_mg = r2(micros.total_omega3.ala_mg + (Number(extras.micros?.total_omega3?.ala_mg) || 0));
                    micros.total_omega3.epa_dha_mg = r2(micros.total_omega3.epa_dha_mg + (Number(extras.micros?.total_omega3?.epa_dha_mg) || 0));
                } else {
                    micros[k] = r2(micros[k] + (Number(extras.micros?.[k]) || 0));
                }
            }
        }
    }

    return { alimentos, macros, micros };
};
