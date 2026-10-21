# CONTEXTO — Coipo

> Documento para que otro modelo/agente continúe el trabajo sin explicaciones.
> Leelo antes de tocar nada. Rutas reales del repo, sin secretos: las claves
> viven en `.env` (no abrirlo); acá solo nombres de variables.

---

## 1. Qué es la app y para quién

**Coipo** es una app mobile-first (360–390 px) para llevar el registro de
comidas, calorías, macros y micros con ayuda de IA, pensada para una persona
común en Argentina (es-AR, texto en español rioplatense): contar calorías sin
cargar todo a mano.

- El usuario escribe lo que comió → la IA lo convierte en macros → la app
  guarda. También puede registrar productos propios/de Open Food Facts o usar
  sus recetas.
- Un asistente de "Sugerencias" le dice qué comer según lo que le queda el día
  (proteínas/calorías restantes), usando sus propias recetas.
- Tema claro/oscuro, onboarding que calcula su plan nutricional, hidratación,
  micros (hierro, calcio, B12, omega-3…), escáner de código de barras.

No es consejo médico: el plan es una estimación con fórmulas estándar.

## 2. Stack y comandos

- **Front**: Vite 8 + JS vanilla (sin framework ni React). Firebase se importa
  desde el **CDN gstatic 10.8.1** (`src/firebase-config.js`); el paquete npm
  `firebase` ya no está instalado (no se usa en el bundle).
- **Backend**: Netlify Functions en `netlify/functions/*.js` (CommonJS) +
  Firestore. Auth con email/password y Google popup.
- **IA**: Groq, exclusivamente server-side (nunca keys en el bundle).
- **Alimentos**: Open Food Facts (búsqueda full-text "search-a-licious" +
  mirrors clásicos).
- **Gesture system** propio (`src/utils/gestos.js`), sin dependencias.

Comandos:

| Acción | Comando |
|---|---|
| Correr en local | `npx netlify dev` (flujo oficial: sitio + `/api/*` con `.env`) |
| Respaldo | `npm run dev` (Vite + plugin `api-local` de `vite.config.mjs`) |
| Build | `npm run build` → `dist/` (`base: './'`, anda desde subcarpeta; `dist/` está en `.gitignore`, no se versiona) |
| Tests | `npm test` → `node --test tests/` (92 tests, sin red, sin navegador) |

- `npm run dev` **funciona como respaldo**: el plugin `api-local` ejecuta las
  mismas funciones de `netlify/functions` en el dev server. Lo que NO reproduce
  son los **redirects** de `netlify.toml` ni el **límite de 10 s** por
  invocación de Netlify; para fidelidad con producción, usar `npx netlify dev`.

- `netlify.toml`: build → `dist`, functions → `netlify/functions`, redirect
  `/api/*` → `/.netlify/functions/:splat`, `included_files: ["prompts/**"]`.
- **Variables de entorno** (nombres, no valores):
  - Cliente (`VITE_`): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`,
    `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
    `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET` →
    `src/config/firebase.js`.
  - Funciones (solo servidor): `GROQ_API_KEYS` (coma-separadas),
    `GROQ_MODELS`, `ALLOWED_ORIGIN`, `OFF_MIRRORS` (opcional),
    `FIREBASE_PROJECT_ID`.
- Los tests de funciones setean `process.env` **antes** del `await import(...)`
  (las funciones leen env al cargar el módulo).

## 3. Estructura de carpetas

```
index.html               Única página: markup estático de TODOS los modales
                         (#modal-registro, #modal-receta, #modal-scanner,
                         #modal-confirm…) + links CSS en orden + inline que
                         aplica el tema antes del primer paint.
src/main.js              Bootstrap: tema → splash → onAuthStateChanged →
                         verificarDestinoUsuario (onboarding vs dashboard) →
                         activarSwipeBack.
src/firebase-config.js   Init de Firebase (CDN 10.8.1); exporta auth, db,
                         googleProvider.
src/config/firebase.js   Config pública desde import.meta.env (VITE_*).
src/config/config.js     Endpoint IA (/api/sugerencias) y rate-limit config.
src/styles/tokens.css    ÚNICO :root global (colores, espacios, radios, fs).
src/styles/components.css Componentes centralizados (botones, chips, pestañas,
                         modal, filas, buscador). No duplicar reglas acá ni
                         en las vistas.
src/css/main.css         Layout principal (importa tokens).
src/css/tema-oscuro.css  Overrides de color para html[data-tema="oscuro"].
src/css/gestos.css       Estilos de los gestos (feedback visual).
src/views/*/*.view.js    Una vista por carpeta (splash, login, register,
                         forgot-password, onboarding, dashboard, sugerencias,
                         perfil), cada una con su CSS.
src/views/dashboard/dashboard.view.js  Vista principal (~2350 líneas): Hoy,
                         hoja Nueva Ingesta (3 pestañas), recetas, escáner,
                         toasts, modales de gramos. Es el hub de la app.
src/services/auth.service.js            Login/registro/reset (Google popup y
                         email/password).
src/services/ai/ia-client.js           ÚNICA puerta de salida a la IA:
                         POST /api/sugerencias con ID token (Bearer) + estado
                         de saturación (429).
src/services/ai/sugerencias.service.js Caso de uso del asistente (caché,
                         reintentos, enfriamiento por usuario).
src/services/ai/groq.service.js        Orquestador: analizarComida (fase 1
                         macros + fase 2 micros), analizarReceta,
                         estimarNutrientesPor100g; tipos 'imagen' y 'busqueda'
                         implementados pero sin UI.
src/services/ai/schemas.js / prompts.js  Esquemas JSON y system prompts que el
                         cliente manda para los tipos no-asistente; el prompt
                         real del asistente es prompts/sugerencias_system.txt.
src/services/db/meal.service.js       Firestore de ingestas: crearRegistroComida
                         (fase 1), enriquecerRegistroConMicros (fase 2: solo
                         escritura en Firestore, sin IA), eliminar/restaurar
                         ingesta, actualizarHidratacion.
src/services/db/receta.service.js     CRUD de recetas; procesarReceta convierte
                         ingredientes a gramos (OFF por similitud, fallback IA
                         'estimar'); micro-cache compartida de ingredientes.
src/services/buscar-alimentos.service.js  Cliente de /api/buscar-alimentos
                         (texto → resultados OFF), caché memoria+sessionStorage.
src/services/openfoodfacts.service.js Cliente de /api/openfoodfacts (lookup por
                         código de barras o nombre; lo usa la IA).
src/services/productos-usuario.service.js  "Tus productos": base propia del
                         usuario (subcolección `productos`).
src/services/product-scanner.service.js    Escáner de cámara; cachea en las
                         colecciones globales `productos_globales` e
                         `ingredientes_base`.
src/utils/nutrition-logic.js   Lógica pura: cálculo del plan nutricional
                         (kcal/macros/micros/agua) a partir del perfil.
src/utils/receta-math.js      Lógica pura de recetas: regla de tres, porciones,
                         por-100g, payload canónico para guardar.
src/utils/sugerencias-logic.js Lógica pura del asistente: intents, momento por
                         hora, restantes del día, caché de sugerencias.
src/utils/unit-converter.js   Unidades (tazas, cdas… → gramos).
src/utils/gestos.js           Gestos iOS: hacerDeslizable (cierre por arrastre),
                         hacerFilaDeslizable (swipe en filas),
                         activarSwipeBack, alRenderizar (restaurar scroll),
                         pedirConfirmacion, golpe() (haptic).
src/utils/tema.js             Tema claro/oscuro (localStorage
                         'coipo_tema' > sistema), cambio en vivo.
netlify/functions/sugerencias.js       Backend de IA (único dueño de las keys).
netlify/functions/buscar-alimentos.js  Búsqueda de alimentos por texto en OFF.
netlify/functions/openfoodfacts.js     Proxy OFF (barcode/imagen/nombre);
                         base de la verificación de token + CORS reutilizada.
prompts/sugerencias_system.txt         System prompt del asistente (inyectado
                         al bundle de la función vía netlify.toml).
firestore.rules             Reglas de seguridad (todo por usuario).
tests/*.mjs                 node --test: buscar-alimentos (34), openfoodfacts
                         (19), sugerencias (16), ingesta-ui (13),
                         estilos-base (7).
AGENTS.md + .agents/skills/ui-coach/SKILL.md  Reglas para agentes: OBLIGATORIO
                         leer la skill antes de tocar CSS/UI.
firebase.json              Solo `firestore.rules` (la app y el backend viven en
                         Netlify; sin Hosting ni Functions de Firebase).
notas.txt                   Notas sueltas de onboarding (histórico).
```

## 4. Modelo de datos (Firestore)

Todo bajo el usuario; reglas: cada usuario solo ve lo suyo (`firestore.rules`).

| Ruta | Campos (resumen) | Para qué |
|---|---|---|
| `usuarios/{uid}` | `sexo, edad, altura, peso, objetivo, tipo_dieta, ritmo_semanal, nivel_actividad, pasos_diarios, horas_sueno, lesiones, alimentos_favoritos, frecuencia_comidas, meta_agua, plan_nutricional {kcal, proteinas_g, carbohidratos_g, grasas_g, agua, micros…}, onboarding_completado, tema, creado_el` | Perfil + plan. Se recalcula al terminar onboarding y al editar desde Perfil. |
| `usuarios/{uid}/ingestas_diarias/{dateKey}/comidas/{docId}` | `alimentos[] (alimento, gramos_estimados, calorias, proteinas, carbohidratos, grasas, fibra…), resumen_macros {total_*, confianza_general}, resumen_micros, items_micros, micros_completos, formato, descripcion_original, es_porcion_receta, creado_el` | Una comida registrada. `dateKey` = `YYYY-MM-DD` en **hora local**. |
| `usuarios/{uid}/resumen_diario/{dateKey}` | `acumulado_calorias/proteinas/carbohidratos/grasas/fibra, acumulado_sodio_mg, acumulado_potasio_mg, acumulado_magnesio_mg, acumulado_calcio_mg, acumulado_hierro_mg, acumulado_zinc_mg, acumulado_vitamina_d_ui, acumulado_vitamina_b12_mcg, acumulado_omega3_ala_mg, acumulado_omega3_epa_dha_mg, vasos_agua, ultima_actualizacion` | Totales del día **incrementales** (`increment()` al registrar, restar al borrar). Es la fuente para "restantes". |
| `usuarios/{uid}/recetas/{id}` | `nombre_receta, descripcion, ingredientes[], porciones_totales, totales_macros_completa, totales_macros_porcion, totales_micros, por_100g, peso_total_g, creado_el, editado_el` | Templates reutilizables. Borrar la receta NO borra ingestas ya registradas. |
| `usuarios/{uid}/productos/{id}` | `nombre, marca, barcode?, imagen_url, por_100g {calorias, proteinas, carbohidratos, grasas, fibra, micros…}` | "Tus productos" (primera fuente de búsqueda). |
| `usuarios/{uid}/feedback_sugerencias/{id}` | `intent, momento, voto, ref, creado_el` | Votos 👍👎 del asistente. |
| `productos_globales/{barcode}` | shape de producto OFF | Cache compartida de escáneres (todos los usuarios). |
| `ingredientes_base/{id}` | `por_100g, fuente ('openfoodfacts'/'ia'),` + clave | Micro-cache compartida de ingredientes de recetas. |

## 5. Pantallas y flujos principales

**Arranque** (`src/main.js`): splash → `onAuthStateChanged` → si no logueado:
login; si logueado sin `onboarding_completado`: onboarding (8 pasos: 1
biometría, 2 objetivo, 3 ritmo semanal, 4 tipo de dieta, 5 mapa de alimentos,
6 actividad física, 7 sintonía fina [pasos/agua/sueño/lesiones], 8 resumen con
el plan calculado); si no: dashboard. Cada cambio de sesión limpia la caché del
dashboard (`limpiarCacheDashboard`) para no filtrar datos entre cuentas.

**Hoy** (`dashboard.view.js`): header con fecha + stats (kcal consumido vs meta,
barras de proteínas/carbos/grasas), anillo de kcal y anillos de macros, calendario
de 7 días (cambio de día con `invalidarCacheDia`), acciones rápidas (Nueva
Receta / Usar Receta), lista "Ingestas de Hoy" (kcal, pills de macros, chips de
micros o "Calculando micros…", acordeón de detalle por ingrediente, ✕ eliminar
con deshacer), botón "¿Qué comiste ahora?", Hidratación (vasos),
Micronutrientes (details). Bottom-nav: Hoy · Sugerencias · **+ Registrar** ·
Perfil (el ítem "Diario" se quitó; el historial sigue pendiente, ver §10).

**Nueva Ingesta** (hoja `#modal-registro`, ~92 dvh; cabecera/chips/pestañas
fijas, un solo cuerpo scrolleable `.ingesta-cuerpo`). Pestañas:

1. **Buscar**: input con ✕ adentro (Enter o botón Buscar). Fuentes en orden:
   (a) Tus productos, (b) Open Food Facts vía `/api/buscar-alimentos`. Chips
   de consulta sugerida. Resultados agrupados "Tus productos / Open Food Facts"
   con "Ver más", crédito `.off-fuente` al pie. Al elegir: modal de gramos
   (`pedirGramos`, arranca con `porcion_g` y ofrece el chip "1 porción (X g)";
   si no hay porción, 100 g) → registro local con **regla de tres** (sin IA).
   Los micros que OFF traiga (fibra, sodio, azúcares) se guardan en la misma
   ingesta; los que falten quedan `null` (no 0). **Acá no se llama a la IA**:
   la porción ya viene calculada y `enriquecerRegistroConMicros` solo escribe
   en Firestore. Lo mismo vale para el escáner.
2. **Recetas**: lista de recetas del usuario → elegir → porciones/gramos →
   registrar (`es_porcion_receta: true`, micros con lógica especial).
3. **IA** (`#texto-comida`, máx. 1000 chars): `analizarComida(descripcion)` →
   `rapido` (fase 1: macros) → `crearRegistroComida` **ya** (optimista) →
   `microsPromise` (fase 2, background, IA tipo `micros`; **solo** en este
   flujo y en los extras de receta) → `enriquecerRegistroConMicros` (solo
   escritura en Firestore, sin IA).
   Chips de momento del día preseleccionados por hora local.

**Recetas**: modal `#modal-receta` — crear/editar: descripción libre →
`analizarReceta` (IA tipo `receta`) → `procesarReceta` (convertir a gramos,
OFF por similitud, fallback IA `estimar`) → `prepararRecetaParaGuardar`
(`receta-math.js`) → vista previa con ingredientes fallidos → guardar.
Detalle de receta: usar, editar (recalcula), eliminar con confirmación.

**Sugerencias** (`sugerencias.view.js`): NO es chat libre. Flujo guiado estilo
burbujas: muestra el restante del día → elige un **intent** (chips:
`QUE_COMER, COMPLETAR_PROTEINA, ENTRAR_EN_CALORIAS, COMIDA_ACTUAL, LIVIANO,
CENA_FINAL, GUSTO, LIBRE, ALTERNATIVA`) → el asistente hace preguntas de
contexto **una por vez** (`preguntasParaIntent`, `deducirAyunoPorHora`) →
consulta a `/api/sugerencias` (payload: texto de contexto + sus recetas
pre-rankeadas con `preRanking`) → tarjetas con "Registrar" / "Ver receta" /
votos 👍👎 (guardados en `feedback_sugerencias`).

**Perfil** (`perfil.view.js`): editar datos → recalcula `plan_nutricional`
(misma fórmula que onboarding), meta de agua, tema (guardado en el doc de
usuario), cerrar sesión.

**Escáner** (`#modal-scanner`, cámara): código de barras →
`buscarProducto(codigo)` (productos_globales → OFF vía `/api/openfoodfacts?barcode=`)
→ si viene de OFF se guarda en "Tus productos" → `pedirGramos` → registrar.

**Estadísticas**: no hay pantalla dedicada; viven dentro de Hoy (stats del día,
micros del día, historial de 7 días en el calendario). Ver §10.

## 6. Cómo funciona la IA

- **Punto único**: `POST /api/sugerencias` (`netlify/functions/sugerencias.js`).
  El navegador solo manda el payload + `Authorization: Bearer <ID token de
  Firebase>` (`ia-client.js`). Las keys de Groq **nunca** llegan al cliente.
- **Auth del servidor**: `jose` verifica el ID token con los JWKS de Google
  (`securetoken@system.gserviceaccount.com`) y que el proyecto coincida con
  `FIREBASE_PROJECT_ID`; CORS restringido a `ALLOWED_ORIGIN`.
- **Tipos válidos**: `sugerencias, analisis_rapido, micros, imagen, busqueda,
  receta, estimar`.
  - `sugerencias` → usa el system prompt del **servidor**
    (`prompts/sugerencias_system.txt`, inyectado con `included_files`).
  - El resto → manda el system prompt el **cliente** (armado en
    `src/services/ai/prompts.js` + `schemas.js`), validado (≤ 15 000 chars).
- **Rotación**: `GROQ_API_KEYS` (coma-separadas, posición inicial aleatoria) ×
  `GROQ_MODELS`; ante 429/401/5xx/error de red/timeout de 10 s pasa a la
  siguiente combinación. `openai/gpt-oss-20b` razona: `max_tokens` 800 +
  `reasoning_effort: "low"`; si el JSON viene vacío/cortado reintenta una vez
  con 4000 tokens.
- **Límites de entrada**: cuerpo 4.5 MB (Netlify 6 MB), texto 12 000 chars,
  imagen base64 2.5 MB, hasta 8 partes.
- **Saturación**: si agotan todas las combinaciones → `429` +
  `Retry-After: 60`. El cliente lo expone con `estadoIA` para que la UI muestre
  la espera. `sugerencias.service.js` suma 3 reintentos de red, 2 intentos de
  JSON válido y 3 s de enfriamiento por usuario; caché en memoria (20 entradas).
- **Llamadas del cliente**: `pedirIA(...)` desde `sugerencias.service.js`
  (asistente) y `groq.service.js` (`analizarComida` → rapido + microsPromise,
  `analizarReceta`, `estimarNutrientesPor100g`). `analizarImagenDeComida` y
  `buscarAlimento` existen pero **no los usa ninguna UI** (ver §10).
- **Micros con IA**: solo el `microsPromise` de `analizarComida()` (tipo
  `micros`), y únicamente para **comidas descritas por texto** y **extras de
  receta**. `enriquecerRegistroConMicros` **no llama a la IA**: recibe los
  micros ya calculados y solo escribe en Firestore (`updateDoc` de la ingesta +
  `increment()` en `resumen_diario`). Los productos de OFF y "Tus productos"
  nunca pasan por IA: usan los micros de la fuente o `null`.

## 7. Búsqueda de alimentos y atribución OFF

Orden de fuentes (IA nunca es la primera):

1. **Tus productos** (`productos-usuario.service.js`) — base propia, sin red.
2. **Open Food Facts** por texto — `/api/buscar-alimentos`
   (`netlify/functions/buscar-alimentos.js`):
   - Fuente 1: **search-a-licious** (`search.openfoodfacts.org`, Elasticsearch
     full-text; tolera typos: "choclate aguila" → "chocolate Aguila").
   - Fuente 2 (respaldo): `search.pl` mirrors `es → us → world`.
   - Cascada (corta en el primer resultado útil): consulta normalizada → sin
     tildes → palabra principal → recortada; primero con filtro Argentina y
     después sin filtro de país. Presupuesto total 8 s.
   - `MIN_Q = 3`, `page_size = 20`, `langs=es,en`.
   - Cliente: caché en memoria + `sessionStorage` (40 entradas, tolerante a
     modo privado). `productoDesdeResultado` mapea al shape del escáner para
     reutilizar la **regla de tres local** (sin IA).
3. **IA** solo como último recurso o para datos sin estructura: analizar texto
   libre (tipo `analisis_rapido`/`micros`) y estimar ingredientes que OFF no
   tiene (tipo `estimar`, fallback en `procesarReceta`).

**Atribución obligatoria**: toda lista de resultados OFF muestra el crédito
"Datos de Open Food Facts" con link (`renderCredito` → `.off-fuente` en
`dashboard.view.js`). Mantenerlo en cualquier vista nueva que muestre datos OFF.

## 8. Decisiones de producto

- **El asistente no es un chat libre**: intents + preguntas guiadas (texto
  libre existe pero limitado a 100 chars, intent `LIBRE`). Menos alucinación,
  respuesta accionable (botón "Registrar" en la tarjeta).
- **La IA es el último recurso**: primero productos propios, luego OFF con cálculo
  local. La IA entra donde no hay dato estructurado (texto suelto, recetas,
  micros).
- **Los macros los calcula SIEMPRE la app**: regla de tres en `receta-math.js` /
  `nutrition-logic.js` / `calcularPorcion`. La IA solo parsea/estima por ítem y
  la fase 2 **recalcula los totales de micros con `reduce` local** — nunca se
  confía en los totales que devuelve el modelo.
- **Registro optimista en dos fases**: los macros se guardan y se muestran ya
  (fase 1); los micros llegan en background sin bloquear (fase 2,
  `micros_completos`).
- **UX de móvil primero**: targets ≥ 44 px, texto ≥ 14 px, sin scroll
  horizontal, modales cerrables por arrastre Y por botón, toasts en lugar de
  `alert()`.
- **Fuera de alcance por ahora**: pantalla de estadísticas e historial
  ("Diario" se quitó del nav; falta definir la vista); análisis de comida por
  **foto** (el tipo `imagen` está en la API pero no hay UI); completar con IA
  los micros que OFF no trae (se decidió no hacerlo: se guarda `null`);
  multi-idioma; wearables/pasos reales; emuladores de Firebase.
- **Dato desconocido = `null`, nunca 0**: los productos de OFF/Tus productos
  pueden no traer fibra, sodio o azúcares. Se persiste `null` y los totales/UI
  distinguen "sin dato" (`—`) de "consumo 0".

## 9. Convenciones

- **UI optimista + totales incrementales**: al registrar, se actualiza la caché
  local del dashboard y se re-renderiza sin esperar la red. Los totales del día
  (`resumen_diario`) se mantienen con `increment()` en Firestore (sumar al
  registrar, **restar** al borrar, sumar al restaurar). No recalcular leyendo
  todas las comidas. *Decisión: NO se implementa `onSnapshot`; la semana se
  carga con `getDoc`/`getDocs` + caché optimista en memoria
  (`cargarSemanaEnCache`, `limpiarCacheDashboard`, `invalidarCacheDia`).
  `onSnapshot` solo se evaluaría para sincronizar cambios entre dispositivos.*
- **Caché de datos**: la semana se cachea por usuario; cambiar de cuenta
  siempre llama a `limpiarCacheDashboard()` y `limpiarCacheAlimentos()`.
- **Gestos**: todo cierre por gesto tiene alternativa con botón; movimiento solo
  con `transform/translate3d`; los sheets "sucios" (con texto a medio escribir)
  piden confirmación (`hacerDeslizable({ sucio })`). Al volver, `alRenderizar`
  restaura scroll/estado.
- **Errores**: mensajes amigables con `textoError(error, fallback)` + toast
  (`mostrarToast`); todo fetch con `AbortController` y timeout. Español
  rioplatense ("Probá de nuevo", "Esperá un momento").
- **Números**: `es-AR` en la UI; redondeos con el helper `redondear` ("e+2")
  en micros. `dateKey` en hora local del dispositivo.
- **CSS**: tokens obligatorios (`src/styles/tokens.css`, único `:root`);
  componentes compartidos solo en `src/styles/components.css`; seguir SIEMPRE
  la skill **ui-coach** (ver `AGENTS.md` → sección UI). Probar claro/oscuro a
  360–390 px. `tests/estilos-base.test.mjs` es el guardián.
- **Lógica pura en `src/utils/*.js`** sin Firebase ni DOM, testeable con
  `node --test` (los tests importan los `.js`/funciones directamente y setean
  `process.env` antes del import).
- **Seguridad**: secretas solo en `.env` → `process.env` de la función; nunca
  loguear ni devolver keys; Firestore por usuario; el ID token se verifica en
  el servidor con JWKS (no confiar en el uid que manda el cliente).

## 10. Estado actual

**Terminado y funcionando**:

- Onboarding (8 pasos) → plan nutricional; login email/Google/reset; perfil
  editable con recálculo del plan; tema claro/oscuro (localStorage + doc).
- Registro de comida en 3 vías: texto con IA (2 fases), producto (búsqueda por
  texto con Tus productos + OFF, y escáner por código de barras), y receta
  propia. Borrado con deshacer (restaura totales).
- Recetas: creación con IA + preview + fallback de ingredientes, edición,
  uso, borrado con confirmación.
- Asistente de sugerencias guiado (intents, preguntas, restantes del día,
  feedback con votos, caché y enfriamiento).
- Base de estilos (tokens + componentes + skill ui-coach + tests guardián) y
  sistema de gestos iOS. `--coipo-primary-light` y `--coipo-primary-rgb` ya
  están definidos (claro y oscuro) y el test guardián no tiene allowlist.
- Micros de OFF/Tus productos **sin IA**: se guardan fibra, sodio y azúcares
  cuando la fuente los trae; si faltan quedan `null` (la UI muestra `—` y no
  suma 0). Los incrementos de `resumen_diario` ignoran los `null`.
- `porcion_g` de OFF como valor inicial del modal de gramos + chip
  "1 porción (X g)"; si el producto no trae porción, 100 g.
- 92 tests en verde y `npm run build` OK. `dist/` es artefacto de build: está
  en `.gitignore` y fuera del índice de Git (la carpeta local se conserva).
- Limpieza: sin archivos `* copy.js`/`prompts-sugerencias.js`, sin el
  directorio legacy `functions/` ni el paquete npm `firebase`. `firebase.json`
  solo conserva `firestore.rules` (Hosting y Functions se gestionan en Netlify).

**A medias / pendientes conocidos**:

- **Historial / "Diario"**: el ítem se quitó del bottom-nav en las 3 vistas
  (Hoy, Sugerencias, Perfil); falta decidir y construir la vista de historial.
- **No hay pantalla de estadísticas** ni historial más allá de los 7 días del
  calendario.
- Tipos IA `imagen` y `busqueda` implementados en `groq.service.js` pero sin
  UI que los use (candidatos: foto de comida o búsqueda IA como fallback).
- **Micros incompletos en productos**: OFF rara vez trae los 10 micros; los
  que faltan quedan `null` a propósito (decisión: no estimarlos con IA). Si se
  quiere el set completo, habría que estimarlo y marcar el origen del dato.

## 11. Problemas conocidos y trampas

- **Límite de 10 s por invocación en Netlify**: por eso `PRESUPUESTO_MS = 8000`
  en las funciones. Cualquier trabajo nuevo contra Groq/OFF debe acotar
  presupuesto y cortar la cascada.
- **Groq 429 es normal** (keys compartidas): la rotación de keys/modelos lo
  absorbe; el 429 definitivo espera 60 s (`Retry-After`). No "arreglar"
  quitando la rotación.
- **`openai/gpt-oss-20b` razona** y consumía los tokens de salida → JSON
  truncado. Por eso el reintento ampliado. Si tocás prompts/esquemas, probá el
  JSON completo de punta a punta.
- **Open Food Facts cae a veces** (mirrors 503): el orden es search-a-licious →
  search.pl (es→us→world). Respetar el presupuesto de la cascada y no bajar
  timeouts.
- **Netlify limita el body a 6 MB**: `MAX_CUERPO_BYTES = 4500000` y
  `MAX_IMAGEN = 2500000` dejan margen.
- **Firebase por CDN**: los imports son `https://www.gstatic.com/firebasejs/10.8.1/...`.
  Cambiarlos a `'firebase/firestore'` (npm) rompe todo; si se migra, migrar
  completo.
- **Los totales del día se descuadran fácil**: cualquier escritura de comidas
  DEBE pasar por `meal.service.js` (usa `increment()`); borrar = restar
  (`eliminarIngesta`), restaurar = sumar (`restaurarIngesta`).
- **`null` ≠ 0**: los micros que una fuente no trae se guardan `null` y
  `crearRegistroComida`/`enriquecerRegistroConMicros`/`eliminarIngesta`/
  `restaurarIngesta` solo operan sobre números (`typeof valor === 'number'`).
  No "arreglar" con `|| 0` ni `increment(null)`: escribiría un 0 falso y la UI
  lo mostraría como consumo.
- **`enriquecerRegistroConMicros` no es IA**: solo hace `updateDoc`/`setDoc`.
  La llamada tipo `micros` vive en `analizarComida()` (`microsPromise`) y se usa
  solo en comidas descritas por texto y extras de receta. No agregarla a
  búsqueda/escáner: esos productos usan los micros de OFF o `null`.
- **`dateKey` en hora local**: `getISO` usa hora local; cuidado con
  `toISOString()` (UTC) alrededor de medianoche.
- **CSS**: no agregar `:root` ni literales de color/espacio/radio; `tema-oscuro.css`
  redefine tokens de color — todo cambio de color debe revisarse en ambos
  temas. No reordenar la cascada de `components.css` (preserva el orden
  histórico). `tests/estilos-base.test.mjs` falla si aparece un `var()` sin
  definir.
- **`index.html` concentra el markup de los modales**; las vistas inyectan
  contenido dentro. Al agregar vista/CSS: insertar el `<link>` en el orden
  correcto (tokens → components → main → vistas).
- **Fin de línea CRLF** en los archivos del proyecto: mantenerlo al editar.
- **JWKS del servidor**: el caché de claves dura 10 min; `FIREBASE_PROJECT_ID`
  debe coincidir con el proyecto que emite el token (401 misterioso = esto).
- **sessionStorage**: la caché de búsquedas vive en la sesión del navegador;
  `limpiarCacheAlimentos()` al cambiar de usuario para no filtrar resultados.
