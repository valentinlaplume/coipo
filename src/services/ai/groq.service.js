// src/ai/groq.service.js

import { GROQ_API_KEYS } from '../../config/config.js';
import {
    GROQ_ESQUEMA_RAPIDO,
    GROQ_ESQUEMA_MICROS,
    GROQ_ESQUEMA_COMIDA_COMPLETO,
    GROQ_ESQUEMA_RECETA,
    schemaToPromptExample
} from './schemas.js';
import { PROMPTS_SISTEMA } from './prompts.js'; // mismos prompts que Gemini
import { buscarProductoPorNombreSimilar } from '../openfoodfacts.service.js';

// ==============================================================================
// 1. API KEY MANAGER — idéntico al de Gemini en lógica
// ==============================================================================
class GroqKeyManager {
    constructor(apiKeys) {
        this.apiKeys        = [...apiKeys];
        this.currentIndex   = 0;
        this.permanentFails = new Set();
        this.cooldowns      = new Map();
        this.requestCount   = 0;
        this.RPM_LIMIT      = 28; // Groq free = 30 RPM, usamos 28 de margen
    }

    getCurrentKey() {
        const ahora = Date.now();
        for (let i = 0; i < this.apiKeys.length; i++) {
            const idx = (this.currentIndex + i) % this.apiKeys.length;
            const key = this.apiKeys[idx];
            if (this.permanentFails.has(key)) continue;
            if ((this.cooldowns.get(key) ?? 0) > ahora) continue;
            this.currentIndex = idx;
            return key;
        }
        return null;
    }

    allOnCooldown() {
        const ahora = Date.now();
        return this.apiKeys
            .filter(k => !this.permanentFails.has(k))
            .every(k => (this.cooldowns.get(k) ?? 0) > ahora);
    }

    msUntilNextKey() {
        const ahora = Date.now();
        const tiempos = this.apiKeys
            .filter(k => !this.permanentFails.has(k))
            .map(k => this.cooldowns.get(k) ?? 0);
        return Math.max(0, Math.min(...tiempos) - ahora);
    }

    markRateLimited(key, ms = 62000) {
        this.cooldowns.set(key, Date.now() + ms);
        this.requestCount = 0;
        this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
        console.warn(`⏳ [Groq] Key ...${key.slice(-6)} en cooldown por ${Math.ceil(ms/1000)}s`);
    }

    markPermanentFail(key) {
        this.permanentFails.add(key);
        this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
        console.error(`❌ [Groq] Key inválida removida: ...${key.slice(-6)}`);
    }

    getAvailableCount() {
        const ahora = Date.now();
        return this.apiKeys.filter(k =>
            !this.permanentFails.has(k) &&
            (this.cooldowns.get(k) ?? 0) <= ahora
        ).length;
    }

    incrementRequest() {
        if (++this.requestCount >= this.RPM_LIMIT) {
            this.requestCount = 0;
            this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
        }
    }
}

export const groqKeyManager = new GroqKeyManager(GROQ_API_KEYS);

// ==============================================================================
// 2. MODELOS — ordenados por velocidad y cuota
// ==============================================================================
// Modelos verificados contra GET /v1/models con la key real (oct 2026) ✓
// ⚠️ NO usar: llama-3.3-70b / llama-3.1-8b (ahora "Enterprise" → 404 en keys
//    normales) ni gemma2-9b-it (descontinuado → 400).
const GROQ_MODELS = [
    "openai/gpt-oss-20b",      // #1 — ~1000 t/s, production, JSON confiable
    "openai/gpt-oss-120b",     // #2 — el más capaz (mejor para cálculos de porciones)
    "qwen/qwen3.8-27b",        // #3 — rápido, multimodal (respaldo)
    "allam-2-7b",              // #4 — respaldo final
];

// Único modelo de esta key que acepta imágenes (verificado con image_url)
const GROQ_VISION_MODEL = "qwen/qwen3.8-27b";

let currentModelIndex = 0;
const getCurrentModel = () => GROQ_MODELS[currentModelIndex];

function rotateModel() {
    currentModelIndex = (currentModelIndex + 1) % GROQ_MODELS.length;
    console.log(`🤖 [Groq] Rotando modelo → ${getCurrentModel()}`);
}

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
// 4. MOTOR CENTRAL — misma lógica que Gemini
// ==============================================================================
export async function sendGroqRequest(systemPrompt, userQuery, schema, timeoutMs = 8000) {
    // Groq usa la API compatible con OpenAI
    // userQuery puede ser string o array (para imágenes con llama-3.2-vision)
    const userContent = Array.isArray(userQuery)
        ? userQuery  // para visión — array de { type, text/image_url }
        : userQuery; // string normal

    // Embebemos el schema en el system prompt
    const fullSystemPrompt = buildSystemPrompt(systemPrompt, schema);

    const MAX_ERRORES_REALES   = 3;
    const MAX_ESPERAS_COOLDOWN = 2;
    let erroresReales   = 0;
    let esperasCooldown = 0;
    // Si TODOS los modelos fallan con 404 o timeout, dejamos de rotar
    // (sino el while(true) giraría para siempre)
    let rotacionesSeguidas = 0;

    while (true) {

        if (groqKeyManager.allOnCooldown()) {
            if (esperasCooldown >= MAX_ESPERAS_COOLDOWN) {
                throw new Error("RATE_LIMIT: Todas las keys Groq en cooldown. Intentá en 1 minuto.");
            }
            const espera = groqKeyManager.msUntilNextKey() + 500;
            console.warn(`⏳ [Groq] Todas en cooldown. Esperando ${Math.ceil(espera/1000)}s... (${esperasCooldown + 1}/${MAX_ESPERAS_COOLDOWN})`);
            await new Promise(r => setTimeout(r, espera));
            esperasCooldown++;
        }

        const currentKey = groqKeyManager.getCurrentKey();
        if (!currentKey) throw new Error("TODAS_LAS_KEYS_INVALIDAS");

        try {
            const controller = new AbortController();
            const timeoutId  = setTimeout(() => controller.abort(), timeoutMs);

            // const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            //     method: "POST",
            //     headers: {
            //         "Content-Type":  "application/json",
            //         "Authorization": `Bearer ${currentKey}`
            //     },
            //     body: JSON.stringify({
            //         model:           getCurrentModel(),
            //         temperature:     0.1,
            //         max_tokens:      1200,
            //         response_format: { type: "json_object" }, // JSON mode de Groq
            //         messages: [
            //             { role: "system", content: fullSystemPrompt },
            //             { role: "user",   content: userContent }
            //         ]
            //     }),
            //     signal: controller.signal
            // });
            // Dentro de sendGroqRequest
                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${currentKey}`
                    },
                    body: JSON.stringify({
                        model: getCurrentModel(),
                        temperature: 0.1,
                        // Los modelos gpt-oss "razonan" antes de responder: dejamos
                        // margen para que no trunque la respuesta a mitad del JSON
                        max_tokens: 4000,
                        // response_format: { type: "json_object" }, // <-- ELIMINAR o comentar
                        messages: [
                            { role: "system", content: fullSystemPrompt },
                            { role: "user", content: userContent }
                        ]
                    }),
                    signal: controller.signal
                });
            clearTimeout(timeoutId);

            if (!response.ok) {
                // El cuerpo de la respuesta trae el motivo real de Groq
                const errorBody = await response.text().catch(() => '');
                const detalle = errorBody ? errorBody.substring(0, 300) : (response.statusText || 'sin detalle');

                if (response.status === 404 || response.status === 400) {
                    // 404 = modelo dado de baja; 400 = rechazo de la petición.
                    // En ambos, probar con OTRO modelo puede funcionar.
                    console.warn(`❌ [Groq] HTTP ${response.status} en "${getCurrentModel()}": ${detalle}`);
                    rotateModel();
                    if (++rotacionesSeguidas >= GROQ_MODELS.length) {
                        const err = new Error(`Groq respondió HTTP ${response.status} en todos los modelos. Detalle: ${detalle}`);
                        err.fatal = true;
                        throw err;
                    }
                    continue;
                }
                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After');
                    const cooldownMs = retryAfter ? parseInt(retryAfter) * 1000 : 62000;
                    groqKeyManager.markRateLimited(currentKey, cooldownMs);
                    continue;
                }
                if (response.status === 401 || response.status === 403) {
                    groqKeyManager.markPermanentFail(currentKey);
                    if (groqKeyManager.getAvailableCount() === 0) {
                        throw new Error("TODAS_LAS_KEYS_INVALIDAS");
                    }
                    continue;
                }
                throw new Error(`HTTP ${response.status}: ${detalle}`);
            }
            rotacionesSeguidas = 0; // el modelo responde bien

            const result  = await response.json();
            const content = result?.choices?.[0]?.message?.content;
            if (!content) throw new Error("Respuesta vacía de Groq");
            // Limpieza robusta: elimina markdown y espacios
            let cleaned = content.replace(/```json\s*|\s*```/g, '').trim();
            // Si empieza con algo que no sea '{', intenta encontrar el primer '{'
            const firstBrace = cleaned.indexOf('{');
            if (firstBrace !== -1) cleaned = cleaned.substring(firstBrace);
            const lastBrace = cleaned.lastIndexOf('}');
            if (lastBrace !== -1) cleaned = cleaned.substring(0, lastBrace + 1);
            const parsed = JSON.parse(cleaned);

            // Groq con json_object ya devuelve JSON limpio, pero limpiamos por si acaso
            // const parsed = JSON.parse(content.replace(/```json|```/g, "").trim());
            groqKeyManager.incrementRequest();
            return parsed;

        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn(`⏱️ [Groq] Timeout. Rotando modelo...`);
                rotateModel();
                if (++rotacionesSeguidas >= GROQ_MODELS.length) {
                    throw new Error(`[Groq] Timeout: los ${GROQ_MODELS.length} modelos no respondieron`);
                }
                continue;
            }
            if (error.fatal ||
                error.message.startsWith('TODAS_LAS_KEYS') ||
                error.message.startsWith('RATE_LIMIT') ||
                error.message.startsWith('[Groq] Timeout')) {
                throw error;
            }

            erroresReales++;
            console.warn(`⚠️ [Groq] Error real #${erroresReales}:`, error.message);
            if (erroresReales >= MAX_ERRORES_REALES) {
                throw new Error(`[Groq] Fallo tras ${erroresReales} errores: ${error.message}`);
            }
            await new Promise(r => setTimeout(r, Math.pow(2, erroresReales) * 500));
        }
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
        5000
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
                8000
            ));

        // Combinar: micros de la IA (ítems sin marca) + micros reales de OFF
        if (microsOFF.length === 0) return microsIA;
        return { ...microsIA, items_micros: [...(microsIA.items_micros || []), ...microsOFF] };
    });

    return { rapido, microsPromise };
}

// Análisis de imagen — requiere modelo con visión
export async function analizarImagenDeComida(base64Image, mimeType = "image/jpeg") {
    const modelAnterior = currentModelIndex;
    const indiceVision = GROQ_MODELS.indexOf(GROQ_VISION_MODEL);
    if (indiceVision === -1) {
        // Defensa: si el modelo de visión no está en la lista, no mandamos
        // imágenes a un modelo de solo texto (la API devolvería un 400)
        throw new Error(`Modelo de visión "${GROQ_VISION_MODEL}" no disponible en GROQ_MODELS`);
    }
    currentModelIndex = indiceVision;
    try {
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
            10000
        );
    } finally {
        currentModelIndex = modelAnterior; // restaurar modelo aunque falle
    }
}

// Buscador puntual
export async function buscarAlimento(query) {
    return await sendGroqRequest(
        PROMPTS_SISTEMA.BUSQUEDA_ALIMENTO,
        query,
        GROQ_ESQUEMA_COMIDA_COMPLETO,
        6000
    );
}

// Helper para el botón
export function hayKeysDisponibles() {
    return groqKeyManager.getAvailableCount() > 0 || groqKeyManager.allOnCooldown();
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
    const resultado = await sendGroqRequest(systemPrompt, `Descripción: "${descripcion}"`, null, 10000);
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
        6000
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