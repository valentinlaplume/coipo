// src/utils/sugerencias-logic.js
// LÓGICA PURA del asistente de sugerencias — sin Firebase ni IA.
// Testeable directamente en Node (convención: mirror .mjs en temp).

// ═════════════════ INTENTS ═════════════════
export const INTENTOS = {
    QUE_COMER: 'QUE_COMER',                       // "¿Qué puedo comer?" (genérico)
    COMPLETAR_PROTEINA: 'COMPLETAR_PROTEINA',
    ENTRAR_EN_CALORIAS: 'ENTRAR_EN_CALORIAS',
    COMIDA_ACTUAL: 'COMIDA_ACTUAL',
    LIVIANO: 'LIVIANO',
    CENA_FINAL: 'CENA_FINAL',
    GUSTO: 'GUSTO',
    LIBRE: 'LIBRE',                               // texto libre (máx 100)
    ALTERNATIVA: 'ALTERNATIVA'                    // "no tengo un ingrediente"
};

export const MOMENTOS = ['desayuno', 'almuerzo', 'merienda', 'cena', 'snack'];

// Momento del día por hora local (0-23)
export const momentoPorHora = (hora) => {
    const h = Number(hora);
    if (h >= 6 && h < 11) return 'desayuno';
    if (h >= 11 && h < 16) return 'almuerzo';
    if (h >= 16 && h < 20) return 'merienda';
    return 'cena'; // 20:00 – 06:00
};

// ═════════════════ RESTANTES DEL DÍA ═════════════════
// plan: plan_nutricional del usuario — resumen: resumen_diario del día
export const calcularRestantes = (plan, resumen) => {
    const r2 = v => Math.round((Number(v) || 0) * 100) / 100;
    return {
        kcal: r2((Number(plan?.kcal) || 0) - (Number(resumen?.acumulado_calorias) || 0)),
        p: r2((Number(plan?.proteina) || 0) - (Number(resumen?.acumulado_proteinas) || 0)),
        c: r2((Number(plan?.carbos) || 0) - (Number(resumen?.acumulado_carbohidratos) || 0)),
        g: r2((Number(plan?.grasas) || 0) - (Number(resumen?.acumulado_grasas) || 0))
    };
};

// Opciones mínimas cuando resta < 100 kcal (sin IA, predefinidas)
export const OPCIONES_MINIMAS = [
    { nombre: 'Infusión (mate, té o café sin azúcar)', kcal: 2, p: 0.2, c: 0.4, g: 0 },
    { nombre: 'Fruta chica (mandarina o ½ manzana)', kcal: 45, p: 0.5, c: 11, g: 0.2 },
    { nombre: 'Yogur descremado chico (100 g)', kcal: 40, p: 4, c: 5, g: 0.5 }
];

// Piso de seguridad: el día nunca puede quedar bajo este mínimo
export const KCAL_MINIMAS_DIA = 1200;

/**
 * Gate principal: qué hace el asistente con el restante.
 * @returns {{accion: 'COMPLETADO'|'MINIMAS'|'IA', mensaje?: string, opciones?: Array}}
 */
export const evaluarRestante = (restante) => {
    if (!(Number(restante?.kcal) > 0)) {
        return { accion: 'COMPLETADO', mensaje: 'Ya completaste tus calorías de hoy' };
    }
    if (restante.kcal < 100) {
        return { accion: 'MINIMAS', opciones: OPCIONES_MINIMAS };
    }
    return { accion: 'IA' };
};

// Piso de seguridad: ninguna sugerencia puede dejar el día bajo el mínimo.
// Las sugerencias SOLO suman calorías, así que el único escenario riesgoso es
// cerrar el día con menos del piso: en ese caso se avisa con este mensaje.
export const mensajePiso = (kcalConsumidas, restanteKcal, piso = KCAL_MINIMAS_DIA) => {
    if ((Number(kcalConsumidas) || 0) < piso && (Number(restanteKcal) || 0) < 100) {
        return `Tu día todavía está por debajo del mínimo de ${piso} kcal: preferí algo con más energía que una infusión.`;
    }
    return null;
};

// ═════════════════ TEXTO LIBRE ═════════════════
// Máximo 100 caracteres, sin caracteres de control. Nada más.
export const sanitizarTextoLibre = (texto) => String(texto ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);

// ═════════════════ CONTEXTO (flujo guiado por botones) ═════════════════
// Preguntas que el asistente hace UNA POR UNA antes de consultar a la IA.
export const PREGUNTAS_CONTEXTO = [
    {
        clave: 'sabor',
        texto: '¿Te va algo dulce o salado?',
        opciones: [
            { v: 'dulce', l: 'Dulce' },
            { v: 'salado', l: 'Salado' },
            { v: 'indiferente', l: 'Me da igual' }
        ]
    },
    {
        clave: 'hambre',
        texto: '¿Cuánta hambre tenés ahora?',
        opciones: [
            { v: 'poca', l: 'Poca' },
            { v: 'media', l: 'Media' },
            { v: 'mucha', l: 'Mucha' }
        ]
    },
    {
        clave: 'ayuno',
        texto: '¿Ya rompiste el ayuno?',
        opciones: [
            { v: 'rompio', l: 'Ya comí' },
            { v: 'en_ayunas', l: 'Sigo en ayuno' }
        ]
    },
    {
        clave: 'entrenamiento',
        texto: '¿Cómo viene tu entrenamiento?',
        opciones: [
            { v: 'pre', l: 'Antes de entrenar' },
            { v: 'post', l: 'Después de entrenar' },
            { v: 'libre', l: 'No estoy entrenando' }
        ]
    }
];

// Qué preguntas aplican según el intent. El "ayuno" solo aplica temprano (hora < 13)
export const preguntasParaIntent = (intent, hora = new Date().getHours()) => {
    const todas = PREGUNTAS_CONTEXTO;
    switch (intent) {
        case INTENTOS.LIBRE:
        case INTENTOS.ALTERNATIVA:
            return []; // piden texto, no contexto
        case INTENTOS.GUSTO:
            return todas.filter(q => q.clave === 'sabor' || q.clave === 'hambre');
        case INTENTOS.LIVIANO:
            return todas.filter(q => q.clave === 'hambre' || q.clave === 'sabor');
        case INTENTOS.CENA_FINAL:
            return todas.filter(q => q.clave !== 'ayuno'); // de noche el ayuno no aplica
        default:
            // QUE_COMER / COMPLETAR_PROTEINA / ENTRAR_EN_CALORIAS / COMIDA_ACTUAL
            return Number(hora) < 13 ? todas : todas.filter(q => q.clave !== 'ayuno');
    }
};

// Sugerencia inicial de ayuno según hora (el usuario puede cambiarla).
// Antes del mediodía todavía no hubo desayuno → parece que sigue en ayuno.
export const deducirAyunoPorHora = (hora) =>
    (Number(hora) < 12) ? 'en_ayunas' : 'rompio';

// ═════════════════ RESTRICCIONES (filtro DURO local, nunca a la IA) ═════════════════
// Heurística por palabras clave en los NOMBRES de los ingredientes guardados.
export const REGLAS_RESTRICCIONES = {
    sin_lactosa: /(queso|leche|yogur|crema|manteca|lacteo|lactosa|muzzarella|mozzarella|ricotta|parmesano|requeson)/i,
    sin_gluten: /(fideos|pan |harina|pastaf|masa |tapa de tarta|gallet|cuscus|pancott|tallarines|spaghetti|pizza)/i,
    vegetariano: /(pollo|carne|milanesa|merluza|atun|pescado|salmon|jamon|chorizo|bondiol|langostino|camaron|almeja|pulpo|tuco)/i,
    vegano: /(pollo|carne|milanesa|merluza|atun|pescado|salmon|jamon|chorizo|queso|leche|yogur|crema |manteca|huevo|clara|yema|miel)/i,
    sin_frutos_secos: /(nuez|almendra|avellana|mani|castana|maranon|pecana|walnut)/i,
    sin_mariscos: /(langostino|camaron|mejillon|calamar|pulpo|marisco|almeja|reneguia)/i,
    sin_huevo: /(huevo|clara|yema|omelet|tortilla de|huevo duro)/i
};

// Restricciones que se derivan del tipo de dieta del onboarding
export const restriccionesDesdeTipoDieta = (tipoDieta) => {
    const t = String(tipoDieta || '').toLowerCase();
    if (t === 'vegano') return ['vegano'];
    if (t === 'vegetariano') return ['vegetariano'];
    return []; // omnívoro y pescetariano: sin reglas extra por defecto
};

// Combina lo que eligió el usuario en Perfil + lo derivado del tipo de dieta
export const restriccionesEfectivas = (userData) => {
    const propias = Array.isArray(userData?.restricciones) ? userData.restricciones : [];
    const derivadas = restriccionesDesdeTipoDieta(userData?.tipo_dieta);
    return [...new Set([...propias, ...derivadas])];
};

/**
 * FILTRO DURO: descarta recetas cuyo ALGUNO ingrediente nombre viola una restricción.
 * Se aplica SIEMPRE en el cliente, ANTES de armar el top para la IA.
 * Sin lista de ingredientes no se puede verificar → por seguridad se descarta.
 */
export const aplicarFiltrosRestricciones = (recetas, restricciones = []) => {
    const reglas = (restricciones || [])
        .map(r => REGLAS_RESTRICCIONES[r])
        .filter(Boolean);
    if (!reglas.length) return [...(recetas || [])];
    return (recetas || []).filter(rec => {
        const ingredientes = rec.ingredientes || [];
        if (!ingredientes.length) return false;
        return !ingredientes.some(ing => reglas.some(rx => rx.test(String(ing?.nombre || ''))));
    });
};

// ═════════════════ RECETAS USADAS HOY ═════════════════
// idsUsados: receta_id encontrados en las ingestas de hoy (alimentos[].receta_id)
export const excluirUsadasHoy = (recetas, idsUsados = []) => {
    const set = new Set((idsUsados || []).filter(Boolean).map(String));
    if (!set.size) return [...(recetas || [])];
    return (recetas || []).filter(r => !set.has(String(r.id)));
};

// ═════════════════ PRE-RANKING ═════════════════
// Ordena por cercanía al restante y al macro faltante del intent.
// Devuelve el top `limite` (por defecto 6) — SOLO eso viaja a la IA.
export const preRanking = (recetas, restante, intent, limite = 6) => {
    const objetivoKcal = intent === INTENTOS.LIVIANO
        ? Math.min(Number(restante?.kcal) || 0, 250)
        : Number(restante?.kcal) || 0;

    const puntuar = (r) => {
        const kcal = Number(r.kcal) || 0;
        const exceso = kcal > objetivoKcal ? (kcal - objetivoKcal) * 2 : 0;
        const cercania = -Math.abs(kcal - objetivoKcal);

        if (intent === INTENTOS.COMPLETAR_PROTEINA) {
            // Se acerca a lo que falta en kcal Y en proteína
            const distP = Math.abs((Number(r.p) || 0) - (Number(restante?.p) || 0));
            return cercania - distP * 15 - exceso;
        }
        if (intent === INTENTOS.LIVIANO) return cercania - kcal * 0.3 - exceso;
        if (intent === INTENTOS.GUSTO) return cercania + kcal * 0.1; // puede exceder (el aviso va en la nota)
        return cercania - exceso;
    };

    return [...(recetas || [])]
        .map(r => ({ r, s: puntuar(r) }))
        .sort((a, b) => b.s - a.s)
        .slice(0, Math.max(1, limite))
        .map(x => x.r);
};

// Forma compacta de las recetas para el payload de la IA
export const recetasParaPayload = (recetas) => (recetas || []).map(r => ({
    id: r.id,
    n: r.nombre,
    kcal: Math.round(Number(r.kcal) || 0),
    p: Math.round((Number(r.p) || 0) * 10) / 10,
    c: Math.round((Number(r.c) || 0) * 10) / 10,
    g: Math.round((Number(r.g) || 0) * 10) / 10
}));

// Normaliza una receta de Firestore a {id,n,kcal,p,c,g} (valores POR PORCIÓN)
export const valorarReceta = (r) => {
    const porcion = r?.totales_macros_porcion || {};
    const kcal = Number(porcion.calorias) || 0;
    if (kcal > 0) {
        return {
            id: r.id, nombre: r.nombre, kcal,
            p: Number(porcion.proteinas) || 0,
            c: Number(porcion.carbohidratos) || 0,
            g: Number(porcion.grasas) || 0
        };
    }
    // Fallback: completa / porciones
    const completa = r?.totales_macros_completa || {};
    const porciones = Number(r?.porciones_totales) || 1;
    return {
        id: r.id, nombre: r.nombre,
        kcal: (Number(completa.calorias) || 0) / porciones,
        p: (Number(completa.proteinas) || 0) / porciones,
        c: (Number(completa.carbohidratos) || 0) / porciones,
        g: (Number(completa.grasas) || 0) / porciones
    };
};

export const objetivoDesdeUsuario = (userData) => {
    const o = String(userData?.objetivo || '').toLowerCase();
    if (o.includes('perder')) return 'deficit';
    if (o.includes('volumen') || o.includes('musculo')) return 'superavit';
    return 'mantener';
};

// ═════════════════ PAYLOAD PARA LA IA ═════════════════
// JSON compacto — la IA NUNCA calcula macros de recetas guardadas.
export const construirPayloadIA = ({ intent, momento, objetivo, contexto, restante, restricciones, recetas, textoLibre = '' }) => ({
    intent,
    momento,
    objetivo: objetivo || 'mantener',
    contexto: {
        sabor: contexto?.sabor || 'indiferente',
        hambre: contexto?.hambre || 'media',
        ayuno: contexto?.ayuno || 'rompio',
        entrenamiento: contexto?.entrenamiento || 'libre'
    },
    restante: {
        kcal: Math.round(Number(restante?.kcal) || 0),
        p: Math.round(Number(restante?.p) || 0),
        c: Math.round(Number(restante?.c) || 0),
        g: Math.round(Number(restante?.g) || 0)
    },
    restricciones: restricciones || [],
    recetas: recetas || [],
    texto_libre: sanitizarTextoLibre(textoLibre)
});

// ═════════════════ PARSEO DE LA RESPUESTA DE LA IA ═════════════════
const FACTORES_VALIDOS = [0.5, 0.75, 1, 1.25, 1.5];

export const parsearRespuestaIA = (data) => {
    if (!data || typeof data !== 'object') throw new Error('RESPUESTA_INVALIDA');

    // Errores temáticos que la IA puede devolver
    if (data.error === 'fuera_de_tema' || data.error === 'consulta_profesional') {
        return { error: data.error };
    }

    const sugerencias = (Array.isArray(data.sugerencias) ? data.sugerencias : [])
        .filter(s => s && s.receta_id != null && s.factor != null)
        .map(s => ({
            receta_id: s.receta_id,
            factor: FACTORES_VALIDOS.includes(Number(s.factor)) ? Number(s.factor) : 1,
            motivo: String(s.motivo || '').slice(0, 120)
        }))
        .slice(0, 3);

    let libre = null;
    if (data.libre && typeof data.libre === 'object' && data.libre.nombre) {
        libre = {
            nombre: String(data.libre.nombre).slice(0, 60),
            kcal: Math.max(0, Number(data.libre.kcal) || 0),
            p: Math.max(0, Number(data.libre.p) || 0),
            c: Math.max(0, Number(data.libre.c) || 0),
            g: Math.max(0, Number(data.libre.g) || 0),
            estimado: true,
            entra: data.libre.entra !== false,
            motivo: String(data.libre.motivo || '').slice(0, 120)
        };
    }

    const nota = data.nota ? String(data.nota).slice(0, 200) : '';

    if (!sugerencias.length && !libre && !nota) throw new Error('RESPUESTA_INVALIDA');
    return { sugerencias, libre, nota };
};

// ═════════════════ REGLA DE TRES (porción sugerida → gramos) ═════════════════
// Mismo criterio que "Usar Receta": gramos = peso_por_porción × factor
export const gramosPorFactor = (receta, factor) => {
    const f = Number(factor) || 1;
    const pesoTotal = Number(receta?.peso_total_g) || 0;
    const porciones = Number(receta?.porciones_totales) || 1;
    const pesoPorcion = Number(receta?.peso_por_porcion_g) > 0
        ? Number(receta.peso_por_porcion_g)
        : (pesoTotal > 0 ? pesoTotal / porciones : 0);
    if (pesoPorcion <= 0) return 0;
    return Math.round(pesoPorcion * f * 100) / 100;
};

// Caché: misma intención + mismo restante (múltiplos de 50 kcal) → reusar respuesta
export const claveCache = (intent, restanteKcal) =>
    `${intent}§${Math.round((Number(restanteKcal) || 0) / 50)}`;
