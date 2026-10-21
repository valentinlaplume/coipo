// tests/estilos-base.test.mjs
// Guardas de la base de estilos: tokens.css es la única fuente de variables
// globales, components.css la única casa de los componentes compartidos y
// ningún var() queda sin definir. Corre con: npm test

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (ruta) => readFileSync(join(raiz, ruta), 'utf8');

const html = leer('index.html');
const tokens = leer('src/styles/tokens.css');
const componentes = leer('src/styles/components.css');
const cssPrincipal = leer('src/css/main.css');
const cssLogin = leer('src/views/login/login.css');
const cssOnboarding = leer('src/views/onboarding/onboarding.css');
const cssDashboard = leer('src/views/dashboard/dashboard.css');

// ── tokens.css ──────────────────────────────────────────────────────────────

test('tokens.css existe, se carga antes que main.css y define el núcleo', () => {
    const iTokens = html.indexOf('src/styles/tokens.css');
    const iComponentes = html.indexOf('src/styles/components.css');
    const iPrincipal = html.indexOf('src/css/main.css');
    assert.ok(iTokens > -1, 'index.html no linkea src/styles/tokens.css');
    assert.ok(iComponentes > -1, 'index.html no linkea src/styles/components.css');
    assert.ok(iTokens < iComponentes && iComponentes < iPrincipal,
        'el orden debe ser tokens → components → main');

    for (const token of [
        '--coipo-bg', '--coipo-surface', '--coipo-primary', '--coipo-text', '--coipo-text-muted',
        '--radius-md', '--radius-lg', '--radius-pill', '--sp-8', '--sp-16',
        '--fs-min', '--fs-caption', '--fs-base', '--font-main',
        '--touch-min', '--touch-md', '--touch-fila',
    ]) {
        assert.ok(new RegExp(`${token}\\s*:`).test(tokens), `falta ${token} en tokens.css`);
    }
});

test('tokens.css no define la misma variable dos veces en :root', () => {
    const raizBloque = tokens.match(/:root\s*\{[\s\S]*?\n\}/);
    assert.ok(raizBloque, 'falta el bloque :root');
    const nombres = [...raizBloque[0].matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]);
    const repetidos = nombres.filter((n, i) => nombres.indexOf(n) !== i);
    assert.deepEqual(repetidos, [], `variables duplicadas: ${repetidos.join(', ')}`);
});

test('los :root duplicados de las vistas ya no existen', () => {
    for (const [nombre, css] of [['onboarding.css', cssOnboarding], ['dashboard.css', cssDashboard]]) {
        assert.ok(!/:root\s*\{/.test(css), `${nombre} sigue definiendo :root (tokens.css manda)`);
    }
});

// ── components.css ──────────────────────────────────────────────────────────

test('components.css centraliza los componentes compartidos', () => {
    for (const clase of [
        '.btn-primary', '.btn-secondary', '.btn-danger', '.btn-block', '.ingesta-btn-primario',
        '.modal-overlay', '.modal-content', '.modal-actions',
        '.pill', '.ingesta-momento', '.ingesta-tabs', '.ingesta-tab',
        '.receta-fila', '.ingesta-receta-fila', '.off-fila',
        '.search-row', '.search-field', '.search-input', '.search-clear', '.search-btn',
    ]) {
        assert.ok(new RegExp(`\\${clase}[ ,{:.]`).test(componentes), `falta ${clase} en components.css`);
    }
});

test('el orden de cascada dentro de components.css es el histórico', () => {
    // .btn-block pierde contra el look canónico; .ingesta-btn-primario lo gana
    assert.ok(componentes.indexOf('.btn-block {') < componentes.indexOf('.btn-primary {'),
        '.btn-block debe ir antes de .btn-primary');
    assert.ok(componentes.indexOf('.btn-primary:disabled') < componentes.indexOf('.ingesta-btn-primario {'),
        '.ingesta-btn-primario debe ir después de .btn-primary');
});

test('los componentes ya no están definidos en varios archivos a la vez', () => {
    // Un solo hogar: si vuelve a aparecer acá, alguien duplicó el componente
    const vetados = [
        [/^\.btn-primary\s*\{/m, cssPrincipal, 'main.css'],
        [/^\.btn-secondary\s*\{/m, cssPrincipal, 'main.css'],
        [/^\.btn-danger\s*\{/m, cssPrincipal, 'main.css'],
        [/^\.btn-block\s*\{/m, cssPrincipal, 'main.css'],
        [/^\.modal-overlay\s*\{/m, cssPrincipal, 'main.css'],
        [/^\.modal-content\s*\{/m, cssPrincipal, 'main.css'],
        [/^\.ingesta-tabs\s*\{/m, cssPrincipal, 'main.css'],
        [/^\.ingesta-tab\s*\{/m, cssPrincipal, 'main.css'],
        [/^\.btn-primary\s*\{/m, cssLogin, 'login.css'],
        [/^\.btn-primary\s*\{/m, cssOnboarding, 'onboarding.css'],
        [/^\.pill\s*\{/m, cssOnboarding, 'onboarding.css'],
        [/^\.search-row\s*\{/m, cssDashboard, 'dashboard.css'],
        [/^\.off-fila\s*\{/m, cssDashboard, 'dashboard.css'],
    ];
    for (const [re, css, archivo] of vetados) {
        assert.ok(!re.test(css), `${archivo} volvió a definir un componente (debe vivir en components.css)`);
    }
});

// ── var() sin definir ───────────────────────────────────────────────────────

test('ningún var() queda sin definir ni fallback', () => {
    // Bugs heredados: NO se definen a propósito (definirlos cambiaría el
    // aspecto actual de .meal-item.pending-new). Si se toca ese componente,
    // agregar el token a tokens.css y sacarlo de esta lista.
    const heredados = new Set(['--coipo-primary-light', '--coipo-primary-rgb']);

    const listarCss = (dir) => readdirSync(dir).flatMap(n => {
        const p = join(dir, n);
        if (statSync(p).isDirectory()) return listarCss(p);
        return n.endsWith('.css') ? [p] : [];
    });

    const definidos = new Set();
    const rutasCss = listarCss(join(raiz, 'src'));

    // Pasada 1: todas las definiciones (--x:) de todo el CSS
    for (const ruta of rutasCss) {
        const txt = readFileSync(ruta, 'utf8');
        for (const m of txt.matchAll(/(--[\w-]+)\s*:/g)) definidos.add(m[1]);
    }

    // Pasada 2: usos sin fallback que no están definidos en ningún archivo
    const huerfanos = new Map();
    for (const ruta of rutasCss) {
        const txt = readFileSync(ruta, 'utf8');
        for (const m of txt.matchAll(/var\(\s*(--[\w-]+)\s*([,)])/g)) {
            if (m[2] === ',') continue;                       // tiene fallback
            if (heredados.has(m[1])) continue;                // bug heredado documentado
            if (definidos.has(m[1])) continue;
            if (!huerfanos.has(m[1])) huerfanos.set(m[1], []);
            huerfanos.get(m[1]).push(ruta.replace(raiz + '/', ''));
        }
    }
    const lista = [...huerfanos].map(([n, rutas]) => `${n} (${rutas.join(', ')})`);
    assert.deepEqual(lista, [], `var() sin definir: ${lista.join(' · ')}`);
});
