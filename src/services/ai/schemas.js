// src/ai/schemas.js

export const ESQUEMA_RAPIDO = {
    type: "object",
    properties: {
        items: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    alimento:         { type: "string" },
                    marca:            { type: "string", description: "Marca detectada del producto (ej: \"One Fit Nutrition\", \"Dicomere\"); vacía si es genérico" },
                    gramos_estimados: { type: "number" },
                    calorias:         { type: "number" },
                    proteinas:        { type: "number" },
                    carbohidratos:    { type: "number" },
                    grasas:           { type: "number" },
                    fibra:            { type: "number" }
                },
                required: ["alimento", "gramos_estimados", "calorias", "proteinas", "carbohidratos", "grasas", "fibra"]
            }
        },
        totales_comida: {
            type: "object",
            properties: {
                total_calorias:      { type: "number" },
                total_proteinas:     { type: "number" },
                total_carbohidratos: { type: "number" },
                total_grasas:        { type: "number" },
                total_fibra:         { type: "number" }
            },
            required: ["total_calorias", "total_proteinas", "total_carbohidratos", "total_grasas", "total_fibra"]
        }
    },
    required: ["items", "totales_comida"]
};

const MICROS_POR_ITEM = {
    type: "object",
    properties: {
        alimento:         { type: "string" },
        sodio_mg:         { type: "number" },
        potasio_mg:       { type: "number" },
        magnesio_mg:      { type: "number" },
        calcio_mg:        { type: "number" },
        hierro_mg:        { type: "number" },
        zinc_mg:          { type: "number" },
        vitamina_d_ui:    { type: "number" },
        vitamina_b12_mcg: { type: "number" },
        omega3: {
            type: "object",
            properties: {
                ala_mg:     { type: "number" },
                epa_dha_mg: { type: "number" }
            },
            required: ["ala_mg", "epa_dha_mg"]
        }
    },
    required: ["alimento", "sodio_mg", "potasio_mg", "magnesio_mg", "calcio_mg", "hierro_mg", "zinc_mg", "vitamina_d_ui", "vitamina_b12_mcg", "omega3"]
};

export const ESQUEMA_MICROS = {
    type: "object",
    properties: {
        items_micros: { type: "array", items: MICROS_POR_ITEM },
        totales_micros: {
            type: "object",
            properties: {
                total_sodio_mg:         { type: "number" },
                total_potasio_mg:       { type: "number" },
                total_magnesio_mg:      { type: "number" },
                total_calcio_mg:        { type: "number" },
                total_hierro_mg:        { type: "number" },
                total_zinc_mg:          { type: "number" },
                total_vitamina_d_ui:    { type: "number" },
                total_vitamina_b12_mcg: { type: "number" },
                total_omega3: {
                    type: "object",
                    properties: { ala_mg: { type: "number" }, epa_dha_mg: { type: "number" } },
                    required: ["ala_mg", "epa_dha_mg"]
                }
            },
            required: ["total_sodio_mg", "total_potasio_mg", "total_magnesio_mg", "total_calcio_mg", "total_hierro_mg", "total_zinc_mg", "total_vitamina_d_ui", "total_vitamina_b12_mcg", "total_omega3"]
        }
    },
    required: ["items_micros", "totales_micros"]
};

export const ESQUEMA_COMIDA_COMPLETO = ESQUEMA_RAPIDO; // mismo schema, misma simplicidad


export const schemaToPromptExample = (schema) => {
    if (!schema || !schema.nombre) return '';  // ← seguridad
    const ejemplos = {
        ESQUEMA_RAPIDO: `{
  "items": [
    { "alimento": "Fideos Matarazzo Proteína Plus (cocidos)", "marca": "Matarazzo", "estado_coccion": "cocido", "producto_de_marca": true, "gramos_estimados": 200, "calorias": 277, "proteinas": 14, "carbohidratos": 50, "grasas": 1.5, "fibra": 3 },
    { "alimento": "Harina de arveja Dicomere", "marca": "Dicomere", "producto_de_marca": true, "gramos_estimados": 30, "calorias": 108, "proteinas": 7.5, "carbohidratos": 16.5, "grasas": 1.5, "fibra": 5.7 },
    { "alimento": "Atún al natural", "estado_coccion": "crudo", "gramos_estimados": 80, "calorias": 93, "proteinas": 20.8, "carbohidratos": 0, "grasas": 0.8, "fibra": 0 }
  ],
  "totales_comida": { "total_calorias": 478, "total_proteinas": 42.3, "total_carbohidratos": 66.5, "total_grasas": 3.8, "total_fibra": 8.7 }
}`,
        ESQUEMA_MICROS: `{
  "items_micros": [
    { "alimento": "Fideos cocidos", "sodio_mg": 1, "potasio_mg": 44, "magnesio_mg": 18, "calcio_mg": 7, "hierro_mg": 0.5, "zinc_mg": 0.5, "vitamina_d_ui": 0, "vitamina_b12_mcg": 0, "omega3": { "ala_mg": 0, "epa_dha_mg": 0 } },
    { "alimento": "Atún al natural", "sodio_mg": 320, "potasio_mg": 355, "magnesio_mg": 28, "calcio_mg": 10, "hierro_mg": 1.0, "zinc_mg": 0.6, "vitamina_d_ui": 214, "vitamina_b12_mcg": 2.0, "omega3": { "ala_mg": 0, "epa_dha_mg": 240 } }
  ],
  "totales_micros": { "total_sodio_mg": 321, "total_potasio_mg": 399, "total_magnesio_mg": 46, "total_calcio_mg": 17, "total_hierro_mg": 1.5, "total_zinc_mg": 1.1, "total_vitamina_d_ui": 214, "total_vitamina_b12_mcg": 2.0, "total_omega3": { "ala_mg": 0, "epa_dha_mg": 240 } }
}`,
        ESQUEMA_RECETA: `{
  "nombre_receta": "Tarta de espinaca y queso",
  "porciones_totales": 6,
  "ingredientes": [
    { "nombre": "suprema cruda", "cantidad": 700, "unidad": "g", "por_100g": { "calorias": 165, "proteinas": 20, "grasas": 3, "carbohidratos": 0, "fibra": 0, "sodio_mg": 50, "potasio_mg": 350 } },
    { "nombre": "espinaca congelada", "cantidad": 500, "unidad": "g", "por_100g": { "calorias": 23, "proteinas": 3, "grasas": 0, "carbohidratos": 3, "fibra": 2, "sodio_mg": 10, "potasio_mg": 470 } }
  ]
}`
    };
    return ejemplos[schema.nombre] ?? '';
};

// Los schemas se mantienen igual — solo cambia el helper
export const GROQ_ESQUEMA_RAPIDO = { nombre: "ESQUEMA_RAPIDO" };
export const GROQ_ESQUEMA_MICROS = { nombre: "ESQUEMA_MICROS" };
export const GROQ_ESQUEMA_COMIDA_COMPLETO = { nombre: "ESQUEMA_COMIDA_COMPLETO" };

export const GROQ_ESQUEMA_RECETA = {
    type: "json_schema",
    json_schema: {
        name: "analisis_receta",
        schema: {
            type: "object",
            properties: {
                nombre_receta: { type: "string" },
                porciones_totales: { type: "number", description: "Número de porciones que rinde la receta" },
                ingredientes: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            nombre: { type: "string" },
                            cantidad: { type: "number", description: "Cantidad en gramos o ml (convertir a gramos si es líquido)" },
                            unidad: { type: "string", enum: ["g", "ml", "unidad", "taza", "cucharada"] },
                            // Nutrientes por cada 100g (o por la unidad base)
                            por_100g: {
                                type: "object",
                                properties: {
                                    calorias: { type: "number" },
                                    proteinas: { type: "number" },
                                    carbohidratos: { type: "number" },
                                    grasas: { type: "number" },
                                    fibra: { type: "number" },
                                    sodio_mg: { type: "number" },
                                    potasio_mg: { type: "number" },
                                    magnesio_mg: { type: "number" },
                                    calcio_mg: { type: "number" },
                                    hierro_mg: { type: "number" },
                                    zinc_mg: { type: "number" },
                                    vitamina_d_ui: { type: "number" },
                                    vitamina_b12_mcg: { type: "number" },
                                    omega3_ala_mg: { type: "number" },
                                    omega3_epa_dha_mg: { type: "number" }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};