// tests/ingesta-ui.test.mjs
// Humo de la hoja "Nueva Ingesta" (sin navegador): chequea que la búsqueda de
// alimento siga DENTRO de la hoja, que el orden de la UX sea producto →
// receta → IA, que la hoja sea a pantalla completa y que no queden restos del
// modal viejo de búsqueda. Corre con: npm test  →  node --test tests/

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (ruta) => readFileSync(join(raiz, ruta), 'utf8');

const html = leer('index.html');
const vista = leer('src/views/dashboard/dashboard.view.js');
const cssPrincipal = leer('src/css/main.css');
const cssBuscador = leer('src/views/dashboard/dashboard.css');

const inicioHoja = html.indexOf('id="modal-registro"');
const finHoja = html.indexOf('id="modal-confirm"');
const hoja = html.slice(inicioHoja, finHoja > inicioHoja ? finHoja : undefined);

const tieneId = (texto, id) => texto.includes(`id="${id}"`);

// ── Estructura de la hoja ────────────────────────────────────────────────────

test('Nueva Ingesta existe y está marcada como hoja a pantalla completa', () => {
    assert.ok(inicioHoja > -1, 'falta #modal-registro en index.html');
    assert.match(html, /id="modal-registro"[^>]*class="modal-overlay ingesta-overlay"/);
    assert.match(hoja, /class="modal-content ingesta-modal"/);
});

test('la hoja tiene cabecera con ✕, pie con Cancelar y el CTA de IA', () => {
    for (const id of ['cerrar-ingesta', 'cancelar-modal', 'confirmar-modal']) {
        assert.ok(tieneId(hoja, id), `falta #${id}`);
    }
    assert.match(hoja, /id="confirmar-modal"[^>]*>🧠 Analizar Comida con IA</);
    assert.match(hoja, /id="cancelar-modal"[^>]*class="btn-secondary ingesta-btn-secundario"/);
});

test('la búsqueda de alimento vive DENTRO de Nueva Ingesta (no hay modal aparte)', () => {
    for (const id of [
        'buscar-alimento-form',
        'buscar-alimento-input',
        'buscar-alimento-estado',
        'buscar-alimento-resultados',
        'buscar-alimento-fuente',
    ]) {
        assert.ok(tieneId(hoja, id), `falta #${id} dentro de #modal-registro`);
    }
    assert.ok(!html.includes('modal-buscar-alimento'), 'sigue el modal viejo de búsqueda');
    assert.ok(!html.includes('abrir-buscar-alimento'), 'sigue el botón viejo que abría ese modal');
});

test('ningún JS de src vuelve a referenciar el modal de búsqueda separado', () => {
    for (const referenciado of ['modal-buscar-alimento', 'abrir-buscar-alimento', 'cerrar-buscar-alimento']) {
        assert.ok(!vista.includes(referenciado), `dashboard.view.js referencia ${referenciado}`);
    }
});

test('el orden UX es: buscar producto → receta → IA (lo último)', () => {
    const iBuscar = hoja.indexOf('id="buscar-alimento-form"');
    const iReceta = hoja.indexOf('id="elegir-receta-modal"');
    const iTexto = hoja.indexOf('id="texto-comida"');
    const iCta = hoja.indexOf('id="confirmar-modal"');

    assert.ok(iBuscar > -1 && iReceta > -1 && iTexto > -1 && iCta > -1, 'sección faltante');
    assert.ok(iBuscar < iReceta, 'la receta tendría que venir DESPUÉS de la búsqueda');
    assert.ok(iReceta < iTexto, 'la descripción con IA tendría que ser la ÚLTIMA sección');
    assert.ok(iTexto < iCta, 'el botón de IA tendría que cerrar la hoja');
});

test('las secciones comunican el costo de cada camino (chips)', () => {
    assert.match(hoja, /ingesta-chip ingesta-chip-rapido">Más rápido</);
    assert.match(hoja, /ingesta-chip">Al instante</);
    assert.match(hoja, /ingesta-chip ingesta-chip-ia">Gasta IA</);
});

// ── CSS: pantalla completa, scroll acotado, botones con target táctil ────────

test('el CSS pinta la hoja a pantalla completa (100dvh, sin margen)', () => {
    const overlay = cssPrincipal.match(/\.modal-overlay\.ingesta-overlay \{[^}]*\}/);
    const modal = cssPrincipal.match(/\.modal-content\.ingesta-modal \{[^}]*\}/);
    assert.ok(overlay, 'falta .modal-overlay.ingesta-overlay');
    assert.ok(modal, 'falta .modal-content.ingesta-modal');
    assert.match(overlay[0], /padding:\s*0;/);
    assert.match(modal[0], /height:\s*100dvh;/);
    assert.match(modal[0], /overflow-y:\s*auto;/);
});

test('las coincidencias scrollean en un contenedor acotado', () => {
    const bloque = cssPrincipal.match(/\.ingesta-seccion \.off-resultados \{[^}]*\}/);
    assert.ok(bloque, 'falta la regla que acota la lista de resultados');
    assert.match(bloque[0], /max-height:/);
    assert.match(bloque[0], /overscroll-behavior:\s*contain;/);
});

test('los botones del pie y de sección respetan el target táctil (≥46 px)', () => {
    const pie = cssPrincipal.match(/\.ingesta-pie button \{[^}]*\}/);
    assert.ok(pie, 'falta .ingesta-pie button');
    assert.match(pie[0], /min-height:\s*(4[6-9]|[5-9]\d)px/);

    const seccion = cssPrincipal.match(/\.ingesta-btn \{[^}]*\}/);
    assert.ok(seccion, 'falta .ingesta-btn');
    assert.match(seccion[0], /min-height:\s*48px;/);
});

test('la fila de búsqueda: input flexible + botón fijo + ✕ dentro del input', () => {
    // Estructura exacta: .search-row > .search-field (input + ✕) + .search-btn
    assert.match(hoja, /<div class="search-row">/);
    assert.match(hoja, /<div class="search-field">/);
    assert.match(hoja, /<input class="search-input" type="search" id="buscar-alimento-input"/);
    assert.match(hoja, /<button class="search-clear" type="button" id="buscar-alimento-limpiar"[^>]*hidden>✕<\/button>/);
    assert.match(hoja, /<button class="search-btn" type="button" id="buscar-alimento-boton">Buscar<\/button>/);
    // Enter sigue entrando por el <form> (onsubmit de la vista)
    assert.match(hoja, /<form id="buscar-alimento-form" autocomplete="off">/);

    const bloque = (re, msg) => {
        const m = cssBuscador.match(re);
        assert.ok(m, msg);
        return m[0];
    };

    const fila = bloque(/\.search-row \{[^}]*\}/, 'falta .search-row');
    assert.match(fila, /display:\s*flex/);
    assert.match(fila, /gap:\s*8px/);
    assert.match(fila, /width:\s*100%/);

    const campo = bloque(/\.search-field \{[^}]*\}/, 'falta .search-field');
    assert.match(campo, /position:\s*relative/);
    assert.match(campo, /flex:\s*1 1 auto/);
    assert.match(campo, /min-width:\s*0/);

    const input = bloque(/\.search-input \{[^}]*\}/, 'falta .search-input');
    assert.match(input, /width:\s*100%/);
    assert.match(input, /height:\s*44px/);
    assert.match(input, /box-sizing:\s*border-box/);
    assert.match(input, /padding:\s*0 40px 0 12px/);

    const limpiar = bloque(/\.search-clear \{[^}]*\}/, 'falta .search-clear');
    assert.match(limpiar, /position:\s*absolute/);
    assert.match(limpiar, /right:\s*6px/);
    assert.match(limpiar, /top:\s*50%/);
    assert.match(limpiar, /width:\s*32px/);
    assert.match(limpiar, /height:\s*32px/);

    const boton = bloque(/\.search-btn \{[^}]*\}/, 'falta .search-btn');
    assert.match(boton, /flex:\s*0 0 auto/);
    assert.match(boton, /height:\s*44px/);
    assert.match(boton, /padding:\s*0 16px/);

    // Se muestra solo con texto y respeta el atributo hidden del HTML
    assert.match(cssBuscador, /\.search-clear\[hidden\] \{ display: none; \}/);
    assert.match(cssBuscador, /\.search-field \.search-input:not\(:placeholder-shown\) ~ \.search-clear \{ display: grid; \}/);

    // Sin restos de las clases viejas que se pisaban con estas
    for (const vieja of ['.off-buscar-fila', '.off-campo', '.off-limpiar', '.off-input']) {
        assert.ok(!cssBuscador.includes(vieja), `quedó la regla vieja ${vieja}`);
        assert.ok(!hoja.includes(vieja), `el HTML todavía usa ${vieja}`);
    }
});

// ── Vinculación JS ↔ markup ──────────────────────────────────────────────────

test('todos los getElementById del flujo de ingesta existen en el HTML', () => {
    const usados = new Set();
    for (const m of vista.matchAll(/getElementById\('([\w-]+)'\)/g)) usados.add(m[1]);

    // Ids que el JS crea en caliente (no están en index.html)
    const dinamicos = new Set([
        'pedir-gramos-input', 'pedir-gramos-ok', 'pedir-gramos-cancel', 'deshacer-borrado',
        'acceso-continuar', 'toast-pedir-gramos', 'acceso-titulo', 'acceso-frase',
        'acceso-guardada', 'acceso-enlace', 'scanner-ayuda', 'scanner-lente',
    ]);

    const faltantes = [...usados].filter(id => !tieneId(html, id) && !dinamicos.has(id));
    assert.deepEqual(faltantes, [], `IDs referenciados y ausentes: ${faltantes.join(', ')}`);
});

test('los controles de la hoja quedan cableados en la vista', () => {
    // ✕ y Cancelar cierran; el CTA de IA tiene su handler
    assert.match(vista, /btnCerrarIngesta\.onclick/);
    assert.match(vista, /getElementById\('cancelar-modal'\)\.onclick/);
    assert.match(vista, /getElementById\('confirmar-modal'\)\.onclick/);

    // Abrir la hoja limpia la búsqueda de la sesión anterior
    const abrir = vista.match(/const abrirModalRegistro = \(\) => \{[\s\S]*?\n    \};/);
    assert.ok(abrir, 'falta abrirModalRegistro');
    assert.match(abrir[0], /resetearBusqueda\(\)/);

    // Búsqueda: disparo explícito (submit/oninput, sin apilar listeners)
    assert.match(vista, /formularioBuscar\.onsubmit/);
    assert.match(vista, /inputBuscar\.oninput/);
    assert.ok(!/inputBuscar\.addEventListener/.test(vista), 'el input estático apilaría listeners por render');
});
