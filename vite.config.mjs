// vite.config.mjs
//
// 1) `base: './'` → los assets del build (JS/CSS/imagenes) se referencian de
//    forma RELATIVA: dist/index.html anda igual servido desde la raíz del
//    dominio (Netlify), desde una subcarpeta o con Live Server sobre dist/.
//
// 2) Plugin `api-local`: en `npm run dev` y `npm run preview` ejecuta la MISMA
//    función de Netlify (netlify/functions/sugerencias.js) dentro del proceso
//    de Vite, para que POST /api/sugerencias funcione sin levantar `netlify dev`.
//    - Las variables de .env (incluidas las secretas) se cargan SOLO en
//      process.env de este proceso del servidor: nunca llegan al bundle.
//    - En producción (Netlify) manda netlify.toml: redirección /api/* →
//      /.netlify/functions/* y las env del entorno de Netlify.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const requireCJS = createRequire(import.meta.url);

// ── Variables de .env → process.env del proceso del dev server ───────────────
// (solo las que aún no estén definidas: en Netlify/CI manda el entorno real)
const cargarEnvEnProceso = (mode) => {
    const envLocal = loadEnv(mode, process.cwd(), ''); // '' = todas, incluidas secretas
    for (const [clave, valor] of Object.entries(envLocal)) {
        if (valor && typeof process.env[clave] !== 'string') process.env[clave] = valor;
    }

    // En dev/preview la página vive en un host local (cualquier puerto que use
    // Vite o Live Server) y la función hace match EXACTO de orígenes: sumamos
    // los puertos típicos ANTES de que la función se importe (lee la lista una
    // sola vez, al cargar el módulo). Solo afecta a este proceso local: en
    // Netlify manda su propio entorno (y el guard de arriba no lo toca).
    if (!process.env.NETLIFY) {
        const permitidos = new Set(
            String(process.env.ALLOWED_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean)
        );
        const hosts = ['http://localhost', 'http://127.0.0.1'];
        const puertos = [...Array(10)].map((_, i) => 5173 + i)  // Vite dev (5173, 5174, ...)
            .concat([4173, 4174])                                // vite preview
            .concat([5500, 5501, 5502]);                         // Live Server de VS Code
        for (const host of hosts) {
            for (const puerto of puertos) permitidos.add(`${host}:${puerto}`);
        }
        process.env.ALLOWED_ORIGIN = [...permitidos].join(',');
    }
};

// ── Middleware: /api/<nombre> → netlify/functions/<nombre>.js ────────────────
const leerCuerpo = (req) => new Promise((resolver, rechazar) => {
    let datos = '';
    req.on('data', fragmento => {
        datos += fragmento;
        if (datos.length > 6000000) {
            rechazar(new Error('Cuerpo demasiado grande'));
            req.destroy();
        }
    });
    req.on('end', () => resolver(datos));
    req.on('error', rechazar);
});

const funciones = new Map(); // nombre → { mtime, modulo }

const importarFuncion = async (nombre) => {
    if (!/^[a-z0-9_-]+$/i.test(nombre)) return null;
    const ruta = path.join(process.cwd(), 'netlify', 'functions', `${nombre}.js`);
    if (!fs.existsSync(ruta)) return null; // 404 antes de que el import reviente

    const mtime = fs.statSync(ruta).mtimeMs;
    const enCache = funciones.get(nombre);
    if (enCache && enCache.mtime === mtime) return enCache.modulo;

    // El require cache de CJS es GLOBAL al proceso: si se editó una función (o
    // una que requiere otra, p. ej. buscar-alimentos → openfoodfacts), hay que
    // limpiarlo para no usar una instancia vieja sin los exports nuevos.
    const dir = path.join('netlify', 'functions');
    for (const clave of Object.keys(requireCJS.cache)) {
        if (clave.includes(dir)) delete requireCJS.cache[clave];
    }

    // El query ?v= bustea también el loader ESM (por si ya se importó antes)
    const modulo = await import(`${pathToFileURL(ruta).href}?v=${mtime}`);
    funciones.set(nombre, { mtime, modulo });
    return modulo;
};

// En dev/preview la página y la API viven en el MISMO host local (cualquier
// puerto: 5173, 5174, 4173...). Aceptamos orígenes de localhost/127.0.0.1
// ANTES de importar la función (la lee una sola vez al cargar el módulo).
// Solo corre en el dev server local: en Netlify manda process.env real.
const permitirOrigenLocal = (req) => {
    if (process.env.NETLIFY) return;
    const origen = String(req.headers?.origin || '');
    const esLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origen);
    if (!esLocal) return;
    const actuales = new Set(
        String(process.env.ALLOWED_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean)
    );
    if (actuales.has(origen)) return;
    actuales.add(origen);
    process.env.ALLOWED_ORIGIN = [...actuales].join(',');
};

const middlewareAPI = async (req, res, next) => {
    const urlCompleta = String(req.url || '');
    const ruta = urlCompleta.split('?')[0];
    const coincide = /^\/api\/([^/]+)$/.exec(ruta);
    if (!coincide) return next();

    try {
        permitirOrigenLocal(req);
        const modulo = await importarFuncion(coincide[1]);
        if (!modulo || typeof modulo.handler !== 'function') {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'No existe esa función.' }));
            return;
        }

        const cuerpo = ['GET', 'HEAD'].includes(req.method) ? '' : await leerCuerpo(req);
        // Mismo shape que un event de Netlify (path sin query + params aparte).
        // OJO: la query se recorta de la URL COMPLETA, no de `ruta` (que ya está
        // sin query): si no, queryStringParameters llegaría siempre vacío.
        const corte = urlCompleta.indexOf('?');
        const query = corte >= 0 ? urlCompleta.slice(corte + 1) : '';
        const queryStringParameters = Object.fromEntries(new URLSearchParams(query));
        const resultado = await modulo.handler({
            httpMethod: req.method,
            headers: req.headers,
            body: cuerpo,
            isBase64Encoded: false,
            path: ruta,
            queryStringParameters
        });

        res.statusCode = resultado?.statusCode || 200;
        for (const [clave, valor] of Object.entries(resultado?.headers || {})) {
            res.setHeader(clave, valor);
        }
        res.end(resultado?.body || '');
    } catch (e) {
        // Nunca imprimimos cuerpos ni claves: solo el mensaje del error
        const mensaje = e?.message || String(e);
        console.error(`❌ [dev/api] ${ruta}:`, mensaje);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        // En dev local devolvemos el motivo (se ve en la consola del navegador);
        // en Netlify jamás exponemos detalles internos.
        res.end(JSON.stringify({
            error: process.env.NETLIFY ? 'Error interno.' : `Error interno del dev server: ${mensaje}`
        }));
    }
};

const pluginApiLocal = () => ({
    name: 'api-local',
    configureServer(servidor) {
        servidor.middlewares.use(middlewareAPI);
    },
    configurePreviewServer(servidor) {
        servidor.middlewares.use(middlewareAPI);
    }
});

export default defineConfig(({ mode }) => {
    cargarEnvEnProceso(mode);
    return {
        base: './',
        plugins: [pluginApiLocal()]
    };
});
