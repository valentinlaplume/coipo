// src/ai/schemas.js

// ─────────────────────────────────────────────────────────────
// SCHEMA RÁPIDO — Solo macros + identificación
// Genera ~60% menos tokens de salida que el schema completo
// ─────────────────────────────────────────────────────────────
// ESQUEMA_RAPIDO completo con el nuevo campo
export const ESQUEMA_RAPIDO = {
    type: "OBJECT",
    properties: {
        items: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    alimento:             { type: "STRING" },
                    marca:                { type: "STRING" },
                    cantidad_entrada:     { type: "STRING" },
                    gramos_estimados:     { type: "NUMBER" },
                    estado_coccion:       { type: "STRING" },
                    calorias:             { type: "NUMBER" },
                    proteinas:            { type: "NUMBER" },
                    carbohidratos:        { type: "NUMBER" },
                    grasas:               { type: "NUMBER" },
                    fibra:                { type: "NUMBER" },
                    confianza:            { type: "STRING" },
                    nota_estimacion:      { type: "STRING" },
                    // Nuevos — trazabilidad de porciones de receta
                    porcion_de_receta:    { type: "BOOLEAN" },
                    peso_total_receta_g:  { type: "NUMBER" },
                    factor_porcion:       { type: "NUMBER" }
                },
                required: [
                    "alimento", "cantidad_entrada", "gramos_estimados",
                    "estado_coccion", "calorias", "proteinas",
                    "carbohidratos", "grasas", "fibra", "confianza"
                ]
            }
        },
        totales_comida: {
            type: "OBJECT",
            properties: {
                total_calorias:      { type: "NUMBER" },
                total_proteinas:     { type: "NUMBER" },
                total_carbohidratos: { type: "NUMBER" },
                total_grasas:        { type: "NUMBER" },
                total_fibra:         { type: "NUMBER" },
                confianza_general:   { type: "STRING" }
            },
            required: [
                "total_calorias", "total_proteinas", "total_carbohidratos",
                "total_grasas", "total_fibra", "confianza_general"
            ]
        }
    },
    required: ["items", "totales_comida"]
};

// ─────────────────────────────────────────────────────────────
// SCHEMA DE MICROS — Solo los campos nuevos que agrega el enriquecimiento
// ─────────────────────────────────────────────────────────────
const MICROS_POR_ITEM = {
    type: "OBJECT",
    properties: {
        alimento:          { type: "STRING" },   // para identificar a qué ítem pertenece
        sodio_mg:          { type: "NUMBER" },
        potasio_mg:        { type: "NUMBER" },
        magnesio_mg:       { type: "NUMBER" },
        calcio_mg:         { type: "NUMBER" },
        hierro_mg:         { type: "NUMBER" },
        zinc_mg:           { type: "NUMBER" },
        vitamina_d_ui:     { type: "NUMBER" },
        vitamina_b12_mcg:  { type: "NUMBER" },
        omega3: {
            type: "OBJECT",
            properties: {
                ala_mg:     { type: "NUMBER" },
                epa_dha_mg: { type: "NUMBER" }
            },
            required: ["ala_mg", "epa_dha_mg"]
        }
    },
    required: [
        "alimento", "sodio_mg", "potasio_mg", "magnesio_mg",
        "calcio_mg", "hierro_mg", "zinc_mg",
        "vitamina_d_ui", "vitamina_b12_mcg", "omega3"
    ]
};

export const ESQUEMA_MICROS = {
    type: "OBJECT",
    properties: {
        items_micros: {
            type: "ARRAY",
            items: MICROS_POR_ITEM
        },
        totales_micros: {
            type: "OBJECT",
            properties: {
                total_sodio_mg:         { type: "NUMBER" },
                total_potasio_mg:       { type: "NUMBER" },
                total_magnesio_mg:      { type: "NUMBER" },
                total_calcio_mg:        { type: "NUMBER" },
                total_hierro_mg:        { type: "NUMBER" },
                total_zinc_mg:          { type: "NUMBER" },
                total_vitamina_d_ui:    { type: "NUMBER" },
                total_vitamina_b12_mcg: { type: "NUMBER" },
                total_omega3: {
                    type: "OBJECT",
                    properties: {
                        ala_mg:     { type: "NUMBER" },
                        epa_dha_mg: { type: "NUMBER" }
                    },
                    required: ["ala_mg", "epa_dha_mg"]
                }
            },
            required: [
                "total_sodio_mg", "total_potasio_mg", "total_magnesio_mg",
                "total_calcio_mg", "total_hierro_mg", "total_zinc_mg",
                "total_vitamina_d_ui", "total_vitamina_b12_mcg", "total_omega3"
            ]
        }
    },
    required: ["items_micros", "totales_micros"]
};

// Schema completo para búsqueda puntual (buscador de alimento único)
// Se mantiene completo porque es 1 solo ítem → rápido igual
export const ESQUEMA_COMIDA_COMPLETO = {
    type: "OBJECT",
    properties: {
        items: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    alimento:          { type: "STRING" },
                    marca:             { type: "STRING" },
                    cantidad_entrada:  { type: "STRING" },
                    gramos_estimados:  { type: "NUMBER" },
                    estado_coccion:    { type: "STRING" },
                    calorias:          { type: "NUMBER" },
                    proteinas:         { type: "NUMBER" },
                    carbohidratos:     { type: "NUMBER" },
                    grasas:            { type: "NUMBER" },
                    fibra:             { type: "NUMBER" },
                    sodio_mg:          { type: "NUMBER" },
                    potasio_mg:        { type: "NUMBER" },
                    magnesio_mg:       { type: "NUMBER" },
                    calcio_mg:         { type: "NUMBER" },
                    hierro_mg:         { type: "NUMBER" },
                    zinc_mg:           { type: "NUMBER" },
                    vitamina_d_ui:     { type: "NUMBER" },
                    vitamina_b12_mcg:  { type: "NUMBER" },
                    omega3: {
                        type: "OBJECT",
                        properties: {
                            ala_mg:     { type: "NUMBER" },
                            epa_dha_mg: { type: "NUMBER" }
                        },
                        required: ["ala_mg", "epa_dha_mg"]
                    },
                    confianza:        { type: "STRING" },
                    nota_estimacion:  { type: "STRING" },
                           // Nuevos — trazabilidad de porciones de receta
                    porcion_de_receta:    { type: "BOOLEAN" },
                    peso_total_receta_g:  { type: "NUMBER" },
                    factor_porcion:       { type: "NUMBER" }
                },
                required: [
                    "alimento", "cantidad_entrada", "gramos_estimados", "estado_coccion",
                    "calorias", "proteinas", "carbohidratos", "grasas", "fibra",
                    "sodio_mg", "potasio_mg", "magnesio_mg", "calcio_mg",
                    "hierro_mg", "zinc_mg", "vitamina_d_ui", "vitamina_b12_mcg",
                    "omega3", "confianza"
                ]
            }
        },
        totales_comida: {
            type: "OBJECT",
            properties: {
                total_calorias:         { type: "NUMBER" },
                total_proteinas:        { type: "NUMBER" },
                total_carbohidratos:    { type: "NUMBER" },
                total_grasas:           { type: "NUMBER" },
                total_fibra:            { type: "NUMBER" },
                total_sodio_mg:         { type: "NUMBER" },
                total_potasio_mg:       { type: "NUMBER" },
                total_magnesio_mg:      { type: "NUMBER" },
                total_calcio_mg:        { type: "NUMBER" },
                total_hierro_mg:        { type: "NUMBER" },
                total_zinc_mg:          { type: "NUMBER" },
                total_vitamina_d_ui:    { type: "NUMBER" },
                total_vitamina_b12_mcg: { type: "NUMBER" },
                total_omega3: {
                    type: "OBJECT",
                    properties: {
                        ala_mg:     { type: "NUMBER" },
                        epa_dha_mg: { type: "NUMBER" }
                    },
                    required: ["ala_mg", "epa_dha_mg"]
                },
                confianza_general: { type: "STRING" }
            },
            required: [
                "total_calorias", "total_proteinas", "total_carbohidratos",
                "total_grasas", "total_fibra",
                "total_sodio_mg", "total_potasio_mg", "total_magnesio_mg",
                "total_calcio_mg", "total_hierro_mg", "total_zinc_mg",
                "total_vitamina_d_ui", "total_vitamina_b12_mcg",
                "total_omega3", "confianza_general"
            ]
        }
    },
    required: ["items", "totales_comida"]
};

// groq IA

// src/ai/groq.schemas.js

// ─────────────────────────────────────────────────────────────
// A diferencia de Gemini, Groq no recibe un responseSchema en
// el payload — el formato lo define el prompt del sistema.
// Estos objetos se usan para:
//   1. Validar la respuesta recibida
//   2. Documentar la estructura esperada
//   3. Generar el bloque JSON de ejemplo que va en el prompt
// ─────────────────────────────────────────────────────────────

// Helper interno — convierte el schema a string JSON de ejemplo para el prompt
// src/ai/groq.schemas.js

// schemaToPromptExample ahora genera un ejemplo CON NÚMEROS REALES
// no con strings de tipo — eso confundía al modelo
export const schemaToPromptExample = (schema) => {
    const ejemplos = {
        ESQUEMA_RAPIDO: `{
  "items": [
    {
      "alimento": "Pechuga de pollo a la plancha",
      "marca": null,
      "cantidad_entrada": "180g",
      "gramos_estimados": 180,
      "estado_coccion": "plancha",
      "calorias": 297,
      "proteinas": 55.8,
      "carbohidratos": 0,
      "grasas": 6.5,
      "fibra": 0,
      "confianza": "alta",
      "nota_estimacion": null,
      "porcion_de_receta": true,
      "peso_total_receta_g": 1720,
      "factor_porcion": 0.174
    }
  ],
  "totales_comida": {
    "total_calorias": 297,
    "total_proteinas": 55.8,
    "total_carbohidratos": 0,
    "total_grasas": 6.5,
    "total_fibra": 0,
    "confianza_general": "alta"
  }
}`,
        ESQUEMA_MICROS: `{
  "items_micros": [
    {
      "alimento": "Pechuga de pollo a la plancha",
      "sodio_mg": 133,
      "potasio_mg": 461,
      "magnesio_mg": 52,
      "calcio_mg": 15,
      "hierro_mg": 1.3,
      "zinc_mg": 1.8,
      "vitamina_d_ui": 7,
      "vitamina_b12_mcg": 0.5,
      "omega3": { "ala_mg": 90, "epa_dha_mg": 0 }
    }
  ],
  "totales_micros": {
    "total_sodio_mg": 133,
    "total_potasio_mg": 461,
    "total_magnesio_mg": 52,
    "total_calcio_mg": 15,
    "total_hierro_mg": 1.3,
    "total_zinc_mg": 1.8,
    "total_vitamina_d_ui": 7,
    "total_vitamina_b12_mcg": 0.5,
    "total_omega3": { "ala_mg": 90, "epa_dha_mg": 0 }
  }
}`,
        ESQUEMA_COMIDA_COMPLETO: `{
  "items": [
    {
      "alimento": "Avena cruda",
      "marca": null,
      "cantidad_entrada": "80g",
      "gramos_estimados": 80,
      "estado_coccion": "crudo",
      "calorias": 311,
      "proteinas": 13.6,
      "carbohidratos": 52.8,
      "grasas": 5.6,
      "fibra": 8,
      "sodio_mg": 2,
      "potasio_mg": 343,
      "magnesio_mg": 142,
      "calcio_mg": 43,
      "hierro_mg": 3.8,
      "zinc_mg": 3.2,
      "vitamina_d_ui": 0,
      "vitamina_b12_mcg": 0,
      "omega3": { "ala_mg": 88, "epa_dha_mg": 0 },
      "confianza": "alta",
      "nota_estimacion": null,
      "porcion_de_receta": true,
      "peso_total_receta_g": 1720,
      "factor_porcion": 0.174
    }
  ],
  "totales_comida": {
    "total_calorias": 311,
    "total_proteinas": 13.6,
    "total_carbohidratos": 52.8,
    "total_grasas": 5.6,
    "total_fibra": 8,
    "total_sodio_mg": 2,
    "total_potasio_mg": 343,
    "total_magnesio_mg": 142,
    "total_calcio_mg": 43,
    "total_hierro_mg": 3.8,
    "total_zinc_mg": 3.2,
    "total_vitamina_d_ui": 0,
    "total_vitamina_b12_mcg": 0,
    "total_omega3": { "ala_mg": 88, "epa_dha_mg": 0 },
    "confianza_general": "alta"
  }
}`
    };
    return ejemplos[schema.nombre] ?? '';
};

// Los schemas se mantienen igual — solo cambia el helper
export const GROQ_ESQUEMA_RAPIDO = { nombre: "ESQUEMA_RAPIDO" };
export const GROQ_ESQUEMA_MICROS = { nombre: "ESQUEMA_MICROS" };
export const GROQ_ESQUEMA_COMIDA_COMPLETO = { nombre: "ESQUEMA_COMIDA_COMPLETO" };