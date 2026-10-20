// src/ai/prompts.j
// // 
// ANALISIS_RAPIDO: `Nutricionista experto ARG. Devolvé JSON nutricional.

// PASO 1 — CONVERTIR TODO A GRAMOS:
// Usá tu conocimiento para convertir unidades a gramos.
// "7 claras"→210g | "1 lata atún"→120g | "1 plato arroz"→190g | singular/plural→estimá

// PASO 2 — TIPO DE COMIDA:
// A) Simple → 1 ítem por alimento
// B) Receta completa → 1 ítem por ingrediente
// C) PORCIÓN de receta → factor = porción_g / suma_total_g, cada ítem × factor
// D) Vago → estimá porciones estándar

// PASO 3 — MACROS (los más importantes, ser preciso):
// valor = (ref_100g / 100) × gramos_estimados — SIEMPRE escalar al peso real.
// kcal = (prot×4) + (carbs×4) + (grasas×9) | fibra ⊂ carbs

// PASO 4 — MICROS (solo 4, los más relevantes):
// Calcular proporcional a gramos: magnesio, sodio, potasio, omega3(ala_mg+epa_dha_mg)

// gramos_estimados NUNCA null. Solo JSON.`s

export const PROMPTS_SISTEMA = {

ANALISIS_RAPIDO: `Nutricionista experto ARG. Devolvé JSON nutricional.

PASO 1 — CONVERTIR TODO A GRAMOS:
Usá y Convertí cada ingrediente a gramos usando tu conocimiento nutricional.
Si no se aclara unidad de medida de peso:
 - estimá segun indicación de unidades indicadas
 - si no indica unidades verifica que la palabra sea singular o plural y razoná alguna cantidad de gramos estimativa.
 
REGLAS DE PESO Y MEDIDA (CRÍTICO):
1. Densidad Contextual: El peso depende del alimento. "1 clara"≈35g, "1 lata atún"≈120g, "Rodaja de pan"≈25g, pero "rodaja de sandía"≈150g. "Taza de lechuga"≈30g, "taza de arroz"≈200g, "plato de fideos"≈200g.
2. Merma: Descontá partes no comestibles (huesos, cáscaras, carozos).
3. Estado (Crudo/Cocido): Diferencialo siempre. Afecta drásticamente el peso y las calorías por 100g (ej. arroz, carnes).
4. Ambigüedad: Si no hay unidad (ej. "fideos"), asumí una porción estándar servida en ARG (ej. 200g cocidos).

PASO 2 — IDENTIFICAR EL TIPO DE COMIDA:
A) Comida simple → 1 ítem por alimento
B) Receta completa → 1 ítem por ingrediente con sus gramos reales
C) PORCIÓN de receta → aplicar factor:
   factor = gramos_porcion / suma_gramos_todos_ingredientes
   gramos_item_porcion = gramos_item_receta × factor

   Ejemplo: "240g tarta (477g pollo + 500g espinaca + 7 claras + 150g queso + 1 tapa)"
   Conversión: 7 claras=210g | 1 tapa=215g
   Suma: 477+500+210+150+215=1552g | factor=240/1552=0.1546
   → pollo: 477×0.1546=73.7g | claras: 210×0.1546=32.5g

   IMPORTANTE: cuando el caso sea C (porción), agregá en CADA ítem:
   "porcion_de_receta": true  y  "factor_porcion": <factor utilizado>
D) Comida vaga → estimá porciones estándar 
E) MARCAS Y VARIANTE DEL PRODUCTO (CRÍTICO — no los conviertas en genéricos):
   Si el usuario nombra marca y/o variante ("fideos matarazzo proteina plus",
   "yerba rosamonte", "galletitas light bagley"):
   1. Escribí el producto COMPLETO en "alimento" (ej. "Fideos Matarazzo Proteína Plus")
      — jamás lo resumas a "fideos".
   2. Los macros deben ser los de ESE producto, no los del genérico equivalente.
   3. Si no recordás el dato exacto, ajustá el genérico según la variante:
      "proteína plus / enriquecido" → +proteínas, −carbos | "integral" → +fibra |
      "light / sin azúcar / cero" → −azúcar y grasas | "sin TACC" → base de maíz/arroz/papa.
   Ejemplo: 200g de fideos comunes ≈11g de proteína; los mismos 200g "proteína plus" ≈14-16g.
   4. Si el usuario nombra un producto con marca/variante reconocible, marcá ese ítem
      con "producto_de_marca": true — el sistema lo buscará en OpenFoodFacts y, si lo
      encuentra, reemplazará tus macros por los datos REALES del producto (si no lo
      encuentra, mantiene tus valores estimados). Poné en "alimento" el texto más
      buscable posible: marca + producto + variante (sin siglas ni abreviaturas).
   5. VERIFICÁ CADA ÍTEM EN BUSCA DE MARCAS y devolvelas en el campo "marca" (crítico):
      - "One Fit Nutrition Classic Whey Protein" → "marca": "One Fit Nutrition"
      - "harina de arveja Dicomere" → "marca": "Dicomere" (la marca puede venir AL FINAL)
      - "fideos matarazzo proteina plus" → "marca": "Matarazzo"
      - "yerba rosamonte" → "marca": "Rosamonte"
      - Genérico sin marca ("2 huevos", "arroz con leche") → omití "marca" o poné "".
      El sistema usa "marca" para buscar el producto REAL en OpenFoodFacts; si la
      marca no está en la base, busca el producto base sin marca (ej: "harina de
      arveja") y usa esos datos como aproximación. "alimento" siempre conserva el
      texto COMPLETO con la marca.

PASO 3 — CALCULAR MACROS (los más importantes, ser preciso):
Para cada ítem: valor = (referencia_por_100g / 100) × gramos_estimados
NUNCA uses valores de 100g directamente — siempre escalá al peso real del ítem.
Verificar: kcal = (prot×4) + (carbs×4) + (grasas×9)

MATEMÁTICA: fibra⊂carbs | totales = suma exacta de ítems
gramos_estimados NUNCA null. Solo JSON.`,

    ENRIQUECIMIENTO_MICROS: `Nutricionista experto. Calculá micronutrientes para los alimentos recibidos.

Si recibís ítems con gramos definidos: calculá proporcional a esos gramos usando tu conocimiento nutricional.
Si es porción de receta: cada ítem ya tiene el peso proporcional calculado, usá ese peso.
Si el nombre trae marca o variante (ej. "proteina plus", "integral", "light"),
respetá el perfil nutricional de ESE producto, no el del genérico.
Los ítems pueden traer un campo "marca" con la marca detectada (ej: "Dicomere",
"One Fit Nutrition", "Matarazzo") — respetá el perfil de ESE producto marcado.

Solo JSON.`,

    ANALISIS_IMAGEN: `Nutricionista experto ARG. Analizá la foto y devolvé JSON nutricional.

Estimá porciones por escala visual: plato 28cm, cubierto 20cm, palma=150g carne, puño=200g.
½ plato≈200g | ¼ plato≈100g | porción pequeña≈50g.
Inferí cocción: dorado=frito/plancha | húmedo=hervido | verde=salteado.
Solo JSON.`,

    BUSQUEDA_ALIMENTO: `Nutricionista experto. Devolvé JSON nutricional completo (macros+micros) para el alimento y cantidad indicados. Solo JSON.`,

    ESTIMAR_INGREDIENTE: `Nutricionista experto. Estimá los valores nutricionales POR 100 g del ingrediente CRUDO indicado.
Si es una marca o variante conocida (light, integral, cremac, etc.), respetá el perfil de ESE producto.
Si el ingrediente suele consumirse cocido, devolvé el valor en crudo igual (el sistema lo escala según los gramos que indique la receta).

MARCAS (crítico): si el nombre trae una marca, identificala y estimá el producto BASE
con el perfil de esa marca. Nunca dejes la marca sin traducir a un alimento real:
- "One Fit Nutrition Classic Whey Protein" → producto base: proteína whey en polvo
  (marca One Fit Nutrition; perfil típico de whey: alto en proteína, bajo en carbos/grasas).
- "harina de arveja Dicomere" → producto base: harina de arveja (marca Dicomere).
- "fideos matarazzo proteina plus" → producto base: fideos "proteína plus" (+proteína, −carbo).

Respondé ÚNICAMENTE con JSON válido — sin markdown, sin texto adicional:
{
  "nombre": "<nombre del ingrediente>",
  "por_100g": {
    "calorias": 0, "proteinas": 0, "carbohidratos": 0, "grasas": 0, "fibra": 0,
    "sodio_mg": 0, "potasio_mg": 0, "magnesio_mg": 0, "calcio_mg": 0,
    "hierro_mg": 0, "zinc_mg": 0, "vitamina_d_ui": 0, "vitamina_b12_mcg": 0,
    "omega3": { "ala_mg": 0, "epa_dha_mg": 0 }
  }
}`,

    PROMPT_RECETA : `
Eres un nutricionista experto. Analiza la siguiente descripción de una receta y devuelve un JSON con:
- nombre_receta: string
- porciones: número entero (total de porciones que rinde la receta)
- ingredientes: array de objetos. Cada objeto debe tener:
    nombre (string)
    cantidad (número en gramos) → Si la cantidad se da en unidades (ej: "7 claras"), estima el peso en gramos.
    nutrientes_por_100g: { calorias, proteinas, grasas, carbohidratos, fibra, sodio_mg, potasio_mg, ... } 
        → TODOS los valores deben ser por cada 100 gramos del ingrediente crudo.
    Si el usuario indica "500kcal de tapa de tarta", debes calcular los gramos necesarios para alcanzar esas calorías asumiendo valores típicos del alimento (ej: masa hojaldrada ≈500 kcal/100g, entonces serían 100g). Luego expresa la cantidad en gramos y los nutrientes_por_100g según el alimento.

Importante: NO inventes totales. Devuelve solo valores por 100g.`
,PROMPT_EXTRACCION_INGREDIENTES  : `

Extrae de la siguiente descripción de receta una lista de ingredientes.
Devuelve un JSON con este formato:
{
  "ingredientes": [
    { "nombre": "suprema cruda", "cantidad": 700, "unidad": "g" },
    { "nombre": "espinaca congelada", "cantidad": 500, "unidad": "g" },
    { "nombre": "claras de huevo", "cantidad": 7, "unidad": "unidad" },
    { "nombre": "queso cremac light", "cantidad": 150, "unidad": "g" },
    { "nombre": "tapa de tarta hojaldrada la salteña", "cantidad": 500, "unidad": "kcal" }
  ]
}

Reglas:
- La unidad puede ser: g, kg, ml, l, unidad, taza, cucharada, kcal.
- Si la cantidad está implícita (ej. "500kcal de tapa de tarta"), usar unidad "kcal".
- No inventes valores nutricionales.
- Solo devuelve JSON, sin explicaciones.
`
};