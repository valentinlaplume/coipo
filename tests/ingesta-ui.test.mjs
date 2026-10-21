// tests/ingesta-ui.test.mjs
// Humo de la hoja "Nueva Ingesta" (sin navegador): chequea que sea una hoja
// con PESTAÑAS (Buscar por defecto → Recetas → IA), que la búsqueda siga
// DENTRO de la hoja con sus resultados agrupados, que solo el cuerpo
// scrollee (92dvh) y que no queden restos del pie viejo. Corre con: npm test

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
// Componentes compartidos (botones, modal, chips, pestañas, filas, buscador)
const cssComponentes = leer('src/styles/components.css');

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

test('la hoja tiene cabecera con ✕, pestañas y el CTA de IA dentro de su pestaña', () => {
    for (const id of ['cerrar-ingesta', 'ingesta-panel-ia', 'confirmar-modal']) {
        assert.ok(tieneId(hoja, id), `falta #${id}`);
    }
    // Sin subtítulo largo y sin pie: Cancelar ya no existe (la ✕ cierra)
    assert.ok(!hoja.includes('<p>Encontrá el producto'), 'sigue el subtítulo largo de la cabecera');
    assert.ok(!tieneId(hoja, 'cancelar-modal'), 'sigue el botón Cancelar del pie viejo');
    assert.ok(!cssPrincipal.includes('.ingesta-pie'), 'siguen los estilos del pie viejo');

    // El CTA vive DENTRO de la pestaña IA, a ancho completo y deshabilitado
    // hasta que haya texto
    const panelIA = hoja.slice(hoja.indexOf('id="ingesta-panel-ia"'));
    assert.match(panelIA, /id="confirmar-modal"[^>]*disabled>🧠 Analizar con IA</);
    assert.match(panelIA, /id="texto-comida"/);
});

test('las pestañas son un segmented control con 3 opciones y Buscar por defecto', () => {
    assert.match(hoja, /<div class="ingesta-tabs" role="tablist"/);
    for (const [tab, icono, etiqueta] of [
        ['buscar', '🔍', 'Buscar'], ['recetas', '🍲', 'Recetas'], ['ia', '✨', 'IA'],
    ]) {
        assert.match(hoja, new RegExp(`id="ingesta-tab-${tab}" data-tab="${tab}" role="tab"`));
        assert.ok(hoja.includes(`${icono} ${etiqueta}`), `falta la pestaña ${etiqueta}`);
    }
    // Una sola activa: Buscar
    assert.match(hoja, /class="ingesta-tab active"[^>]*id="ingesta-tab-buscar"[^>]*aria-selected="true"/);
    assert.ok((hoja.match(/class="ingesta-tab active"/g) || []).length === 1, 'más de una pestaña activa');

    // Solo se muestra su panel: los otros dos vienen con hidden
    assert.match(hoja, /id="ingesta-panel-recetas" role="tabpanel" hidden/);
    assert.match(hoja, /id="ingesta-panel-ia" role="tabpanel" hidden/);
    assert.match(cssPrincipal, /\.ingesta-panel\[hidden\] \{ display: none; \}/);

    // El segmented control vive en components.css y usa el token de target
    const tabs = cssComponentes.match(/\.ingesta-tab \{[^}]*\}/);
    assert.ok(tabs, 'falta .ingesta-tab');
    assert.match(tabs[0], /min-height: var\(--touch-min\)/);
    const activa = cssComponentes.match(/\.ingesta-tab\.active \{[^}]*\}/);
    assert.ok(activa, 'falta .ingesta-tab.active');
    assert.match(activa[0], /border-bottom-color/);
});

test('los chips de momento están en el HTML y la preselección usa la hora actual', () => {
    for (const momento of ['desayuno', 'almuerzo', 'merienda', 'cena', 'snack']) {
        assert.match(hoja, new RegExp(`data-momento="${momento}"`));
    }
    assert.ok((hoja.match(/class="ingesta-momento"/g) || []).length === 5, 'faltan chips de momento');
    // Misma regla de horas que el asistente de sugerencias (lógica reutilizada)
    assert.match(vista, /momentoPorHora\(new Date\(\)\.getHours\(\)\)/);
    assert.match(cssComponentes, /\.ingesta-momentos \{[^}]*overflow-x: auto;/);
    assert.match(cssComponentes, /\.ingesta-momento \{[^}]*min-height: var\(--touch-min\)/);
});

test('la búsqueda de alimento vive DENTRO de Nueva Ingesta (no hay modal aparte)', () => {
    for (const id of [
        'buscar-alimento-form',
        'buscar-alimento-input',
        'buscar-alimento-estado',
        'buscar-alimento-resultados',
        'buscar-alimento-ver-mas',
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

test('la pestaña Recetas lista Mis Recetas con kcal/porción y su botón de crear', () => {
    assert.ok(tieneId(hoja, 'ingesta-recetas-lista'), 'falta el contenedor de la lista');
    assert.ok(tieneId(hoja, 'ingesta-nueva-receta'), 'falta el botón de crear una receta');
    assert.match(vista, /ingesta-receta-kcal">\$\{Math\.round\(r\.totales_macros_porcion\?\.calorias \|\| 0\)\} kcal\/porción/);
    assert.match(vista, /abrirModalGramos\(receta\);   \/\/ idéntico a "Usar Receta"/);
    assert.match(vista, /const cargarRecetasEnIngesta = async/);
});

test('los resultados se agrupan por fuente y muestran 6 + «Ver más»', () => {
    // Subtítulos de grupo y límite de visibles, en la vista (presentación)
    assert.match(vista, /titulo: 'TUS PRODUCTOS'/);
    assert.match(vista, /titulo: 'OPEN FOOD FACTS'/);
    assert.match(vista, /const RESULTADOS_VISIBLES = 6;/);
    // "Sin marca" no se muestra y hay chevron a la derecha
    assert.match(vista, /marca !== 'Sin marca'/);
    assert.match(vista, /off-fila-chevron/);
    // Miniatura: foto o ícono de comida (40 px)
    assert.match(vista, /off-fila-icono/);

    // El subtítulo de grupo vive con el resto de la sección del buscador
    const grupo = cssBuscador.match(/\.off-grupo \{[^}]*\}/);
    assert.ok(grupo, 'falta .off-grupo');
    assert.match(grupo[0], /font-size: var\(--fs-caption\)/);
    assert.match(grupo[0], /text-transform: uppercase/);

    // La fila de resultado es un componente compartido (.off-fila en components.css)
    const fila = cssComponentes.match(/\.off-fila \{[^}]*\}/);
    assert.match(fila[0], /min-height: var\(--touch-fila\)/);
    assert.match(cssComponentes, /\.off-fila img \{[^}]*width: 40px;/);
    assert.ok(cssComponentes.includes('.off-fila-icono'), 'falta .off-fila-icono');

    // El «Ver más» se auto-oculta si la lista queda vacía
    assert.match(cssBuscador, /\.off-ver-mas\[hidden\] \{ display: none; \}/);
    assert.match(cssBuscador, /#buscar-alimento-resultados:empty ~ \.off-ver-mas \{ display: none; \}/);
});

test('la hoja mide 92dvh como máximo y el cuerpo es el único scrolleable', () => {
    const overlay = cssPrincipal.match(/\.modal-overlay\.ingesta-overlay \{[^}]*\}/);
    const modal = cssPrincipal.match(/\.modal-content\.ingesta-modal \{[^}]*\}/);
    assert.ok(overlay, 'falta .modal-overlay.ingesta-overlay');
    assert.ok(modal, 'falta .modal-content.ingesta-modal');
    assert.match(overlay[0], /padding:\s*0;/);
    assert.match(modal[0], /max-height: 92dvh;/);
    assert.match(modal[0], /overflow: hidden;/);

    // Cabecera, chips y pestañas no scrollean: el scroll es del cuerpo.
    // (chips y pestañas son componentes compartidos; la cabecera es de la hoja)
    const cuerpo = cssPrincipal.match(/\.ingesta-cuerpo \{[^}]*\}/);
    assert.ok(cuerpo, 'falta .ingesta-cuerpo');
    assert.match(cuerpo[0], /overflow-y: auto;/);
    assert.match(cuerpo[0], /min-height: 0;/);
    const fijos = { '.ingesta-header': cssPrincipal, '.ingesta-momentos': cssComponentes, '.ingesta-tabs': cssComponentes };
    for (const [fijo, css] of Object.entries(fijos)) {
        const regla = css.match(new RegExp(`${fijo} \\{[^}]*\\}`));
        assert.ok(regla, `falta ${fijo}`);
        assert.match(regla[0], /flex: 0 0 auto/, `${fijo} debería estar fijo (sin crecer ni encoger)`);
    }
});

test('la IA se usa desde su pestaña: textarea + hint + único primario ≥44 px', () => {
    const cta = cssComponentes.match(/\.ingesta-btn-primario \{[^}]*\}/);
    assert.ok(cta, 'falta .ingesta-btn-primario');
    assert.match(cta[0], /width: 100%/);
    assert.match(cta[0], /min-height: 50px/);

    // Un solo botón primario verde por pantalla: la hoja ya no tiene pie
    assert.ok(!cssPrincipal.includes('.ingesta-btn-secundario'), 'quedó el botón secundario del pie');
    assert.ok(!cssComponentes.includes('.ingesta-btn-secundario'), 'quedó el botón secundario del pie');

    assert.match(cssPrincipal, /\.ingesta-ia-hint \{[^}]*font-size: var\(--fs-min\);/);
    assert.match(cssComponentes, /\.ingesta-tab \{[^}]*min-height: var\(--touch-min\)/);
    assert.match(cssBuscador, /\.off-acciones button \{[^}]*min-height: var\(--touch-min\)/);
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
        const m = cssComponentes.match(re);
        assert.ok(m, msg);
        return m[0];
    };

    const fila = bloque(/\.search-row \{[^}]*\}/, 'falta .search-row');
    assert.match(fila, /display:\s*flex/);
    assert.match(fila, /gap:\s*var\(--sp-8\)/);
    assert.match(fila, /width:\s*100%/);

    const campo = bloque(/\.search-field \{[^}]*\}/, 'falta .search-field');
    assert.match(campo, /position:\s*relative/);
    assert.match(campo, /flex:\s*1 1 auto/);
    assert.match(campo, /min-width:\s*0/);

    const input = bloque(/\.search-input \{[^}]*\}/, 'falta .search-input');
    assert.match(input, /width:\s*100%/);
    assert.match(input, /height:\s*var\(--touch-min\)/);
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
    assert.match(boton, /height:\s*var\(--touch-min\)/);
    assert.match(boton, /padding:\s*0 16px/);

    // Se muestra solo con texto y respeta el atributo hidden del HTML
    assert.match(cssComponentes, /\.search-clear\[hidden\] \{ display: none; \}/);
    assert.match(cssComponentes, /\.search-field \.search-input:not\(:placeholder-shown\) ~ \.search-clear \{ display: grid; \}/);

    // Sin restos de las clases viejas que se pisaban con estas
    for (const vieja of ['.off-buscar-fila', '.off-campo', '.off-limpiar', '.off-input']) {
        assert.ok(!cssBuscador.includes(vieja), `quedó la regla vieja ${vieja} en dashboard.css`);
        assert.ok(!cssComponentes.includes(vieja), `quedó la regla vieja ${vieja} en components.css`);
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
    // ✕ cierra; las pestañas alternan paneles; el CTA de IA se habilita solo
    assert.match(vista, /btnCerrarIngesta\.onclick/);
    assert.match(vista, /const activarTabIngesta = \(cual\)/);
    assert.match(vista, /tab\.onclick = \(\) => activarTabIngesta\(tab\.dataset\.tab\)/);
    assert.match(vista, /getElementById\('confirmar-modal'\)\.onclick/);
    assert.match(vista, /sincronizarBotonIA/);

    // Abrir la hoja: pestaña Buscar, búsqueda limpia y momento por hora
    const abrir = vista.match(/const abrirModalRegistro = \(\) => \{[\s\S]*?\n    \};/);
    assert.ok(abrir, 'falta abrirModalRegistro');
    assert.match(abrir[0], /resetearBusqueda\(\)/);
    assert.match(abrir[0], /activarTabIngesta\('buscar'\)/);
    assert.match(abrir[0], /preseleccionarMomento\(\)/);

    // Búsqueda: disparo explícito (submit/oninput, sin apilar listeners)
    assert.match(vista, /formularioBuscar\.onsubmit/);
    assert.match(vista, /inputBuscar\.oninput/);
    assert.ok(!/inputBuscar\.addEventListener/.test(vista), 'el input estático apilaría listeners por render');

    // Sin restos del modal viejo: pie con Cancelar ni atajo de receta
    assert.ok(!vista.includes('cancelar-modal'), 'dashboard.view.js sigue cableando #cancelar-modal');
    assert.ok(!vista.includes('elegir-receta-modal'), 'sigue el atajo viejo de receta');
});
