import{initializeApp as e}from"https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";import{GoogleAuthProvider as t,createUserWithEmailAndPassword as n,getAuth as r,sendPasswordResetEmail as i,signInWithEmailAndPassword as a,signInWithPopup as o,signOut as s}from"https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";import{addDoc as c,collection as l,deleteDoc as u,doc as d,getDoc as f,getDocs as p,getFirestore as m,increment as h,limit as g,query as _,serverTimestamp as v,setDoc as y,updateDoc as b}from"https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";typeof globalThis==`object`&&globalThis.__COIPO_FIREBASE__;var x={apiKey:`AIzaSyAN3zmC2Z5arHy3Mw_DW2wu56VMCjTZ708`,authDomain:`coachnutricional-5da25.firebaseapp.com`,projectId:`coachnutricional-5da25`,storageBucket:`coachnutricional-5da25.firebasestorage.app`,messagingSenderId:`74727736016`,appId:`1:74727736016:web:96d93e3d9ad1d4f3b794d5`},S=Object.entries({apiKey:`VITE_FIREBASE_API_KEY`,authDomain:`VITE_FIREBASE_AUTH_DOMAIN`,projectId:`VITE_FIREBASE_PROJECT_ID`,storageBucket:`VITE_FIREBASE_STORAGE_BUCKET`,messagingSenderId:`VITE_FIREBASE_MESSAGING_SENDER_ID`,appId:`VITE_FIREBASE_APP_ID`}).filter(([e])=>!x[e]).map(([,e])=>e);S.length>0&&console.error(`❌ [Firebase] Falta la config pública: ${S.join(`, `)}. Opción A (recomendada): corré la app con Vite — \`npm run dev\` o \`npm run build\` — para que esas variables se lean de .env. Opción B: si servís el HTML sin Vite, pegá tu config pública en window.__COIPO_FIREBASE__ (hay una plantilla comentada en index.html).`);var C=e(x),w=r(C),T=m(C),E=new t;E.setCustomParameters({prompt:`select_account`});var D={loginWithGoogle:async()=>{try{return{user:(await o(w,E)).user,error:null}}catch(e){return console.error(`Error Google Auth:`,e.code),{user:null,error:e.message}}},loginWithEmail:async(e,t)=>{try{return{user:(await a(w,e,t)).user,error:null}}catch(e){return{user:null,error:e.message}}},registerWithEmail:async(e,t)=>{try{return{user:(await n(w,e,t)).user,error:null}}catch(e){return{user:null,error:e.message}}},resetPassword:async e=>{try{return await i(w,e),{success:!0,error:null}}catch(e){return{success:!1,error:e.message}}},logout:()=>s(w)},ee=e=>{let{edad:t,peso:n,altura:r,sexo:i,objetivo:a,nivel_actividad:o,tipo_dieta:s=`omnivoro`}=e,c=i===`hombre`,l=!c,u=10*n+6.25*r-5*t;u=c?u+5:u-161;let d=u*({sedentario:1.2,ligero:1.375,moderado:1.55,intenso:1.725,atleta:1.9}[o]??1.2),f;f=a===`perder_peso`?d*.8:a===`volumen`?d*1.1:d,f=Math.max(f,c?1500:1200);let p;p=t>=65?{perder_peso:1.8,volumen:1.6,mantener:1.2}[a]??1.2:{perder_peso:2.2,volumen:1.8,mantener:1.6}[a]??1.6,(s===`vegetariano`||s===`vegano`)&&(p=+(p*1.1).toFixed(2));let m=Math.round(n*p),h=Math.round(f*(a===`mantener`?.3:.25)/9),g=Math.round(n*.7),_=Math.max(h,g),v=f-m*4-_*9,y=Math.max(Math.round(v/4),100),b=m*4+_*9+y*4,x=Math.round(f/1e3*14),S=n*35;o===`atleta`?S+=1e3:o===`intenso`?S+=750:o===`moderado`&&(S+=500);let C=t>50?1500:2300,w;w=t<19?c?410:360:t<=30?c?400:310:c?420:320;let T=o===`sedentario`?3500:4700,E;E=t<18?1300:t>70?1200:1e3;let D=s===`vegano`?Math.round(E*1.15):E,ee=t>70?800:600,O;O=t<19?c?11:15:l&&t<=50?18:8;let te=s===`vegetariano`||s===`vegano`?Math.round(O*1.8):O,k;k=t<19?c?11:9:c?11:8;let A=s===`vegetariano`||s===`vegano`?Math.round(k*1.5):k,ne={meta_mcg:2.4,requiere_suplemento:s===`vegano`||s===`vegetariano`,nota:s===`vegano`||s===`vegetariano`?`La B12 no está presente en alimentos vegetales. Se requiere suplementación diaria o semanal.`:null},re;return re=s===`omnivoro`||s===`pescetariano`?{epa_dha_mg:500,ala_mg:c?1600:1100,fuentes:s===`pescetariano`?[`salmón`,`sardinas`,`atún`,`caballa`,`suplemento fish oil`]:[`salmón`,`sardinas`,`atún`,`nueces`,`semillas de lino`,`suplemento fish oil`],nota:null}:{epa_dha_mg:null,ala_mg:Math.round((c?1600:1100)*1.6),fuentes:[`semillas de chía`,`semillas de lino`,`nueces`,`cáñamo`,`aceite de lino`],nota:`La conversión de ALA a EPA/DHA es del 5–10%. Se recomienda suplementar con aceite de algas (alga DHA) para cubrir la meta cardiovascular de 500mg EPA+DHA.`},{tmb:Math.round(u),mantenimiento:Math.round(d),kcal:Math.round(b),proteina:m,grasas:_,carbos:y,fibra:x,agua:Math.round(S),sodio:C,magnesio:w,potasio:T,calcio:D,vitaminaD:ee,hierro:te,zinc:A,vitaminaB12:ne,omega3:re,meta:{tipo_dieta:s,ajuste_proteina_dieta:s===`vegetariano`||s===`vegano`?`+10% por baja biodisponibilidad proteica vegetal (DIAAS)`:null}}},O=e=>!e||!e.nombre?``:{ESQUEMA_RAPIDO:`{
  "items": [
    { "alimento": "Fideos Matarazzo Proteína Plus (cocidos)", "marca": "Matarazzo", "estado_coccion": "cocido", "producto_de_marca": true, "gramos_estimados": 200, "calorias": 277, "proteinas": 14, "carbohidratos": 50, "grasas": 1.5, "fibra": 3 },
    { "alimento": "Harina de arveja Dicomere", "marca": "Dicomere", "producto_de_marca": true, "gramos_estimados": 30, "calorias": 108, "proteinas": 7.5, "carbohidratos": 16.5, "grasas": 1.5, "fibra": 5.7 },
    { "alimento": "Atún al natural", "estado_coccion": "crudo", "gramos_estimados": 80, "calorias": 93, "proteinas": 20.8, "carbohidratos": 0, "grasas": 0.8, "fibra": 0 }
  ],
  "totales_comida": { "total_calorias": 478, "total_proteinas": 42.3, "total_carbohidratos": 66.5, "total_grasas": 3.8, "total_fibra": 8.7 }
}`,ESQUEMA_MICROS:`{
  "items_micros": [
    { "alimento": "Fideos cocidos", "sodio_mg": 1, "potasio_mg": 44, "magnesio_mg": 18, "calcio_mg": 7, "hierro_mg": 0.5, "zinc_mg": 0.5, "vitamina_d_ui": 0, "vitamina_b12_mcg": 0, "omega3": { "ala_mg": 0, "epa_dha_mg": 0 } },
    { "alimento": "Atún al natural", "sodio_mg": 320, "potasio_mg": 355, "magnesio_mg": 28, "calcio_mg": 10, "hierro_mg": 1.0, "zinc_mg": 0.6, "vitamina_d_ui": 214, "vitamina_b12_mcg": 2.0, "omega3": { "ala_mg": 0, "epa_dha_mg": 240 } }
  ],
  "totales_micros": { "total_sodio_mg": 321, "total_potasio_mg": 399, "total_magnesio_mg": 46, "total_calcio_mg": 17, "total_hierro_mg": 1.5, "total_zinc_mg": 1.1, "total_vitamina_d_ui": 214, "total_vitamina_b12_mcg": 2.0, "total_omega3": { "ala_mg": 0, "epa_dha_mg": 240 } }
}`,ESQUEMA_RECETA:`{
  "nombre_receta": "Tarta de espinaca y queso",
  "porciones_totales": 6,
  "ingredientes": [
    { "nombre": "suprema cruda", "cantidad": 700, "unidad": "g", "por_100g": { "calorias": 165, "proteinas": 20, "grasas": 3, "carbohidratos": 0, "fibra": 0, "sodio_mg": 50, "potasio_mg": 350 } },
    { "nombre": "espinaca congelada", "cantidad": 500, "unidad": "g", "por_100g": { "calorias": 23, "proteinas": 3, "grasas": 0, "carbohidratos": 3, "fibra": 2, "sodio_mg": 10, "potasio_mg": 470 } }
  ]
}`}[e.nombre]??``,te={nombre:`ESQUEMA_RAPIDO`},k={nombre:`ESQUEMA_MICROS`},A={ANALISIS_RAPIDO:`Nutricionista experto ARG. Devolvé JSON nutricional.

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
gramos_estimados NUNCA null. Solo JSON.`,ENRIQUECIMIENTO_MICROS:`Nutricionista experto. Calculá micronutrientes para los alimentos recibidos.

Si recibís ítems con gramos definidos: calculá proporcional a esos gramos usando tu conocimiento nutricional.
Si es porción de receta: cada ítem ya tiene el peso proporcional calculado, usá ese peso.
Si el nombre trae marca o variante (ej. "proteina plus", "integral", "light"),
respetá el perfil nutricional de ESE producto, no el del genérico.
Los ítems pueden traer un campo "marca" con la marca detectada (ej: "Dicomere",
"One Fit Nutrition", "Matarazzo") — respetá el perfil de ESE producto marcado.

Solo JSON.`,ANALISIS_IMAGEN:`Nutricionista experto ARG. Analizá la foto y devolvé JSON nutricional.

Estimá porciones por escala visual: plato 28cm, cubierto 20cm, palma=150g carne, puño=200g.
½ plato≈200g | ¼ plato≈100g | porción pequeña≈50g.
Inferí cocción: dorado=frito/plancha | húmedo=hervido | verde=salteado.
Solo JSON.`,BUSQUEDA_ALIMENTO:`Nutricionista experto. Devolvé JSON nutricional completo (macros+micros) para el alimento y cantidad indicados. Solo JSON.`,ESTIMAR_INGREDIENTE:`Nutricionista experto. Estimá los valores nutricionales POR 100 g del ingrediente CRUDO indicado.
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
}`,PROMPT_RECETA:`
Eres un nutricionista experto. Analiza la siguiente descripción de una receta y devuelve un JSON con:
- nombre_receta: string
- porciones: número entero (total de porciones que rinde la receta)
- ingredientes: array de objetos. Cada objeto debe tener:
    nombre (string)
    cantidad (número en gramos) → Si la cantidad se da en unidades (ej: "7 claras"), estima el peso en gramos.
    nutrientes_por_100g: { calorias, proteinas, grasas, carbohidratos, fibra, sodio_mg, potasio_mg, ... } 
        → TODOS los valores deben ser por cada 100 gramos del ingrediente crudo.
    Si el usuario indica "500kcal de tapa de tarta", debes calcular los gramos necesarios para alcanzar esas calorías asumiendo valores típicos del alimento (ej: masa hojaldrada ≈500 kcal/100g, entonces serían 100g). Luego expresa la cantidad en gramos y los nutrientes_por_100g según el alimento.

Importante: NO inventes totales. Devuelve solo valores por 100g.`,PROMPT_EXTRACCION_INGREDIENTES:`

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
`},ne=`/api/sugerencias`,re=3e4,ie=0,j={allOnCooldown:()=>ie>Date.now(),msUntilNextKey:()=>Math.max(0,ie-Date.now()),marcarSaturado:(e=6e4)=>{ie=Date.now()+e},limpiar:()=>{ie=0}},ae=async()=>{let e=w.currentUser;if(!e)return null;try{return await e.getIdToken()}catch{return null}},oe=e=>{let t=String(e??``).trim();t=t.replace(/^```(?:json)?\s*/i,``).replace(/\s*```\s*$/,``);try{return JSON.parse(t)}catch{let e=t.indexOf(`{`),n=t.lastIndexOf(`}`);if(e===-1||n===-1||n<=e)throw Error(`RESPUESTA_INVALIDA`);return JSON.parse(t.slice(e,n+1))}},se=async({tipo:e,systemPrompt:t,userContent:n})=>{let r=w.currentUser;if(!r)throw Error(`SIN_SESION`);let i;try{i=await r.getIdToken()}catch{throw Error(`SIN_SESION`)}let a=new AbortController,o=setTimeout(()=>a.abort(),re);try{let r=await fetch(ne,{method:`POST`,headers:{"Content-Type":`application/json`,Authorization:`Bearer ${i}`},body:JSON.stringify({tipo:e,systemPrompt:t,userContent:n}),signal:a.signal});if(r.status!==429&&j.limpiar(),r.status===429){let e=Number(r.headers.get(`Retry-After`))||60;throw j.marcarSaturado(e*1e3),Error(`SATURADO`)}if(r.status===401||r.status===403)throw Error(`SESION_INVALIDA`);if(!r.ok)throw Error(`HTTP_${r.status}`);let o=await r.json().catch(()=>null);if(!o)throw Error(`RESPUESTA_VACIA`);if(o.data!==void 0&&o.data!==null)return o.data;if(o.contenido)return oe(o.contenido);throw Error(`RESPUESTA_VACIA`)}catch(e){throw e?.name===`AbortError`?Error(`TIMEOUT`):e instanceof TypeError?Error(`RED`):e}finally{clearTimeout(o)}},ce=`/api/openfoodfacts`,le=5e3,ue=.66,de=new Set([`de`,`del`,`la`,`el`,`los`,`las`,`con`,`y`,`en`,`al`,`un`,`una`,`porcion`,`x`]),fe=new Set([`crudo`,`cruda`,`cocido`,`cocida`,`frito`,`frita`,`hervido`,`hervida`,`natural`,`dorado`,`dorada`,`salteado`,`salteada`,`plancha`,`horno`,`caliente`]),M=e=>String(e??``).toLowerCase().normalize(`NFD`).replace(/[\u0300-\u036f]/g,``),N=e=>M(e).replace(/\([^)]*\)/g,` `).replace(/[^a-z0-9 ]/g,` `).split(/\s+/).filter(e=>e.length>1&&!de.has(e)&&!fe.has(e)),P=(e,t)=>e===t||e.replace(/s$/,``)===t.replace(/s$/,``)||e.length>=4&&t.length>=4&&(e.startsWith(t)||t.startsWith(e)),F=e=>typeof e==`number`&&!isNaN(e)?e:0,pe=e=>new Promise(t=>setTimeout(t,e)),me=async e=>{let t=await ae();if(!t)return null;let n=`${ce}?q=${encodeURIComponent(e)}&page_size=20`;for(let e=0;e<2;e++){let e=new AbortController,r=setTimeout(()=>e.abort(),le);try{let r=await fetch(n,{signal:e.signal,headers:{Accept:`application/json`,Authorization:`Bearer ${t}`}}),i=r.headers.get(`content-type`)||``;if(r.ok&&i.includes(`json`))return await r.json();if(r.status===429||r.status>=500){await pe(1200);continue}return null}catch{return null}finally{clearTimeout(r)}}return null},he=(e,t)=>{let n=e.nutriments||{},r=N(`${e.product_name||e.product_name_es||``} ${e.brands||``}`),i=t.filter(e=>r.some(t=>P(e,t)));return{score:t.length?i.length/t.length:0,extras:r.filter(e=>!t.some(t=>P(t,e))).length,completo:typeof n.proteins_100g==`number`&&typeof n.carbohydrates_100g==`number`&&typeof n.fat_100g==`number`&&Number(n[`energy-kcal_100g`])>0}},ge=async(e,t=null)=>{if(!e||typeof e!=`string`)return null;let n=N(e);if(n.length===0)return null;let r=t?N(t):[],i=r.length?n.filter(e=>!r.some(t=>P(e,t))):n,a=[{consulta:M(e).replace(/\([^)]*\)/g,` `).trim(),tokens:n,base:!1}];r.length&&i.length>0&&i.length<n.length&&a.push({consulta:i.join(` `),tokens:i,base:!0}),n.length>=3&&a.push({consulta:n.slice(1).join(` `),tokens:n,base:!1});let o=new Set,s=a.filter(e=>o.has(e.consulta)?!1:(o.add(e.consulta),!0));for(let e=0;e<s.length;e++){let t=s[e];e>0&&await pe(600);let n=await me(t.consulta);if(!n?.products?.length)continue;let i=n.products.filter(e=>e.product_name||e.product_name_es).map(e=>({p:e,...he(e,t.tokens)})).filter(e=>e.completo&&e.score>=ue).sort((e,t)=>t.score-e.score||e.extras-t.extras);if(i.length===0)continue;let a=i[0].p,o=a.nutriments||{},c=N(a.brands||``),l=r.some(e=>c.some(t=>P(e,t))),u=r.length>0&&!l;return{nombre:a.product_name||a.product_name_es,marca:a.brands||null,por_100g:{calorias:F(o[`energy-kcal_100g`]),proteinas:F(o.proteins_100g),carbohidratos:F(o.carbohydrates_100g),grasas:F(o.fat_100g),fibra:F(o.fiber_100g),sodio_mg:F(o.sodium_100g)*1e3,potasio_mg:F(o.potassium_100g),magnesio_mg:F(o.magnesium_100g),calcio_mg:F(o.calcium_100g),hierro_mg:F(o.iron_100g),zinc_mg:F(o.zinc_100g),omega3:{ala_mg:F(o[`alpha-linolenic-acid_100g`]),epa_dha_mg:F(o.epa_100g)+F(o.dha_100g)}},fuente:`openfoodfacts`,es_generica:u}}return null},_e={allOnCooldown:()=>j.allOnCooldown(),msUntilNextKey:()=>j.msUntilNextKey()},I={ANALISIS:`analisis_rapido`,MICROS:`micros`,IMAGEN:`imagen`,BUSQUEDA:`busqueda`,RECETA:`receta`,ESTIMAR:`estimar`},L=(e,t)=>`${e}

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

${O(t)}`,R={SATURADO:`RATE_LIMIT: El asistente está saturado. Intentá en 1 minuto.`,SIN_SESION:`Tu sesión expiró. Entrá de nuevo para continuar.`,SESION_INVALIDA:`Tu sesión expiró. Entrá de nuevo para continuar.`,RED:`Sin conexión — probá de nuevo.`,TIMEOUT:`Tardó demasiado — probá de nuevo.`,RESPUESTA_VACIA:`No pude entender la respuesta. Probá una vez más.`,RESPUESTA_INVALIDA:`No pude entender la respuesta. Probá una vez más.`},ve=e=>R[e]?R[e]:typeof e==`string`&&e.startsWith(`HTTP_`)?`El asistente no respondió. Probá de nuevo.`:e||`No se pudo consultar a la IA. Intentá de nuevo.`;async function ye(e,t,n,r=8e3,i=I.ANALISIS){let a=t,o=L(e,n);try{return await se({tipo:i,systemPrompt:o,userContent:a})}catch(e){throw Error(ve(e?.message))}}var be=new Map,xe=(e,t)=>{let n=Number(e.gramos_estimados)||0,r=String(e.estado_coccion||``).toLowerCase(),i=r.includes(`crudo`)||r.includes(`seco`),a=String(e.alimento||``).toLowerCase(),o=String(t.nombre||``).toLowerCase(),s=/(spaghet|fideo|pasta|macarr|penne|fusilli|tirabuz|tallar|mostac|arroz|cuscus|polenta|quinoa|amaranto|avena)/.test(a)||/(spaghet|fideo|pasta|macarr|penne|fusilli|tirabuz|tallar|mostac|arroz|cuscus|polenta|quinoa|amaranto|avena)/.test(o),c=/(cocido|preparado|listo|congelado)/.test(o);return s&&!c&&!i&&n>=140?n/(a.includes(`avena`)?3:2.3):n},Se=async e=>{let t=e?.items,n=[];if(!Array.isArray(t)||t.length===0)return{resultado:e,microsOFF:n};let r=t.filter(e=>!e.porcion_de_receta&&(e.producto_de_marca===!0||typeof e.marca==`string`&&e.marca.trim()!==``));if(r.length===0)return{resultado:e,microsOFF:n};if(await Promise.all(r.map(async e=>{try{let t=`${e.alimento}§${e.marca||``}`,r=be.get(t);if(r===void 0&&(r=await ge(e.alimento,e.marca||null),be.set(t,r)),!r){console.log(`🔎 OFF: sin coincidencia para "${e.alimento}" → se mantienen los valores estimados por IA`);return}let i=xe(e,r);if(!i||i<=0)return;let a=i/100,o=r.por_100g,s=e=>Math.round(e*10)/10,c=e=>Math.round(e);e.calorias=s(o.calorias*a),e.proteinas=s(o.proteinas*a),e.carbohidratos=s(o.carbohidratos*a),e.grasas=s(o.grasas*a),e.fibra=s(o.fibra*a),e.fuente_datos=`openfoodfacts`;let l=r.es_generica?` — match genérico (marca "${e.marca}" sin dato en OFF)`:`${r.marca?` (`+r.marca+`)`:``} — datos reales aplicados`;console.log(`✅ OFF: "${e.alimento}" → "${r.nombre}"${l} a ${Math.round(i)}g`),n.push({alimento:e.alimento,sodio_mg:c(o.sodio_mg*a),potasio_mg:c(o.potasio_mg*a),magnesio_mg:c(o.magnesio_mg*a),calcio_mg:c(o.calcio_mg*a),hierro_mg:Math.round(o.hierro_mg*a*10)/10,zinc_mg:Math.round(o.zinc_mg*a*10)/10,omega3:{ala_mg:c(o.omega3.ala_mg*a),epa_dha_mg:c(o.omega3.epa_dha_mg*a)},fuente_datos:`openfoodfacts`})}catch(t){console.warn(`⚠️ OFF falló para "${e.alimento}":`,t.message)}})),t.some(e=>e.fuente_datos===`openfoodfacts`)){let n=e=>Math.round(t.reduce((t,n)=>t+(Number(n[e])||0),0)*100)/100;e.totales_comida={total_calorias:n(`calorias`),total_proteinas:n(`proteinas`),total_carbohidratos:n(`carbohidratos`),total_grasas:n(`grasas`),total_fibra:n(`fibra`)}}return{resultado:e,microsOFF:n}};function Ce(e){let t=`Analizá: "${e}"`,n=[],r=ye(A.ANALISIS_RAPIDO,t,te,5e3,I.ANALISIS).then(async e=>{let{resultado:t,microsOFF:r}=await Se(e);return n=r,t});return{rapido:r,microsPromise:r.then(async t=>{let r=(t.items||[]).filter(e=>e.fuente_datos!==`openfoodfacts`);if(r.length===0)return console.log(`🧪 Micros: resueltos 100% con OpenFoodFacts (sin llamada a IA)`),{items_micros:n,fuente:`openfoodfacts`};let i=r.map(t=>t.porcion_de_receta&&t.factor_porcion?[`Porción de receta: "${t.alimento}" (${t.gramos_estimados}g consumidos)`,`Factor de porción aplicado: ${t.factor_porcion.toFixed(4)}`,`Descripción completa de la receta: ${e}`,`INSTRUCCIÓN: Extraé cada ingrediente de la receta, calculá su peso proporcional`,`multiplicando su cantidad por ${t.factor_porcion.toFixed(4)},`,`y calculá los micronutrientes de cada uno. Luego sumalos todos.`].join(` `):`${t.alimento} (${t.gramos_estimados}g, ${t.estado_coccion})`).join(` | `),a=await new Promise(e=>setTimeout(e,2e3)).then(()=>ye(A.ENRIQUECIMIENTO_MICROS,`Calculá micronutrientes para: ${i}`,k,8e3,I.MICROS));return n.length===0?a:{...a,items_micros:[...a.items_micros||[],...n]}})}}var we=async e=>{let t=await ye(`Eres un asistente nutricionista. Tu tarea es extraer de la descripción de la receta su nombre y la lista de ingredientes con cantidades, unidades y marcas.

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
- Respondé solo con el JSON.`,`Descripción: "${e}"`,null,1e4,I.RECETA);if(!t.ingredientes)throw Error(`La respuesta no contiene ingredientes`);return t},Te=e=>{if(!e||typeof e!=`object`)return!1;let t=[`calorias`,`proteinas`,`carbohidratos`,`grasas`];return t.every(t=>typeof e[t]==`number`&&Number.isFinite(e[t])&&e[t]>=0)?t.some(t=>e[t]>0)||[`fibra`,`sodio_mg`,`potasio_mg`,`magnesio_mg`,`calcio_mg`,`hierro_mg`,`zinc_mg`].some(t=>typeof e[t]==`number`&&e[t]>0):!1};async function Ee(e){let t=await ye(A.ESTIMAR_INGREDIENTE,`Ingrediente: "${e}"`,null,6e3,I.ESTIMAR),n=t?.por_100g;if(!Te(n))throw Error(`La IA no devolvió valores por 100g válidos para "${e}"`);return{nombre:t.nombre||e,por_100g:n}}var De=async(e,t,n,r=``)=>{try{let i=n||new Date().toISOString().split(`T`)[0],a=l(T,`usuarios`,e,`ingestas_diarias`,i,`comidas`),o=d(T,`usuarios`,e,`resumen_diario`,i),{items:s}=t,u=e=>Number(Math.round(e+`e+2`)+`e-2`),f={total_calorias:u(s.reduce((e,t)=>e+(Number(t.calorias)||0),0)),total_proteinas:u(s.reduce((e,t)=>e+(Number(t.proteinas)||0),0)),total_carbohidratos:u(s.reduce((e,t)=>e+(Number(t.carbohidratos)||0),0)),total_grasas:u(s.reduce((e,t)=>e+(Number(t.grasas)||0),0)),total_fibra:u(s.reduce((e,t)=>e+(Number(t.fibra)||0),0)),confianza_general:s.some(e=>e.confianza===`baja`)?`baja`:s.some(e=>e.confianza===`media`)?`media`:`alta`},p=s.some(e=>e.porcion_de_receta===!0);console.log(`📊 Totales recalculados:`,f);let m=await c(a,{alimentos:s,resumen_macros:f,resumen_micros:null,micros_completos:!1,confianza_general:f.confianza_general,formato:`texto`,descripcion_original:r,es_porcion_receta:p,creado_el:v()});return await y(o,{acumulado_calorias:h(f.total_calorias),acumulado_proteinas:h(f.total_proteinas),acumulado_carbohidratos:h(f.total_carbohidratos),acumulado_grasas:h(f.total_grasas),acumulado_fibra:h(f.total_fibra),ultima_actualizacion:v()},{merge:!0}),m.id}catch(e){throw console.error(`Error en crearRegistroComida:`,e),e}},Oe=async(e,t,n,r)=>{try{let i=d(T,`usuarios`,e,`ingestas_diarias`,t,`comidas`,n),a=d(T,`usuarios`,e,`resumen_diario`,t),{items_micros:o}=r,s=e=>Number(Math.round(e+`e+2`)+`e-2`),c={total_sodio_mg:s(o.reduce((e,t)=>e+(Number(t.sodio_mg)||0),0)),total_potasio_mg:s(o.reduce((e,t)=>e+(Number(t.potasio_mg)||0),0)),total_magnesio_mg:s(o.reduce((e,t)=>e+(Number(t.magnesio_mg)||0),0)),total_calcio_mg:s(o.reduce((e,t)=>e+(Number(t.calcio_mg)||0),0)),total_hierro_mg:s(o.reduce((e,t)=>e+(Number(t.hierro_mg)||0),0)),total_zinc_mg:s(o.reduce((e,t)=>e+(Number(t.zinc_mg)||0),0)),total_vitamina_d_ui:s(o.reduce((e,t)=>e+(Number(t.vitamina_d_ui)||0),0)),total_vitamina_b12_mcg:s(o.reduce((e,t)=>e+(Number(t.vitamina_b12_mcg)||0),0)),total_omega3:{ala_mg:s(o.reduce((e,t)=>e+(Number(t.omega3?.ala_mg)||0),0)),epa_dha_mg:s(o.reduce((e,t)=>e+(Number(t.omega3?.epa_dha_mg)||0),0))}};await b(i,{items_micros:o,resumen_micros:c,micros_completos:!0}),await y(a,{acumulado_sodio_mg:h(c.total_sodio_mg),acumulado_potasio_mg:h(c.total_potasio_mg),acumulado_magnesio_mg:h(c.total_magnesio_mg),acumulado_calcio_mg:h(c.total_calcio_mg),acumulado_hierro_mg:h(c.total_hierro_mg),acumulado_zinc_mg:h(c.total_zinc_mg),acumulado_vitamina_d_ui:h(c.total_vitamina_d_ui),acumulado_vitamina_b12_mcg:h(c.total_vitamina_b12_mcg),acumulado_omega3_ala_mg:h(c.total_omega3.ala_mg),acumulado_omega3_epa_dha_mg:h(c.total_omega3.epa_dha_mg),ultima_actualizacion:v()},{merge:!0}),console.log(`✅ Micros enriquecidos matemáticamente en background para doc:`,n)}catch(e){console.warn(`⚠️ Error al enriquecer micros (no crítico):`,e)}},ke=async(e,t,n)=>{try{let r=l(T,`usuarios`,e,`ingestas_diarias`,t,`comidas`),i=d(T,`usuarios`,e,`ingestas_diarias`,t,`comidas`,n.id),a=d(T,`usuarios`,e,`resumen_diario`,t);await u(i);let o=await p(r),s=n.micros_completos&&n.resumen_micros?n.resumen_micros:null;if(o.empty)await b(a,{acumulado_calorias:0,acumulado_proteinas:0,acumulado_carbohidratos:0,acumulado_grasas:0,acumulado_fibra:0,acumulado_sodio_mg:0,acumulado_potasio_mg:0,acumulado_magnesio_mg:0,acumulado_calcio_mg:0,acumulado_hierro_mg:0,acumulado_zinc_mg:0,acumulado_vitamina_d_ui:0,acumulado_vitamina_b12_mcg:0,acumulado_omega3_ala_mg:0,acumulado_omega3_epa_dha_mg:0}),console.log(`Última comida eliminada. Resumen reseteado a 0.`);else{let e={acumulado_calorias:h(-(n.resumen_macros?.total_calorias||0)),acumulado_proteinas:h(-(n.resumen_macros?.total_proteinas||0)),acumulado_carbohidratos:h(-(n.resumen_macros?.total_carbohidratos||0)),acumulado_grasas:h(-(n.resumen_macros?.total_grasas||0)),acumulado_fibra:h(-(n.resumen_macros?.total_fibra||0))};s&&(e.acumulado_sodio_mg=h(-(s.total_sodio_mg||0)),e.acumulado_potasio_mg=h(-(s.total_potasio_mg||0)),e.acumulado_magnesio_mg=h(-(s.total_magnesio_mg||0)),e.acumulado_calcio_mg=h(-(s.total_calcio_mg||0)),e.acumulado_hierro_mg=h(-(s.total_hierro_mg||0)),e.acumulado_zinc_mg=h(-(s.total_zinc_mg||0)),e.acumulado_vitamina_d_ui=h(-(s.total_vitamina_d_ui||0)),e.acumulado_vitamina_b12_mcg=h(-(s.total_vitamina_b12_mcg||0)),e.acumulado_omega3_ala_mg=h(-(s.total_omega3?.ala_mg||0)),e.acumulado_omega3_epa_dha_mg=h(-(s.total_omega3?.epa_dha_mg||0))),await b(a,e)}return!0}catch(e){throw console.error(`Error al eliminar ingesta:`,e),e}},Ae=async(e,t,n)=>{try{let{id:r,...i}=n,a=l(T,`usuarios`,e,`ingestas_diarias`,t,`comidas`),o=d(T,`usuarios`,e,`resumen_diario`,t);await c(a,i);let s=n.micros_completos&&n.resumen_micros?n.resumen_micros:null,u={acumulado_calorias:h(n.resumen_macros?.total_calorias||0),acumulado_proteinas:h(n.resumen_macros?.total_proteinas||0),acumulado_carbohidratos:h(n.resumen_macros?.total_carbohidratos||0),acumulado_grasas:h(n.resumen_macros?.total_grasas||0),acumulado_fibra:h(n.resumen_macros?.total_fibra||0)};return s&&(u.acumulado_sodio_mg=h(s.total_sodio_mg||0),u.acumulado_potasio_mg=h(s.total_potasio_mg||0),u.acumulado_magnesio_mg=h(s.total_magnesio_mg||0),u.acumulado_calcio_mg=h(s.total_calcio_mg||0),u.acumulado_hierro_mg=h(s.total_hierro_mg||0),u.acumulado_zinc_mg=h(s.total_zinc_mg||0),u.acumulado_vitamina_d_ui=h(s.total_vitamina_d_ui||0),u.acumulado_vitamina_b12_mcg=h(s.total_vitamina_b12_mcg||0),u.acumulado_omega3_ala_mg=h(s.total_omega3?.ala_mg||0),u.acumulado_omega3_epa_dha_mg=h(s.total_omega3?.epa_dha_mg||0)),await b(o,u),!0}catch(e){throw console.error(`Error al restaurar ingesta:`,e),e}},je=async(e,t,n)=>{try{return await y(d(T,`usuarios`,e,`resumen_diario`,t),{vasos_agua:h(n),ultima_actualizacion:v()},{merge:!0}),!0}catch(e){throw console.error(`Error al actualizar hidratación:`,e),e}},Me=5e3,Ne=e=>e.toLowerCase().trim().normalize(`NFD`).replace(/[\u0300-\u036f]/g,``).replace(/[^a-z0-9]/g,`_`),z=(e={},t,n=1)=>{let r=e[t];return typeof r==`number`&&!isNaN(r)?Number(r)*n:0},B=(e,t=1)=>typeof e!=`number`||isNaN(e)?0:Math.round(e*10**t)/10**t,Pe=async(e,t=Me,n=void 0)=>{let r=new AbortController,i=setTimeout(()=>r.abort(),t);try{let t=await fetch(e,{signal:r.signal,headers:n});return clearTimeout(i),t}catch(e){throw clearTimeout(i),e}},Fe=async()=>{let e=await ae();return e?{Authorization:`Bearer ${e}`}:null},Ie=async e=>{if(!e||typeof e!=`string`)return console.warn(`❌ Código de barras inválido`),null;try{let t=await Fe();if(!t)return console.warn(`⚠️ Sin sesión: no se consulta OFF por código`),null;let n=await Pe(`/api/openfoodfacts?barcode=${encodeURIComponent(e)}`,Me,t);if(!n.ok)return console.warn(`⚠️ HTTP ${n.status} para código ${e}`),null;let r=await n.json();if(r.status!==1||!r.product)return null;let i=r.product,a=i.nutriments??{};return{barcode:e,nombre:i.product_name||i.product_name_es||`Producto sin nombre`,marca:i.brands??null,imagen_url:i.image_front_url??null,por_100g:{calorias:z(a,`energy-kcal_100g`),proteinas:z(a,`proteins_100g`),carbohidratos:z(a,`carbohydrates_100g`),grasas:z(a,`fat_100g`),fibra:z(a,`fiber_100g`),sodio_mg:z(a,`sodium_100g`,1e3),potasio_mg:z(a,`potassium_100g`),magnesio_mg:z(a,`magnesium_100g`),calcio_mg:z(a,`calcium_100g`),hierro_mg:z(a,`iron_100g`),zinc_mg:z(a,`zinc_100g`),omega3:{ala_mg:z(a,`alpha-linolenic-acid_100g`),epa_dha_mg:z(a,`epa_100g`)+z(a,`dha_100g`)}},fuente:`openfoodfacts`}}catch(t){return t.name===`AbortError`?console.warn(`⏱️ Timeout buscando código ${e}`):console.warn(`❌ Error en OFF (código):`,t.message),null}},Le=async e=>{if(!e)return null;try{let t=d(T,`productos_globales`,e),n=await f(t);return n.exists()?(console.log(`✅ Producto encontrado en BD local`),await b(t,{veces_escaneado:h(1),ultimo_escaneo:v()}),{...n.data(),fuente:`base_propia`}):(console.log(`🔍 Buscando código ${e} en OpenFoodFacts...`),await Ie(e))}catch(e){return console.warn(`❌ Error buscando producto:`,e.message),null}},Re=async(e,t)=>{if(!e||!t?.barcode)return console.warn(`❌ Faltan datos: userId o barcode`),!1;try{let{barcode:n}=t,r=d(T,`productos_globales`,n);return(await f(r)).exists()?(await b(r,{veces_escaneado:h(1),ultimo_aportante:e,ultimo_escaneo:v()}),console.log(`📈 Producto existente actualizado`),!0):(await y(r,{...t,aportado_por:e,verificado:!1,veces_escaneado:1,creado_el:v()}),console.log(`✅ Producto nuevo guardado:`,t.nombre),!0)}catch(e){return console.error(`❌ Error guardando producto:`,e.message),!1}},ze=(e,t)=>{if(!e?.por_100g||typeof t!=`number`||t<=0)return console.warn(`❌ Datos inválidos para calcular porción`),null;let n=t/100,r=e.por_100g;return{alimento:e.nombre,marca:e.marca||null,gramos_estimados:t,calorias:B(r.calorias*n,1),proteinas:B(r.proteinas*n,1),carbohidratos:B(r.carbohidratos*n,1),grasas:B(r.grasas*n,1),fibra:B(r.fibra*n,1),sodio_mg:B(r.sodio_mg*n,0),potasio_mg:B(r.potasio_mg*n,0),magnesio_mg:B(r.magnesio_mg*n,0),calcio_mg:B(r.calcio_mg*n,0),hierro_mg:B(r.hierro_mg*n,1),zinc_mg:B(r.zinc_mg*n,1),omega3:{ala_mg:B(r.omega3.ala_mg*n,0),epa_dha_mg:B(r.omega3.epa_dha_mg*n,0)},fuente_datos:e.fuente}},Be=async(e,t=null)=>{if(!e||typeof e!=`string`)return console.warn(`❌ Nombre de ingrediente inválido`),null;try{let n=Ne(e),r=d(T,`ingredientes_base`,n),i=await f(r);if(i.exists())return console.log(`✅ Ingrediente encontrado en BD local`),{id:n,...i.data(),fuente:`base_propia`};console.log(`🔍 Buscando "${e}"${t?` (marca: ${t})`:``} en OpenFoodFacts...`);let a=await ge(e,t);return a?(a.es_generica&&console.log(`ℹ️ "${e}" → match genérico "${a.nombre}" (marca "${t}" sin dato en OFF)`),await y(r,{nombre:a.nombre,por_100g:a.por_100g,fuente:`openfoodfacts`,es_generica:!!a.es_generica,creado_el:v()}),console.log(`✅ Ingrediente guardado en BD para caché`),{id:n,...a,fuente:`openfoodfacts`}):(console.warn(`⚠️ No se encontró "${e}" en OpenFoodFacts`),null)}catch(e){return console.error(`❌ Error obteniendo ingrediente:`,e.message),null}},Ve={g:1,gr:1,grs:1,kg:1e3,mg:.001,ml:1,cc:1,l:1e3,cucharada:15,cucharadita:5,cda:15,cdta:5,cdita:5,tbsp:15,tsp:5,taza:240,tazas:240,cup:240,sobre:1.5,sobres:1.5},He={"clara de huevo":33,"claras de huevo":33,"huevo entero":50,"rodaja de pan":30,diente:5,puñado:30,pizca:1,huevo:50,sobre:1.5,edulcorante:1.5},Ue={"tapa de tarta hojaldrada":500,"tapa de tarta":300,"masa hojaldrada":500,aceite:900,azúcar:400,manteca:720},We=e=>{if(typeof e==`number`)return isNaN(e)?null:e;if(typeof e!=`string`)return null;let t=e.trim().replace(`,`,`.`);if(t.includes(`/`)){let[e,n]=t.split(`/`).map(e=>parseFloat(e.trim()));return isNaN(e)||isNaN(n)||n===0?null:e/n}let n=parseFloat(t);return isNaN(n)?null:n},Ge=(e,t,n,r=``)=>{let i=We(t);if(i===null||i<=0)return console.warn(`⚠️ Cantidad inválida: "${t}"`),null;let a=(n||``).toLowerCase().trim(),o=(r||``).toLowerCase().trim();if(!a)return console.warn(`⚠️ Unidad vacía para "${r}"`),null;if(a in Ve)return Math.round(i*Ve[a]*100)/100;if(a===`unidad`||a===`unidades`){for(let[e,t]of Object.entries(He))if(o.includes(e))return Math.round(i*t*100)/100;return Math.round(i*100*100)/100}if(a===`kcal`){let e=200;for(let[t,n]of Object.entries(Ue))if(o.includes(t)){e=n;break}return Math.round(i/e*100*100)/100}return console.warn(`⚠️ Unidad no reconocida: "${n}" para "${r}"`),null},Ke=(e,t,n)=>{let r=Number(t),i=Number(n);if(!(r>0)||!(i>0))return e;let a=r/i*100;if(!(a>0))return e;let o=Math.max(a,Number(e)||0);return(o>0?Math.abs(a-e)/o:0)>.01?Math.round(a*100)/100:e},qe=e=>{let t=Number(e?.peso_total_g);if(Number.isFinite(t)&&t>0)return Math.round(t*100)/100;let n=(e?.ingredientes||[]).reduce((e,t)=>e+(Number(t?.cantidad_g??t?.cantidad)||0),0);return Math.round(n*100)/100},Je=(e,t)=>{let n=Number(t);if(!Number.isFinite(n)||n<=0)throw Error(`Los gramos consumidos deben ser mayores a 0`);let r=qe(e);if(r<=0)throw Error(`La receta no tiene peso registrado. Volvé a crearla con "Nueva Receta".`);let i=n/r,a=e=>Math.round(e*100)/100,o=e.totales_macros_completa||e.totales_macros,s=e.totales_macros_porcion,c=t=>{if(o)return(Number(o[t])||0)*i;if(s){let i=r/(Number(e.porciones_totales)||1);return(Number(s[t])||0)*(i>0?n/i:0)}return 0},l={total_calorias:a(c(`calorias`)),total_proteinas:a(c(`proteinas`)),total_carbohidratos:a(c(`carbohidratos`)),total_grasas:a(c(`grasas`)),total_fibra:a(c(`fibra`))},u=Number(e.porciones_totales)||1,d=e.totales_micros_porcion||e.totales_micros||{},f=e=>a((Number(d[e])||0)*u*i),p={total_sodio_mg:f(`sodio_mg`),total_potasio_mg:f(`potasio_mg`),total_magnesio_mg:f(`magnesio_mg`),total_calcio_mg:f(`calcio_mg`),total_hierro_mg:f(`hierro_mg`),total_zinc_mg:f(`zinc_mg`),total_vitamina_d_ui:f(`vitamina_d_ui`),total_vitamina_b12_mcg:f(`vitamina_b12_mcg`),total_omega3:{ala_mg:f(`omega3_ala_mg`),epa_dha_mg:f(`omega3_epa_dha_mg`)}};return{factor:Math.round(i*1e6)/1e6,gramos:n,peso_total_g:r,macros:l,micros:p}},Ye=(e,t)=>{let n=Array.isArray(e?.items)?e.items:[];if(n.length===0)throw Error(`No se pudieron analizar los ingredientes extra`);let r=e=>Math.round(e*100)/100,i=e=>r(n.reduce((t,n)=>t+(Number(n[e])||0),0)),a={total_calorias:i(`calorias`),total_proteinas:i(`proteinas`),total_carbohidratos:i(`carbohidratos`),total_grasas:i(`grasas`),total_fibra:i(`fibra`)},o=Array.isArray(t?.items_micros)?t.items_micros:[],s=e=>r(o.reduce((t,n)=>t+(Number(n[e])||0),0));return{items:n,macros:a,micros:{total_sodio_mg:s(`sodio_mg`),total_potasio_mg:s(`potasio_mg`),total_magnesio_mg:s(`magnesio_mg`),total_calcio_mg:s(`calcio_mg`),total_hierro_mg:s(`hierro_mg`),total_zinc_mg:s(`zinc_mg`),total_vitamina_d_ui:s(`vitamina_d_ui`),total_vitamina_b12_mcg:s(`vitamina_b12_mcg`),total_omega3:{ala_mg:r(o.reduce((e,t)=>e+(Number(t?.omega3?.ala_mg)||0),0)),epa_dha_mg:r(o.reduce((e,t)=>e+(Number(t?.omega3?.epa_dha_mg)||0),0))}},con_micros:o.length>0}},Xe=(e,t,n=null)=>{let r=Je(e,t),i=e=>Math.round(e*100)/100,a=r.factor,o={...r.macros},s={...r.micros,total_omega3:{...r.micros.total_omega3}},c=(Array.isArray(e.ingredientes)?e.ingredientes:[]).map(t=>{let n=t.nutrientes_por_100g||{},r=i((Number(t.cantidad_g??t.cantidad)||0)*a),o=e=>i((Number(n[e])||0)*r/100);return{alimento:t.nombre,...t.marca?{marca:t.marca}:{},gramos_estimados:r,calorias:o(`calorias`),proteinas:o(`proteinas`),carbohidratos:o(`carbohidratos`),grasas:o(`grasas`),fibra:o(`fibra`),es_ingrediente_receta:!0,receta_id:e.id}});if(c.length===0&&c.push({alimento:e.nombre,gramos_estimados:r.gramos,calorias:o.total_calorias,proteinas:o.total_proteinas,carbohidratos:o.total_carbohidratos,grasas:o.total_grasas,fibra:o.total_fibra,es_receta:!0,receta_id:e.id}),n?.items?.length){for(let e of n.items)c.push({alimento:e.alimento,...e.marca?{marca:e.marca}:{},gramos_estimados:e.gramos_estimados||0,calorias:e.calorias||0,proteinas:e.proteinas||0,carbohidratos:e.carbohidratos||0,grasas:e.grasas||0,fibra:e.fibra||0});for(let e of Object.keys(o))o[e]=i(o[e]+(Number(n.macros?.[e])||0));if(n.con_micros)for(let e of Object.keys(s))e===`total_omega3`?(s.total_omega3.ala_mg=i(s.total_omega3.ala_mg+(Number(n.micros?.total_omega3?.ala_mg)||0)),s.total_omega3.epa_dha_mg=i(s.total_omega3.epa_dha_mg+(Number(n.micros?.total_omega3?.epa_dha_mg)||0))):s[e]=i(s[e]+(Number(n.micros?.[e])||0))}return{alimentos:c,macros:o,micros:s}},Ze=e=>{let t=e.nombre_receta??e.nombre,n=Number(e.porciones_totales??e.porciones_sugeridas)||1;if(!t)throw Error(`Falta el nombre de la receta`);if(!e.ingredientes?.length)throw Error(`Faltan los ingredientes`);let r=e.totales_macros_completa??(e.totales_macros_porcion?Object.fromEntries(Object.entries(e.totales_macros_porcion).map(([e,t])=>[e,(t||0)*n])):null),i=e.totales_macros_porcion??(r?Object.fromEntries(Object.entries(r).map(([e,t])=>[e,(t||0)/n])):null);if(!i)throw Error(`Faltan los macros de la receta`);let a=qe(e),o=[`calorias`,`proteinas`,`carbohidratos`,`grasas`,`fibra`],s=(e,t)=>e?.[t]||0;return{nombre:t,porciones_totales:n,descripcion:e.descripcion||``,peso_total_g:a,peso_por_porcion_g:a>0?Math.round(a/n*100)/100:0,valores_por_100g:e.valores_por_100g||null,ingredientes:(e.ingredientes||[]).map(e=>{let t=e.nutrientes_por_100g||{};return{nombre:e.nombre,marca:e.marca||null,cantidad_g:e.cantidad_g??e.cantidad??0,nutrientes_por_100g:{calorias:t.calorias??e.calorias??0,proteinas:t.proteinas??e.proteinas??0,carbohidratos:t.carbohidratos??e.carbohidratos??0,grasas:t.grasas??e.grasas??0,fibra:t.fibra??e.fibra??0,sodio_mg:t.sodio_mg??e.sodio_mg??0,potasio_mg:t.potasio_mg??e.potasio_mg??0,magnesio_mg:t.magnesio_mg??e.magnesio_mg??0,calcio_mg:t.calcio_mg??e.calcio_mg??0,hierro_mg:t.hierro_mg??e.hierro_mg??0,zinc_mg:t.zinc_mg??e.zinc_mg??0,vitamina_d_ui:t.vitamina_d_ui??e.vitamina_d_ui??0,vitamina_b12_mcg:t.vitamina_b12_mcg??e.vitamina_b12_mcg??0,omega3_ala_mg:t.omega3_ala_mg??e.omega3_ala_mg??0,omega3_epa_dha_mg:t.omega3_epa_dha_mg??e.omega3_epa_dha_mg??0}}}),totales_macros_completa:Object.fromEntries(o.map(e=>[e,s(r,e)])),totales_macros_porcion:Object.fromEntries(o.map(e=>[e,s(i,e)])),totales_micros_porcion:e.totales_micros_porcion||{sodio_mg:0,potasio_mg:0,magnesio_mg:0,calcio_mg:0,hierro_mg:0,zinc_mg:0,vitamina_d_ui:0,vitamina_b12_mcg:0,omega3_ala_mg:0,omega3_epa_dha_mg:0}}},Qe=async(e,t)=>(await c(l(T,`usuarios`,e,`recetas`),{...Ze(t),creado_el:v()})).id,$e=async(e,t,n)=>{if(!e||!t)throw Error(`Faltan datos para actualizar la receta`);return await b(d(T,`usuarios`,e,`recetas`,t),{...Ze(n),actualizado_el:v()}),!0},et=async e=>(await p(l(T,`usuarios`,e,`recetas`))).docs.map(e=>({id:e.id,...e.data()})),tt=async(e,t)=>{if(!e||!t)throw Error(`Faltan datos para eliminar la receta`);return await u(d(T,`usuarios`,e,`recetas`,t)),!0},nt=async(e,t)=>{if(!e||!t)throw Error(`Faltan datos para restaurar la receta`);let{id:n,...r}=t;return{id:(await c(l(T,`usuarios`,e,`recetas`),r)).id,...r}},rt=async(e,t,n,r,i=null)=>{let{alimentos:a,macros:o,micros:s}=Xe(n,r,i),u=e=>s[e]||0,f=l(T,`usuarios`,e,`ingestas_diarias`,t,`comidas`),p=d(T,`usuarios`,e,`resumen_diario`,t),m=await c(f,{alimentos:a,resumen_macros:o,resumen_micros:s,micros_completos:!0,confianza_general:`alta`,formato:`receta`,descripcion:(n.nombre||`Receta`).trim(),creado_el:v()});return await y(p,{acumulado_calorias:h(o.total_calorias),acumulado_proteinas:h(o.total_proteinas),acumulado_carbohidratos:h(o.total_carbohidratos),acumulado_grasas:h(o.total_grasas),acumulado_fibra:h(o.total_fibra),acumulado_sodio_mg:h(u(`total_sodio_mg`)),acumulado_potasio_mg:h(u(`total_potasio_mg`)),acumulado_magnesio_mg:h(u(`total_magnesio_mg`)),acumulado_calcio_mg:h(u(`total_calcio_mg`)),acumulado_hierro_mg:h(u(`total_hierro_mg`)),acumulado_zinc_mg:h(u(`total_zinc_mg`)),acumulado_vitamina_d_ui:h(u(`total_vitamina_d_ui`)),acumulado_vitamina_b12_mcg:h(u(`total_vitamina_b12_mcg`)),acumulado_omega3_ala_mg:h(s.total_omega3.ala_mg),acumulado_omega3_epa_dha_mg:h(s.total_omega3.epa_dha_mg),ultima_actualizacion:v()},{merge:!0}),m.id},it=async(e,t)=>{if(!e?.nombre||!t||t<=0)return console.warn(`❌ Ingrediente o gramos inválido`),null;try{let n=await Be(e.nombre,e.marca),r=n?.fuente||null;if(!n){console.log(`🤖 "${e.nombre}" sin dato en OFF — pidiendo estimación a la IA...`);try{n=await Ee(e.nombre),r=`ia_estimado`}catch(t){console.warn(`⚠️ Estimación IA falló para "${e.nombre}":`,t.message)}}if(!n)return console.warn(`⚠️ No se encontró: "${e.nombre}"`),null;let i=t/100,a={};for(let[e,t]of Object.entries(n.por_100g))typeof t==`number`?a[e]=Math.round(t*i*100)/100:e===`omega3`&&t&&typeof t==`object`&&(a.omega3_ala_mg=Math.round((t.ala_mg||0)*i*100)/100,a.omega3_epa_dha_mg=Math.round((t.epa_dha_mg||0)*i*100)/100);return{nombre:e.nombre,marca:e.marca||null,cantidad_g:t,nutrientes_por_100g:n.por_100g,nutrientes_totales:a,fuente:r||`desconocida`}}catch(t){return console.error(`Error enriqueciendo ${e.nombre}:`,t),null}},at=e=>{let t={};if(e.length>0){let n=e[0].nutrientes_totales;for(let e of Object.keys(n))t[e]=0}return e.forEach(e=>{for(let[n,r]of Object.entries(e.nutrientes_totales))t[n]=(t[n]||0)+r}),t},ot=(e,t)=>{if(t<=0)return{};let n={},r=100/t;for(let[t,i]of Object.entries(e))n[t]=Math.round(i*r*100)/100;return n},st=async e=>{if(!e?.ingredientes||e.ingredientes.length===0)throw Error(`No hay ingredientes para procesar`);let t=[],n=0,r=[];console.log(`📋 Procesando ${e.ingredientes.length} ingredientes...`);for(let i of e.ingredientes){let e=Ge(i,i.cantidad,i.unidad,i.nombre);if(!e||e<=0){r.push({nombre:i.nombre,razon:`No se pudo convertir "${i.cantidad} ${i.unidad}"`});continue}let a=await it(i,e);if(!a){r.push({nombre:i.nombre,razon:`No se encontró en OpenFoodFacts`});continue}if(String(i.unidad||``).toLowerCase()===`kcal`){let e=Number(a.nutrientes_por_100g?.calorias)||0,t=Ke(a.cantidad_g,i.cantidad,e);if(t!==a.cantidad_g){let n=t/100;for(let[e,t]of Object.entries(a.nutrientes_por_100g||{}))typeof t==`number`?a.nutrientes_totales[e]=Math.round(t*n*100)/100:e===`omega3`&&t&&typeof t==`object`&&(a.nutrientes_totales.omega3_ala_mg=Math.round((t.ala_mg||0)*n*100)/100,a.nutrientes_totales.omega3_epa_dha_mg=Math.round((t.epa_dha_mg||0)*n*100)/100);a.cantidad_g=t,console.log(`🎯 kcal exactas: "${i.nombre}" → ${t}g para ${i.cantidad} kcal (${e} kcal/100g reales)`)}}t.push(a),n+=a.cantidad_g}if(t.length===0)throw Error(`No se pudieron procesar ingredientes válidos`);r.length>0&&console.warn(`⚠️ Ingredientes no procesados:`,r);let i=at(t),a=ot(i,n);return{ingredientesEnriquecidos:t,pesoTotalGramos:n,totales:i,valoresPor100g:a,ingredientesFallidos:r,precisacionProcesamiento:`${t.length}/${e.ingredientes.length} ingredientes`}},ct=(e,t,n,r=1)=>{if(!e||!n)throw Error(`Datos insuficientes para guardar receta`);let{ingredientesEnriquecidos:i,pesoTotalGramos:a,totales:o,valoresPor100g:s}=e,c=Math.max(1,Number(r)||1),l=[`calorias`,`proteinas`,`carbohidratos`,`grasas`,`fibra`],u=[`sodio_mg`,`potasio_mg`,`magnesio_mg`,`calcio_mg`,`hierro_mg`,`zinc_mg`,`vitamina_d_ui`,`vitamina_b12_mcg`,`omega3_ala_mg`,`omega3_epa_dha_mg`],d=Object.fromEntries(l.map(e=>[e,e===`calorias`?Math.round(o[e]||0):Math.round((o[e]||0)*10)/10])),f=Object.fromEntries(l.map(e=>[e,Math.round(d[e]/c*10)/10])),p={sodio_mg:o.sodio_mg||0,potasio_mg:o.potasio_mg||0,magnesio_mg:o.magnesio_mg||0,calcio_mg:o.calcio_mg||0,hierro_mg:o.hierro_mg||0,zinc_mg:o.zinc_mg||0,vitamina_d_ui:o.vitamina_d_ui||0,vitamina_b12_mcg:o.vitamina_b12_mcg||0,omega3_ala_mg:o.omega3_ala_mg??o.omega3?.ala_mg??0,omega3_epa_dha_mg:o.omega3_epa_dha_mg??o.omega3?.epa_dha_mg??0},m=Object.fromEntries(u.map(e=>[e,Math.round(p[e]/c*10)/10]));return{nombre:n.trim(),porciones_totales:c,descripcion:(t||``).trim(),peso_total_g:a,peso_por_porcion_g:Math.round(a/c*100)/100,ingredientes:i.map(e=>{let t=e.nutrientes_por_100g||{};return{nombre:e.nombre,marca:e.marca||null,cantidad_g:e.cantidad_g,fuente:e.fuente,nutrientes_por_100g:{...t,omega3_ala_mg:t.omega3_ala_mg??t.omega3?.ala_mg??0,omega3_epa_dha_mg:t.omega3_epa_dha_mg??t.omega3?.epa_dha_mg??0}}}),totales_macros_completa:d,totales_macros_porcion:f,totales_micros_porcion:m,valores_por_100g:s,valores_por_porcion:Object.entries(s).reduce((e,[t,n])=>(e[t]=Math.round(a/c*n*100)/100,e),{}),version:1}},lt=`/api/buscar-alimentos`,ut=12e3,dt=3,ft=`coipo_buscar_alimentos_v1`,pt=40,mt=new Map,ht=()=>{try{let e=sessionStorage.getItem(ft),t=e?JSON.parse(e):null;return t&&typeof t==`object`?t:{}}catch{return{}}},gt=e=>{try{sessionStorage.setItem(ft,JSON.stringify(e))}catch{}},V=null,_t=e=>String(e||``).trim().toLowerCase().replace(/\s+/g,` `),vt=async e=>{let t=_t(e);if(t.length<dt)return{estado:`corto`,resultados:[]};if(mt.has(t))return{estado:`ok`,resultados:mt.get(t)};if(V===null&&(V=ht()),Array.isArray(V[t]))return mt.set(t,V[t]),{estado:`ok`,resultados:V[t]};let n=await ae();if(!n)return{estado:`error`,resultados:[],mensaje:`Tu sesión expiró. Entrá de nuevo para continuar.`};let r=new AbortController,i=setTimeout(()=>r.abort(),ut);try{let e=await fetch(`${lt}?q=${encodeURIComponent(t)}`,{headers:{Accept:`application/json`,Authorization:`Bearer ${n}`},signal:r.signal}),i=await e.json().catch(()=>null);if(e.status===401)return{estado:`error`,resultados:[],mensaje:`Tu sesión expiró. Entrá de nuevo para continuar.`};if(!e.ok)return{estado:`error`,resultados:[],mensaje:i?.error||`No se pudo buscar ahora. Probá de nuevo en unos segundos.`};let a=Array.isArray(i?.resultados)?i.resultados:[];mt.set(t,a),V===null&&(V=ht()),V[t]=a;let o=Object.keys(V);if(o.length>pt)for(let e of o.slice(0,o.length-pt))delete V[e];return gt(V),{estado:a.length?`ok`:`vacio`,resultados:a}}catch(e){return e?.name===`AbortError`?{estado:`error`,resultados:[],mensaje:`La búsqueda tardó demasiado. Probá de nuevo.`}:{estado:`error`,resultados:[],mensaje:`Sin conexión con la base de alimentos.`}}finally{clearTimeout(i)}},yt=e=>({barcode:e.codigo||null,nombre:e.nombre,marca:e.marca||null,imagen_url:e.imagen||null,por_100g:{calorias:Number(e.kcal100)||0,proteinas:Number(e.p100)||0,carbohidratos:Number(e.c100)||0,grasas:Number(e.g100)||0,fibra:0,sodio_mg:0,potasio_mg:0,magnesio_mg:0,calcio_mg:0,hierro_mg:0,zinc_mg:0,omega3:{ala_mg:0,epa_dha_mg:0}},fuente:e.fuente===`propio`?`base_propia`:`openfoodfacts`}),bt=`productos`,xt=200,St=5,Ct=3,wt=e=>String(e||``).toLowerCase().normalize(`NFD`).replace(/[\u0300-\u036f]/g,``).replace(/\s+/g,` `).trim(),Tt=(e,t)=>wt(`${e||``} ${t||``}`).replace(/[^a-z0-9]+/g,`-`).replace(/^-+|-+$/g,``).slice(0,80)||`p-${Date.now()}`,H=e=>{let t=Number(e);return Number.isFinite(t)?t:null},Et=(e,t)=>{if(!t||!e)return-1;if(t===e)return 0;if(t.startsWith(e))return 1;let n=e.split(` `).filter(e=>e.length>=Ct);if(!n.length)return-1;if(n.length>1&&n.every(e=>t.includes(e)))return 2;let r=n.reduce((e,t)=>t.length>=e.length?t:e,n[0]);return t.includes(r)?3:-1},Dt=e=>{let t=e&&typeof e.por_100g==`object`?e.por_100g:{},n=H(t.calorias),r=typeof e.nombre==`string`?e.nombre.trim():``;return!r||n===null||n<=0?null:{codigo:null,nombre:r,marca:typeof e.marca==`string`&&e.marca.trim()?e.marca.trim():null,imagen:typeof e.imagen_url==`string`?e.imagen_url:null,kcal100:n,p100:H(t.proteinas)??0,c100:H(t.carbohidratos)??0,g100:H(t.grasas)??0,porcion_g:H(e.porcion_g),fuente:`propio`}},Ot=async(e,t)=>{if(!e)return[];let n=wt(t);if(n.length<Ct)return[];try{let t=await p(_(l(T,`usuarios`,e,bt),g(xt))),r=[];return t.forEach(e=>{let t=e.data()||{},i=Et(n,wt(`${t.nombre||``} ${t.marca||``}`));if(i<0)return;let a=Dt(t);a&&r.push({puntos:i,veces:H(t.veces_usado)||0,resultado:a})}),r.sort((e,t)=>e.puntos-t.puntos||t.veces-e.veces).slice(0,St).map(e=>e.resultado)}catch(e){return console.warn(`⚠️ Sin productos propios (Firestore):`,e?.message||e),[]}},kt=async(e,t)=>{if(!e||!t?.nombre)return!1;let n=H(t.por_100g?.calorias);if(n===null||n<=0)return!1;try{return await y(d(T,`usuarios`,e,bt,Tt(t.nombre,t.marca)),{nombre:String(t.nombre).trim().slice(0,120),marca:t.marca?String(t.marca).trim().slice(0,80):null,imagen_url:typeof t.imagen_url==`string`?t.imagen_url:null,porcion_g:H(t.porcion_g),por_100g:{calorias:n,proteinas:H(t.por_100g.proteinas)??0,carbohidratos:H(t.por_100g.carbohidratos)??0,grasas:H(t.por_100g.grasas)??0},origen:t.origen===`manual`?`manual`:`ia`,veces_usado:h(1),creado_el:v(),uso_el:v()},{merge:!0}),!0}catch(e){return console.warn(`⚠️ No se pudo guardar el producto propio:`,e?.message||e),!1}},At=async(e,t)=>{if(!(!e||!Array.isArray(t)||t.length===0))for(let n of t){let t=Number(n?.gramos_estimados)||0;if(!n?.alimento||t<=0||n.fuente_datos===`openfoodfacts`)continue;let r=100/t;await kt(e,{nombre:n.alimento,marca:n.marca||null,origen:n.origen||`ia`,por_100g:{calorias:(Number(n.calorias)||0)*r,proteinas:(Number(n.proteinas)||0)*r,carbohidratos:(Number(n.carbohidratos)||0)*r,grasas:(Number(n.grasas)||0)*r}})}},jt=async(e,t,n)=>{if(!(!e||!t))try{await b(d(T,`usuarios`,e,bt,Tt(t,n)),{veces_usado:h(1),uso_el:v()})}catch(e){console.warn(`⚠️ No se pudo registrar el uso:`,e?.message||e)}},U={QUE_COMER:`QUE_COMER`,COMPLETAR_PROTEINA:`COMPLETAR_PROTEINA`,ENTRAR_EN_CALORIAS:`ENTRAR_EN_CALORIAS`,COMIDA_ACTUAL:`COMIDA_ACTUAL`,LIVIANO:`LIVIANO`,CENA_FINAL:`CENA_FINAL`,GUSTO:`GUSTO`,LIBRE:`LIBRE`,ALTERNATIVA:`ALTERNATIVA`},Mt=[`desayuno`,`almuerzo`,`merienda`,`cena`,`snack`],Nt=e=>{let t=Number(e);return t>=6&&t<11?`desayuno`:t>=11&&t<16?`almuerzo`:t>=16&&t<20?`merienda`:`cena`},Pt=(e,t)=>{let n=e=>Math.round((Number(e)||0)*100)/100;return{kcal:n((Number(e?.kcal)||0)-(Number(t?.acumulado_calorias)||0)),p:n((Number(e?.proteina)||0)-(Number(t?.acumulado_proteinas)||0)),c:n((Number(e?.carbos)||0)-(Number(t?.acumulado_carbohidratos)||0)),g:n((Number(e?.grasas)||0)-(Number(t?.acumulado_grasas)||0))}},Ft=[{nombre:`Infusión (mate, té o café sin azúcar)`,kcal:2,p:.2,c:.4,g:0},{nombre:`Fruta chica (mandarina o ½ manzana)`,kcal:45,p:.5,c:11,g:.2},{nombre:`Yogur descremado chico (100 g)`,kcal:40,p:4,c:5,g:.5}],It=1200,Lt=e=>Number(e?.kcal)>0?e.kcal<100?{accion:`MINIMAS`,opciones:Ft}:{accion:`IA`}:{accion:`COMPLETADO`,mensaje:`Ya completaste tus calorías de hoy`},Rt=(e,t,n=It)=>(Number(e)||0)<n&&(Number(t)||0)<100?`Tu día todavía está por debajo del mínimo de ${n} kcal: preferí algo con más energía que una infusión.`:null,zt=e=>String(e??``).replace(/[\u0000-\u001F\u007F]/g,` `).replace(/\s+/g,` `).trim().slice(0,100),Bt=[{clave:`sabor`,texto:`¿Te va algo dulce o salado?`,opciones:[{v:`dulce`,l:`Dulce`},{v:`salado`,l:`Salado`},{v:`indiferente`,l:`Me da igual`}]},{clave:`hambre`,texto:`¿Cuánta hambre tenés ahora?`,opciones:[{v:`poca`,l:`Poca`},{v:`media`,l:`Media`},{v:`mucha`,l:`Mucha`}]},{clave:`ayuno`,texto:`¿Ya rompiste el ayuno?`,opciones:[{v:`rompio`,l:`Ya comí`},{v:`en_ayunas`,l:`Sigo en ayuno`}]},{clave:`entrenamiento`,texto:`¿Cómo viene tu entrenamiento?`,opciones:[{v:`pre`,l:`Antes de entrenar`},{v:`post`,l:`Después de entrenar`},{v:`libre`,l:`No estoy entrenando`}]}],Vt=(e,t=new Date().getHours())=>{let n=Bt;switch(e){case U.LIBRE:case U.ALTERNATIVA:return[];case U.GUSTO:return n.filter(e=>e.clave===`sabor`||e.clave===`hambre`);case U.LIVIANO:return n.filter(e=>e.clave===`hambre`||e.clave===`sabor`);case U.CENA_FINAL:return n.filter(e=>e.clave!==`ayuno`);default:return Number(t)<13?n:n.filter(e=>e.clave!==`ayuno`)}},Ht=e=>Number(e)<12?`en_ayunas`:`rompio`,Ut={sin_lactosa:/(queso|leche|yogur|crema|manteca|lacteo|lactosa|muzzarella|mozzarella|ricotta|parmesano|requeson)/i,sin_gluten:/(fideos|pan |harina|pastaf|masa |tapa de tarta|gallet|cuscus|pancott|tallarines|spaghetti|pizza)/i,vegetariano:/(pollo|carne|milanesa|merluza|atun|pescado|salmon|jamon|chorizo|bondiol|langostino|camaron|almeja|pulpo|tuco)/i,vegano:/(pollo|carne|milanesa|merluza|atun|pescado|salmon|jamon|chorizo|queso|leche|yogur|crema |manteca|huevo|clara|yema|miel)/i,sin_frutos_secos:/(nuez|almendra|avellana|mani|castana|maranon|pecana|walnut)/i,sin_mariscos:/(langostino|camaron|mejillon|calamar|pulpo|marisco|almeja|reneguia)/i,sin_huevo:/(huevo|clara|yema|omelet|tortilla de|huevo duro)/i},Wt=e=>{let t=String(e||``).toLowerCase();return t===`vegano`?[`vegano`]:t===`vegetariano`?[`vegetariano`]:[]},Gt=e=>{let t=Array.isArray(e?.restricciones)?e.restricciones:[],n=Wt(e?.tipo_dieta);return[...new Set([...t,...n])]},Kt=(e,t=[])=>{let n=(t||[]).map(e=>Ut[e]).filter(Boolean);return n.length?(e||[]).filter(e=>{let t=e.ingredientes||[];return t.length?!t.some(e=>n.some(t=>t.test(String(e?.nombre||``)))):!1}):[...e||[]]},qt=(e,t=[])=>{let n=new Set((t||[]).filter(Boolean).map(String));return n.size?(e||[]).filter(e=>!n.has(String(e.id))):[...e||[]]},Jt=(e,t,n,r=6)=>{let i=n===U.LIVIANO?Math.min(Number(t?.kcal)||0,250):Number(t?.kcal)||0,a=e=>{let r=Number(e.kcal)||0,a=r>i?(r-i)*2:0,o=-Math.abs(r-i);return n===U.COMPLETAR_PROTEINA?o-Math.abs((Number(e.p)||0)-(Number(t?.p)||0))*15-a:n===U.LIVIANO?o-r*.3-a:n===U.GUSTO?o+r*.1:o-a};return[...e||[]].map(e=>({r:e,s:a(e)})).sort((e,t)=>t.s-e.s).slice(0,Math.max(1,r)).map(e=>e.r)},Yt=e=>(e||[]).map(e=>({id:e.id,n:e.nombre,kcal:Math.round(Number(e.kcal)||0),p:Math.round((Number(e.p)||0)*10)/10,c:Math.round((Number(e.c)||0)*10)/10,g:Math.round((Number(e.g)||0)*10)/10})),Xt=e=>{let t=e?.totales_macros_porcion||{},n=Number(t.calorias)||0;if(n>0)return{id:e.id,nombre:e.nombre,kcal:n,p:Number(t.proteinas)||0,c:Number(t.carbohidratos)||0,g:Number(t.grasas)||0};let r=e?.totales_macros_completa||{},i=Number(e?.porciones_totales)||1;return{id:e.id,nombre:e.nombre,kcal:(Number(r.calorias)||0)/i,p:(Number(r.proteinas)||0)/i,c:(Number(r.carbohidratos)||0)/i,g:(Number(r.grasas)||0)/i}},Zt=e=>{let t=String(e?.objetivo||``).toLowerCase();return t.includes(`perder`)?`deficit`:t.includes(`volumen`)||t.includes(`musculo`)?`superavit`:`mantener`},Qt=({intent:e,momento:t,objetivo:n,contexto:r,restante:i,restricciones:a,recetas:o,textoLibre:s=``})=>({intent:e,momento:t,objetivo:n||`mantener`,contexto:{sabor:r?.sabor||`indiferente`,hambre:r?.hambre||`media`,ayuno:r?.ayuno||`rompio`,entrenamiento:r?.entrenamiento||`libre`},restante:{kcal:Math.round(Number(i?.kcal)||0),p:Math.round(Number(i?.p)||0),c:Math.round(Number(i?.c)||0),g:Math.round(Number(i?.g)||0)},restricciones:a||[],recetas:o||[],texto_libre:zt(s)}),$t=[.5,.75,1,1.25,1.5],en=e=>{if(!e||typeof e!=`object`)throw Error(`RESPUESTA_INVALIDA`);if(e.error===`fuera_de_tema`||e.error===`consulta_profesional`)return{error:e.error};let t=(Array.isArray(e.sugerencias)?e.sugerencias:[]).filter(e=>e&&e.receta_id!=null&&e.factor!=null).map(e=>({receta_id:e.receta_id,factor:$t.includes(Number(e.factor))?Number(e.factor):1,motivo:String(e.motivo||``).slice(0,120)})).slice(0,3),n=null;e.libre&&typeof e.libre==`object`&&e.libre.nombre&&(n={nombre:String(e.libre.nombre).slice(0,60),kcal:Math.max(0,Number(e.libre.kcal)||0),p:Math.max(0,Number(e.libre.p)||0),c:Math.max(0,Number(e.libre.c)||0),g:Math.max(0,Number(e.libre.g)||0),estimado:!0,entra:e.libre.entra!==!1,motivo:String(e.libre.motivo||``).slice(0,120)});let r=e.nota?String(e.nota).slice(0,200):``;if(!t.length&&!n&&!r)throw Error(`RESPUESTA_INVALIDA`);return{sugerencias:t,libre:n,nota:r}},tn=(e,t)=>{let n=Number(t)||1,r=Number(e?.peso_total_g)||0,i=Number(e?.porciones_totales)||1,a=Number(e?.peso_por_porcion_g)>0?Number(e.peso_por_porcion_g):r>0?r/i:0;return a<=0?0:Math.round(a*n*100)/100},nn=(e,t)=>`${e}§${Math.round((Number(t)||0)/50)}`,rn=3,an=2,on=3e3,sn=20,cn=new Map,ln=0,un={saturado:`El asistente está saturado. Probá de nuevo en un minuto.`,conexion:`No pude conectar con el asistente. Revisá tu conexión y probá de nuevo.`,respuesta:`No pude entender la respuesta. Probá una vez más.`,limitado:`Demasiadas consultas por ahora. Esperá un momento y volvé a intentar.`,sesion:`Tu sesión expiró. Entrá de nuevo para continuar.`},dn=async e=>{if(j.allOnCooldown())throw Error(`SATURADO`);let t=null;for(let n=0;n<rn;n++)try{return await se({tipo:`sugerencias`,userContent:e})}catch(e){if(t=e.message,e.message===`SATURADO`||e.message===`SIN_SESION`||e.message===`SESION_INVALIDA`)break}throw Error(t||`RED`)},fn=e=>{let t=String(e||``).trim();t=t.replace(/^```(?:json)?\s*/i,``).replace(/\s*```\s*$/,``);try{return JSON.parse(t)}catch{let e=t.indexOf(`{`),n=t.lastIndexOf(`}`);if(e===-1||n===-1||n<=e)throw Error(`RESPUESTA_INVALIDA`);return JSON.parse(t.slice(e,n+1))}},pn=async e=>{let t=Number(e?.restante?.kcal);if(!(t>0))return{error:`completado`,mensaje:`Ya completaste tus calorías de hoy`};let n=String(e?.texto_libre||``).trim(),r=nn(e.intent,t)+(n?`§${n}`:``);if(cn.has(r))return{...cn.get(r),desdeCache:!0};let i=on-(Date.now()-ln);i>0&&await new Promise(e=>setTimeout(e,i)),ln=Date.now();let a=JSON.stringify(e),o=!1,s=null;for(let e=0;e<an&&!o;e++){let t;try{t=await dn(a)}catch(e){throw e.message===`SATURADO`?Error(un.limitado):e.message===`SIN_SESION`||e.message===`SESION_INVALIDA`?Error(un.sesion):j.allOnCooldown()?Error(un.saturado):Error(un.conexion)}try{s=en(typeof t==`object`&&t?t:fn(t)),o=!0}catch{console.warn(`⚠️ [Sugerencias] JSON inválido (intento ${e+1})`)}}if(!o)throw Error(un.respuesta);return s.error||(cn.size>=sn&&cn.delete(cn.keys().next().value),cn.set(r,s)),s},mn=!1,hn=()=>mn,gn=e=>{mn=e},_n=(e=12)=>{try{typeof navigator<`u`&&navigator.vibrate&&navigator.vibrate(e)}catch{}},vn=e=>String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`),yn=(e,t)=>e>110||e>40&&t>.65,bn=()=>Array.from(document.querySelectorAll(`.modal-overlay, .scanner-modal`)).some(e=>e.style.display&&e.style.display!==`none`),xn=(e,t,n=`Aceptar`,r=`Cancelar`)=>new Promise(i=>{document.querySelectorAll(`.gesto-confirm-overlay`).forEach(e=>e.remove());let a=document.createElement(`div`);a.className=`modal-overlay gesto-confirm-overlay`,a.style.display=`flex`,a.innerHTML=`
            <div class="modal-content confirm-modal">
                <h3>${vn(e)}</h3>
                <p>${vn(t)}</p>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" data-cancelar>${vn(r)}</button>
                    <button type="button" class="btn-danger" data-aceptar>${vn(n)}</button>
                </div>
            </div>`,document.body.appendChild(a);let o=!1,s=e=>{o||(o=!0,document.removeEventListener(`keydown`,c),a.remove(),i(e))},c=e=>{e.key===`Escape`&&s(!1)};document.addEventListener(`keydown`,c),a.querySelector(`[data-aceptar]`).onclick=()=>s(!0),a.querySelector(`[data-cancelar]`).onclick=()=>s(!1),a.addEventListener(`click`,e=>{e.target===a&&s(!1)}),setTimeout(()=>{let e=a.querySelector(`[data-cancelar]`);e&&e.focus()},40)}),Sn=new WeakMap,Cn=(e,t={})=>{if(!e||(Sn.set(e,t),e.dataset.gestosListo===`1`))return;e.dataset.gestosListo=`1`;let n=e.querySelector(`.modal-content`),r=n||e,i=null;n&&!n.querySelector(`.modal-grabber`)&&(i=document.createElement(`div`),i.className=`modal-grabber`,i.setAttribute(`aria-hidden`,`true`),n.appendChild(i),n.addEventListener(`scroll`,()=>{i.style.top=8+n.scrollTop+`px`},{passive:!0}));let a=i||e.querySelector(`.scanner-header`)||r,o=null,s=0,c=0,l=!1,u=!1,d=!1,f=[],p=null,m=null,h=()=>{p&&=(p(),null),m&&=(e.removeEventListener(`touchmove`,m),null)},g=()=>{h(),d&&=(gn(!1),!1),l=!1,u=!1,o=null,f=[]},_=()=>{r.style.transition=`transform .3s cubic-bezier(.22,.61,.36,1)`,r.style.transform=`translate3d(0,0,0)`;let e=()=>{l||(r.removeEventListener(`transitionend`,e),r.style.transition=``,r.style.transform=``)};r.addEventListener(`transitionend`,e),setTimeout(e,340)},v=t=>{if(typeof t.cerrar==`function`){t.cerrar();return}if(typeof t.cerrar==`string`){let n=e.querySelector(t.cerrar)||document.querySelector(t.cerrar);if(n){n.click();return}}e.style.display=`none`},y=()=>{let t=Sn.get(e)||{},n=r.getBoundingClientRect().height||320;_n(14),r.style.transition=`transform .26s cubic-bezier(.32,.72,.34,1)`,r.style.transform=`translate3d(0, ${n+80}px, 0)`,e.style.transition=`opacity .24s ease`,e.style.opacity=`0`,setTimeout(()=>{v(t),r.style.transition=``,r.style.transform=``,e.style.transition=``,e.style.opacity=``},270)},b=t=>{let n=t;for(;n;){if(n!==i&&n.scrollHeight>n.clientHeight+4&&n.scrollTop>0)return!1;if(n===r||n===e)break;n=n.parentElement}return!0},x=e=>!!(e&&e.closest&&e.closest(`input, textarea, select, button, a, video, [contenteditable="true"], [role="slider"]`)),S=t=>{if(l||t.pointerType===`mouse`&&t.button!==0||!r.contains(t.target))return;let n=Sn.get(e)||{};if(!(i?t.target===i||i.contains(t.target):a.contains(t.target))&&(x(t.target)||n.bloquearSel&&t.target.closest(n.bloquearSel)||!b(t.target)))return;o=t.pointerId,s=t.clientX,c=t.clientY,l=!0,u=!1,f=[{t:performance.now(),y:t.clientY}];let d=e=>{e.pointerId===o&&C(e)},m=e=>{e.pointerId===o&&(e.type===`pointercancel`?T():w(e))};p=()=>{window.removeEventListener(`pointermove`,d),window.removeEventListener(`pointerup`,m),window.removeEventListener(`pointercancel`,m)},window.addEventListener(`pointermove`,d,{passive:!1}),window.addEventListener(`pointerup`,m),window.addEventListener(`pointercancel`,m)},C=t=>{if(!l)return;let n=t.clientX-s,i=t.clientY-c;if(!u){if(hn()){g();return}if(Math.abs(n)>8&&Math.abs(n)>Math.abs(i)*1.2){g();return}if(i<-8){g();return}if(i>8&&i>Math.abs(n)*1.2)u=!0,d=!0,gn(!0),m=e=>e.preventDefault(),e.addEventListener(`touchmove`,m,{passive:!1}),r.style.transition=`none`;else return}let a=i;a<0&&(a*=.15),r.style.transform=`translate3d(0, ${a}px, 0)`,f.push({t:performance.now(),y:t.clientY}),f.length>6&&f.shift()},w=t=>{if(!l)return;if(!u){g();return}let n=t.clientY-c,r=f[0]||{t:performance.now(),y:t.clientY},i=f[f.length-1]||r,a=(i.y-r.y)/Math.max(1,i.t-r.t);if(g(),yn(n,a)){let t=Sn.get(e)||{};t.sucio&&t.sucio()?(_(),xn(`¿Descartar cambios?`,`Hay cambios sin guardar en este formulario.`,`Descartar`).then(e=>{e&&y()})):y()}else _()},T=()=>{l&&(u&&_(),g())};a.addEventListener(`pointerdown`,S),a!==r&&r.addEventListener(`pointerdown`,S)},W=[],wn=!1,Tn=!1,En=(e,t)=>{let n=W[W.length-1];if(n&&n.id===e){n.restaurar=t;return}let r=W.findIndex(t=>t.id===e);if(r>=0){W.length=r+1,W[r].restaurar=t;return}for(W.push({id:e,restaurar:t});W.length>8;)W.shift()},Dn=()=>{W.length=0},On=()=>document.getElementById(`app`),kn=e=>{let t=On();if(!t){e(),wn=!1;return}let n=t.clientWidth||window.innerWidth;t.style.transition=`transform .28s cubic-bezier(.32,.72,.34,1)`,t.style.transform=`translate3d(${n}px,0,0)`,setTimeout(()=>{t.style.transition=`none`,t.style.transform=`translate3d(0,0,0)`,e(),t.style.transform=`translate3d(-28%,0,0)`,t.offsetHeight,requestAnimationFrame(()=>{t.style.transition=`transform .26s cubic-bezier(.22,.61,.36,1)`,t.style.transform=`translate3d(0,0,0)`,setTimeout(()=>{t.style.transition=``,t.style.transform=``,wn=!1},300)})},290)},An=()=>{if(wn||W.length<=1)return!1;let e=W.pop(),t=W[W.length-1];return!t||typeof t.restaurar!=`function`?(W.push(e),!1):(wn=!0,_n(14),kn(()=>t.restaurar()),!0)},jn=()=>{if(Tn)return;Tn=!0;let e=null,t=0,n=0,r=!1,i=!1,a=!1,o=[],s=null,c=null,l=null,u=()=>{s&&=(s(),null),c&&=(document.removeEventListener(`touchmove`,c),null)},d=()=>{u(),a&&=(gn(!1),!1),r=!1,i=!1,e=null,o=[]},f=()=>{if(!l){d();return}l.style.transition=`transform .3s cubic-bezier(.22,.61,.36,1)`,l.style.transform=`translate3d(0,0,0)`;let e=()=>{r||wn||(l.removeEventListener(`transitionend`,e),l.style.transition=``,l.style.transform=``)};l.addEventListener(`transitionend`,e),setTimeout(e,340),d()},p=a=>{if(r||wn||hn()||a.pointerType===`mouse`&&a.button!==0||bn()||W.length<=1||a.clientX>26||(l=On(),!l))return;e=a.pointerId,t=a.clientX,n=a.clientY,r=!0,i=!1,o=[{t:performance.now(),x:a.clientX}];let c=t=>{t.pointerId===e&&m(t)},u=t=>{t.pointerId===e&&(t.type===`pointercancel`?i?f():d():h(t))};s=()=>{window.removeEventListener(`pointermove`,c),window.removeEventListener(`pointerup`,u),window.removeEventListener(`pointercancel`,u)},window.addEventListener(`pointermove`,c,{passive:!1}),window.addEventListener(`pointerup`,u),window.addEventListener(`pointercancel`,u)},m=e=>{if(!r)return;let s=e.clientX-t,u=e.clientY-n;if(!i){if(hn()){d();return}if(s<-8){d();return}if(Math.abs(u)>8&&Math.abs(u)>s*1.2){d();return}if(s>12&&s>Math.abs(u)*1.2)i=!0,a=!0,gn(!0),c=e=>e.preventDefault(),document.addEventListener(`touchmove`,c,{passive:!1}),l.style.transition=`none`;else return}let f=s;f<0&&(f*=.2),l.style.transform=`translate3d(${f}px,0,0)`,o.push({t:performance.now(),x:e.clientX}),o.length>6&&o.shift()},h=e=>{if(!r)return;if(!i){d();return}let n=e.clientX-t,a=o[0]||{t:performance.now(),x:e.clientX},s=o[o.length-1]||a,c=(s.x-a.x)/Math.max(1,s.t-a.t),u=l&&l.clientWidth||window.innerWidth;d(),(n>u*.32||n>30&&c>.55)&&An()||f()};document.addEventListener(`pointerdown`,p)},Mn=null,Nn=!1,Pn=e=>!!e&&e.dataset.abierta===`1`,Fn=e=>{if(!e||!e._fila)return;delete e.dataset.abierta,Mn===e&&(Mn=null);let t=e._fila;t.style.transition=``,t.style.transform=``},In=(e,t={})=>{if(!e||!e.parentNode||e.dataset.filaGestos===`1`)return;e.dataset.filaGestos=`1`;let n=Array.isArray(t.acciones)?t.acciones:[],r=t.alEjecutarLargo||null,i=document.createElement(`div`);i.className=`swipe-row`,e.parentNode.insertBefore(i,e),i.appendChild(e),i._fila=e;let a=document.createElement(`div`);a.className=`swipe-acciones`,n.forEach(t=>{let n=document.createElement(`button`);n.type=`button`,n.className=`swipe-accion`+(t.clase?` `+t.clase:``),n.textContent=t.etiqueta,n.addEventListener(`click`,n=>{n.stopPropagation(),Fn(i),t.alPulsar&&t.alPulsar(e,i)}),a.appendChild(n)}),i.insertBefore(a,e),Nn||(Nn=!0,document.addEventListener(`pointerdown`,e=>{Mn&&!Mn.contains(e.target)&&Fn(Mn)},!0));let o=()=>a.offsetWidth||Math.max(1,n.length)*92,s=null,c=0,l=0,u=!1,d=!1,f=!1,p=[],m=null,h=null,g=0,_=0,v=!1,y=()=>{m&&=(m(),null),h&&=(i.removeEventListener(`touchmove`,h),null)},b=()=>{y(),f&&=(gn(!1),!1),u=!1,d=!1,s=null,p=[]},x=()=>{v=!0,setTimeout(()=>{v=!1},350)};i.addEventListener(`click`,e=>{v&&(a.contains(e.target)||(e.stopPropagation(),e.preventDefault(),v=!1))},!0);let S=e=>{if(u||e.pointerType===`mouse`&&e.button!==0)return;s=e.pointerId,c=e.clientX,l=e.clientY,u=!0,d=!1,_=Pn(i)?-o():0,p=[{t:performance.now(),x:e.clientX}];let t=e=>{e.pointerId===s&&C(e)},n=e=>{e.pointerId===s&&(e.type===`pointercancel`?(d&&w(),b()):T(e))};m=()=>{window.removeEventListener(`pointermove`,t),window.removeEventListener(`pointerup`,n),window.removeEventListener(`pointercancel`,n)},window.addEventListener(`pointermove`,t,{passive:!1}),window.addEventListener(`pointerup`,n),window.addEventListener(`pointercancel`,n)},C=t=>{if(!u)return;let n=t.clientX-c,r=t.clientY-l;if(!d){if(hn()){b();return}if(Math.abs(r)>8&&Math.abs(r)>Math.abs(n)*1.2){b();return}if(Math.abs(n)>12&&Math.abs(n)>Math.abs(r)*1.2)d=!0,f=!0,gn(!0),g=o(),h=e=>e.preventDefault(),i.addEventListener(`touchmove`,h,{passive:!1}),e.style.transition=`none`;else return}let a=(Pn(i)?-g:0)+n;a>0&&(a*=.2);let s=-g-60;a<s&&(a=s+(a-s)*.2),_=a,e.style.transform=`translate3d(${a}px,0,0)`,p.push({t:performance.now(),x:t.clientX}),p.length>6&&p.shift()},w=(t=!1)=>{e.style.transition=``,e.style.transform=t?``:_<=-g*.45?`translate3d(${-g}px,0,0)`:``,!t&&_<=-g*.45?(i.dataset.abierta=`1`,Mn=i):Fn(i)},T=t=>{if(!u)return;if(!d){let e=Pn(i);b(),e&&(x(),Fn(i));return}let n=p[0]||{t:performance.now(),x:t.clientX},a=p[p.length-1]||n,o=(a.x-n.x)/Math.max(1,a.t-n.t);b(),x();let s=o<-.9,c=_<=-(g+20)||_<=-(g*.8)&&s;if(r&&c){_n(14),i.classList.add(`swipe-ejecutando`),e.style.transition=``,e.style.transform=``,Mn===i&&(Mn=null),delete i.dataset.abierta,r(e,i);return}w()};e.addEventListener(`pointerdown`,S)},G=e=>String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`),K=e=>Math.round((Number(e)||0)*10)/10,q=e=>Math.round(Number(e)||0),Ln=e=>{let t=new Date(e);return new Date(t.getTime()-t.getTimezoneOffset()*6e4).toISOString().split(`T`)[0]},Rn={[U.QUE_COMER]:`¿Qué puedo comer?`,[U.COMPLETAR_PROTEINA]:`Completar mi proteína`,[U.ENTRAR_EN_CALORIAS]:`Algo que entre en mis calorías`,[U.COMIDA_ACTUAL]:`Qué como ahora`,[U.LIVIANO]:`Algo liviano`,[U.CENA_FINAL]:`Cerrar el día`,[U.GUSTO]:`Darme un gusto`,[U.LIBRE]:`Quiero comer otra cosa`,[U.ALTERNATIVA]:`No tengo un ingrediente`},zn={desayuno:`Desayuno`,almuerzo:`Almuerzo`,merienda:`Merienda`,cena:`Cena`,snack:`Snack`},Bn=async(e,t)=>{En(`sug`,()=>Bn(e,t));let n=t.uid,r=Ln(new Date),i=new Date().getHours(),a=t.plan_nutricional||ee(t),o=Gt(t),s={},u=[],m=[],h={kcal:0,p:0,c:0,g:0},g=Nt(i),_=t.config_sugerencias?.excluir_usadas!==!1,y={},x=null,S=``,C=null,w=0;e.innerHTML=`
        <div class="dashboard-layout fade-in vista-sugerencias">
            <header class="sug-header">
                <div class="sug-header-top">
                    <div>
                        <h1>Sugerencias</h1>
                        <p class="sug-sub">Ideas según lo que te falta hoy</p>
                    </div>
                    <button class="sug-reiniciar" id="sug-reiniciar">↺ Empezar de nuevo</button>
                </div>

                <div class="sug-restante-card">
                    <div class="sug-kcal">
                        <span class="sug-kcal-valor" id="sug-kcal-valor">—</span>
                        <span class="sug-kcal-label">kcal restantes</span>
                    </div>
                    <div class="sug-barras">
                        <div class="sug-barra-fila">
                            <span class="sug-barra-nombre">Proteínas</span>
                            <div class="sug-barra"><div id="sug-barra-p"></div></div>
                            <span class="sug-barra-valor" id="sug-val-p"></span>
                        </div>
                        <div class="sug-barra-fila">
                            <span class="sug-barra-nombre">Carbos</span>
                            <div class="sug-barra"><div id="sug-barra-c"></div></div>
                            <span class="sug-barra-valor" id="sug-val-c"></span>
                        </div>
                        <div class="sug-barra-fila">
                            <span class="sug-barra-nombre">Grasas</span>
                            <div class="sug-barra"><div id="sug-barra-g"></div></div>
                            <span class="sug-barra-valor" id="sug-val-g"></span>
                        </div>
                    </div>
                </div>
            </header>

            <div class="sug-ajustes">
                <div class="sug-momento">
                    <span class="sug-momento-label">Momento</span>
                    <div class="sug-momento-chips" id="sug-momento-chips">
                        ${Mt.map(e=>`
                            <button class="pill ${e===g?`active`:``}" data-momento="${e}">
                                ${zn[e]}
                            </button>`).join(``)}
                    </div>
                </div>

                <label class="sug-excluir">
                    <input type="checkbox" id="sug-excluir-usadas" ${_?`checked`:``}>
                    <span>Excluir recetas ya usadas hoy</span>
                </label>
            </div>

            <main class="sug-chat" id="sug-chat" aria-live="polite"></main>

            <p class="sug-disclaimer">Las sugerencias son orientativas y no reemplazan el consejo de un profesional.</p>

            <nav class="bottom-nav">
                <button class="nav-item" id="nav-hoy-sug">
                    <span class="nav-icon">🏠</span><span class="nav-texto">Hoy</span>
                </button>
                <button class="nav-item active">
                    <span class="nav-icon">💡</span><span class="nav-texto">Sugerencias</span>
                </button>
                <button class="nav-item nav-add" id="nav-registrar-sug">
                    <span class="nav-add-circle">+</span>
                    <span class="nav-add-label">Registrar</span>
                </button>
                <button class="nav-item">
                    <span class="nav-icon">🥗</span><span class="nav-texto">Diario</span>
                </button>
                <button class="nav-item" id="nav-perfil-sug">
                    <span class="nav-icon">⚙️</span><span class="nav-texto">Perfil</span>
                </button>
            </nav>
        </div>
    `;let E=e.querySelector(`#sug-chat`),D=e=>{try{e.scrollIntoView({behavior:`smooth`,block:`nearest`})}catch{}},O=e=>{let t=document.createElement(`div`);return t.className=`sug-bubble sug-asistente`,t.innerHTML=e,E.appendChild(t),D(t),t},te=e=>{let t=document.createElement(`div`);return t.className=`sug-bubble sug-usuario`,t.textContent=e,E.appendChild(t),D(t),t},k=e=>new Promise(t=>{C=()=>{C=null,t(null)},e(e=>{C=null,t(e)})}),A=()=>{e.querySelector(`#sug-kcal-valor`).textContent=q(Math.max(0,h.kcal));let t=(e,t)=>Math.max(0,Math.min(100,e/(Number(t)||1)*100));e.querySelector(`#sug-barra-p`).style.width=`${t(h.p,a.proteina)}%`,e.querySelector(`#sug-barra-c`).style.width=`${t(h.c,a.carbos)}%`,e.querySelector(`#sug-barra-g`).style.width=`${t(h.g,a.grasas)}%`,e.querySelector(`#sug-val-p`).textContent=`${q(Math.max(0,h.p))} / ${q(a.proteina)} g`,e.querySelector(`#sug-val-c`).textContent=`${q(Math.max(0,h.c))} / ${q(a.carbos)} g`,e.querySelector(`#sug-val-g`).textContent=`${q(Math.max(0,h.g))} / ${q(a.grasas)} g`},ne=()=>{let e=u.filter(e=>(e.totales_macros_porcion||e.totales_macros_completa)&&(e.ingredientes?.length||e.totales_macros_completa));return e=Kt(e,o),_&&(e=qt(e,m)),Yt(Jt(e.map(Xt).filter(e=>e.kcal>0),h,x))},re=(e,t,n,i)=>{h.kcal=K(h.kcal-e),h.p=K(h.p-t),h.c=K(h.c-n),h.g=K(h.g-i),A(),nr(r)},ie=()=>{let e=Lt(h);e.accion===`COMPLETADO`&&O(`<p class="sug-nota">${e.mensaje}</p>`)},j=async(e,t,i,a)=>{Z(a,`Registrando...`);try{await rt(n,r,e,t),m.push(String(e.id)),re(i.macros.total_calorias,i.macros.total_proteinas,i.macros.total_carbohidratos,i.macros.total_grasas),a.disabled=!0,a.innerText=`Registrada ✓`,a.classList.add(`sug-registrado`),a.closest(`.sug-card`)?.classList.add(`sug-card-ok`),X(`Registrado en el diario`,`success`),ie()}catch(e){console.error(`Error registrando sugerencia:`,e),Q(a),X(`No pude registrar. Probá de nuevo.`,`error`)}},ae=async(e,t)=>{Z(t,`Registrando...`);try{await De(n,{items:[e]},r,`sugerencia-libre`),re(e.calorias,e.proteinas,e.carbohidratos,e.grasas),t.disabled=!0,t.innerText=`Registrada ✓`,t.classList.add(`sug-registrado`),t.closest(`.sug-card`)?.classList.add(`sug-card-ok`),X(`Registrado en el diario`,`success`),ie()}catch(e){console.error(`Error registrando sugerencia:`,e),Q(t),X(`No pude registrar. Probá de nuevo.`,`error`)}},oe=async(e,t,r)=>{e.querySelectorAll(`.sug-voto`).forEach(e=>e.classList.remove(`activo`)),e.querySelector(`.sug-voto[data-v="${t}"]`)?.classList.add(`activo`);try{await c(l(T,`usuarios`,n,`feedback_sugerencias`),{intent:x,momento:g,voto:t,ref:r,creado_el:v()})}catch(e){console.warn(`Feedback no guardado:`,e)}},se=()=>{let e=document.createElement(`article`);return e.className=`sug-card`,E.appendChild(e),D(e),e},ce=`
        <div class="sug-votos">
            <button class="sug-voto" data-v="up" title="Me sirve">👍</button>
            <button class="sug-voto" data-v="down" title="No me sirve">👎</button>
        </div>`,le=e=>{let t=u.find(t=>String(t.id)===String(e.receta_id));if(!t)return;let n=Xt(t),r=tn(t,e.factor),i=null;try{i=r>0?Je(t,r):null}catch{i=null}let a=i?i.macros.total_calorias:q(n.kcal*e.factor),o=i?i.macros.total_proteinas:K(n.p*e.factor),s=i?i.macros.total_carbohidratos:K(n.c*e.factor),c=i?i.macros.total_grasas:K(n.g*e.factor),l=se();l.innerHTML=`
            <div class="sug-card-top">
                <h4>${G(t.nombre)}</h4>
                <span class="sug-factor">×${e.factor}</span>
            </div>
            ${r>0?`<p class="sug-porcion">Comé <b>${Math.round(r)} g</b> de esta receta</p>`:``}
            <div class="sug-macros">
                <span class="sug-m-kcal">${q(a)}<small>kcal</small></span>
                <span>P ${K(o)} g</span>
                <span>C ${K(s)} g</span>
                <span>G ${K(c)} g</span>
            </div>
            ${e.motivo?`<p class="sug-motivo">${G(e.motivo)}</p>`:``}
            <div class="sug-card-acciones">
                <button class="btn-primary sug-btn-registrar" ${i?``:`disabled`}>Registrar</button>
                ${ce}
            </div>`;let d=l.querySelector(`.sug-btn-registrar`);i&&(d.onclick=()=>j(t,r,i,d)),l.querySelector(`.sug-voto[data-v="up"]`).onclick=()=>oe(l,`up`,{receta_id:String(t.id)}),l.querySelector(`.sug-voto[data-v="down"]`).onclick=()=>oe(l,`down`,{receta_id:String(t.id)})},ue=e=>{let t=se();t.classList.add(`sug-card-libre`),t.innerHTML=`
            <div class="sug-card-top">
                <h4>${G(e.nombre)}</h4>
                <span class="sug-pill">Estimación aproximada</span>
            </div>
            <div class="sug-libre-campos">
                <label>kcal<input type="number" min="0" step="1" data-c="kcal" value="${q(e.kcal)}"></label>
                <label>Proteínas (g)<input type="number" min="0" step="0.1" data-c="p" value="${K(e.p)}"></label>
                <label>Carbos (g)<input type="number" min="0" step="0.1" data-c="c" value="${K(e.c)}"></label>
                <label>Grasas (g)<input type="number" min="0" step="0.1" data-c="g" value="${K(e.g)}"></label>
            </div>
            ${e.motivo?`<p class="sug-motivo">${G(e.motivo)}</p>`:``}
            <div class="sug-card-acciones">
                <button class="btn-primary sug-btn-registrar">Registrar</button>
                ${ce}
            </div>`;let n=t.querySelector(`.sug-btn-registrar`);n.onclick=()=>{let r=e=>Math.max(0,Number(t.querySelector(`input[data-c="${e}"]`).value)||0);ae({alimento:e.nombre,calorias:r(`kcal`),proteinas:r(`p`),carbohidratos:r(`c`),grasas:r(`g`),fibra:0,confianza:`media`},n)},t.querySelector(`.sug-voto[data-v="up"]`).onclick=()=>oe(t,`up`,{libre:e.nombre}),t.querySelector(`.sug-voto[data-v="down"]`).onclick=()=>oe(t,`down`,{libre:e.nombre})},de=e=>{O(`<p>Te quedan menos de 100 kcal. Algo chico:</p>`),e.opciones.forEach(e=>{let t=se();t.innerHTML=`
                <div class="sug-card-top">
                    <h4>${G(e.nombre)}</h4>
                    <span class="sug-pill">Estimación aproximada</span>
                </div>
                <div class="sug-macros">
                    <span class="sug-m-kcal">${q(e.kcal)}<small>kcal</small></span>
                    <span>P ${K(e.p)} g</span><span>C ${K(e.c)} g</span><span>G ${K(e.g)} g</span>
                </div>
                <div class="sug-card-acciones">
                    <button class="btn-primary sug-btn-registrar">Registrar</button>
                </div>`;let n=t.querySelector(`.sug-btn-registrar`);n.onclick=()=>ae({alimento:e.nombre,calorias:e.kcal,proteinas:e.p,carbohidratos:e.c,grasas:e.g,fibra:0,confianza:`media`},n)});let t=Rt(a.kcal-h.kcal,h.kcal);t&&O(`<p class="sug-nota">${G(t)}</p>`)},fe=e=>k(t=>{let n=e.clave===`ayuno`?Ht(i):null,r=O(`
            <p class="sug-pregunta">${G(e.texto)}</p>
            ${n?`<span class="sug-pista">Por tu hora, parece: ${n===`rompio`?`ya comiste`:`sigo en ayuno`}</span>`:``}
            <div class="sug-opciones">
                ${e.opciones.map(e=>`<button class="pill ${e.v===n?`sug-pre`:``}" data-v="${e.v}">${G(e.l)}</button>`).join(``)}
            </div>`);r.querySelectorAll(`.pill`).forEach(e=>{e.onclick=()=>{te(e.textContent.trim());let n=e.dataset.v;r.remove(),t(n)}})}),M=()=>k(e=>{let t=O(`
            <p class="sug-pregunta">${x===U.ALTERNATIVA?`¿Qué ingrediente te falta o qué querés cambiar?`:`¿Qué se te antoja?`}</p>
            <textarea class="sug-textarea" id="sug-texto" maxlength="100"
                placeholder="Máx. 100 caracteres"></textarea>
            <div class="sug-texto-pie">
                <span class="sug-counter" id="sug-counter">0/100</span>
                <button class="btn-primary" id="sug-enviar">Pedir idea</button>
            </div>`),n=t.querySelector(`#sug-texto`),r=t.querySelector(`#sug-counter`);n.oninput=()=>{r.textContent=`${n.value.length}/100`},t.querySelector(`#sug-enviar`).onclick=()=>{let r=zt(n.value);if(!r){X(`Escribí algo primero`,`warning`);return}te(r),t.remove(),e(r)},setTimeout(()=>n.focus(),150)}),N=async()=>{let e=Lt(h);if(e.accion===`COMPLETADO`){O(`<p class="sug-nota">${e.mensaje}</p>`);return}if(e.accion===`MINIMAS`){de(e);return}let n=w,r=O(`
            <div class="sug-pensando"><span class="btn-spinner"></span> Pensando ideas…</div>`);try{let e=await pn(Qt({intent:x,momento:g,objetivo:Zt(t),contexto:y,restante:h,restricciones:o,recetas:ne(),textoLibre:S}));if(n!==w)return;if(r.remove(),e.error===`completado`){O(`<p class="sug-nota">${G(e.mensaje||`Ya completaste tus calorías de hoy`)}</p>`);return}if(e.error===`fuera_de_tema`){O(`<p>Con eso no puedo ayudarte: solo sugiero ideas de comida. Probá contarme qué querés comer.</p>`);return}if(e.error===`consulta_profesional`){O(`<p>Eso mejor te lo puede responder un profesional de la salud.</p>`);return}if(!(e.sugerencias?.length||e.libre)&&!e.nota)throw Error(`respuesta vacía`);e.sugerencias?.length&&O(`<p>Estas son mis ideas:</p>`),(e.sugerencias||[]).forEach(le),e.libre&&ue(e.libre),e.nota&&O(`<p class="sug-nota">${G(e.nota)}</p>`);let i=document.createElement(`div`);i.className=`sug-fin`,i.innerHTML=`
                <button class="sug-fin-btn" id="sug-otra">Pedir otra idea</button>
                <button class="sug-fin-btn" id="sug-reiniciar-2">↺ Empezar de nuevo</button>`,E.appendChild(i),D(i),i.querySelector(`#sug-otra`).onclick=()=>N(),i.querySelector(`#sug-reiniciar-2`).onclick=()=>he()}catch(e){if(n!==w)return;r.remove();let t=O(`<p>${G(e?.message||`No pude responder ahora.`)}</p>`),i=document.createElement(`div`);i.className=`sug-error-btns`,i.innerHTML=`
                <button class="sug-fin-btn" id="sug-reintentar">Reintentar</button>
                <button class="sug-fin-btn" id="sug-reiniciar-3">↺ Empezar de nuevo</button>`,t.appendChild(i),D(t),i.querySelector(`#sug-reintentar`).onclick=()=>{t.remove(),N()},i.querySelector(`#sug-reiniciar-3`).onclick=()=>he()}},P=async()=>{let e=Vt(x,i);for(let t of e){let e=await fe(t);if(e===null)return;y[t.clave]=e}if(x===U.LIBRE||x===U.ALTERNATIVA){let e=await M();if(e===null)return;S=e}await N()},F=e=>{let t=e.dataset.intent;t&&(x=t,y={},S=``,te(Rn[t]),e.closest(`.sug-bubble`)?.remove(),P())},pe=()=>{O(`
            <p>¿Qué te propongo?</p>
            <div class="sug-intents">
                ${Object.entries(Rn).map(([e,t])=>`<button class="sug-intent" data-intent="${e}">${G(t)}</button>`).join(``)}
            </div>`),E.querySelectorAll(`.sug-intent`).forEach(e=>{e.onclick=()=>F(e)})},me=()=>{w++,E.innerHTML=``,C=null,y={},x=null,S=``;let e=Lt(h);if(e.accion===`COMPLETADO`){O(`<p class="sug-nota">${e.mensaje}</p>`);return}if(e.accion===`MINIMAS`){de(e);return}O(`<p>Acá van ideas según lo que te falta hoy.</p>`),pe()},he=()=>{C&&C(),me(),D(E.firstElementChild||E)};e.querySelector(`#nav-hoy-sug`).onclick=()=>$(e,t),e.querySelector(`#nav-registrar-sug`).onclick=async()=>{await $(e,t),document.getElementById(`nav-registrar`)?.click()},e.querySelector(`#nav-perfil-sug`).onclick=()=>Qn(e,t),e.querySelectorAll(`#sug-momento-chips .pill`).forEach(t=>{t.onclick=()=>{g=t.dataset.momento,e.querySelectorAll(`#sug-momento-chips .pill`).forEach(e=>e.classList.remove(`active`)),t.classList.add(`active`)}}),e.querySelector(`#sug-excluir-usadas`).onchange=e=>{_=e.target.checked,b(d(T,`usuarios`,n),{config_sugerencias:{excluir_usadas:_}}).then(()=>{t.config_sugerencias={...t.config_sugerencias||{},excluir_usadas:_}}).catch(e=>console.warn(`No se guardó la configuración:`,e))},e.querySelector(`#sug-reiniciar`).onclick=()=>he(),O(`<div class="sug-pensando"><span class="btn-spinner"></span> Cargando tu día…</div>`);try{let[e,t,i]=await Promise.all([f(d(T,`usuarios`,n,`resumen_diario`,r)),p(l(T,`usuarios`,n,`ingestas_diarias`,r,`comidas`)),et(n)]);s=e.exists()?e.data():{},m=[],t.forEach(e=>{(e.data().alimentos||[]).forEach(e=>{e.receta_id&&m.push(String(e.receta_id))})}),u=i,h=Pt(a,s),A(),me()}catch(n){console.error(`Error cargando datos de sugerencias:`,n),E.innerHTML=``,O(`
            <p>No pude cargar tus datos. Revisá la conexión.</p>
            <div class="sug-error-btns">
                <button class="sug-fin-btn" id="sug-recargar">Recargar</button>
            </div>`),E.querySelector(`#sug-recargar`).onclick=()=>Bn(e,t)}},Vn=`claro`,Hn=`oscuro`,Un=`coipo_tema`,Wn=()=>document.querySelector(`meta[name="theme-color"]`),Gn=()=>{try{return localStorage.getItem(Un)}catch{return null}},Kn=()=>document.documentElement.getAttribute(`data-tema`)===`oscuro`?Hn:Vn,qn=e=>{e===`oscuro`?document.documentElement.setAttribute(`data-tema`,Hn):document.documentElement.removeAttribute(`data-tema`);let t=Wn();t&&t.setAttribute(`content`,e===`oscuro`?`#14161A`:`#F5F7F4`)},Jn=e=>{qn(e);try{localStorage.setItem(Un,e)}catch{}},Yn=()=>{let e=Gn(),t=window.matchMedia?window.matchMedia(`(prefers-color-scheme: dark)`):null;qn(e||(t&&t.matches?`oscuro`:`claro`)),t&&!e&&t.addEventListener(`change`,e=>qn(e.matches?Hn:Vn))},Xn=e=>String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`),Zn=[{v:`sin_lactosa`,l:`Sin lactosa`},{v:`sin_gluten`,l:`Sin gluten`},{v:`sin_huevo`,l:`Sin huevo`},{v:`sin_frutos_secos`,l:`Sin frutos secos`},{v:`sin_mariscos`,l:`Sin mariscos`},{v:`vegetariano`,l:`Vegetariano`},{v:`vegano`,l:`Vegano`}],Qn=(e,t)=>{En(`perfil`,()=>Qn(e,t));let n=t.uid||w.currentUser?.uid,r=t.email||w.currentUser?.email||`sin email`,i={sexo:t.sexo||`hombre`,edad:Number(t.edad)||25,altura:Number(t.altura)||170,peso:Number(t.peso)||70,objetivo:t.objetivo||`mantener`,tipo_dieta:t.tipo_dieta||`omnivoro`,ritmo_semanal:Number(t.ritmo_semanal)||300,nivel_actividad:t.nivel_actividad||`ligero`,pasos_diarios:Number(t.pasos_diarios)||5e3,horas_sueno:Number(t.horas_sueno)||7,frecuencia_comidas:Number(t.frecuencia_comidas)||4,lesiones:t.lesiones||``,alimentos_favoritos:Array.isArray(t.alimentos_favoritos)?[...t.alimentos_favoritos]:[],restricciones:Array.isArray(t.restricciones)?[...t.restricciones]:[]},a=t.plan_nutricional||ee(t),o=r.split(`@`)[0],s=o.slice(0,2).toUpperCase(),c=o.replace(/[._-]+/g,` `).trim(),l=``;try{let e=t.fecha_registro,n=e?.toDate?e.toDate():e?.seconds?new Date(e.seconds*1e3):null;n&&(l=n.toLocaleDateString(`es-AR`,{month:`long`,year:`numeric`}))}catch{}let u=a.omega3?.epa_dha_mg?`EPA+DHA: <b>${a.omega3.epa_dha_mg}mg</b>`:`Omega-3 ALA: <b>${a.omega3?.ala_mg??0}mg</b>`;e.innerHTML=`
        <div class="dashboard-layout fade-in">
            <header class="dash-header">
                <div class="header-titles">
                    <p class="date-text">MI PERFIL</p>
                </div>
            </header>

            <div class="content-scrollable">
                <!-- HERO: identidad -->
                <section class="perfil-hero">
                    <div class="perfil-avatar">${Xn(s)}</div>
                    <div class="perfil-hero-info">
                        <strong>${Xn(c)}</strong>
                        <span>${Xn(r)}</span>
                        ${l?`<span class="perfil-miembro">Miembro desde ${l}</span>`:``}
                    </div>
                </section>

                <!-- META DIARIA (solo lectura) -->
                <section class="perfil-seccion">
                    <div class="perfil-seccion-titulo"><span>⚡</span><h3>Tu meta diaria</h3></div>
                    <div class="perfil-meta-grid">
                        <div class="perfil-meta-kcal"><b>${a.kcal}</b><span>kcal</span></div>
                        <div class="perfil-meta-agua"><b>${(a.agua/1e3).toFixed(1)}L</b><span>agua</span></div>
                    </div>
                    <div class="macros-bar-container">
                        <div class="macro-item"><span class="dot prot"></span><span>Proteína: <b>${a.proteina}g</b></span></div>
                        <div class="macro-item"><span class="dot carb"></span><span>Carbos: <b>${a.carbos}g</b></span></div>
                        <div class="macro-item"><span class="dot fat"></span><span>Grasas: <b>${a.grasas}g</b></span></div>
                        <div class="macro-item"><span class="dot fiber"></span><span>Fibra: <b>${a.fibra}g</b></span></div>
                    </div>
                    <div class="micros-grid" style="margin-top: 12px;">
                        <div class="micro-pill">Magnesio: <b>${a.magnesio}mg</b></div>
                        <div class="micro-pill">Potasio: <b>${a.potasio}mg</b></div>
                        <div class="micro-pill">${u}</div>
                        <div class="micro-pill">Calcio: <b>${a.calcio}mg</b></div>
                        <div class="micro-pill">Sodio máx: <b>${a.sodio}mg</b></div>
                        <div class="micro-pill">Hierro: <b>${a.hierro}mg</b></div>
                        <div class="micro-pill">Zinc: <b>${a.zinc}mg</b></div>
                        <div class="micro-pill">Vit. D: <b>${a.vitaminaD} UI</b></div>
                        <div class="micro-pill">B12: <b>${a.vitaminaB12.meta_mcg}mcg</b></div>
                    </div>
                    <p class="perfil-nota">Esta meta se recalcula sola cuando guardás cambios en tus datos.</p>
                </section>

                <!-- DATOS PERSONALES -->
                <section class="perfil-seccion">
                    <div class="perfil-seccion-titulo"><span>👤</span><h3>Datos personales</h3></div>

                    <div class="perfil-campo">
                        <label class="card-label">Sexo biológico</label>
                        <div class="pill-group">
                            <button class="pill ${i.sexo===`hombre`?`active`:``}" data-key="sexo" data-value="hombre">Hombre</button>
                            <button class="pill ${i.sexo===`mujer`?`active`:``}" data-key="sexo" data-value="mujer">Mujer</button>
                        </div>
                    </div>

                    <div class="perfil-campo">
                        <label class="card-label">Edad</label>
                        <div class="counter-control">
                            <button class="cnt-btn" id="perfil-minus-edad">−</button>
                            <span class="value-display" id="perfil-edad-val">${i.edad}</span>
                            <button class="cnt-btn" id="perfil-plus-edad">+</button>
                        </div>
                    </div>

                    <div class="perfil-campo">
                        <div class="label-row">
                            <label class="card-label">Altura</label>
                            <span class="value-badge" id="perfil-altura-val">${i.altura} cm</span>
                        </div>
                        <input type="range" id="perfil-altura" min="140" max="220" step="1" value="${i.altura}" class="modern-slider">
                    </div>

                    <div class="perfil-campo">
                        <div class="label-row">
                            <label class="card-label">Peso actual</label>
                            <span class="value-badge primary" id="perfil-peso-val">${i.peso.toFixed(1)} kg</span>
                        </div>
                        <input type="range" id="perfil-peso" min="40" max="150" step="0.1" value="${i.peso}" class="modern-slider">
                    </div>
                </section>

                <!-- OBJETIVO Y ALIMENTACIÓN -->
                <section class="perfil-seccion">
                    <div class="perfil-seccion-titulo"><span>🎯</span><h3>Objetivo y alimentación</h3></div>

                    <div class="perfil-campo">
                        <label class="card-label">Tu meta</label>
                        <button class="option-card ${i.objetivo===`perder_peso`?`active`:``}" data-key="objetivo" data-value="perder_peso">
                            <strong>📉 Perder Peso</strong><span>Déficit calórico controlado</span>
                        </button>
                        <button class="option-card ${i.objetivo===`mantener`?`active`:``}" data-key="objetivo" data-value="mantener">
                            <strong>⚖️ Mantener</strong><span>Composición corporal estable</span>
                        </button>
                        <button class="option-card ${i.objetivo===`volumen`?`active`:``}" data-key="objetivo" data-value="volumen">
                            <strong>💪 Ganar Músculo</strong><span>Superávit para síntesis muscular</span>
                        </button>
                    </div>

                    <div class="perfil-campo">
                        <div class="label-row">
                            <label class="card-label">Ritmo semanal</label>
                            <span class="value-badge" id="perfil-ritmo-val">${i.ritmo_semanal} g</span>
                        </div>
                        <input type="range" id="perfil-ritmo" min="100" max="1000" step="50" value="${i.ritmo_semanal}">
                    </div>

                    <div class="perfil-campo">
                        <label class="card-label">Tipo de alimentación</label>
                        <button class="option-card ${i.tipo_dieta===`omnivoro`?`active`:``}" data-key="tipo_dieta" data-value="omnivoro">
                            <strong>🍗 Omnívoro</strong><span>Como de todo: carnes, lácteos, vegetales</span>
                        </button>
                        <button class="option-card ${i.tipo_dieta===`pescetariano`?`active`:``}" data-key="tipo_dieta" data-value="pescetariano">
                            <strong>🐟 Pescetariano</strong><span>Sin carne roja ni pollo, sí pescado</span>
                        </button>
                        <button class="option-card ${i.tipo_dieta===`vegetariano`?`active`:``}" data-key="tipo_dieta" data-value="vegetariano">
                            <strong>🥗 Vegetariano</strong><span>Sin carnes, sí lácteos y huevos</span>
                        </button>
                        <button class="option-card ${i.tipo_dieta===`vegano`?`active`:``}" data-key="tipo_dieta" data-value="vegano">
                            <strong>🌱 Vegano</strong><span>Solo alimentos de origen vegetal</span>
                        </button>
                    </div>
                </section>

                <!-- RESTRICCIONES ALIMENTARIAS (filtro duro de Sugerencias) -->
                <section class="perfil-seccion">
                    <div class="perfil-seccion-titulo"><span>🚫</span><h3>Restricciones alimentarias</h3></div>
                    <div class="perfil-campo">
                        <label class="card-label">Nunca me sugieras recetas con…</label>
                        <div class="pill-group pill-wrap" id="perfil-restricciones">
                            ${Zn.map(e=>`
                                <button class="pill ${i.restricciones.includes(e.v)?`active`:``}" data-rest="${e.v}">${e.l}</button>`).join(``)}
                        </div>
                        <p class="perfil-nota">Se aplican siempre en el asistente de sugerencias: las recetas que las incumplen se descartan antes de cualquier consulta.</p>
                    </div>
                </section>

                <!-- ESTILO DE VIDA -->
                <section class="perfil-seccion">
                    <div class="perfil-seccion-titulo"><span>⚡</span><h3>Estilo de vida</h3></div>

                    <div class="perfil-campo">
                        <label class="card-label">Actividad</label>
                        <button class="option-card ${i.nivel_actividad===`sedentario`?`active`:``}" data-key="nivel_actividad" data-value="sedentario">
                            <strong>🪑 Sedentario</strong><span>Oficina / Poco movimiento</span>
                        </button>
                        <button class="option-card ${i.nivel_actividad===`ligero`?`active`:``}" data-key="nivel_actividad" data-value="ligero">
                            <strong>🚶 Ligero</strong><span>1-3 días de gym</span>
                        </button>
                        <button class="option-card ${i.nivel_actividad===`moderado`?`active`:``}" data-key="nivel_actividad" data-value="moderado">
                            <strong>🏃 Moderado</strong><span>3-5 días de gym</span>
                        </button>
                        <button class="option-card ${i.nivel_actividad===`intenso`?`active`:``}" data-key="nivel_actividad" data-value="intenso">
                            <strong>⚡ Muy Activo</strong><span>Entrenamiento diario fuerte</span>
                        </button>
                        <button class="option-card ${i.nivel_actividad===`atleta`?`active`:``}" data-key="nivel_actividad" data-value="atleta">
                            <strong>🏅 Atleta</strong><span>Doble sesión / élite</span>
                        </button>
                    </div>

                    <div class="perfil-campo">
                        <div class="label-row">
                            <label class="card-label">Pasos diarios</label>
                            <span class="value-badge" id="perfil-pasos-val">${i.pasos_diarios}</span>
                        </div>
                        <input type="range" id="perfil-pasos" min="2000" max="15000" step="500" value="${i.pasos_diarios}">
                    </div>

                    <div class="perfil-campo">
                        <label class="card-label">Horas de sueño</label>
                        <div class="pill-group">
                            ${[5,6,7,8,9].map(e=>`
                                <button class="pill ${i.horas_sueno==e?`active`:``}" data-key="horas_sueno" data-value="${e}">${e}h</button>
                            `).join(``)}
                        </div>
                    </div>

                    <div class="perfil-campo">
                        <label class="card-label">Comidas por día</label>
                        <div class="pill-group">
                            ${[3,4,5,6].map(e=>`
                                <button class="pill ${i.frecuencia_comidas==e?`active`:``}" data-key="frecuencia_comidas" data-value="${e}">${e}</button>
                            `).join(``)}
                        </div>
                    </div>
                </section>

                <!-- SALUD -->
                <section class="perfil-seccion">
                    <div class="perfil-seccion-titulo"><span>🩹</span><h3>Salud</h3></div>
                    <textarea id="lesiones" placeholder="Ej: Tendinitis rotuliana, asma, etc." rows="3">${Xn(i.lesiones)}</textarea>
                </section>

                <!-- APARIENCIA (se aplica al instante, sin tocar "Guardar") -->
                <section class="perfil-seccion">
                    <div class="perfil-seccion-titulo"><span>🎨</span><h3>Apariencia</h3></div>
                    <div class="perfil-ajuste-fila">
                        <div class="perfil-ajuste-texto">
                            <strong>Modo oscuro</strong>
                            <span>Fondo y colores en tonos oscuros</span>
                        </div>
                        <button id="toggle-tema" class="switch" aria-pressed="false" aria-label="Modo oscuro">
                            <span class="switch-knob"></span>
                        </button>
                    </div>
                    <p class="perfil-nota">Se guarda en tu cuenta y se usa también en otros dispositivos.</p>
                </section>

                <!-- SESIÓN -->
                <section class="perfil-seccion">
                    <div class="perfil-seccion-titulo"><span>🔒</span><h3>Sesión</h3></div>
                    <div class="perfil-sesion-fila">
                        <span>Email</span>
                        <b>${Xn(r)}</b>
                    </div>
                    <button id="cerrar-sesion-btn" class="btn-danger btn-block">Cerrar sesión</button>
                    <div id="confirmar-sesion" class="perfil-confirm" style="display: none; margin-top: 12px;">
                        <p>¿Querés cerrar tu sesión en este dispositivo?</p>
                        <div class="modal-actions">
                            <button id="cancelar-sesion" class="btn-secondary">Cancelar</button>
                            <button id="si-cerrar-sesion" class="btn-danger">Sí, salir</button>
                        </div>
                    </div>
                </section>
            </div>

            <!-- BARRA STICKY: cambios sin guardar -->
            <div class="perfil-barra-guardar" id="barra-guardar" style="display: none;">
                <span>Cambios sin guardar</span>
                <button id="descartar-cambios" class="btn-secondary">Descartar</button>
                <button id="guardar-cambios" class="btn-primary">Guardar</button>
            </div>

            <nav class="bottom-nav">
                <button class="nav-item" id="nav-hoy-perfil">
                    <span class="nav-icon">🏠</span><span class="nav-texto">Hoy</span>
                </button>
                <button class="nav-item" id="nav-sugerencias-perfil">
                    <span class="nav-icon">💡</span><span class="nav-texto">Sugerencias</span>
                </button>
                <button class="nav-item nav-add" id="nav-registrar-perfil">
                    <span class="nav-add-circle">+</span>
                    <span class="nav-add-label">Registrar</span>
                </button>
                <button class="nav-item">
                    <span class="nav-icon">🥗</span><span class="nav-texto">Diario</span>
                </button>
                <button class="nav-item active" id="nav-perfil-activo">
                    <span class="nav-icon">⚙️</span><span class="nav-texto">Perfil</span>
                </button>
            </nav>
        </div>
    `;let f=!1,p=e.querySelector(`#barra-guardar`),m=()=>{f||(f=!0,p.style.display=`flex`)};e.querySelectorAll(`.pill[data-key]`).forEach(t=>{t.onclick=t=>{let n=t.currentTarget.dataset.key;e.querySelectorAll(`.pill[data-key="${n}"]`).forEach(e=>e.classList.remove(`active`)),t.currentTarget.classList.add(`active`);let r=t.currentTarget.dataset.value;i[n]=n===`horas_sueno`||n===`frecuencia_comidas`?parseInt(r):r,m()}}),e.querySelectorAll(`#perfil-restricciones .pill`).forEach(e=>{e.onclick=()=>{e.classList.toggle(`active`);let t=e.dataset.rest;i.restricciones=e.classList.contains(`active`)?[...new Set([...i.restricciones,t])]:i.restricciones.filter(e=>e!==t),m()}});let h=e.querySelector(`#toggle-tema`);h&&(h.setAttribute(`aria-pressed`,String(Kn()===Hn)),h.onclick=async()=>{let e=Kn()===`oscuro`?Vn:Hn;Jn(e),h.setAttribute(`aria-pressed`,String(e===Hn));try{await b(d(T,`usuarios`,n),{tema:e})}catch(e){console.warn(`No se pudo sincronizar el tema:`,e)}}),e.querySelectorAll(`.option-card[data-key]`).forEach(t=>{t.onclick=t=>{let n=t.currentTarget.dataset.key;e.querySelectorAll(`.option-card[data-key="${n}"]`).forEach(e=>e.classList.remove(`active`)),t.currentTarget.classList.add(`active`),i[n]=t.currentTarget.dataset.value,m()}});let g=e.querySelector(`#perfil-edad-val`);e.querySelector(`#perfil-minus-edad`).onclick=()=>{i.edad>15&&(i.edad--,g.innerText=i.edad,m())},e.querySelector(`#perfil-plus-edad`).onclick=()=>{i.edad<90&&(i.edad++,g.innerText=i.edad,m())};let _=(t,n,r)=>{let a=e.querySelector(`#perfil-${t}`),o=e.querySelector(`#perfil-${t}-val`);a.oninput=e=>{let t=parseFloat(e.target.value);i[n]=t,o.innerText=r(t),m()}};_(`altura`,`altura`,e=>`${e} cm`),_(`peso`,`peso`,e=>`${e.toFixed(1)} kg`),_(`ritmo`,`ritmo_semanal`,e=>`${e} g`),_(`pasos`,`pasos_diarios`,e=>`${e}`),e.querySelector(`#lesiones`).oninput=e=>{i.lesiones=e.target.value,m()},e.querySelector(`#guardar-cambios`).onclick=async r=>{if(!(i.peso>=30&&i.altura>=100&&i.edad>=15)){X(`Revisá peso, altura y edad`,`warning`);return}let a=r.currentTarget;Z(a,`Guardando...`);try{let r=ee(i),a={...i,plan_nutricional:r,meta_agua:r.agua};await b(d(T,`usuarios`,n),a),Object.assign(t,a),X(`Cambios guardados`,`success`),Qn(e,t)}catch(e){console.error(`Error guardando perfil:`,e),X(`No se pudo guardar el perfil`,`error`)}finally{Q(a)}},e.querySelector(`#descartar-cambios`).onclick=()=>{Qn(e,t)};let v=e.querySelector(`#cerrar-sesion-btn`),y=e.querySelector(`#confirmar-sesion`);v.onclick=()=>{v.style.display=`none`,y.style.display=`block`},e.querySelector(`#cancelar-sesion`).onclick=()=>{y.style.display=`none`,v.style.display=`block`},e.querySelector(`#si-cerrar-sesion`).onclick=async e=>{let t=e.currentTarget;Z(t,`Saliendo...`);try{await D.logout()}catch(e){console.error(`Error al cerrar sesión:`,e),X(`No se pudo cerrar la sesión`,`error`),Q(t)}};let x=e=>{if(f){X(`Guardá o descartá los cambios primero`,`warning`);return}e()};e.querySelector(`#nav-hoy-perfil`).onclick=()=>{x(()=>$(e,t))},e.querySelector(`#nav-sugerencias-perfil`).onclick=()=>{x(()=>Bn(e,t))},e.querySelector(`#nav-registrar-perfil`).onclick=()=>{x(async()=>{await $(e,t);let n=document.getElementById(`nav-registrar`);n&&n.click()})}},J={},$n=null,er=0,tr=()=>{J={},$n=null},nr=e=>{delete J[e]},Y=e=>String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`),rr=e=>{let t=String(e?.descripcion||e?.descripcion_original||``).trim();if(t)return t.length>38?t.substring(0,38)+`…`:t;if(e?.formato===`receta`)return`Receta guardada`;let n=(e?.alimentos||[]).map(e=>e.alimento).filter(Boolean).join(`, `);return n.length>38?n.substring(0,38)+`…`:n||`Comida`},ir=null,X=(e,t=`info`,n=2600,r=null)=>{document.querySelectorAll(`.toast-notification`).forEach(e=>e.remove()),ir&&clearTimeout(ir);let i={success:`✓`,error:`✕`,warning:`!`,info:`i`},a=r?`<button type="button" class="toast-accion">${Y(r.etiqueta)}</button>`:``,o=document.createElement(`div`);o.className=`toast-notification ${t}`,o.setAttribute(`role`,`status`),o.innerHTML=`
        <span class="toast-icon" aria-hidden="true">${i[t]||`i`}</span>
        <span class="toast-mensaje">${Y(e)}</span>
        ${a}
        <div class="toast-progress"><div class="toast-progress-bar" style="animation-duration: ${n}ms;"></div></div>
    `,document.body.appendChild(o),o.offsetHeight,o.classList.add(`show`);let s=o.querySelector(`.toast-progress-bar`);if(s&&(s.style.animation=`shrink ${n}ms linear forwards`),ir=setTimeout(()=>ar(o),n),r){let e=o.querySelector(`.toast-accion`);e&&(e.onclick=()=>{clearTimeout(ir),r.alPulsar(),ar(o)})}let c=null;o.addEventListener(`touchstart`,e=>{c=e.touches[0].clientX,o.classList.add(`toast-arrastrando`)},{passive:!0}),o.addEventListener(`touchmove`,e=>{if(c===null)return;let t=e.touches[0].clientX-c;o.style.transform=`translateX(${t}px)`},{passive:!0}),o.addEventListener(`touchend`,e=>{if(c===null)return;let t=e.changedTouches[0].clientX-c;o.classList.remove(`toast-arrastrando`),Math.abs(t)>48?(clearTimeout(ir),o.style.transform=`translateX(${t>0?140:-140}px)`,o.style.opacity=`0`,setTimeout(()=>o.remove(),200)):o.style.transform=``,c=null},{passive:!0})},ar=e=>{e.classList.remove(`show`),setTimeout(()=>e.remove(),300)},or=(e,t)=>{let n=String(e?.code||``),r=String(e?.message||``);return n===`permission-denied`||/permission denied/i.test(r)?`No tenés permiso para esta acción`:n===`unavailable`||/network|failed to fetch|load failed/i.test(r)?`Sin conexión — probá de nuevo`:n===`resource-exhausted`||/\b429\b|quota/i.test(r)?`Demasiados pedidos — esperá un minuto`:n===`deadline-exceeded`||/timeout|aborted/i.test(r)?`Tardó demasiado — probá de nuevo`:/email-already-in-use|already been registered/i.test(r)?`Ese email ya está registrado`:/weak-password/i.test(r)?`La contraseña necesita al menos 6 caracteres`:/invalid-email|malformed-email/i.test(r)?`El email no es válido`:/invalid-credential|wrong-password|invalid login credentials/i.test(r)?`Email o contraseña incorrectos`:/too-many-requests/i.test(r)?`Demasiados intentos — esperá un minuto`:n?t:r&&r.length<100&&!/^Firebase:/i.test(r)?r:t},sr=(e,t=100)=>new Promise(n=>{let r=Number(t)>0?Number(t):100;document.querySelectorAll(`.toast-notification`).forEach(e=>e.remove());let i=document.createElement(`div`);i.className=`modal-overlay`,i.style.display=`flex`,i.innerHTML=`
        <div class="modal-content" style="width: 88%; max-width: 340px;">
            <h3 style="margin: 0 0 2px; font-size: 1.05rem;">¿Cuántos gramos comiste?</h3>
            <p style="margin: 0 0 12px; font-size: 0.82rem; color: var(--coipo-text-muted);">${Y(e)}</p>
            <input type="number" id="pedir-gramos-input" inputmode="decimal" min="1" step="1" value="${Y(String(r))}"
                style="width: 100%; box-sizing: border-box; padding: 12px; font-size: 1.25rem; text-align: center;
                       font-weight: 700; border: 1px solid var(--coipo-surface); border-radius: 12px;
                       background: var(--coipo-bg); color: var(--coipo-text);">
            <div style="display: flex; gap: 10px; margin-top: 14px;">
                <button class="btn-secondary" id="pedir-gramos-cancel" style="flex: 1;">Cancelar</button>
                <button class="btn-primary" id="pedir-gramos-ok" style="flex: 2;">Registrar</button>
            </div>
        </div>`,document.body.appendChild(i);let a=i.querySelector(`#pedir-gramos-input`);setTimeout(()=>{a.focus(),a.select()},120);let o=e=>{i.remove(),n(e)};i.querySelector(`#pedir-gramos-ok`).onclick=()=>{let e=parseFloat(String(a.value).replace(`,`,`.`));o(e>0?e:null)},i.querySelector(`#pedir-gramos-cancel`).onclick=()=>o(null),i.addEventListener(`click`,e=>{e.target===i&&o(null)}),a.addEventListener(`keydown`,e=>{e.key===`Enter`&&i.querySelector(`#pedir-gramos-ok`).click()}),Cn(i,{cerrar:()=>o(null),sucio:()=>{let e=String(a.value).trim();return e!==``&&e!==String(r)}})}),Z=(e,t=`Procesando...`)=>e?(e.dataset.labelOriginal||(e.dataset.labelOriginal=e.innerText),e.disabled=!0,e.innerHTML=`<span class="btn-spinner" aria-hidden="true"></span><span class="btn-cargando-texto">${Y(t)}</span>`,t=>{let n=e.querySelector(`.btn-cargando-texto`);n&&(n.textContent=t)}):()=>{},Q=e=>{e&&(e.disabled=!1,e.dataset.labelOriginal!==void 0&&(e.innerText=e.dataset.labelOriginal,delete e.dataset.labelOriginal))},cr=e=>{let t=new Date(e);return new Date(t.getTime()-t.getTimezoneOffset()*6e4).toISOString().split(`T`)[0]},lr=e=>{let t=new Date(e);t.setHours(12,0,0,0);let n=t.getDay(),r=t.getDate()-n+(n===0?-6:1);return new Date(t.setDate(r))},ur=async(e,t)=>{let n=lr(t),r=[];for(let t=0;t<7;t++){let i=new Date(n);i.setDate(n.getDate()+t);let a=cr(i);J[a]||r.push((async()=>{let t=d(T,`usuarios`,e,`resumen_diario`,a),n=l(T,`usuarios`,e,`ingestas_diarias`,a,`comidas`),[r,i]=await Promise.all([f(t),p(n)]);J[a]={resumen:r.exists()?r.data():{acumulado_calorias:0,acumulado_proteinas:0,acumulado_carbohidratos:0,acumulado_grasas:0,acumulado_fibra:0,vasos_agua:0},ingestas:i.docs.map(e=>({id:e.id,...e.data()}))}})())}await Promise.all(r)},dr=()=>{let e=(e,t)=>{let n=document.querySelector(e);n&&Cn(n,t)};e(`#modal-registro`,{cerrar:`#cerrar-ingesta`,sucio:()=>(document.getElementById(`texto-comida`)?.value||``).trim()!==``||(document.getElementById(`buscar-alimento-input`)?.value||``).trim()!==``}),e(`#modal-confirm`,{cerrar:`#cancelar-borrado`}),e(`#modal-scanner`,{cerrar:`#cerrar-scanner`,bloquearSel:`#reader-wrapper`}),e(`#modal-receta`,{cerrar:`#cancelar-receta`,sucio:()=>(document.getElementById(`texto-receta`)?.value||``).trim()!==``||(document.getElementById(`nombre-receta`)?.value||``).trim()!==``}),e(`#modal-select-receta`,{cerrar:`#cancelar-select-receta`}),e(`#modal-detalle-receta`,{cerrar:()=>{let e=document.getElementById(`detalle-confirmar-eliminar`),t=e&&e.style.display&&e.style.display!==`none`,n=document.getElementById(t?`cancelar-eliminar-receta`:`cerrar-detalle-receta`);n&&n.click()}}),e(`#modal-porciones-receta`,{cerrar:`#cancelar-porciones`,sucio:()=>(document.getElementById(`input-gramos-receta`)?.value||``).trim()!==``||(document.getElementById(`extras-receta`)?.value||``).trim()!==``})},$=async(e,t,n=new Date)=>{let r=t.uid;dr(),En(`hoy`,()=>$(e,t,n));try{t.tema&&!Gn()&&Jn(t.tema)}catch{}let i=cr(n);$n!==r&&(J={},$n=r),J[i]||await ur(r,n);let{resumen:a,ingestas:o}=J[i];console.log(o.sort((e,t)=>(e.creado_el?.seconds||0)-(t.creado_el?.seconds||0))),er=a.vasos_agua||0;let s=t.plan_nutricional||ee(t);console.log(a),console.log(s);let c=a.acumulado_calorias||0,l=Math.min(c/s.kcal*100,100),u=Math.round(s.agua/250),d=e=>{let t=e.resumen_macros||{},n=e.resumen_micros||{},r=(e,t)=>Math.max(0,(Number(e)||0)-(Number(t)||0));a.acumulado_calorias=r(a.acumulado_calorias,t.total_calorias),a.acumulado_proteinas=r(a.acumulado_proteinas,t.total_proteinas),a.acumulado_carbohidratos=r(a.acumulado_carbohidratos,t.total_carbohidratos),a.acumulado_grasas=r(a.acumulado_grasas,t.total_grasas),a.acumulado_fibra=r(a.acumulado_fibra,t.total_fibra),a.acumulado_sodio_mg=r(a.acumulado_sodio_mg,n.total_sodio_mg),a.acumulado_potasio_mg=r(a.acumulado_potasio_mg,n.total_potasio_mg),a.acumulado_magnesio_mg=r(a.acumulado_magnesio_mg,n.total_magnesio_mg),a.acumulado_calcio_mg=r(a.acumulado_calcio_mg,n.total_calcio_mg),a.acumulado_hierro_mg=r(a.acumulado_hierro_mg,n.total_hierro_mg),a.acumulado_vitamina_d_ui=r(a.acumulado_vitamina_d_ui,n.total_vitamina_d_ui),a.acumulado_omega3_ala_mg=r(a.acumulado_omega3_ala_mg,n.total_omega3?.ala_mg)},f=()=>{let t=Number(a.acumulado_calorias)||0,n=e.querySelector(`.main-kcal .value`);n&&(n.textContent=Math.round(s.kcal-t));let r=e.querySelector(`.secondary-stats .consumed-color`);r&&(r.textContent=Math.round(t));let i=e.querySelector(`.timeline-progress`);i&&(i.style.width=`${Math.min(t/s.kcal*100,100)}%`),[[`acumulado_proteinas`,`proteina`],[`acumulado_carbohidratos`,`carbos`],[`acumulado_grasas`,`grasas`],[`acumulado_fibra`,`fibra`]].forEach(([t,n],r)=>{let i=e.querySelectorAll(`.macros-grid .macro-card`)[r];if(!i)return;let o=Number(a[t])||0,c=Number(s[n])||1,l=Math.round(o/c*100),u=i.querySelector(`.macro-values`);u&&(u.textContent=`${o.toFixed(0)} / ${c}g`);let d=i.querySelector(`.progress-fill`);d&&(d.style.width=`${Math.min(l,100)}%`);let f=i.querySelector(`.progress-percent`);f&&(f.textContent=`${l}%`)}),[[`acumulado_sodio_mg`,`sodio`,0,`mg`],[`acumulado_potasio_mg`,`potasio`,0,` mg`],[`acumulado_magnesio_mg`,`magnesio`,0,` mg`],[`acumulado_calcio_mg`,`calcio`,0,` mg`],[`acumulado_hierro_mg`,`hierro`,1,` mg`],[`acumulado_vitamina_d_ui`,`vitaminaD`,0,` UI`],[`acumulado_omega3_ala_mg`,`omega3_ala`,0,`mg`]].forEach(([t,n,r,i],o)=>{let c=e.querySelectorAll(`.micros-grid .micro-stat`)[o];if(!c)return;let l=Number(a[t])||0,u=Number(s[n])||1,d=c.querySelector(`.micro-value`);d&&(d.textContent=`${l.toFixed(r)} / ${u}${i}`);let f=c.querySelector(`.micro-fill`);f&&(f.style.width=`${Math.min(l/u*100,100)}%`)})};e.innerHTML=`
        <div class="dashboard-layout fade-in">
            <header class="dash-header">
                <div class="header-titles">
                    <p class="date-text">${n.toLocaleDateString(`es-AR`,{month:`long`,year:`numeric`}).toUpperCase()}</p>
                </div>
                <div class="profile-avatar" id="avatar-perfil" title="Mi perfil" style="cursor: pointer;"><i class="icon-user"></i></div>
            </header>

            ${fr(n)}

            <div class="content-scrollable">
                ${t.lesiones?`
                <div class="alert-pill">
                    <span class="pulse-dot"></span>
                    <p>Cuidado hoy con: <b>${Y(t.lesiones)}</b></p>
                </div>`:``}

                <section class="energy-timeline-section">
                    <div class="timeline-header">
                        <div class="main-kcal">
                            <span class="value">${Math.round(s.kcal-c,0)}</span>
                            <span class="label">kcal restantes</span>
                        </div>
                        <div class="secondary-stats">
                            <span>Meta: <b>${s.kcal}</b></span>
                            <span>Consumido: <b class="consumed-color">${Math.round(c)}</b></span>
                        </div>
                    </div>
                    <div class="timeline-bar-bg">
                        <div class="timeline-progress" style="width: ${l}%"></div>
                    </div>
                </section>

                <!-- MACRONUTRIENTES — Grid 2x2 -->
                <section class="macros-grid-container">
                    <h3 class="section-title">Macronutrientes Consumidos Hoy</h3>
                    <div class="macros-grid">
                        <!-- Proteína -->
                        <div class="macro-card">
                            <div class="macro-header">
                                <span class="macro-name">Proteínas</span>
                                <span class="macro-values">${(a.acumulado_proteinas||0).toFixed(0)} / ${s.proteina}g</span>
                            </div>
                            <div class="progress-bar-container">
                                <div class="progress-fill prot" style="width: ${Math.min(a.acumulado_proteinas/s.proteina*100,100)}%"></div>
                            </div>
                            <div class="progress-percent">${Math.round(a.acumulado_proteinas/s.proteina*100)}%</div>
                        </div>

                        <!-- Carbohidratos -->
                        <div class="macro-card">
                            <div class="macro-header">
                                <span class="macro-name">Carbos</span>
                                <span class="macro-values">${(a.acumulado_carbohidratos||0).toFixed(0)} / ${s.carbos}g</span>
                            </div>
                            <div class="progress-bar-container">
                                <div class="progress-fill carb" style="width: ${Math.min(a.acumulado_carbohidratos/s.carbos*100,100)}%"></div>
                            </div>
                            <div class="progress-percent">${Math.round(a.acumulado_carbohidratos/s.carbos*100)}%</div>
                        </div>

                        <!-- Grasas -->
                        <div class="macro-card">
                            <div class="macro-header">
                                <span class="macro-name">Grasas</span>
                                <span class="macro-values">${(a.acumulado_grasas||0).toFixed(0)} / ${s.grasas}g</span>
                            </div>
                            <div class="progress-bar-container">
                                <div class="progress-fill fat" style="width: ${Math.min(a.acumulado_grasas/s.grasas*100,100)}%"></div>
                            </div>
                            <div class="progress-percent">${Math.round(a.acumulado_grasas/s.grasas*100)}%</div>
                        </div>

                        <!-- Fibra -->
                        <div class="macro-card">
                            <div class="macro-header">
                                <span class="macro-name">Fibra</span>
                                <span class="macro-values">${(a.acumulado_fibra||0).toFixed(0)} / ${s.fibra}g</span>
                            </div>
                            <div class="progress-bar-container">
                                <div class="progress-fill fiber" style="width: ${Math.min(a.acumulado_fibra/s.fibra*100,100)}%"></div>
                            </div>
                            <div class="progress-percent">${Math.round(a.acumulado_fibra/s.fibra*100)}%</div>
                        </div>
                    </div>
                </section>

                <!-- MICRONUTRIENTES — Desplegable -->
                <section class="micros-collapsible">
                <details>
                    <summary class="micros-summary-title">
                        <span>Micronutrientes</span>
                        <span class="icon-arrow">▾</span>
                    </summary>
                    <div class="micros-content">
                        <div class="micros-grid">
                            
                            <!-- Sodio (Usualmente es un límite máximo) -->
                            <div class="micro-stat">
                                <div class="micro-header-info">
                                    <span class="micro-label">Sodio</span>
                                    <span class="micro-value">${(a.acumulado_sodio_mg||0).toFixed(0)} / ${s.sodio}mg</span>
                                </div>
                                <div class="micro-progress-bg">
                                    <div class="micro-fill warning" style="width: ${Math.min(a.acumulado_sodio_mg/s.sodio*100,100)}%"></div>
                                </div>
                            </div>

                            <!-- Potasio -->
                            <div class="micro-stat">
                                <div class="micro-header-info">
                                    <span class="micro-label">Potasio</span>
                                    <span class="micro-value">${(a.acumulado_potasio_mg||0).toFixed(0)} / ${s.potasio} mg</span>
                                </div>
                                <div class="micro-progress-bg">
                                    <div class="micro-fill" style="width: ${Math.min(a.acumulado_potasio_mg/s.potasio*100,100)}%"></div>
                                </div>
                            </div>

                            <!-- Magnesio -->
                            <div class="micro-stat">
                                <div class="micro-header-info">
                                    <span class="micro-label">Magnesio</span>
                                    <span class="micro-value">${(a.acumulado_magnesio_mg||0).toFixed(0)} / ${s.magnesio} mg</span>
                                </div>
                                <div class="micro-progress-bg">
                                    <div class="micro-fill" style="width: ${Math.min(a.acumulado_magnesio_mg/s.magnesio*100,100)}%"></div>
                                </div>
                            </div>

                            <!-- Calcio -->
                            <div class="micro-stat">
                                <div class="micro-header-info">
                                    <span class="micro-label">Calcio</span>
                                    <span class="micro-value">${(a.acumulado_calcio_mg||0).toFixed(0)} / ${s.calcio} mg</span>
                                </div>
                                <div class="micro-progress-bg">
                                    <div class="micro-fill" style="width: ${Math.min(a.acumulado_calcio_mg/s.calcio*100,100)}%"></div>
                                </div>
                            </div>

                            <!-- Hierro -->
                            <div class="micro-stat">
                                <div class="micro-header-info">
                                    <span class="micro-label">Hierro</span>
                                    <span class="micro-value">${(a.acumulado_hierro_mg||0).toFixed(1)} / ${s.hierro} mg </span>
                                </div>
                                <div class="micro-progress-bg">
                                    <div class="micro-fill" style="width: ${Math.min(a.acumulado_hierro_mg/s.hierro*100,100)}%"></div>
                                </div>
                            </div>

                            <!-- Vitamina D -->
                            <div class="micro-stat">
                                <div class="micro-header-info">
                                    <span class="micro-label">Vit. D</span>
                                    <span class="micro-value">${(a.acumulado_vitamina_d_ui||0).toFixed(0)} / ${s.vitaminaD} UI </span>
                                </div>
                                <div class="micro-progress-bg">
                                    <div class="micro-fill" style="width: ${Math.min(a.acumulado_vitamina_d_ui/s.vitaminaD*100,100)}%"></div>
                                </div>
                            </div>

                            <!-- Omegas (Opcional según tu lógica) -->
                            <div class="micro-stat full-width">
                                <div class="micro-header-info">
                                    <span class="micro-label">Omega-3 (ALA)</span>
                                    <span class="micro-value">${(a.acumulado_omega3_ala_mg||0).toFixed(0)} / ${s.omega3_ala||1600}mg</span>
                                </div>
                                <div class="micro-progress-bg">
                                    <div class="micro-fill omega" style="width: ${Math.min(a.acumulado_omega3_ala_mg/(s.omega3_ala||1600)*100,100)}%"></div>
                                </div>
                            </div>

                        </div>
                    </div>
                </details>
            </section>

            <!-- SECCIÓN SUB-MENÚ DE ACCIONES -->
            <section class="submenu-actions">
                <button class="action-btn" id="btn-escaner-producto">
                    <span class="action-icon">📷</span>
                    <span class="action-label">ESCANEAR</span>
                </button>
                <button class="action-btn" id="btn-registrar-receta">
                    <span class="action-icon">🍲</span>
                    <span class="action-label">Nueva Receta</span>
                </button>
                <button class="action-btn" id="btn-usar-receta">
                    <span class="action-icon">🍽️</span>
                    <span class="action-label">Usar Receta</span>
                </button>
            </section>
 


                <section class="today-meals">
                    <div class="section-header"><h3>Ingestas de Hoy</h3></div>
                    <div class="meals-list">
                        ${o.slice().sort((e,t)=>(e.creado_el?.seconds||0)-(t.creado_el?.seconds||0)).map((e,t)=>{let n=e.resumen_macros??{},r=e.micros_completos===!0,i=e.resumen_micros??{},a=rr(e),o=[...e.alimentos||[]].sort((e,t)=>(Number(t.calorias)||0)-(Number(e.calorias)||0)),s=Math.round(n.total_calorias||0),c=Number(n.total_proteinas||0).toFixed(1),l=Number(n.total_carbohidratos||0).toFixed(1),u=Number(n.total_grasas||0).toFixed(1),d=Number(n.total_fibra||0).toFixed(1),f=r?[i.total_hierro_mg?{label:`Fe`,val:`${i.total_hierro_mg.toFixed(1)}mg`}:null,i.total_calcio_mg?{label:`Ca`,val:`${Math.round(i.total_calcio_mg)}mg`}:null,i.total_magnesio_mg?{label:`Mg`,val:`${Math.round(i.total_magnesio_mg)}mg`}:null,i.total_zinc_mg?{label:`Zn`,val:`${i.total_zinc_mg.toFixed(1)}mg`}:null,i.total_vitamina_d_ui?{label:`Vit.D`,val:`${Math.round(i.total_vitamina_d_ui)}UI`}:null,i.total_vitamina_b12_mcg?{label:`B12`,val:`${i.total_vitamina_b12_mcg.toFixed(1)}mcg`}:null,i.total_omega3?.epa_dha_mg?{label:`EPA+DHA`,val:`${Math.round(i.total_omega3.epa_dha_mg)}mg`,omega:!0}:null,i.total_omega3?.ala_mg?{label:`ALA`,val:`${Math.round(i.total_omega3.ala_mg)}mg`,omega:!0}:null].filter(Boolean):[];return`
                            <div class="meal-card">
                                <div class="meal-card-header">
                                    <div class="meal-index">${t+1}</div>
                                    <div class="meal-title-block">
                                        <span class="meal-name">${Y(a)}</span>
                                        <span class="meal-time">${e.creado_el?.seconds?new Date(e.creado_el.seconds*1e3).toLocaleTimeString(`es-AR`,{hour:`2-digit`,minute:`2-digit`}):``}</span>
                                    </div>
                                    <div class="meal-kcal-block">
                                        <span class="meal-kcal-num">${s}</span>
                                        <span class="meal-kcal-label">kcal</span>
                                    </div>
                                    <button class="meal-delete-btn" data-id="${e.id||t}" title="Eliminar">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                    </button>
                                </div>

                                <div class="meal-macros-row">
                                    <div class="macro-pill prot"><span class="pill-label">Proteína</span><span class="pill-val">${c}g</span></div>
                                    <div class="macro-pill carb"><span class="pill-label">Carbos</span><span class="pill-val">${l}g</span></div>
                                    <div class="macro-pill fat"><span class="pill-label">Grasas</span><span class="pill-val">${u}g</span></div>
                                    <div class="macro-pill fiber"><span class="pill-label">Fibra</span><span class="pill-val">${d}g</span></div>
                                </div>

                                ${r&&f.length>0?`
                                    <div class="meal-micros-row">
                                        ${f.map(e=>`
                                            <span class="micro-chip ${e.omega?`omega`:``}">
                                                <span class="micro-chip-label">${e.label}</span>
                                                <span class="micro-chip-val">${e.val}</span>
                                            </span>
                                        `).join(``)}
                                    </div>
                                `:r?``:`
                                    <div class="meal-micros-loading">
                                        <span class="loading-dot"></span>
                                        <span class="loading-dot"></span>
                                        <span class="loading-dot"></span>
                                        <span>Calculando micros...</span>
                                    </div>
                                `}

                                <!-- ACORDEÓN: detalle por ingrediente (oculto hasta tocar) -->
                                <button class="meal-detalle-toggle" type="button" aria-expanded="false">
                                    <span>Detalle (${o.length})</span>
                                    <svg class="meal-detalle-chev" width="14" height="14" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M6 9l6 6 6-6"/>
                                    </svg>
                                </button>
                                <div class="meal-detalle-cuerpo"><div>
                                    <div class="meal-items-list">
                                        ${o.map(e=>`
                                            <div class="meal-item-container">
                                                <div class="meal-item-row">
                                                    <span class="meal-item-dot"></span>
                                                    <span class="meal-item-name">${Y(e.alimento)}</span>
                                                    <span class="meal-item-grams">${e.gramos_estimados?`${e.gramos_estimados}g`:``}</span>
                                                    <span class="meal-item-kcal">${Math.round(Number(e.calorias)||0)} kcal</span>
                                                </div>
                                                <div class="meal-item-macros">
                                                    <span class="mi-prot">P ${Number(e.proteinas||0).toFixed(1)}g</span>
                                                    <span class="mi-carb">C ${Number(e.carbohidratos||0).toFixed(1)}g</span>
                                                    <span class="mi-fat">G ${Number(e.grasas||0).toFixed(1)}g</span>
                                                    <span class="mi-fib">F ${Number(e.fibra||0).toFixed(1)}g</span>
                                                </div>
                                            </div>
                                        `).join(``)}
                                    </div>
                                </div></div>
                            </div>`}).join(``)}

                        <div class="meal-item pending-new" id="boton-registro-texto" style="cursor: pointer;">
                            <div class="meal-badge b-next">${o.length+1}</div>
                            <div class="meal-info">
                                <div class="meal-header-row">
                                    <div class="title-meta">
                                        <strong class="meal-title">¿Qué comiste ahora?</strong>
                                        <p class="meal-subtitle">Producto, receta o con IA</p>
                                    </div>
                                    <div class="meal-stats"><button class="add-btn-main">+</button></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- HIDRATACIÓN — Desplegable (mismo estilo que Micronutrientes) -->
                <section class="micros-collapsible hydration-collapsible">
                    <details>
                        <summary class="micros-summary-title">
                            <span class="hydration-title-group">
                                <span>Hidratación</span>
                                <span class="water-counter hydration-badge"><b id="vasos-tomados">${er}</b> / ${u} vasos</span>
                            </span>
                            <span class="icon-arrow">▾</span>
                        </summary>
                        <div class="micros-content">
                            <div class="glasses-grid" id="glasses-container">
                                ${Array(u).fill(0).map((e,t)=>`
                                    <div class="glass-item ${t<er?`filled`:``}" data-index="${t}">
                                        <span class="glass-icon">💧</span>
                                    </div>
                                `).join(``)}
                            </div>
                        </div>
                    </details>
                </section>
            </div>

            <nav class="bottom-nav">
                <button class="nav-item active" id="nav-hoy">
                    <span class="nav-icon">🏠</span><span class="nav-texto">Hoy</span>
                </button>
                <button class="nav-item" id="nav-sugerencias">
                    <span class="nav-icon">💡</span><span class="nav-texto">Sugerencias</span>
                </button>
                <button class="nav-item nav-add" id="nav-registrar">
                    <span class="nav-add-circle">+</span>
                    <span class="nav-add-label">Registrar</span>
                </button>
                <button class="nav-item">
                    <span class="nav-icon">🥗</span><span class="nav-texto">Diario</span>
                </button>
                <button class="nav-item" id="nav-perfil">
                    <span class="nav-icon">⚙️</span><span class="nav-texto">Perfil</span>
                </button>
            </nav>
        </div>
    `,e.querySelectorAll(`.day-item`).forEach(n=>{n.onclick=()=>{$(e,t,new Date(n.dataset.date+`T12:00:00`))}});let p=e.querySelectorAll(`.glass-item`),m=e.querySelector(`#vasos-tomados`);p.forEach(e=>{e.onclick=async()=>{let t=e.classList.contains(`filled`)?-1:1;if(!(er===0&&t===-1)){er+=t,m.innerText=er,p.forEach((e,t)=>{t<er?e.classList.add(`filled`):e.classList.remove(`filled`)}),J[i].resumen.vasos_agua=er;try{await je(r,i,t)}catch(e){console.error(e)}}}});let h=document.getElementById(`buscar-alimento-input`),g=document.getElementById(`buscar-alimento-estado`),_=document.getElementById(`buscar-alimento-resultados`),v=document.getElementById(`buscar-alimento-fuente`),y=`Escribí al menos 3 letras y tocá «Buscar».`,b=()=>{h&&(h.value=``),_&&(_.innerHTML=``),g&&(g.innerHTML=y),v&&(v.innerHTML=``)},x=document.getElementById(`modal-registro`),S=()=>{document.getElementById(`texto-comida`).value=``,b(),x.style.display=`flex`};e.querySelector(`#boton-registro-texto`).onclick=S;let C=e.querySelector(`#nav-registrar`);C&&(C.onclick=S);let w=document.getElementById(`cerrar-ingesta`);if(w&&(w.onclick=()=>{x.style.display=`none`}),document.getElementById(`cancelar-modal`).onclick=()=>{x.style.display=`none`},document.getElementById(`confirmar-modal`).onclick=async()=>{let a=document.getElementById(`confirmar-modal`),o=document.getElementById(`texto-comida`).value.trim();if(!o){X(`Escribí qué comiste — o buscá un producto / elegí una receta`,`warning`),document.getElementById(`texto-comida`).focus();return}let s=Z(a,`Analizando...`),c=setInterval(()=>{if(_e.allOnCooldown()){let e=Math.ceil(_e.msUntilNextKey()/1e3);s(e>0?`Esperando API (${e}s)...`:`Reintentando...`)}else s(`Analizando...`)},1e3);try{let{rapido:a,microsPromise:s}=Ce(o),c=await a;console.log(c);let l=document.querySelector(`.day-item.active`).dataset.date,u=await De(r,c,l,o);At(r,c.items).catch(e=>console.warn(`⚠️ No se guardaron los productos propios:`,e)),delete J[i],x.style.display=`none`,$(e,t,n),s.then(e=>Oe(r,i,u,e)).catch(e=>console.warn(`⚠️ Micros no disponibles:`,e.message))}catch(e){console.error(`Error al analizar comida:`,e);let t;t=e.message.startsWith(`RATE_LIMIT`)?`La IA está al límite — esperá 1 minuto`:e.message===`TODAS_LAS_KEYS_INVALIDAS`?`Error de configuración de API keys`:`No se pudo analizar la comida. Intentá de nuevo.`,X(t,`error`)}finally{clearInterval(c),Q(a)}},h){let a=0,o=null,s=()=>{x.style.display=`none`},c=e=>`
            <div>Sin resultados para "<b>${Y(e)}</b>".</div>
            ${l()}`,l=()=>`
            <div class="off-acciones">
                <button type="button" class="btn-primary" data-accion="ia">🧠 Estimar con IA</button>
                <button type="button" class="btn-secondary" data-accion="manual">✏️ Cargar manual</button>
            </div>`,u=e=>{let t=document.getElementById(`texto-comida`);t&&(typeof e==`string`&&(t.value=e),t.scrollIntoView({behavior:`smooth`,block:`center`}),setTimeout(()=>t.focus({preventScroll:!0}),260))},d=e=>{g.querySelector(`[data-accion="ia"]`)?.addEventListener(`click`,()=>u(e)),g.querySelector(`[data-accion="manual"]`)?.addEventListener(`click`,()=>u(null))},f=async a=>{if(!a)return;let o=a.fuente===`propio`,c=a.marca?`${a.nombre} (${a.marca})`:a.nombre,l=o?`Tus productos`:`Open Food Facts`,u=await sr(c,a.porcion_g||100);if(!u)return;let d=ze(yt(a),u);if(!d){X(`No se pudieron calcular los macros del producto`,`error`);return}try{let f=document.querySelector(`.day-item.active`)?.dataset.date||i;await De(r,{items:[d]},f,`${u} g de ${c} (${l})`),o&&jt(r,a.nombre,a.marca).catch(()=>{}),delete J[f],s(),await $(e,t,n),X(`${u} g de "${a.nombre}" registrados`,`success`),navigator.vibrate&&navigator.vibrate([100,50,100])}catch(e){console.error(`Error registrando alimento buscado:`,e),X(`No se pudo registrar — probá de nuevo`,`error`)}},p=(e,t)=>{_.innerHTML=e.map((e,t)=>`
                <button type="button" class="off-fila" data-indice="${t}" role="option">
                    ${e.imagen?`<img src="${Y(e.imagen)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`:`<img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E" alt="">`}
                    <span class="off-fila-texto">
                        <span class="off-fila-nombre">${Y(e.nombre)}</span>
                        <span class="off-fila-marca">${Y(e.marca||(e.fuente===`propio`?`Tus productos`:`Sin marca`))}</span>
                    </span>
                    <span class="off-fila-kcal">${Math.round(Number(e.kcal100)||0)} kcal/100 g</span>
                </button>`).join(``),g.innerHTML=`
                <div>${e.length} resultado${e.length===1?``:`s`} — tocá uno para registrar</div>`,v&&(v.innerHTML=m(e)),_.querySelectorAll(`.off-fila`).forEach(t=>{t.onclick=()=>f(e[Number(t.dataset.indice)])})},m=e=>{let t=e.some(e=>e.fuente===`propio`),n=e.some(e=>e.fuente!==`propio`);if(!t&&!n)return``;let r=[];return t&&r.push(`<span>Tus productos cargados</span>`),n&&r.push(`<span>Datos de <a href="https://openfoodfacts.org" target="_blank" rel="noopener noreferrer">Open Food Facts</a></span>`),`<div class="off-fuente">${r.join(`<span class="off-fuente-sep">·</span>`)}</div>`},b=async(e,t)=>{let n=await Ot(r,e);if(t!==a)return;let i=await vt(e);if(t!==a)return;let o=[...n,...i.resultados||[]].slice(0,15);if(o.length){p(o,e);return}_.innerHTML=``,v&&(v.innerHTML=``),i.estado===`error`?g.innerHTML=`
                    <div>${Y(i.mensaje||`No se pudo buscar. Probá de nuevo.`)}</div>
                    ${l()}`:g.innerHTML=c(e),d(e)},S=()=>{let e=h.value.trim().replace(/\s+/g,` `);if(e.length<3){_.innerHTML=``,v&&(v.innerHTML=``),g.innerHTML=e.length?`Escribí al menos 3 letras para buscar.`:y;return}if(o===e)return;o=e;let t=++a;g.innerHTML=`<span class="off-spinner" aria-hidden="true"></span>Buscando...`,_.innerHTML=``,v&&(v.innerHTML=``),b(e,t).finally(()=>{o===e&&(o=null)})};h.oninput=()=>{++a;let e=h.value.trim();_.innerHTML=``,v&&(v.innerHTML=``),g.innerHTML=e.length<3?e.length?`Escribí al menos 3 letras para buscar.`:y:`Tocá «Buscar» o apretá Enter.`};let C=document.getElementById(`buscar-alimento-limpiar`);if(C){C.onclick=()=>{h.value=``,h.dispatchEvent(new Event(`input`,{bubbles:!0})),h.focus()};let e=h.oninput;h.oninput=t=>{e&&e(t),C.hidden=h.value.trim()===``}}let w=document.getElementById(`buscar-alimento-boton`);w&&(w.onclick=S);let T=document.getElementById(`buscar-alimento-form`);T&&(T.onsubmit=e=>{e.preventDefault(),S()})}e.querySelectorAll(`.meal-card .meal-detalle-toggle`).forEach(e=>{e.onclick=()=>{let t=e.closest(`.meal-card`).classList.toggle(`detalle-abierto`);e.setAttribute(`aria-expanded`,String(t))}});let T=async(a,s,{conDeshacer:c=!1}={})=>{let l=rr(a);if(s){let e=s.closest(`.swipe-row`)||s;s.style.maxHeight=s.offsetHeight+`px`,s.classList.add(`meal-eliminando`),setTimeout(()=>e.remove(),260)}let u=o.findIndex(e=>e.id===a.id);u>-1&&o.splice(u,1),d(a),f(),e.querySelectorAll(`.meal-card .meal-index`).forEach((e,t)=>{e.textContent=t+1});let p=e.querySelector(`#boton-registro-texto .meal-badge`);p&&(p.textContent=o.length+1);let m=async()=>{try{await Ae(r,i,a),delete J[i],$(e,t,n)}catch(e){console.error(`Error deshaciendo el borrado:`,e),X(`No se pudo deshacer`,`error`)}};if(c)try{await ke(r,i,a),delete J[i],X(`"${l}" eliminado`,`info`,6e3,{etiqueta:`Deshacer`,alPulsar:m})}catch(r){console.error(`Error eliminando ingesta:`,r),X(`No se pudo borrar — restaurado`,`error`),delete J[i],$(e,t,n)}else X(`"${l}" eliminado`,`success`),ke(r,i,a).then(()=>{delete J[i]}).catch(r=>{console.error(`Error eliminando ingesta:`,r),X(`No se pudo borrar — restaurado`,`error`),delete J[i],$(e,t,n)})};e.querySelectorAll(`.meals-list .meal-card`).forEach(e=>{let t=()=>{let t=e.querySelector(`.meal-delete-btn`)?.dataset.id,n=o.find(e=>e.id===t);n&&T(n,e,{conDeshacer:!0})};In(e,{acciones:[{etiqueta:`Eliminar`,clase:`peligro`,alPulsar:t}],alEjecutarLargo:t})});let E=document.getElementById(`modal-confirm`);e.querySelectorAll(`.meal-delete-btn`).forEach(e=>{e.onclick=()=>{let t=e.dataset.id,n=o.find(e=>e.id===t);if(!n){console.error(`No se encontró la ingesta con ID: ${t}`);return}document.getElementById(`confirm-text`).innerText=`¿Borrar "${rr(n)}"?`,E.style.display=`flex`,document.getElementById(`confirmar-borrado`).onclick=()=>{E.style.display=`none`,T(n,e.closest(`.meal-card`))}}}),document.getElementById(`cancelar-borrado`).onclick=()=>{E.style.display=`none`},e.querySelector(`#nav-hoy`).onclick=()=>$(e,t,new Date);let D=e.querySelector(`#nav-sugerencias`);D&&(D.onclick=()=>Bn(e,t));let O=e.querySelector(`#nav-perfil`);O&&(O.onclick=()=>Qn(e,t));let te=e.querySelector(`#avatar-perfil`);te&&(te.onclick=()=>Qn(e,t));let k=null,A=async()=>{let e=document.getElementById(`modal-scanner`);if(k?.isScanning)try{await k.stop(),k.clear()}catch(e){console.error(`Error al limpiar scanner:`,e)}e&&(e.style.display=`none`)},ne=document.getElementById(`cerrar-scanner`);ne&&(ne.onclick=A);let re=e=>{let t=document.getElementById(`modal-scanner`);t.style.display=`flex`,k||=new Html5Qrcode(`reader`),k.start({facingMode:`environment`},{fps:10,qrbox:250},async t=>{navigator.vibrate&&navigator.vibrate(200),await A(),e(t)},e=>{}).catch(e=>{console.error(`Error de cámara:`,e),X(`No se pudo abrir la cámara`,`error`),A()})},ie=e.querySelector(`#btn-escaner-producto`);ie&&(ie.onclick=()=>{re(async a=>{X(`Buscando producto...`,`info`);let o=await Le(a);if(!o){X(`Producto no encontrado`,`error`);return}o.fuente===`openfoodfacts`?(await Re(t.uid,o),X(`"${o.nombre}" guardado`,`success`)):console.log(`Producto ya existente, no se guarda duplicado`);let s=await sr(o.nombre);if(!s)return;let c=ze(o,s);if(!c){X(`No se pudieron calcular los macros del producto`,`error`);return}await Oe(r,i,await De(r,{items:[c]},i,o.nombre),{items_micros:[c]}),delete J[i],await $(e,t,n),X(`${s} g de "${o.nombre?.length>30?o.nombre.substring(0,27)+`...`:o.nombre}" registrados`,`success`),navigator.vibrate&&navigator.vibrate([100,50,100])})});let j=e=>Math.round((e.nutrientes_por_100g?.calorias??e.calorias??0)*(e.cantidad_g??e.cantidad??0)/100),ae=e=>{let t=e.nutrientes_por_100g||{},n=(Number(e.cantidad_g??e.cantidad)||0)/100,r=e=>Math.round((Number(e)||0)*n*10)/10;return{p:r(t.proteinas),c:r(t.carbohidratos),g:r(t.grasas),fib:r(t.fibra)}},oe=e=>(e||[]).filter(Boolean).map(e=>`<span class="receta-chip">${Y(e)}</span>`).join(``),se=e=>{let t=(e||[]).filter(e=>e&&e.valor!==null&&e.valor!==void 0&&e.valor!==``);return t.length?`<div class="receta-meta-lista">`+t.map(e=>`<div class="receta-meta-fila"><span>${Y(e.label)}</span><b>${Y(String(e.valor))}</b></div>`).join(``)+`</div>`:``},ce=e=>{if(!e?.length)return`<p style="color:var(--coipo-text-muted); font-size:0.85rem; margin:10px 4px;">Sin ingredientes registrados</p>`;let t=e.map(e=>{let t=e.cantidad_g??e.cantidad??0,n=j(e),r=e.fuente===`openfoodfacts`?`datos reales`:e.fuente===`ia_estimado`?`estimado por IA`:e.fuente===`base_propia`?`base propia`:``,i=ae(e),a=e.marca?`<span class="receta-ing-marca">${Y(e.marca)}</span>`:``,o=[a?`${a} `:``,`${t} g`,r].filter(Boolean).join(` · `),s=i.p+i.c+i.g+i.fib>0;return`
        <div class="receta-ing-bloque">
            <div class="receta-ing-bloque-head">
                <span class="receta-ing-bloque-nombre">${Y(e.nombre||``)}</span>
                <span class="receta-ing-bloque-kcal">${n>0?`${n} kcal`:`—`}</span>
            </div>
            <div class="receta-ing-bloque-meta">${o}</div>
            ${s?`<div class="receta-ing-bloque-macros">P ${i.p} g · C ${i.c} g · G ${i.g} g${i.fib>0?` · F ${i.fib} g`:``}</div>`:``}
        </div>`});return e.map((e,t)=>({idx:t,kcal:j(e)})).sort((e,t)=>t.kcal-e.kcal).map(e=>t[e.idx]).join(``)},le=(e,t,n=`Receta completa`)=>{let r=[[`calorias`,`Calorías`,`kcal`],[`proteinas`,`Proteínas`,`g`],[`carbohidratos`,`Carbohidratos`,`g`],[`grasas`,`Grasas`,`g`],[`fibra`,`Fibra`,`g`]],i=(e,t)=>t===`calorias`?Math.round(e||0):Math.round((e||0)*10)/10,a=e=>r.map(([t,n,r])=>`<div class="receta-macro-linea"><span>${n}</span><span><b>${i(e?.[t],t)}</b> ${r}</span></div>`).join(``);return`
        <div class="receta-cards">
            <div class="receta-card">
                <div class="receta-card-titulo">${Y(n)}</div>
                ${a(e)}
            </div>
            <div class="receta-card receta-card-acento">
                <div class="receta-card-titulo">Por 100 g</div>
                ${a(t)}
            </div>
        </div>`},ue=document.getElementById(`modal-receta`),de=document.getElementById(`receta-form`),fe=document.getElementById(`receta-preview`),M=null,N=null,P=()=>{fe.style.display=`none`,de.style.display=`block`},F=e.querySelector(`#btn-registrar-receta`);F&&(F.onclick=()=>{N=null,document.getElementById(`receta-form-titulo`).textContent=`Crear Nueva Receta`,document.getElementById(`receta-form-hint`).textContent=`Pegá o escribí la receta con todos sus ingredientes y cantidades. La IA calcula los macros y te los muestra antes de guardar.`,document.getElementById(`texto-receta`).value=``,document.getElementById(`nombre-receta`).value=``,M=null,P(),ue.style.display=`flex`}),document.getElementById(`cancelar-receta`).onclick=()=>{if(ue.style.display=`none`,N){let e=N;N=null,M=null,xe(e)}};let pe=(e,t)=>{document.getElementById(`preview-nombre`).textContent=e.nombre,document.getElementById(`preview-meta`).innerHTML=se([{label:`Peso total`,valor:`${Math.round(e.peso_total_g)} g`},{label:`Rinde`,valor:`${e.porciones_totales} porciones`},{label:`Peso por porción`,valor:`${e.peso_por_porcion_g} g`},{label:`Kcal por porción`,valor:`${Math.round(e.totales_macros_porcion.calorias)} kcal`}]);let n=document.getElementById(`preview-desc`);e.descripcion?(n.textContent=e.descripcion,n.style.display=`block`):n.style.display=`none`,document.getElementById(`preview-ingredientes`).innerHTML=ce(e.ingredientes),document.getElementById(`preview-tarjetas`).innerHTML=le(e.totales_macros_completa,e.valores_por_100g,`Receta completa (${Math.round(e.peso_total_g)}g)`);let r=document.getElementById(`preview-avisos`);r.innerHTML=t?.length?`<div class="receta-aviso">⚠️ No se pudieron calcular: ${Y(t.map(e=>`${e.nombre} (${e.razon})`).join(`, `))}</div>`:``,document.getElementById(`guardar-receta`).innerText=N?`Guardar cambios`:`Guardar receta`,de.style.display=`none`,fe.style.display=`block`};document.getElementById(`confirmar-receta`).onclick=async()=>{let e=document.getElementById(`confirmar-receta`),t=document.getElementById(`texto-receta`).value.trim();if(t){Z(e,`Calculando macros (IA + OFF)...`);try{let e=document.getElementById(`nombre-receta`).value.trim(),n=N?Math.max(1,Number(N.porciones_totales)||4):4,r=await we(t);if(!r?.ingredientes?.length)throw Error(`No se pudieron extraer ingredientes`);e||=String(r.nombre_receta||``).trim()||`Mi receta`;let i=await st(r);M=ct(i,t,e,n),pe(M,i.ingredientesFallidos)}catch(e){console.error(e),X(or(e,`No pude analizar la receta`),`error`)}finally{Q(e)}}},document.getElementById(`volver-receta`).onclick=()=>{M=null,P()},document.getElementById(`guardar-receta`).onclick=async()=>{if(!M){P();return}let e=document.getElementById(`guardar-receta`),t=M,n=N;Z(e,n?`Guardando cambios...`:`Guardando...`);try{if(n){await $e(r,n.id,t);let e={id:n.id,...t};N=null,M=null,ue.style.display=`none`,P(),X(`Receta "${t.nombre}" actualizada`,`success`);try{await Te()}catch(e){console.warn(`No se pudo refrescar la lista:`,e)}xe(e);return}await Qe(r,t),X(`Receta "${t.nombre}" guardada`,`success`),ue.style.display=`none`,document.getElementById(`texto-receta`).value=``,document.getElementById(`nombre-receta`).value=``,M=null,P(),window.recetasCache&&delete window.recetasCache}catch(e){console.error(e),X(or(e,n?`No se pudieron guardar los cambios`:`No se pudo guardar la receta`),`error`)}finally{Q(e)}};let me=document.getElementById(`modal-select-receta`),he=document.getElementById(`modal-porciones-receta`),ge=document.getElementById(`modal-detalle-receta`),I=null,L=null,R=null,ve=()=>{let e=document.getElementById(`calculo-vivo`),t=parseFloat(document.getElementById(`input-gramos-receta`).value)||0;if(!I||t<=0||qe(I)<=0){e.style.display=`none`;return}let n,r;try{n=Je(I,t),r=Xe(I,t,R?.datos||null)}catch{e.style.display=`none`;return}let i=r.macros,a=e=>Math.round((e||0)*10)/10,o=!!R?.datos?.items?.length,s=r.micros||{},c=[[`total_sodio_mg`,`mg sodio`,0],[`total_potasio_mg`,`mg potasio`,0],[`total_magnesio_mg`,`mg magnesio`,0],[`total_calcio_mg`,`mg calcio`,0],[`total_hierro_mg`,`mg hierro`,1],[`total_zinc_mg`,`mg zinc`,1],[`total_vitamina_d_ui`,`UI vit D`,0],[`total_vitamina_b12_mcg`,`µg B12`,1]].filter(([e])=>(Number(s[e])||0)>.05).map(([e,t,n])=>`<span class="receta-chip">${n?a(s[e]):Math.round(s[e])} ${t}</span>`);(Number(s.total_omega3?.ala_mg)||0)>.05&&c.push(`<span class="receta-chip">${Math.round(s.total_omega3.ala_mg)}mg Ω3</span>`);let l=o?`
        <div class="receta-vivo-desglose">
            <span>Receta ${t}g: <b>${a(n.macros.total_calorias)} kcal</b></span>
            <span>Extras: <b>${a(R.datos.macros?.total_calorias||0)} kcal</b></span>
        </div>`:``,u=n.factor*100,d=u>.05?`<span class="receta-chip">≈ ${Math.round(u*10)/10}% de ${Math.round(n.peso_total_g)}g</span>`:``,f=r.alimentos.filter(e=>e.es_ingrediente_receta).map(e=>`
            <div class="receta-vivo-ing">
                <span class="receta-vivo-ing-nombre" title="${Y(e.alimento)}">${Y(e.alimento)}${e.marca?` <i class="receta-ing-marca">${Y(e.marca)}</i>`:``}</span>
                <span class="receta-vivo-ing-g">${a(e.gramos_estimados)}g</span>
                <span class="receta-vivo-ing-kcal">${Math.round(e.calorias)} kcal</span>
            </div>`).join(``);e.innerHTML=`
        <div class="receta-vivo-head">
            <span class="receta-vivo-label">${t}g de receta${o?` + extras`:``}</span>
            ${d}${o?`<span class="receta-chip receta-chip-acento">con extras</span>`:``}
        </div>
        <div class="receta-vivo-kcal"><b>${Math.round(i.total_calorias)}</b><small>kcal</small></div>
        <div class="receta-vivo-macros">
            <span>Proteínas <b>${a(i.total_proteinas)}g</b></span>
            <span>Carbos <b>${a(i.total_carbohidratos)}g</b></span>
            <span>Grasas <b>${a(i.total_grasas)}g</b></span>
            <span>Fibra <b>${a(i.total_fibra)}g</b></span>
        </div>
        ${c.length?`<div class="receta-chips">${c.join(``)}</div>`:``}
        ${f?`
        <details class="receta-acordeon">
            <summary class="receta-acordeon-resumen">
                <span>Tu porción, ingrediente por ingrediente</span>
                <span class="receta-acordeon-icono">▾</span>
            </summary>
            <div class="receta-vivo-ing-lista">${f}</div>
        </details>`:``}
        ${l}
    `,e.style.display=`block`};document.getElementById(`input-gramos-receta`).oninput=ve,document.getElementById(`extras-receta`).oninput=()=>{let e=document.getElementById(`extras-receta`).value.trim();R&&e!==R.texto&&(R=null,ve())},document.getElementById(`calcular-extras-btn`).onclick=async()=>{let e=document.getElementById(`extras-receta`).value.trim();if(!e){X(`Escribí los extras (ej: 2 claras de huevo)`,`warning`);return}if(R&&R.texto===e){X(`Esos extras ya están calculados`,`success`);return}let t=document.getElementById(`calcular-extras-btn`);Z(t,`Analizando extras...`);try{let{rapido:t,microsPromise:n}=Ce(e);R={texto:e,datos:Ye(await t,await n.catch(e=>(console.warn(`Micros de extras no disponibles:`,e.message),null)))},ve(),X(`Extras: +${Math.round(R.datos.macros.total_calorias)} kcal al total`,`success`)}catch(e){console.error(`Error analizando extras:`,e),R=null,ve(),X(or(e,`No se pudieron analizar los extras`),`error`)}finally{Q(t)}};let ye=e=>{I=e,me.style.display=`none`,R=null;let t=qe(e),n=e.valores_por_100g??(t>0&&e.totales_macros_completa?Object.fromEntries([`calorias`,`proteinas`,`carbohidratos`,`grasas`].map(n=>[n,(Number(e.totales_macros_completa[n])||0)/t*100])):null),r=e=>Math.round((e||0)*10)/10,i=n&&Number(n.calorias)>0?[`${Math.round(n.calorias)} kcal`,`${r(n.proteinas)}g P`,`${r(n.carbohidratos)}g C`,`${r(n.grasas)}g G`]:[];document.getElementById(`receta-nombre-porciones`).textContent=e.nombre;let a=document.getElementById(`receta-info-gramos`);a.innerHTML=i.length?`<span class="receta-chip receta-chip-acento">Por 100 g</span>`+oe(i):``,a.style.display=i.length?``:`none`,document.getElementById(`input-gramos-receta`).value=``,document.getElementById(`extras-receta`).value=``,ve(),he.style.display=`flex`},be=e=>{let t=qe(e),n=Number(e.porciones_totales)||1,r=e.peso_por_porcion_g>0?e.peso_por_porcion_g:t>0?Math.round(t/n*100)/100:0,i=e.totales_macros_completa??(e.totales_macros_porcion?Object.fromEntries(Object.entries(e.totales_macros_porcion).map(([e,t])=>[e,(t||0)*n])):{}),a=e.valores_por_100g??(t>0?Object.fromEntries(Object.entries(i).map(([e,n])=>[e,Math.round((n||0)/t*100*100)/100])):{}),o=i.calorias?Math.round(i.calorias/n):0,s=se([{label:`Peso total`,valor:t>0?`${Math.round(t)} g`:null},{label:`Rinde`,valor:`${n} porciones`},{label:`Peso por porción`,valor:r>0?`${r} g`:null},{label:`Kcal por porción`,valor:o>0?`${o} kcal`:null},{label:`Kcal totales`,valor:i.calorias?`${Math.round(i.calorias)} kcal`:null}]),c=e.totales_micros_porcion||e.totales_micros||null,l=oe(c?[c.sodio_mg>0?`${Math.round(c.sodio_mg)}mg sodio`:``,c.potasio_mg>0?`${Math.round(c.potasio_mg)}mg potasio`:``,c.magnesio_mg>0?`${Math.round(c.magnesio_mg)}mg magnesio`:``,c.calcio_mg>0?`${Math.round(c.calcio_mg)}mg calcio`:``,c.hierro_mg>0?`${Math.round(c.hierro_mg*10)/10}mg hierro`:``,c.zinc_mg>0?`${Math.round(c.zinc_mg*10)/10}mg zinc`:``,c.omega3_ala_mg>0?`${Math.round(c.omega3_ala_mg)}mg Ω3 (ALA)`:``]:[]);return`
        <h3>${Y(e.nombre)}</h3>
        ${s}
        ${e.descripcion?`
        <details class="receta-acordeon">
            <summary class="receta-acordeon-resumen">
                <span>Descripción</span>
                <span class="receta-acordeon-icono">▾</span>
            </summary>
            <div class="receta-desc">${Y(e.descripcion)}</div>
        </details>`:``}

        <div class="receta-seccion">Ingredientes · de más a menos calorías</div>
        <div class="receta-ing">
            ${ce(e.ingredientes)}
        </div>

        <div class="receta-seccion">Macros</div>
        ${le(i,a,t>0?`Receta completa (${Math.round(t)}g)`:`Receta completa`)}

        ${l?`
        <div class="receta-seccion">Micros por porción</div>
        <div class="receta-chips">${l}</div>`:``}
    `},xe=e=>{L=e,document.getElementById(`detalle-receta-contenido`).innerHTML=be(e),document.getElementById(`detalle-acciones`).style.display=``,document.getElementById(`detalle-confirmar-eliminar`).style.display=`none`,ge.style.display=`flex`},Se=e=>Math.round(e.totales_macros_completa?.calorias||(e.totales_macros_porcion?.calorias||0)*(Number(e.porciones_totales)||1)||0),Te=async()=>{let e=document.getElementById(`lista-recetas-container`),t=await et(r);if(t.length===0){e.innerHTML=`<p style="color: var(--coipo-text-muted); text-align: center; padding: 24px 0;">Todavía no tenés recetas. Creá una con "Nueva Receta".</p>`;return}let n=[...t].sort((e,t)=>Se(t)-Se(e));e.innerHTML=n.map(e=>{let t=qe(e),n=t>0?`${Math.round(t)}g · `:``;return`
        <div class="receta-fila" data-id="${e.id}">
            <div class="receta-fila-info">
                <strong>${Y(e.nombre)}</strong>
                <span>${n}${e.porciones_totales||`?`} porciones · ${Math.round(e.totales_macros_porcion?.calorias||0)} kcal/porción · ${Se(e)} kcal total</span>
            </div>
            <button class="receta-icon-btn receta-detalle-btn" data-id="${e.id}" title="Ver detalle" aria-label="Ver detalle">👁️</button>
            <button class="receta-icon-btn receta-icon-btn-eliminar receta-delete-btn" data-id="${e.id}" title="Eliminar receta" aria-label="Eliminar receta">🗑️</button>
        </div>
    `}).join(``),e.querySelectorAll(`.receta-fila`).forEach(e=>{e.onclick=()=>{let t=n.find(t=>t.id===e.dataset.id);t&&ye(t)}}),e.querySelectorAll(`.receta-detalle-btn`).forEach(e=>{e.onclick=t=>{t.stopPropagation();let r=n.find(t=>t.id===e.dataset.id);r&&xe(r)}}),e.querySelectorAll(`.receta-delete-btn`).forEach(e=>{e.onclick=t=>{t.stopPropagation();let r=n.find(t=>t.id===e.dataset.id);r&&(xe(r),z())}});let i=async e=>{let t=n.find(t=>t.id===e.dataset.id);if(!t)return;let i=e.closest(`.swipe-row`)||e;e.style.maxHeight=e.offsetHeight+`px`,e.classList.add(`swipe-eliminando`),setTimeout(()=>i.remove(),260);try{await tt(r,t.id),window.recetasCache&&delete window.recetasCache,X(`"${t.nombre}" eliminada`,`info`,6e3,{etiqueta:`Deshacer`,alPulsar:async()=>{try{await nt(r,t),window.recetasCache&&delete window.recetasCache,await Te(),X(`Receta restaurada`,`success`)}catch(e){console.error(`Error deshaciendo la eliminación:`,e),X(`No se pudo deshacer`,`error`)}}})}catch(e){console.error(`Error eliminando receta:`,e),X(`No se pudo eliminar`,`error`),Te().catch(()=>{})}};e.querySelectorAll(`.receta-fila`).forEach(e=>{In(e,{acciones:[{etiqueta:`Editar`,clase:`neutro`,alPulsar:e=>{let t=n.find(t=>t.id===e.dataset.id);if(!t)return;xe(t);let r=document.getElementById(`editar-receta-btn`);r&&r.click()}},{etiqueta:`Eliminar`,clase:`peligro`,alPulsar:e=>i(e)}],alEjecutarLargo:e=>i(e)})})},Ee=async()=>{let e=document.getElementById(`lista-recetas-container`);e&&(e.innerHTML=[1,2,3].map(()=>`
            <div class="skeleton-fila">
                <div class="skeleton-linea skeleton-ancho-60"></div>
                <div class="skeleton-linea skeleton-ancho-40"></div>
            </div>`).join(``)),me.style.display=`flex`;try{await Te()}catch(t){console.error(`Error cargando recetas:`,t),e&&(e.innerHTML=`<p style="color: var(--coipo-text-muted); text-align: center; padding: 24px 0;">No se pudieron cargar tus recetas. Cerrá y volvé a intentar.</p>`),X(`No se pudieron cargar tus recetas`,`error`)}},Me=e.querySelector(`#btn-usar-receta`);Me&&(Me.onclick=Ee);let Ne=document.getElementById(`elegir-receta-modal`);Ne&&(Ne.onclick=()=>{me.style.display=`none`,document.getElementById(`modal-registro`).style.display=`none`,Ee()}),document.getElementById(`cerrar-detalle-receta`).onclick=()=>{ge.style.display=`none`},document.getElementById(`usar-desde-detalle`).onclick=()=>{if(!L)return;let e=L;ge.style.display=`none`,ye(e)},document.getElementById(`editar-receta-btn`).onclick=()=>{L&&(N=L,M=null,document.getElementById(`receta-form-titulo`).textContent=`Editar Receta`,document.getElementById(`receta-form-hint`).textContent=`Modificá la descripción de la receta y recalculá los macros. Se conservan las porciones originales.`,document.getElementById(`texto-receta`).value=L.descripcion||``,document.getElementById(`nombre-receta`).value=L.nombre||``,ge.style.display=`none`,P(),ue.style.display=`flex`,document.getElementById(`texto-receta`).focus())};let z=()=>{L&&(document.getElementById(`detalle-confirmar-texto`).textContent=`¿Eliminar "${L.nombre}"? Esta acción no se puede deshacer.`,document.getElementById(`detalle-acciones`).style.display=`none`,document.getElementById(`detalle-confirmar-eliminar`).style.display=`block`)};document.getElementById(`eliminar-receta-btn`).onclick=z,document.getElementById(`cancelar-eliminar-receta`).onclick=()=>{document.getElementById(`detalle-acciones`).style.display=``,document.getElementById(`detalle-confirmar-eliminar`).style.display=`none`},document.getElementById(`si-eliminar-receta`).onclick=()=>{if(!L)return;let e=L;L=null,ge.style.display=`none`,I?.id===e.id&&(I=null,he.style.display=`none`);let t=document.getElementById(`lista-recetas-container`),n=t?.querySelector(`.receta-fila[data-id="${e.id}"]`);n&&(n.style.maxHeight=n.offsetHeight+`px`,n.classList.add(`meal-eliminando`),setTimeout(()=>{n.remove(),t&&!t.querySelector(`.receta-fila`)&&(t.innerHTML=`<p style="color: var(--coipo-text-muted); text-align: center; padding: 24px 0;">Todavía no tenés recetas. Creá una con "Nueva Receta".</p>`)},260)),X(`Receta "${e.nombre}" eliminada`,`success`),tt(r,e.id).catch(e=>{console.error(`Error eliminando receta:`,e),X(`No se pudo borrar — restaurada`,`error`),Te().catch(()=>{})})},document.getElementById(`cancelar-select-receta`).onclick=()=>{me.style.display=`none`},document.getElementById(`cancelar-porciones`).onclick=()=>{he.style.display=`none`},document.getElementById(`confirmar-porciones`).onclick=async()=>{if(!I)return;let a=document.getElementById(`confirmar-porciones`),o=parseFloat(document.getElementById(`input-gramos-receta`).value)||0;if(o<=0){X(`Ingresá los gramos de la porción que comiste`,`warning`);return}let s=document.getElementById(`extras-receta`).value.trim(),c=!!(s&&R&&R.texto===s);Z(a,s&&!c?`Analizando extras...`:`Registrando...`);try{let a=null;if(s)if(c)a=R.datos;else{let{rapido:e,microsPromise:t}=Ce(s);a=Ye(await e,await t.catch(e=>(console.warn(`Micros de extras no disponibles:`,e.message),null)))}await rt(r,i,I,o,a),delete J[i],he.style.display=`none`;let l=I.nombre;I=null,R=null,document.getElementById(`extras-receta`).value=``,X(`${o} g de "${l}"${a?` + extras`:``} registrados`,`success`),$(e,t,n)}catch(e){console.error(`Error registrando receta:`,e),X(or(e,`No se pudo registrar la receta`),`error`)}finally{Q(a)}}},fr=e=>{let t=lr(e),n=[`Lun`,`Mar`,`Mie`,`Jue`,`Vie`,`Sab`,`Dom`],r=cr(new Date),i=cr(e),a=`<div class="weekly-calendar">`;for(let e=0;e<7;e++){let o=new Date(t);o.setDate(t.getDate()+e);let s=cr(o);a+=`
            <button class="day-item ${s===i?`active`:``} ${s===r?`is-today`:``}" data-date="${s}">
                <span class="day-name">${n[e]}</span>
                <span class="day-number">${o.getDate()}</span>
            </button>`}return a+`</div>`},pr=`modulepreload`,mr=function(e,t){return new URL(e,t).href},hr={},gr=function(e,t,n){let r=Promise.resolve();if(t&&t.length>0){let e=document.getElementsByTagName(`link`),i=document.querySelector(`meta[property=csp-nonce]`),a=i?.nonce||i?.getAttribute(`nonce`);function o(e){return Promise.all(e.map(e=>Promise.resolve(e).then(e=>({status:`fulfilled`,value:e}),e=>({status:`rejected`,reason:e}))))}r=o(t.map(t=>{if(t=mr(t,n),t in hr)return;hr[t]=!0;let r=t.endsWith(`.css`),i=r?`[rel="stylesheet"]`:``;if(n)for(let n=e.length-1;n>=0;n--){let i=e[n];if(i.href===t&&(!r||i.rel===`stylesheet`))return}else if(document.querySelector(`link[href="${t}"]${i}`))return;let o=document.createElement(`link`);if(o.rel=r?`stylesheet`:pr,r||(o.as=`script`),o.crossOrigin=``,o.href=t,a&&o.setAttribute(`nonce`,a),document.head.appendChild(o),r)return new Promise((e,n)=>{o.addEventListener(`load`,e),o.addEventListener(`error`,()=>n(Error(`Unable to preload CSS for ${t}`)))})}))}function i(e){let t=new Event(`vite:preloadError`,{cancelable:!0});if(t.payload=e,window.dispatchEvent(t),!t.defaultPrevented)throw e}return r.then(t=>{for(let e of t||[])e.status===`rejected`&&i(e.reason);return e().catch(i)})};export{Q as a,Yn as c,ee as d,D as f,Z as i,jn as l,T as m,tr as n,$ as o,w as p,X as r,or as s,gr as t,Dn as u};