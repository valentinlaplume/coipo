// src/ai/groq.service.js

import { GROQ_API_KEYS } from '../../config/config.js';
import {
    GROQ_ESQUEMA_RAPIDO,
    GROQ_ESQUEMA_MICROS,
    GROQ_ESQUEMA_COMIDA_COMPLETO,
    schemaToPromptExample
} from './schemas.js';
import { PROMPTS_SISTEMA } from './prompts.js'; // mismos prompts que Gemini

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
const GROQ_MODELS = [
    "llama-3.3-70b-versatile", // #2 — más preciso, fallback
    "llama-3.1-8b-instant",    // #1 — ultrarrápido, 14.400 req/día, suficiente para JSON
    "gemma2-9b-it",            // #3 — respaldo adicional
];

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

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type":  "application/json",
                    "Authorization": `Bearer ${currentKey}`
                },
                body: JSON.stringify({
                    model:           getCurrentModel(),
                    temperature:     0.1,
                    max_tokens:      1200,
                    response_format: { type: "json_object" }, // JSON mode de Groq
                    messages: [
                        { role: "system", content: fullSystemPrompt },
                        { role: "user",   content: userContent }
                    ]
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 404) {
                    rotateModel();
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
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result  = await response.json();
            const content = result?.choices?.[0]?.message?.content;
            if (!content) throw new Error("Respuesta vacía de Groq");

            // Groq con json_object ya devuelve JSON limpio, pero limpiamos por si acaso
            const parsed = JSON.parse(content.replace(/```json|```/g, "").trim());
            groqKeyManager.incrementRequest();
            return parsed;

        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn(`⏱️ [Groq] Timeout. Rotando modelo...`);
                rotateModel();
                continue;
            }
            if (error.message.startsWith('TODAS_LAS_KEYS') ||
                error.message.startsWith('RATE_LIMIT')) {
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

// Flujo principal: macros rápido + micros en background
export function analizarComida(foodDescription) {
    const query = `Analizá: "${foodDescription}"`;

    const rapido = sendGroqRequest(
        PROMPTS_SISTEMA.ANALISIS_RAPIDO,
        query,
        GROQ_ESQUEMA_RAPIDO,
        5000
    );

    const microsPromise = rapido.then(resultadoRapido => {
        const items = resultadoRapido.items;

        const alimentosParaMicros = items.map(i => {

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
        return new Promise(resolve => setTimeout(resolve, 2000))
            .then(() => sendGroqRequest(
                PROMPTS_SISTEMA.ENRIQUECIMIENTO_MICROS,
                `Calculá micronutrientes para: ${alimentosParaMicros}`,
                GROQ_ESQUEMA_MICROS,
                8000
            ));
    });

    return { rapido, microsPromise };
}

// Análisis de imagen — requiere modelo con visión
export async function analizarImagenDeComida(base64Image, mimeType = "image/jpeg") {
    // Groq visión usa llama-3.2-11b-vision-preview
    const modelAnterior = currentModelIndex;
    currentModelIndex = GROQ_MODELS.indexOf("llama-3.2-11b-vision-preview");
    if (currentModelIndex === -1) currentModelIndex = modelAnterior; // fallback si no está

    const resultado = await sendGroqRequest(
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

    currentModelIndex = modelAnterior; // restaurar modelo
    return resultado;
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