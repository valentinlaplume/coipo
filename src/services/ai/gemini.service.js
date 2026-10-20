// src/ai/gemini.service.js

import { GEMINI_API_KEYS } from '../../config/config.js';
import { ESQUEMA_RAPIDO, ESQUEMA_MICROS, ESQUEMA_COMIDA_COMPLETO } from './schemas.js';
import { PROMPTS_SISTEMA } from './prompts.js';

// ==============================================================================
// 1. API KEY MANAGER
// ==============================================================================
class ApiKeyManager {
    constructor(apiKeys) {
        this.apiKeys      = [...apiKeys]; // copia para no mutar el original
        this.currentIndex = 0;
        this.permanentFails = new Set(); // 403 / key inválida — nunca vuelve
        this.cooldowns      = new Map(); // 429 — vuelve después del tiempo
        this.requestCount   = 0;
        this.RPM_LIMIT      = 14; // Gemini free = 15 RPM, usamos 14 de margen
    }

    // Siguiente key disponible (no en cooldown, no fallida)
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
        return null; // todas bloqueadas
    }

    // Todas las keys válidas están en cooldown?
    allOnCooldown() {
        const ahora = Date.now();
        return this.apiKeys
            .filter(k => !this.permanentFails.has(k))
            .every(k => (this.cooldowns.get(k) ?? 0) > ahora);
    }

    // Cuántos ms hasta que se libere la próxima key
    msUntilNextKey() {
        const ahora = Date.now();
        const tiempos = this.apiKeys
            .filter(k => !this.permanentFails.has(k))
            .map(k => this.cooldowns.get(k) ?? 0);
        return Math.max(0, Math.min(...tiempos) - ahora);
    }

    // 429 → cooldown temporal (nunca fallo permanente)
    markRateLimited(key, ms = 65000) {
        this.cooldowns.set(key, Date.now() + ms);
        this.requestCount = 0;
        this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
        console.warn(`⏳ Key ...${key.slice(-6)} en cooldown por ${Math.ceil(ms/1000)}s`);
    }

    // 403 → fallo permanente (key inválida o sin permisos)
    markPermanentFail(key) {
        this.permanentFails.add(key);
        this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
        console.error(`❌ Key inválida removida del pool: ...${key.slice(-6)}`);
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

export const keyManager = new ApiKeyManager(GEMINI_API_KEYS);

// ==============================================================================
// 2. MODELOS — ordenados por velocidad para structured output
// ==============================================================================
const GEMINI_MODELS = [
    "gemini-2.0-flash-lite",  // #1 — cuota SEPARADA de 2.0-flash, más liviano
    "gemini-2.5-flash-lite",  // #2 — cuota separada también
    "gemini-2.5-flash",       // #3 — fallback
    "gemini-2.0-flash",       // #4 — último recurso
];
let currentModelIndex = 0;
const getCurrentModel = () => GEMINI_MODELS[currentModelIndex];
const getApiUrl      = () =>
    `https://generativelanguage.googleapis.com/v1beta/models/${getCurrentModel()}:generateContent`;

function rotateModel() {
    currentModelIndex = (currentModelIndex + 1) % GEMINI_MODELS.length;
    console.log(`🤖 Rotando modelo → ${getCurrentModel()}`);
}

export async function sendGeminiRequest(systemPrompt, userQuery, responseSchema, timeoutMs = 8000) {
    const userParts = Array.isArray(userQuery) ? userQuery : [{ text: userQuery }];

    const payload = {
        contents:          [{ role: "user", parts: userParts }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            temperature:      0.1,
            responseMimeType: "application/json",
            responseSchema,
            maxOutputTokens:  1200
        }
    };

    const MAX_ERRORES_REALES = 3; // solo cuenta errores que NO son 429
    const MAX_ESPERAS_COOLDOWN = 2; // cuántas veces esperamos cooldown antes de rendirse
    let erroresReales = 0;
    let esperasCooldown = 0;
    // Si TODOS los modelos fallan con 404 o timeout, dejamos de rotar
    let rotacionesSeguidas = 0;

    while (true) {

        // — Si todas las keys están en cooldown, esperamos ——————
        if (keyManager.allOnCooldown()) {
            if (esperasCooldown >= MAX_ESPERAS_COOLDOWN) {
                throw new Error("RATE_LIMIT: Todas las keys en cooldown. Intentá en 1 minuto.");
            }
            const espera = keyManager.msUntilNextKey() + 500;
            console.warn(`⏳ Todas las keys en cooldown. Esperando ${Math.ceil(espera/1000)}s... (${esperasCooldown + 1}/${MAX_ESPERAS_COOLDOWN})`);
            await new Promise(r => setTimeout(r, espera));
            esperasCooldown++;
        }

        const currentKey = keyManager.getCurrentKey();
        if (!currentKey) {
            throw new Error("TODAS_LAS_KEYS_INVALIDAS");
        }

        try {
            const controller = new AbortController();
            const timeoutId  = setTimeout(() => controller.abort(), timeoutMs);

            const response = await fetch(`${getApiUrl()}?key=${currentKey}`, {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(payload),
                signal:  controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 404) {
                    rotateModel();
                    if (++rotacionesSeguidas >= GEMINI_MODELS.length) {
                        throw new Error(`HTTP 404: ningún modelo disponible en Gemini (${GEMINI_MODELS.join(', ')})`);
                    }
                    continue; // no cuenta como error real
                }

                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After');
                    const cooldownMs = retryAfter ? parseInt(retryAfter) * 1000 : 65000;
                    keyManager.markRateLimited(currentKey, cooldownMs);
                    continue; // no cuenta como error real — el while espera arriba si hacen falta
                }

                if (response.status === 403) {
                    keyManager.markPermanentFail(currentKey);
                    if (keyManager.getAvailableCount() === 0) {
                        throw new Error("TODAS_LAS_KEYS_INVALIDAS");
                    }
                    continue; // no cuenta como error real
                }

                // Cualquier otro HTTP error SÍ cuenta
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            rotacionesSeguidas = 0; // el modelo responde bien

            const result   = await response.json();
            const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!jsonText) throw new Error("Respuesta vacía de la API");

            const parsed = JSON.parse(jsonText.replace(/```json|```/g, "").trim());
            keyManager.incrementRequest();
            return parsed; // ✅ éxito

        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn(`⏱️ Timeout. Rotando modelo...`);
                rotateModel();
                if (++rotacionesSeguidas >= GEMINI_MODELS.length) {
                    throw new Error(`Timeout: los ${GEMINI_MODELS.length} modelos de Gemini no respondieron`);
                }
                continue; // timeout no cuenta como error real
            }

            // Errores que nosotros lanzamos — propagar directo
            if (error.message.startsWith('TODAS_LAS_KEYS') ||
                error.message.startsWith('RATE_LIMIT') ||
                error.message.startsWith('HTTP 404') ||
                error.message.startsWith('Timeout:')) {
                throw error;
            }

            // Error real de red o parseo
            erroresReales++;
            console.warn(`⚠️ Error real #${erroresReales}:`, error.message);
            if (erroresReales >= MAX_ERRORES_REALES) {
                throw new Error(`Fallo tras ${erroresReales} errores: ${error.message}`);
            }
            await new Promise(r => setTimeout(r, Math.pow(2, erroresReales) * 500));
        }
    }
}

// ==============================================================================
// 4. FUNCIONES PÚBLICAS
// ==============================================================================

// Flujo principal: macros rápido + micros en background
export function analizarComida(foodDescription) {
    const query = `Analizá: "${foodDescription}"`;

    const rapido = sendGeminiRequest(
        PROMPTS_SISTEMA.ANALISIS_RAPIDO,
        query,
        ESQUEMA_RAPIDO,
        5000
    );

    const microsPromise = rapido.then(resultadoRapido => {
        const alimentosIdentificados = resultadoRapido.items
            .map(i => `${i.alimento} (${i.gramos_estimados}g, ${i.estado_coccion})`)
            .join(', ');
        return sendGeminiRequest(
            PROMPTS_SISTEMA.ENRIQUECIMIENTO_MICROS,
            `Calculá micronutrientes para: ${alimentosIdentificados}`,
            ESQUEMA_MICROS,
            8000
        );
    });

    return { rapido, microsPromise };
}

// Análisis de imagen
export async function analizarImagenDeComida(base64Image, mimeType = "image/jpeg") {
    return await sendGeminiRequest(
        PROMPTS_SISTEMA.ANALISIS_IMAGEN,
        [
            { inlineData: { mimeType, data: base64Image } },
            { text: "Analizá nutricionalmente esta imagen." }
        ],
        ESQUEMA_RAPIDO,
        8000
    );
}

// Buscador puntual
export async function buscarAlimento(query) {
    return await sendGeminiRequest(
        PROMPTS_SISTEMA.BUSQUEDA_ALIMENTO,
        query,
        ESQUEMA_COMIDA_COMPLETO,
        6000
    );
}

// Helper para el botón — saber si hay keys disponibles antes de intentar
export function hayKeysDisponibles() {
    return keyManager.getAvailableCount() > 0 || keyManager.allOnCooldown();
    // allOnCooldown = true significa que hay keys pero están esperando → vale la pena intentar
}