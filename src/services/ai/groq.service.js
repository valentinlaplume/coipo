// src/ai/groq.service.js
//
// ⚠️ Sin keys en el cliente: todas las llamadas salen por /api/sugerencias con
//    el ID token de Firebase Auth (ver ia-client.js). La rotación de keys y
//    modelos vive en el servidor (netlify/functions/sugerencias.js), que rota
//    ante 429 / 401 / 5xx / error de red / timeout de 10s.

import {
    GROQ_ESQUEMA_RAPIDO,
    GROQ_ESQUEMA_MICROS,
    GROQ_ESQUEMA_COMIDA_COMPLETO,
    GROQ_ESQUEMA_RECETA,
    schemaToPromptExample
} from './schemas.js';
import { PROMPTS_SISTEMA } from './prompts.js'; // mismos prompts que Gemini
import { buscarProductoPorNombreSimilar } from '../openfoodfacts.service.js';
import { pedirIA, estadoIA } from './ia-client.js';

// ==============================================================================
// 1. ESTADO DE SATURACIÓN — interfaz histórica que usa el dashboard
// Antes era el GroqKeyManager local (con las keys en el cliente). Ahora el
// servidor avisa con 429 + Retry-After y estadoIA conserva ese estado.
// ==============================================================================
export const groqKeyManager = {
    allOnCooldown: () => estadoIA.allOnCooldown(),
    msUntilNextKey: () => estadoIA.msUntilNextKey()
};

// ==============================================================================
// 2. TIPOS DE PETICIÓN — misma whitelist que netlify/functions/sugerencias.js
// ==============================================================================
const TIPO = {
    ANALISIS: 'analisis_rapido',
    MICROS: 'micros',
    IMAGEN: 'imagen',
    BUSQUEDA: 'busqueda',
    RECETA: 'receta',
    ESTIMAR: 'estimar'
};

// ==============================================================================
// 3. CONSTRUCTOR DE SYSTEM PROMPT CON SCHEMA EMBEBIDO
// Groq no acepta responseSchema en el payload — el formato va en el prompt
// ==============================================================================
const buildSystemPrompt = (basePrompt, schema) => {
    const ejemplo = schemaToPromptExample(schema);
    return `${basePrompt}

════════════════════════════════════════
FORMATO DE RESPUESTA OBLIGATORIO
════════════════════════════════════════
Respondé ÚNICAMENTE con un JSON válido con esta estructura exacta.
Sin texto adicional. Sin markdown. Sin backticks.
Todos los campos numéricos deben ser números, no strings.

Campos opcionales por ítem:
- "estado_coccion": string — cómo vino/elaborado (ej: "crudo", "cocido", "frito", "hervido").
- "producto_de_marca": true — cuando el usuario nombra una marca o producto envasado
  específico (ej: "yerba rosamonte"). El sistema lo buscará en OpenFoodFacts para usar
  los datos reales del producto.
- "marca": string — la MARCA detectada en el nombre del producto. Ejemplos:
  "One Fit Nutrition Classic Whey Protein" → "One Fit Nutrition";
  "harina de arveja Dicomere" → "Dicomere" (la marca puede venir al final);
  "fideos matarazzo proteina plus" → "Matarazzo".
  Sin marca → omitila o dejala vacía "". El sistema usa este campo para buscar el
  producto real en OpenFoodFacts y, si la marca no existe en la base, buscar el
  producto base sin marca (ej: "harina de arveja") como aproximación.
- Si el usuario describe una PORCIÓN de una receta (ej: "240g tarta"), agregá a CADA ítem:
  "porcion_de_receta": true  y  "factor_porcion": <factor calculado>

${ejemplo}`;
};

// ==============================================================================
// 4. MOTOR CENTRAL — delega en el backend /api/sugerencias
// El servidor valida el token de Firebase, rota keys/modelos ante 429 / 401 /
// 5xx / error de red / timeout de 10s, reintenta una vez si el JSON viene
// vacío o cortado y devuelve el JSON ya parseado.
// ==============================================================================

// Errores del cliente (ia-client.js) → mensajes para la UI. "RATE_LIMIT: ..."
// se conserva como prefijo porque varias vistas lo chequean así.
const MSJ_IA = {
    SATURADO:           'RATE_LIMIT: El asistente está saturado. Intentá en 1 minuto.',
    SIN_SESION:         'Iniciá sesión para continuar.',
    SESION_INVALIDA:    'No pudimos verificar tu sesión, probá de nuevo.',
    RED:                'Sin conexión — probá de nuevo.',
    TIMEOUT:            'Tardó demasiado — probá de nuevo.',
    RESPUESTA_VACIA:    'No pude entender la respuesta. Probá una vez más.',
    RESPUESTA_INVALIDA: 'No pude entender la respuesta. Probá una vez más.'
};

const mensajeAmigable = (codigo) => {
    if (MSJ_IA[codigo]) return MSJ_IA[codigo];
    if (typeof codigo === 'string' && codigo.startsWith('HTTP_')) {
        return 'El asistente no respondió. Probá de nuevo.';
    }
    return codigo || 'No se pudo consultar a la IA. Intentá de nuevo.';
};

export async function sendGroqRequest(systemPrompt, userQuery, schema, timeoutMs = 8000, tipo = TIPO.ANALISIS) {
    // `timeoutMs` ya no se usa para abortar: los timeouts y la rotación los
    // maneja el servidor. Se mantiene el parámetro para no romper la firma
    // de los llamadores existentes.
    void timeoutMs;

    // userQuery puede ser string o array (array = partes con imagen)
    const userContent = Array.isArray(userQuery) ? userQuery : userQuery;

    // Embebemos el schema en el system prompt
    const fullSystemPrompt = buildSystemPrompt(systemPrompt, schema);

    try {
        return await pedirIA({ tipo, systemPrompt: fullSystemPrompt, userContent });
    } catch (e) {
        throw new Error(mensajeAmigable(e?.message));
    }
}

// ==============================================================================
// 5. FUNCIONES PÚBLICAS — misma firma que gemini.service.js
// ==============================================================================

// ─────────────────────────────────────────────────────────────
// 5a. ENRIQUECIMIENTO CON OPENFOODFACTS (productos con marca)
// Si la IA marcó un ítem con "producto_de_marca": true, buscamos el producto
// en OpenFoodFacts y reemplazamos macros/micros por los DATOS REALES.
// Si OFF no tiene el producto o no hay coincidencia suficiente → se mantienen
// los valores estimados por la IA (fallback transparente).
// ─────────────────────────────────────────────────────────────
const cacheOFF = new Map(); // alimento → resultado OFF (o null si no hubo match)

// Los productos de OFF dan sus macros por 100g COMO SE VENDEN (fideos = secos).
// Si la IA estimó un peso ≥140g (porción típica cocida) de un staple que se vende
// seco, convertimos a peso seco: 100g secos rinden ≈230g cocidos (avena ≈300g).
const gramajeBase = (item, producto) => {
    const gramos = Number(item.gramos_estimados) || 0;
    const estado = String(item.estado_coccion || '').toLowerCase();
    const esCrudo = estado.includes('crudo') || estado.includes('seco');

    const textoItem = String(item.alimento || '').toLowerCase();
    const textoProd = String(producto.nombre || '').toLowerCase();

    // Detección en AMBOS textos: el ítem dice qué comió el usuario
    // ("Fideos ... (cocidos)") y el producto OFF puede traer la forma
    // ("Proteína Plus Mostachol") aunque el ítem no la nombre.
    const esStapleSeco = /(spaghet|fideo|pasta|macarr|penne|fusilli|tirabuz|tallar|mostac|arroz|cuscus|polenta|quinoa|amaranto|avena)/.test(textoItem)
        || /(spaghet|fideo|pasta|macarr|penne|fusilli|tirabuz|tallar|mostac|arroz|cuscus|polenta|quinoa|amaranto|avena)/.test(textoProd);
    // "cocido/preparado/listo/congelado" en el producto = sus gramos ya son cocidos
    const yaPreparado = /(cocido|preparado|listo|congelado)/.test(textoProd);

    if (esStapleSeco && !yaPreparado && !esCrudo && gramos >= 140) {
        const factor = textoItem.includes('avena') ? 3 : 2.3;
        return gramos / factor;
    }
    return gramos;
};

const enriquecerItemsConOFF = async (resultado) => {
    const items = resultado?.items;
    const microsOFF = [];
    if (!Array.isArray(items) || items.length === 0) return { resultado, microsOFF };

    // Candidatos: ítems con marca detectada por la IA (producto_de_marca o campo "marca")
    const candidatos = items.filter(i =>
        !i.porcion_de_receta &&
        (i.producto_de_marca === true ||
            (typeof i.marca === 'string' && i.marca.trim() !== '')));
    if (candidatos.length === 0) return { resultado, microsOFF };

    await Promise.all(candidatos.map(async (item) => {
        try {
            const cacheKey = `${item.alimento}§${item.marca || ''}`;
            let prod = cacheOFF.get(cacheKey);
            if (prod === undefined) {
                // Con marca → si la marca no está en OFF, se reintenta con el producto base
                prod = await buscarProductoPorNombreSimilar(item.alimento, item.marca || null);
                cacheOFF.set(cacheKey, prod); // cachea match y no-match
            }
            if (!prod) {
                console.log(`🔎 OFF: sin coincidencia para "${item.alimento}" → se mantienen los valores estimados por IA`);
                return;
            }

            const gramosBase = gramajeBase(item, prod);
            if (!gramosBase || gramosBase <= 0) return;
            const f  = gramosBase / 100;
            const p  = prod.por_100g;
            const r1 = v => Math.round(v * 10) / 10;
            const r0 = v => Math.round(v);

            // Macros reales del producto × gramos consumidos
            item.calorias        = r1(p.calorias * f);
            item.proteinas       = r1(p.proteinas * f);
            item.carbohidratos   = r1(p.carbohidratos * f);
            item.grasas          = r1(p.grasas * f);
            item.fibra           = r1(p.fibra * f);
            item.fuente_datos    = 'openfoodfacts';

            const notaMarca = prod.es_generica
                ? ` — match genérico (marca "${item.marca}" sin dato en OFF)`
                : `${prod.marca ? ' (' + prod.marca + ')' : ''} — datos reales aplicados`;
            console.log(`✅ OFF: "${item.alimento}" → "${prod.nombre}"${notaMarca} a ${Math.round(gramosBase)}g`);

            // Micros reales (misma base de cálculo que los macros)
            microsOFF.push({
                alimento: item.alimento,
                sodio_mg:     r0(p.sodio_mg * f),
                potasio_mg:   r0(p.potasio_mg * f),
                magnesio_mg:  r0(p.magnesio_mg * f),
                calcio_mg:    r0(p.calcio_mg * f),
                hierro_mg:    Math.round(p.hierro_mg * f * 10) / 10,
                zinc_mg:      Math.round(p.zinc_mg * f * 10) / 10,
                omega3: { ala_mg: r0(p.omega3.ala_mg * f), epa_dha_mg: r0(p.omega3.epa_dha_mg * f) },
                fuente_datos: 'openfoodfacts'
            });
        } catch (e) {
            console.warn(`⚠️ OFF falló para "${item.alimento}":`, e.message);
        }
    }));

    // Si algo cambió, recalculamos los totales del resultado rápido
    if (items.some(i => i.fuente_datos === 'openfoodfacts')) {
        const tot = campo => Math.round(items.reduce((s, i) => s + (Number(i[campo]) || 0), 0) * 100) / 100;
        resultado.totales_comida = {
            total_calorias:      tot('calorias'),
            total_proteinas:     tot('proteinas'),
            total_carbohidratos: tot('carbohidratos'),
            total_grasas:        tot('grasas'),
            total_fibra:         tot('fibra')
        };
    }

    return { resultado, microsOFF };
};

// Flujo principal: macros rápido + micros en background
export function analizarComida(foodDescription) {
    const query = `Analizá: "${foodDescription}"`;

    // Micros reales de OFF por ítem (se llenan tras el enriquecimiento de macros)
    let microsOFF = [];

    const rapido = sendGroqRequest(
        PROMPTS_SISTEMA.ANALISIS_RAPIDO,
        query,
        GROQ_ESQUEMA_RAPIDO,
        5000,
        TIPO.ANALISIS
    ).then(async resultado => {
        const { resultado: enriquecido, microsOFF: off } = await enriquecerItemsConOFF(resultado);
        microsOFF = off;
        return enriquecido;
    });

    const microsPromise = rapido.then(async resultadoRapido => {
        const items = resultadoRapido.items || [];

        // Ítems ya resueltos con datos reales de OFF vs. los que van a la IA
        const itemsParaIA = items.filter(i => i.fuente_datos !== 'openfoodfacts');

        if (itemsParaIA.length === 0) {
            // Todo resuelto con OFF → ni siquiera llamamos a la IA para micros
            console.log('🧪 Micros: resueltos 100% con OpenFoodFacts (sin llamada a IA)');
            return { items_micros: microsOFF, fuente: 'openfoodfacts' };
        }

        const alimentosParaMicros = itemsParaIA.map(i => {

            // Caso 1: Porción de receta → reconstruir ingredientes desde el input original
            // con sus pesos proporcionales al factor de porción
            if (i.porcion_de_receta && i.factor_porcion) {
                return [
                    `Porción de receta: "${i.alimento}" (${i.gramos_estimados}g consumidos)`,
                    `Factor de porción aplicado: ${i.factor_porcion.toFixed(4)}`,
                    `Descripción completa de la receta: ${foodDescription}`,
                    `INSTRUCCIÓN: Extraé cada ingrediente de la receta, calculá su peso proporcional`,
                    `multiplicando su cantidad por ${i.factor_porcion.toFixed(4)},`,
                    `y calculá los micronutrientes de cada uno. Luego sumalos todos.`
                ].join(' ');
            }

            // Caso 2: Alimento simple → nombre + peso + cocción
            return `${i.alimento} (${i.gramos_estimados}g, ${i.estado_coccion})`;

        }).join(' | ');

        // Espera 2s para que la key no esté saturada
        const microsIA = await new Promise(resolve => setTimeout(resolve, 2000))
            .then(() => sendGroqRequest(
                PROMPTS_SISTEMA.ENRIQUECIMIENTO_MICROS,
                `Calculá micronutrientes para: ${alimentosParaMicros}`,
                GROQ_ESQUEMA_MICROS,
                8000,
                TIPO.MICROS
            ));

        // Combinar: micros de la IA (ítems sin marca) + micros reales de OFF
        if (microsOFF.length === 0) return microsIA;
        return { ...microsIA, items_micros: [...(microsIA.items_micros || []), ...microsOFF] };
    });

    return { rapido, microsPromise };
}

// Análisis de imagen — el servidor elige el modelo con visión cuando detecta
// una imagen en el contenido (ver netlify/functions/sugerencias.js)
export async function analizarImagenDeComida(base64Image, mimeType = "image/jpeg") {
    return await sendGroqRequest(
        PROMPTS_SISTEMA.ANALISIS_IMAGEN,
        [
            {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64Image}` }
            },
            { type: "text", text: "Analizá nutricionalmente esta imagen." }
        ],
        GROQ_ESQUEMA_RAPIDO,
        10000,
        TIPO.IMAGEN
    );
}

// Buscador puntual
export async function buscarAlimento(query) {
    return await sendGroqRequest(
        PROMPTS_SISTEMA.BUSQUEDA_ALIMENTO,
        query,
        GROQ_ESQUEMA_COMIDA_COMPLETO,
        6000,
        TIPO.BUSQUEDA
    );
}

// Helper para el botón — sin keys locales: el servidor reporta la saturación
export function hayKeysDisponibles() {
    return !groqKeyManager.allOnCooldown();
}

export const analizarReceta = async (descripcion) => {
    const systemPrompt = `Eres un asistente nutricionista. Tu tarea es extraer de la descripción de la receta su nombre y la lista de ingredientes con cantidades, unidades y marcas.

Debes responder ÚNICAMENTE con un objeto JSON que tenga el siguiente formato, sin texto adicional, sin markdown, sin backticks:

{
  "nombre_receta": "Hamburguesas de lenteja con espinaca",
  "ingredientes": [
    { "nombre": "lentejas secas", "cantidad": 300, "unidad": "g" },
    { "nombre": "espinaca congelada", "cantidad": 200, "unidad": "g" },
    { "nombre": "claras de huevo", "cantidad": 7, "unidad": "unidad" },
    { "nombre": "harina de arveja Dicomere", "cantidad": 150, "unidad": "g", "marca": "Dicomere" },
    { "nombre": "One Fit Nutrition Classic Whey Protein", "cantidad": 50, "unidad": "g", "marca": "One Fit Nutrition" },
    { "nombre": "tapa de tarta hojaldrada la salteña", "cantidad": 500, "unidad": "kcal" }
  ]
}

Reglas:
- "nombre_receta": nombre corto, descriptivo y en minúsculas del plato (ej: "hamburguesas de lenteja con espinaca").
- Si el usuario ya indica gramos, copiá el número exacto con unidad "g" — NO lo conviertas.
- Las unidades válidas son: "g", "kg", "ml", "l", "unidad", "taza", "cucharada", "kcal".
- Si la cantidad está implícita en calorías (ej: "500 kcal de tapa de tarta"), usar unidad "kcal".
- No inventes valores nutricionales, solo extrae nombres, cantidades y unidades.
- Incluí TODOS los ingredientes que mencione el usuario, aunque sean condimentos.
- MARCAS (crítico): conservá el "nombre" COMPLETO con la marca incluida (no la quites).
  Además, si el ingrediente tiene una marca, indicála en "marca":
  "harina de arveja Dicomere" → marca: "Dicomere" (la marca puede venir AL FINAL);
  "One Fit Nutrition Classic Whey Protein" → marca: "One Fit Nutrition";
  "queso cremac light" → marca: "Cremac".
  Sin marca → omití el campo "marca".
- Respondé solo con el JSON.`;

    // Llamamos a sendGroqRequest sin esquema (null) y con mayor timeout
    const resultado = await sendGroqRequest(systemPrompt, `Descripción: "${descripcion}"`, null, 10000, TIPO.RECETA);
    // resultado ya debería ser un objeto JSON
    if (!resultado.ingredientes) throw new Error("La respuesta no contiene ingredientes");
    return resultado;
};

// Estimación de nutrientes por 100g de un ingrediente que OpenFoodFacts no tiene
// (fallback de "Nueva Receta": si OFF/local falla, la IA estima y el flujo sigue)
// Un por_100g es válido si las macros son números finitos ≥ 0 y hay AL MENOS
// un dato nutricional > 0. Acepta 0 kcal (ej: polvo de hornear, minerales)
// y rechaza respuestas vacías "toda en 0" (respuesta lazy / inválida).
const esPor100Valido = (p) => {
    if (!p || typeof p !== 'object') return false;
    const macros = ['calorias', 'proteinas', 'carbohidratos', 'grasas'];
    if (!macros.every(k => typeof p[k] === 'number' && Number.isFinite(p[k]) && p[k] >= 0)) return false;
    const otros = ['fibra', 'sodio_mg', 'potasio_mg', 'magnesio_mg', 'calcio_mg', 'hierro_mg', 'zinc_mg'];
    return macros.some(k => p[k] > 0) ||
        otros.some(k => typeof p[k] === 'number' && p[k] > 0);
};

export async function estimarNutrientesPor100g(nombreIngrediente) {
    const resultado = await sendGroqRequest(
        PROMPTS_SISTEMA.ESTIMAR_INGREDIENTE,
        `Ingrediente: "${nombreIngrediente}"`,
        null,
        6000,
        TIPO.ESTIMAR
    );

    const por100 = resultado?.por_100g;
    if (!esPor100Valido(por100)) {
        throw new Error(`La IA no devolvió valores por 100g válidos para "${nombreIngrediente}"`);
    }

    return {
        nombre: resultado.nombre || nombreIngrediente,
        por_100g: por100
    };
}
