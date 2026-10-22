// netlify/functions/sugerencias.js
// Backend de IA de Coipo. Único lugar donde viven las keys de Groq.
//
// Qué hace:
//   1. Verifica el ID token de Firebase Auth (jose) y el origen (ALLOWED_ORIGIN).
//   2. Valida la entrada (tipo, prompt y contenido, con límites de tamaño).
//   3. Usa el system prompt de prompts/sugerencias_system.txt para el asistente
//      de sugerencias; para el resto de los tipos usa el prompt que manda el
//      cliente (armado en src/services/ai/*.js con sus schemas).
//   4. Llama a Groq rotando keys (posición inicial aleatoria) y modelos: ante
//      429, 401, 5xx, error de red o timeout de 10s pasa a la siguiente key y
//      al siguiente modelo de GROQ_MODELS. Si todas fallan → 429 amigable.
//   5. openai/gpt-oss-20b es de razonamiento: max_tokens 800 + reasoning_effort
//      "low" (si la API lo acepta). Si la respuesta viene vacía o con JSON
//      cortado, reintenta una vez con más presupuesto de tokens.
//
// ⚠️ Nunca se loguea ni se devuelve una key.

const { createRemoteJWKSet, jwtVerify } = require('jose');
const fs = require('node:fs');
const path = require('node:path');

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN (solo variables de entorno del servidor)
// ─────────────────────────────────────────────────────────────────────────────
const CLAVES = String(process.env.GROQ_API_KEYS || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);

const MODELOS_CONFIGURADOS = String(process.env.GROQ_MODELS || '')
    .split(',')
    .map(m => m.trim())
    .filter(Boolean);

// Respaldo por si GROQ_MODELS no está seteado (orden: más rápido → más capaz)
const MODELOS_RESERVA = [
    'openai/gpt-oss-20b',
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
    'allam-2-7b'
];

const MODELOS = MODELOS_CONFIGURADOS.length > 0 ? MODELOS_CONFIGURADOS : MODELOS_RESERVA;

// Único modelo de la lista que acepta imágenes (verificado con image_url)
const MODELO_VISION = 'qwen/qwen3.8-27b';

const PROYECTO_FIREBASE = String(process.env.FIREBASE_PROJECT_ID || '').trim();

const ORIGENES_PERMITIDOS = String(process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

// ── Límites / parámetros ──
const TIEMPO_LIMITE_MS = 10000;      // 10s por intento (spec)
const MAX_INTENTOS_JSON = 2;         // original + 1 reintento si vino vacío/cortado
const MAX_TOKENS_RAZONADOR = 800;    // openai/gpt-oss-20b (spec)
const MAX_TOKENS = 4000;             // modelos sin razonamiento pesado
const MAX_TOKENS_AMPLIADO = 4000;    // reintento cuando el JSON vino cortado
const TEMPERATURA_SUGERENCIAS = 0.2;
const TEMPERATURA = 0.1;

const TIPOS_VALIDOS = new Set([
    'sugerencias', 'analisis_rapido', 'micros', 'imagen', 'busqueda', 'receta', 'estimar'
]);

const MAX_CUERPO_BYTES = 4500000;    // por debajo del límite de 6MB de Netlify
const MAX_SYSTEM_PROMPT = 15000;
const MAX_TEXTO = 12000;
const MAX_IMAGEN = 2500000;          // data URL en base64
const MAX_PARTES = 8;

const URL_JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const obtenerHeader = (headers, nombre) => {
    if (!headers) return undefined;
    const clave = Object.keys(headers).find(k => k.toLowerCase() === nombre.toLowerCase());
    if (!clave) return undefined;
    const valor = headers[clave];
    return Array.isArray(valor) ? valor[0] : valor;
};

const origenPermitido = (origen) =>
    Boolean(origen) && ORIGENES_PERMITIDOS.includes(origen);

const cabecerasCORS = (origen) => {
    const cors = {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin'
    };
    if (origen && origenPermitido(origen)) cors['Access-Control-Allow-Origin'] = origen;
    else if (ORIGENES_PERMITIDOS.includes('*')) cors['Access-Control-Allow-Origin'] = '*';
    return cors;
};

const responder = (statusCode, cuerpo, cabecerasExtra = {}) => ({
    statusCode,
    headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...cabecerasExtra
    },
    body: JSON.stringify(cuerpo)
});

// 401/403 con código estable en el cuerpo y el MISMO código en el log.
// Solo se registra el código: nunca token, headers ni valores de entorno.
const responderAuth = (statusCode, codigo, cors) => {
    console.error(`❌ [IA] ${statusCode} ${codigo}`);
    return responder(statusCode, { error: codigo }, cors);
};

// ── Token de Firebase Auth (issuer/audience = proyecto) ──
const jwks = createRemoteJWKSet(new URL(URL_JWKS), {
    cooldownDuration: 30000,
    cacheMaxAge: 600000
});

const verificarToken = async (token) => {
    if (!PROYECTO_FIREBASE) {
        console.error('❌ [IA] Falta FIREBASE_PROJECT_ID: no se puede verificar la sesión');
        return null;
    }
    try {
        const { payload } = await jwtVerify(token, jwks, {
            issuer: `https://securetoken.google.com/${PROYECTO_FIREBASE}`,
            audience: PROYECTO_FIREBASE
        });
        return payload && payload.sub ? payload : null;
    } catch {
        return null;
    }
};

// ── System prompt del asistente (archivo incluido en el deploy) ──
let promptSugerenciasCache = null;

const leerPromptSugerencias = () => {
    if (promptSugerenciasCache) return promptSugerenciasCache;

    const nombre = 'sugerencias_system.txt';
    const candidatas = [
        path.join(process.cwd(), 'prompts', nombre),
        path.join(process.cwd(), '..', 'prompts', nombre),
        path.join(__dirname, '..', '..', 'prompts', nombre),
        path.join(__dirname, '..', 'prompts', nombre)
    ];

    for (const ruta of candidatas) {
        try {
            const texto = fs.readFileSync(ruta, 'utf8').trim();
            if (texto) {
                promptSugerenciasCache = texto;
                return texto;
            }
        } catch {
            // probamos la siguiente ruta
        }
    }

    console.error(`❌ [IA] No se encontró prompts/${nombre} (included_files en netlify.toml)`);
    return null;
};

// ── Extraer JSON tolerante (backticks, texto alrededor, JSON cortado) ──
const extraerJSON = (contenido) => {
    if (typeof contenido !== 'string' || !contenido.trim()) return { ok: false };

    const limpio = contenido
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '');

    const intentar = (texto) => {
        try {
            const dato = JSON.parse(texto);
            return dato && typeof dato === 'object' ? { ok: true, data: dato } : null;
        } catch {
            return null;
        }
    };

    const directo = intentar(limpio);
    if (directo) return directo;

    const i = limpio.indexOf('{');
    const f = limpio.lastIndexOf('}');
    if (i === -1 || f === -1 || f <= i) return { ok: false };
    return intentar(limpio.slice(i, f + 1)) || { ok: false };
};

// ── Validación de la entrada ──
const validarEntrada = (cuerpo) => {
    if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) {
        return 'Petición inválida.';
    }
    if (typeof cuerpo.tipo !== 'string' || !TIPOS_VALIDOS.has(cuerpo.tipo)) {
        return 'Tipo de consulta inválido.';
    }

    const contenido = cuerpo.userContent;
    if (typeof contenido === 'string') {
        if (!contenido.trim()) return 'Petición inválida.';
        if (contenido.length > MAX_TEXTO) return 'La consulta es demasiado larga.';
    } else if (Array.isArray(contenido)) {
        if (contenido.length === 0 || contenido.length > MAX_PARTES) return 'Petición inválida.';
        for (const parte of contenido) {
            if (!parte || typeof parte !== 'object') return 'Petición inválida.';
            if (parte.type === 'text') {
                if (typeof parte.text !== 'string' || parte.text.length > MAX_TEXTO) {
                    return 'La consulta es demasiado larga.';
                }
            } else if (parte.type === 'image_url') {
                const url = parte.image_url && parte.image_url.url;
                if (typeof url !== 'string' || !url.startsWith('data:image/') || url.length > MAX_IMAGEN) {
                    return 'Imagen inválida o demasiado grande.';
                }
            } else {
                return 'Petición inválida.';
            }
        }
    } else {
        return 'Petición inválida.';
    }

    if (cuerpo.tipo !== 'sugerencias') {
        if (typeof cuerpo.systemPrompt !== 'string' || !cuerpo.systemPrompt.trim()) {
            return 'Falta el prompt del sistema.';
        }
        if (cuerpo.systemPrompt.length > MAX_SYSTEM_PROMPT) {
            return 'El prompt del sistema es demasiado largo.';
        }
    }
    return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// LLAMADA A GROQ (10s por intento)
// ─────────────────────────────────────────────────────────────────────────────
const llamarGroq = async ({ clave, modelo, systemPrompt, userContent, maxTokens, temperatura, reasoningEffort }) => {
    const controlador = new AbortController();
    const reloj = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS);

    try {
        const payload = {
            model: modelo,
            temperature: temperatura,
            max_tokens: maxTokens,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ]
        };
        if (reasoningEffort) payload.reasoning_effort = 'low';

        return await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${clave}`
            },
            body: JSON.stringify(payload),
            signal: controlador.signal
        });
    } finally {
        clearTimeout(reloj);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ROTACIÓN: posición inicial aleatoria → siguiente key y siguiente modelo
// ante 429 / 401 / 5xx / error de red / timeout
// ─────────────────────────────────────────────────────────────────────────────
const ejecutarConRotacion = async ({ systemPrompt, userContent, esImagen, temperatura }) => {
    const modelos = esImagen && MODELOS.includes(MODELO_VISION) ? [MODELO_VISION] : MODELOS;

    if (CLAVES.length === 0) {
        console.error('❌ [IA] GROQ_API_KEYS no está configurado en el entorno');
        return { data: null, estado: 'sin_respuesta' };
    }

    const inicio = Math.floor(Math.random() * CLAVES.length);
    let reasoningActivo = true;
    let respuestasValidasHTTP = 0;

    for (let i = 0; i < CLAVES.length; i++) {
        const indiceClave = (inicio + i) % CLAVES.length;
        const clave = CLAVES[indiceClave];
        const modelo = modelos[i % modelos.length];

        for (let intento = 0; intento < MAX_INTENTOS_JSON; intento++) {
            const esRazonador = modelo.startsWith('openai/gpt-oss');
            const maxTokens = intento === 0
                ? (modelo === 'openai/gpt-oss-20b' ? MAX_TOKENS_RAZONADOR : MAX_TOKENS)
                : MAX_TOKENS_AMPLIADO; // reintento: más presupuesto si vino cortado

            let respuesta;
            try {
                respuesta = await llamarGroq({
                    clave,
                    modelo,
                    systemPrompt,
                    userContent,
                    maxTokens,
                    temperatura,
                    reasoningEffort: reasoningActivo && esRazonador
                });
            } catch (e) {
                const motivo = e && e.name === 'AbortError' ? 'timeout 10s' : 'error de red';
                console.warn(`⚠️ [IA] key ${i + 1}/${CLAVES.length} · ${modelo}: ${motivo} → siguiente key/modelo`);
                break;
            }

            if (!respuesta.ok) {
                // ¿La API no soporta reasoning_effort? → lo quitamos y repetimos
                // el MISMO intento sin consumir la rotación.
                if (respuesta.status === 400 && reasoningActivo && esRazonador) {
                    const cuerpo400 = await respuesta.text().catch(() => '');
                    if (/reasoning_effort|unknown|unexpected/i.test(cuerpo400)) {
                        reasoningActivo = false;
                        intento--;
                        continue;
                    }
                }
                // 429 / 401 / 403 / 4xx / 5xx → siguiente key y siguiente modelo
                console.warn(`⚠️ [IA] key ${i + 1}/${CLAVES.length} · ${modelo}: HTTP ${respuesta.status} → siguiente key/modelo`);
                break;
            }

            let json = null;
            try {
                json = await respuesta.json();
            } catch {
                json = null;
            }
            respuestasValidasHTTP++;

            const contenido = json && json.choices && json.choices[0]
                ? json.choices[0].message && json.choices[0].message.content
                : undefined;
            const parseo = extraerJSON(contenido);
            if (parseo.ok) {
                console.log(`✅ [IA] ok en key ${i + 1}/${CLAVES.length} · ${modelo}`);
                return { data: parseo.data, estado: 'ok' };
            }

            // Vacío o JSON cortado → 1 reintento (intento === 1) con más tokens
            console.warn(`⚠️ [IA] key ${i + 1}/${CLAVES.length} · ${modelo}: respuesta ${contenido ? 'con JSON inválido o cortado' : 'vacía'} → reintento`);
        }
    }

    return {
        data: null,
        estado: respuestasValidasHTTP > 0 ? 'json_invalido' : 'sin_respuesta'
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
    const origen = obtenerHeader(event && event.headers, 'origin');
    const cors = cabecerasCORS(origen);
    const metodo = String((event && event.httpMethod) || 'GET').toUpperCase();

    // Preflight
    if (metodo === 'OPTIONS') {
        if (origen && !origenPermitido(origen)) {
            return responderAuth(403, 'origen_no_permitido', cors);
        }
        return { statusCode: 204, headers: cors, body: '' };
    }

    if (metodo !== 'POST') {
        return responder(405, { error: 'Método no permitido.' }, cors);
    }

    // CORS restringido a ALLOWED_ORIGIN (sin header Origin → no es una request
    // de navegador, así que pasa igual)
    if (origen && !origenPermitido(origen)) {
        return responderAuth(403, 'origen_no_permitido', cors);
    }

    // ── Sesión ──
    const autorizacion = obtenerHeader(event && event.headers, 'authorization');
    const token = typeof autorizacion === 'string' && /^Bearer\s+\S+/i.test(autorizacion.trim())
        ? autorizacion.replace(/^Bearer\s+/i, '').trim()
        : '';
    if (!token) {
        return responderAuth(401, 'sin_token', cors);
    }
    const sesion = await verificarToken(token);
    if (!sesion) {
        return responderAuth(401, 'token_invalido', cors);
    }

    // ── Cuerpo ──
    const crudo = !event.body
        ? ''
        : (event.isBase64Encoded
            ? Buffer.from(event.body, 'base64').toString('utf8')
            : event.body);

    if (Buffer.byteLength(crudo, 'utf8') > MAX_CUERPO_BYTES) {
        return responder(413, { error: 'La petición es demasiado grande.' }, cors);
    }

    let cuerpo = null;
    try {
        cuerpo = JSON.parse(crudo);
    } catch {
        cuerpo = null;
    }

    const errorValidacion = validarEntrada(cuerpo);
    if (errorValidacion) {
        return responder(400, { error: errorValidacion }, cors);
    }

    const tipo = cuerpo.tipo;
    const esImagen = tipo === 'imagen' ||
        (Array.isArray(cuerpo.userContent) &&
            cuerpo.userContent.some(p => p && p.type === 'image_url'));

    // El asistente de sugerencias usa SIEMPRE el prompt del servidor;
    // el resto de los tipos manda el prompt armado por el cliente.
    let systemPrompt;
    if (tipo === 'sugerencias') {
        systemPrompt = leerPromptSugerencias();
    } else {
        systemPrompt = String(cuerpo.systemPrompt).trim();
    }

    if (!systemPrompt) {
        return responder(500, { error: 'El asistente no está disponible ahora. Probá más tarde.' }, cors);
    }

    const resultado = await ejecutarConRotacion({
        systemPrompt,
        userContent: cuerpo.userContent,
        esImagen,
        temperatura: tipo === 'sugerencias' ? TEMPERATURA_SUGERENCIAS : TEMPERATURA
    });

    if (resultado.data) {
        return responder(200, { ok: true, data: resultado.data }, cors);
    }

    if (resultado.estado === 'json_invalido') {
        return responder(502, { error: 'No pude entender la respuesta. Probá una vez más.' }, cors);
    }

    // Todas las keys/modelos agotadas (o sin keys configuradas)
    return responder(
        429,
        { error: 'El asistente está saturado. Probá de nuevo en un minuto.' },
        { ...cors, 'Retry-After': '60' }
    );};

// Exportadas solo para tests unitarios (no son parte de la API)
exports._interno = {
    validarEntrada,
    extraerJSON,
    cabecerasCORS,
    origenPermitido,
    obtenerHeader,
    // Cantidad de keys configuradas (NUNCA se expone el valor de las keys)
    cantidadClaves: () => CLAVES.length,
    cantidadModelos: () => MODELOS.length
};
