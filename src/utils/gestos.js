// src/utils/gestos.js ─────────────────────────────────────────────────────────
// Componentes de gestos reutilizables estilo iOS para Coipo (vanilla JS, sin dependencias).
//
// Etapa 1: CIERRE POR ARRASTRE (swipe-down) en modales y bottom sheets.
// Etapa 2: SWIPE-BACK desde el borde izquierdo (pila de pantallas).
// Etapa 3: SWIPEABLE ROW — deslizar filas de lista para revelar acciones.
//
// Principios del proyecto:
//  - Movimiento solo con transform/translate3d (hilo de composición → 60 fps).
//  - Pointer Events → mismo comportamiento con dedo y con mouse (escritorio).
//  - Un solo gesto activo a la vez: no compite con scroll, carruseles ni filas.
//  - El botón de cerrar SIEMPRE sigue visible: el gesto es una alternativa más.
//  - Toda acción por gesto tiene alternativa accesible (el botón correspondiente).

// ── Constantes compartidas ───────────────────────────────────────────────────
export const UMBRAL_ARRANQUE = 8;      // px para comprometer la dirección del gesto
export const DOMINIO_DIRECCION = 1.2;  // cuánto debe dominar un eje sobre el otro
export const UMBRAL_CIERRE = 110;      // px de arrastre para cerrar un sheet
export const VELOCIDAD_CIERRE = 0.65;  // px/ms: cierre por velocidad del dedo
export const ZONA_BORDE = 26;          // px de borde izquierdo para volver atrás

// Un solo gesto a la vez en toda la app (coordina sheets, filas y swipe-back)
let gestoActivo = false;
export const hayGestoActivo = () => gestoActivo;
const marcarGesto = (v) => { gestoActivo = v; };

// ── Háptico leve (Android/Chrome; iOS Safari no implementa vibrate) ─────────
export const golpe = (ms = 12) => {
    try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
    } catch (e) { /* plataforma sin háptico */ }
};

// Escape básico de texto (mismo criterio que la app)
const esc = (texto) => String(texto ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ── Criterio puro de cierre de sheet (testeable sin DOM) ────────────────────
// Cierra si el arrastre superó la distancia umbral O si se soltó con velocidad.
export const criterioCierre = (dy, vy) =>
    dy > UMBRAL_CIERRE || (dy > 40 && vy > VELOCIDAD_CIERRE);

// ── ¿Hay algún modal/sheet visible? (pausa los gestos de pantalla) ──────────
export const hayModalAbierto = () =>
    Array.from(document.querySelectorAll('.modal-overlay, .scanner-modal'))
        .some(el => el.style.display && el.style.display !== 'none');

// ── Confirmación reutilizable ────────────────────────────────────────────────
// Se usa para "¿Descartar cambios?" cuando un sheet con formulario se cierra
// por arrastre. Diálogo propio (no toca el modal de borrado de comidas).
export const pedirConfirmacion = (titulo, texto, labelAceptar = 'Aceptar', labelCancelar = 'Cancelar') =>
    new Promise(resolve => {
        document.querySelectorAll('.gesto-confirm-overlay').forEach(o => o.remove());

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay gesto-confirm-overlay';
        overlay.style.display = 'flex';
        overlay.innerHTML = `
            <div class="modal-content confirm-modal">
                <h3>${esc(titulo)}</h3>
                <p>${esc(texto)}</p>
                <div class="modal-actions">
                    <button type="button" class="btn-secondary" data-cancelar>${esc(labelCancelar)}</button>
                    <button type="button" class="btn-danger" data-aceptar>${esc(labelAceptar)}</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        let resuelto = false;
        const fin = (valor) => {
            if (resuelto) return;
            resuelto = true;
            document.removeEventListener('keydown', onKey);
            overlay.remove();
            resolve(valor);
        };
        const onKey = (e) => { if (e.key === 'Escape') fin(false); };
        document.addEventListener('keydown', onKey);

        overlay.querySelector('[data-aceptar]').onclick = () => fin(true);
        overlay.querySelector('[data-cancelar]').onclick = () => fin(false);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) fin(false); });
        // La opción segura recibe el foco (teclado/lector de pantalla)
        setTimeout(() => { const b = overlay.querySelector('[data-cancelar]'); if (b) b.focus(); }, 40);
    });

// ── DismissibleSheet: swipe-down para cerrar un modal/bottom sheet ──────────
//
// opciones = {
//   cerrar:   string (selector del botón de cierre) | function (cierre propio).
//             Se invoca SOLO cuando el cierre está confirmado. Si falta, se oculta el overlay.
//   sucio:    () => boolean — true si hay cambios sin guardar en el formulario.
//             Con sucio=true el gesto pide "¿Descartar cambios?" antes de cerrar.
//   bloquearSel: selector opcional de zonas donde NO arrancar el gesto (ej: cámara).
// }
//
// Reglas de activación (no interfiere con el scroll):
//  - Desde la agarradera (barra superior): siempre.
//  - Desde el contenido: solo si no se toca un control (input/botón) y el scroll
//    interno de cualquier contenedor está en el tope.
//  - Se compromete recién cuando el movimiento vertical domina claramente al
//    horizontal; si domina el horizontal, el gesto se abandona (lo tomará una fila
//    o el scroll normal).
const registrosDeslizables = new WeakMap();

export const hacerDeslizable = (overlay, opciones = {}) => {
    if (!overlay) return;
    registrosDeslizables.set(overlay, opciones); // registro fresco en cada render (closures nuevos)
    if (overlay.dataset.gestosListo === '1') return;
    overlay.dataset.gestosListo = '1';

    const contenidoBase = overlay.querySelector('.modal-content');
    // Escáner u otros sheets sin .modal-content: la raíz es la que se arrastra
    const contenido = contenidoBase || overlay;

    // Agarradera visual (pista de que la hoja se puede tirar hacia abajo)
    let barra = null;
    if (contenidoBase && !contenidoBase.querySelector('.modal-grabber')) {
        barra = document.createElement('div');
        barra.className = 'modal-grabber';
        barra.setAttribute('aria-hidden', 'true');
        contenidoBase.appendChild(barra);
        // Absoluta dentro del contenedor con scroll: compensamos el scrollTop
        // para que la barra quede siempre arriba, sin importar el padding.
        contenidoBase.addEventListener('scroll', () => {
            barra.style.top = (8 + contenidoBase.scrollTop) + 'px';
        }, { passive: true });
    }
    const zona = barra || overlay.querySelector('.scanner-header') || contenido;

    let pointerId = null, x0 = 0, y0 = 0;
    let arrastrando = false, comprometido = false, miGesto = false;
    let muestras = [], quitarVentana = null, guardatouch = null;

    const soltarGuardas = () => {
        if (quitarVentana) { quitarVentana(); quitarVentana = null; }
        if (guardatouch) { overlay.removeEventListener('touchmove', guardatouch); guardatouch = null; }
    };
    const terminar = () => {
        soltarGuardas();
        if (miGesto) { marcarGesto(false); miGesto = false; }
        arrastrando = false; comprometido = false; pointerId = null; muestras = [];
    };

    // Vuelve a su lugar con animación (no superó umbral/velocidad)
    const volverALugar = () => {
        contenido.style.transition = 'transform .3s cubic-bezier(.22,.61,.36,1)';
        contenido.style.transform = 'translate3d(0,0,0)';
        const fin = () => {
            if (arrastrando) return; // el usuario ya agarró de nuevo
            contenido.removeEventListener('transitionend', fin);
            contenido.style.transition = '';
            contenido.style.transform = '';
        };
        contenido.addEventListener('transitionend', fin);
        setTimeout(fin, 340); // respaldo si no llega transitionend
    };

    const ejecutarCierre = (ops) => {
        if (typeof ops.cerrar === 'function') { ops.cerrar(); return; }
        if (typeof ops.cerrar === 'string') {
            const btn = overlay.querySelector(ops.cerrar) || document.querySelector(ops.cerrar);
            if (btn) { btn.click(); return; }
        }
        overlay.style.display = 'none';
    };

    // Cierre confirmado: sale siguiendo el último arrastre y ejecuta el cierre real
    const cerrarConAnimacion = () => {
        const ops = registrosDeslizables.get(overlay) || {};
        const alto = contenido.getBoundingClientRect().height || 320;
        golpe(14); // háptico al confirmar la acción por gesto
        contenido.style.transition = 'transform .26s cubic-bezier(.32,.72,.34,1)';
        contenido.style.transform = `translate3d(0, ${alto + 80}px, 0)`;
        overlay.style.transition = 'opacity .24s ease';
        overlay.style.opacity = '0';
        setTimeout(() => {
            ejecutarCierre(ops);
            // Limpio los estilos para que la próxima apertura arranque en cero
            contenido.style.transition = '';
            contenido.style.transform = '';
            overlay.style.transition = '';
            overlay.style.opacity = '';
        }, 270);
    };

    // Scroll interno en el tope (si no, el gesto es del scroll, no nuestro)
    const scrollerEnTope = (el) => {
        let n = el;
        while (n) {
            if (n !== barra && n.scrollHeight > n.clientHeight + 4 && n.scrollTop > 0) return false;
            if (n === contenido || n === overlay) break;
            n = n.parentElement;
        }
        return true;
    };

    const esInteractivo = (el) => !!(el && el.closest &&
        el.closest('input, textarea, select, button, a, video, [contenteditable="true"], [role="slider"]'));

    const onDown = (e) => {
        if (arrastrando) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (!contenido.contains(e.target)) return; // el fondo del overlay no arrastra (respeta su clic)

        const ops = registrosDeslizables.get(overlay) || {};
        const desdeZona = barra ? (e.target === barra || barra.contains(e.target))
                                : zona.contains(e.target);
        if (!desdeZona) {
            if (esInteractivo(e.target)) return;                 // inputs/botones: el gesto es del usuario ahí
            if (ops.bloquearSel && e.target.closest(ops.bloquearSel)) return;
            if (!scrollerEnTope(e.target)) return;               // scroll interno NO en tope → lo maneja el scroll
        }

        pointerId = e.pointerId; x0 = e.clientX; y0 = e.clientY;
        arrastrando = true; comprometido = false;
        muestras = [{ t: performance.now(), y: e.clientY }];

        const mover = (ev) => { if (ev.pointerId === pointerId) onMove(ev); };
        const soltar = (ev) => {
            if (ev.pointerId !== pointerId) return;
            if (ev.type === 'pointercancel') onCancelar(); else onUp(ev);
        };
        quitarVentana = () => {
            window.removeEventListener('pointermove', mover);
            window.removeEventListener('pointerup', soltar);
            window.removeEventListener('pointercancel', soltar);
        };
        window.addEventListener('pointermove', mover, { passive: false });
        window.addEventListener('pointerup', soltar);
        window.addEventListener('pointercancel', soltar);
    };

    const onMove = (e) => {
        if (!arrastrando) return;
        const dx = e.clientX - x0, dy = e.clientY - y0;

        if (!comprometido) {
            if (hayGestoActivo()) { terminar(); return; }        // otro gesto ganó (fila, edge-back…)
            if (Math.abs(dx) > UMBRAL_ARRANQUE && Math.abs(dx) > Math.abs(dy) * DOMINIO_DIRECCION) {
                terminar(); return;                              // horizontal → lo toma otra cosa
            }
            if (dy < -UMBRAL_ARRANQUE) { terminar(); return; }   // hacia arriba: no es cierre
            if (dy > UMBRAL_ARRANQUE && dy > Math.abs(dx) * DOMINIO_DIRECCION) {
                comprometido = true; miGesto = true; marcarGesto(true);
                // Congelamos el scroll nativo mientras el dedo maneja la hoja
                guardatouch = (ev) => ev.preventDefault();
                overlay.addEventListener('touchmove', guardatouch, { passive: false });
                contenido.style.transition = 'none';
            } else return;
        }

        // Sigue al dedo en tiempo real (solo transform → 60 fps)
        let despl = dy;
        if (despl < 0) despl *= 0.15; // goma elástica si intenta subir
        contenido.style.transform = `translate3d(0, ${despl}px, 0)`;
        muestras.push({ t: performance.now(), y: e.clientY });
        if (muestras.length > 6) muestras.shift();
    };

    const onUp = (e) => {
        if (!arrastrando) return;
        if (!comprometido) { terminar(); return; }

        const dy = e.clientY - y0;
        const a = muestras[0] || { t: performance.now(), y: e.clientY };
        const b = muestras[muestras.length - 1] || a;
        const vy = (b.y - a.y) / Math.max(1, b.t - a.t);
        terminar(); // libera guardas antes de animar

        if (criterioCierre(dy, vy)) {
            const ops = registrosDeslizables.get(overlay) || {};
            if (ops.sucio && ops.sucio()) {
                // Formulario con cambios: vuelve a su lugar y pide confirmación
                volverALugar();
                pedirConfirmacion('¿Descartar cambios?', 'Hay cambios sin guardar en este formulario.', 'Descartar')
                    .then(si => { if (si) cerrarConAnimacion(); });
            } else {
                cerrarConAnimacion();
            }
        } else {
            volverALugar(); // no llegó al umbral: anima de vuelta a su lugar
        }
    };

    const onCancelar = () => {
        if (!arrastrando) return;
        if (comprometido) volverALugar(); // el navegador recuperó el scroll: nada de datos
        terminar();
    };

    zona.addEventListener('pointerdown', onDown);
    if (zona !== contenido) contenido.addEventListener('pointerdown', onDown);
};

// ── Etapa 2: HISTORIAL DE PANTALLAS + SWIPE-BACK ─────────────────────────────
//
// No hay librería de navegación en el proyecto (SPA vanilla con renders que
// reemplazan el contenido de #app), así que la pila de "volver" es propia:
//  - Cada pantalla se registra con alRenderizar(id, restaurar).
//  - Mismo id arriba → sólo se actualiza el restaurar (cambios de día, re-render).
//  - Un id ya conocido en la pila → se trunca hasta él (volver a un estado conocido).
//  - Volver = deslizar desde el borde izquierdo: la pantalla sale a la derecha
//    siguiendo el dedo y la anterior entra en parallax (como iOS).
// Las pantallas de auth (login/onboarding) NO participan: el historial se
// reinicia al cambiar la sesión (evita restaurar datos de otro usuario).
const pila = [];
let animandoVuelta = false;
let swipeBackListo = false;

export const alRenderizar = (id, restaurar) => {
    const tope = pila[pila.length - 1];
    if (tope && tope.id === id) { tope.restaurar = restaurar; return; }
    const i = pila.findIndex(p => p.id === id);
    if (i >= 0) {
        pila.length = i + 1;          // vuelta a un estado ya visitado (tipo tabs)
        pila[i].restaurar = restaurar;
        return;
    }
    pila.push({ id, restaurar });
    while (pila.length > 8) pila.shift(); // tope de profundidad (si faltara la raíz, volver no actúa)
};

export const reiniciarHistorial = () => { pila.length = 0; };
export const puedeVolver = () => pila.length > 1;

const appRaiz = () => document.getElementById('app');

// Animación de vuelta: sale la pantalla actual, entra la anterior con parallax
const animarVuelta = (restaurar) => {
    const app = appRaiz();
    if (!app) { restaurar(); animandoVuelta = false; return; }
    const ancho = app.clientWidth || window.innerWidth;

    app.style.transition = 'transform .28s cubic-bezier(.32,.72,.34,1)';
    app.style.transform = `translate3d(${ancho}px,0,0)`; // sale hacia la derecha
    setTimeout(() => {
        app.style.transition = 'none';
        app.style.transform = 'translate3d(0,0,0)';
        restaurar(); // acá #app cambia de contenido (estilos en línea sobreviven al innerHTML)
        app.style.transform = 'translate3d(-28%,0,0)'; // la anterior entra desde la izquierda
        app.offsetHeight; // reflow forzado: sin parpadeo
        requestAnimationFrame(() => {
            app.style.transition = 'transform .26s cubic-bezier(.22,.61,.36,1)';
            app.style.transform = 'translate3d(0,0,0)';
            setTimeout(() => {
                app.style.transition = '';
                app.style.transform = '';
                animandoVuelta = false;
            }, 300);
        });
    }, 290);
};

export const volver = () => {
    if (animandoVuelta || pila.length <= 1) return false;
    const saliente = pila.pop();
    const previo = pila[pila.length - 1];
    if (!previo || typeof previo.restaurar !== 'function') { pila.push(saliente); return false; }
    animandoVuelta = true;
    golpe(14); // háptico al confirmar "volver" por gesto
    animarVuelta(() => previo.restaurar());
    return true;
};

// Borde izquierdo → arrastre hacia la derecha → volver. Se activa una sola vez;
// el listener consultúa la pila en vivo (se llama en cada render de sección).
export const activarSwipeBack = () => {
    if (swipeBackListo) return;
    swipeBackListo = true;

    let pointerId = null, x0 = 0, y0 = 0;
    let arrastrando = false, comprometido = false, miGesto = false;
    let muestras = [], quitarVentana = null, guardatouch = null;
    let app = null;

    const soltarGuardas = () => {
        if (quitarVentana) { quitarVentana(); quitarVentana = null; }
        if (guardatouch) { document.removeEventListener('touchmove', guardatouch); guardatouch = null; }
    };
    const terminar = () => {
        soltarGuardas();
        if (miGesto) { marcarGesto(false); miGesto = false; }
        arrastrando = false; comprometido = false; pointerId = null; muestras = [];
    };

    const volverALugar = () => {
        if (!app) { terminar(); return; }
        app.style.transition = 'transform .3s cubic-bezier(.22,.61,.36,1)';
        app.style.transform = 'translate3d(0,0,0)';
        const fin = () => {
            if (arrastrando || animandoVuelta) return;
            app.removeEventListener('transitionend', fin);
            app.style.transition = '';
            app.style.transform = '';
        };
        app.addEventListener('transitionend', fin);
        setTimeout(fin, 340);
        terminar();
    };

    const onDown = (e) => {
        if (arrastrando || animandoVuelta || hayGestoActivo()) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (hayModalAbierto()) return;   // con un sheet abierto, el borde no hace nada
        if (pila.length <= 1) return;    // pantalla raíz: no hay dónde volver
        if (e.clientX > ZONA_BORDE) return; // sólo desde el borde izquierdo
        app = appRaiz();
        if (!app) return;

        pointerId = e.pointerId; x0 = e.clientX; y0 = e.clientY;
        arrastrando = true; comprometido = false;
        muestras = [{ t: performance.now(), x: e.clientX }];

        const mover = (ev) => { if (ev.pointerId === pointerId) onMove(ev); };
        const soltar = (ev) => {
            if (ev.pointerId !== pointerId) return;
            if (ev.type === 'pointercancel') { if (comprometido) volverALugar(); else terminar(); }
            else onUp(ev);
        };
        quitarVentana = () => {
            window.removeEventListener('pointermove', mover);
            window.removeEventListener('pointerup', soltar);
            window.removeEventListener('pointercancel', soltar);
        };
        window.addEventListener('pointermove', mover, { passive: false });
        window.addEventListener('pointerup', soltar);
        window.addEventListener('pointercancel', soltar);
    };

    const onMove = (e) => {
        if (!arrastrando) return;
        const dx = e.clientX - x0, dy = e.clientY - y0;

        if (!comprometido) {
            if (hayGestoActivo()) { terminar(); return; }
            if (dx < -UMBRAL_ARRANQUE) { terminar(); return; } // para la izquierda: nada
            if (Math.abs(dy) > UMBRAL_ARRANQUE && Math.abs(dy) > dx * DOMINIO_DIRECCION) {
                terminar(); return; // vertical → lo maneja el scroll de la página
            }
            if (dx > 12 && dx > Math.abs(dy) * DOMINIO_DIRECCION) {
                comprometido = true; miGesto = true; marcarGesto(true);
                guardatouch = (ev) => ev.preventDefault();
                document.addEventListener('touchmove', guardatouch, { passive: false });
                app.style.transition = 'none';
            } else return;
        }

        let d = dx;
        if (d < 0) d *= 0.2; // goma si sigue empujando hacia la izquierda
        app.style.transform = `translate3d(${d}px,0,0)`;
        muestras.push({ t: performance.now(), x: e.clientX });
        if (muestras.length > 6) muestras.shift();
    };

    const onUp = (e) => {
        if (!arrastrando) return;
        if (!comprometido) { terminar(); return; }

        const dx = e.clientX - x0;
        const a = muestras[0] || { t: performance.now(), x: e.clientX };
        const b = muestras[muestras.length - 1] || a;
        const vx = (b.x - a.x) / Math.max(1, b.t - a.t);
        const ancho = (app && app.clientWidth) || window.innerWidth;
        terminar();

        if (dx > ancho * 0.32 || (dx > 30 && vx > 0.55)) {
            if (!volver()) volverALugar(); // sin pila → rebota en su lugar
        } else {
            volverALugar();
        }
    };

    document.addEventListener('pointerdown', onDown);
};

// ── Etapa 3: SWIPEABLE ROW — filas deslizables de lista ──────────────────────
//
// Deslizar una fila hacia la izquierda revela sus acciones (Eliminar, Editar…):
//  - Deslizamiento corto → la fila queda abierta y el usuario toca la acción.
//  - Deslizamiento LARGO (llega al final del panel, con velocidad) → ejecuta la
//    acción principal (alEjecutarLargo) al instante — siempre con "Deshacer".
//  - Tocar la fila abierta la cierra (y se traga ese click para no activarla).
//  - Una sola fila abierta a la vez; tocar fuera la cierra.
//  - touch-action: pan-y en la fila → el scroll vertical sigue siendo del sistema.
let envolturaAbierta = null;
let oyedeExteriorListo = false;

const estaAbierta = (env) => !!env && env.dataset.abierta === '1';

export const cerrarFilaDeslizable = (env) => {
    if (!env || !env._fila) return;
    delete env.dataset.abierta;
    if (envolturaAbierta === env) { envolturaAbierta = null; }
    const f = env._fila;
    f.style.transition = '';
    f.style.transform = ''; // vuelve al origen con la transición del CSS
};

export const hacerFilaDeslizable = (fila, opciones = {}) => {
    if (!fila || !fila.parentNode || fila.dataset.filaGestos === '1') return;
    fila.dataset.filaGestos = '1';
    const acciones = Array.isArray(opciones.acciones) ? opciones.acciones : [];
    const alEjecutarLargo = opciones.alEjecutarLargo || null;

    // Estructura: [panel de acciones DETRÁS] + [fila encima, la que se desliza]
    const envoltura = document.createElement('div');
    envoltura.className = 'swipe-row';
    fila.parentNode.insertBefore(envoltura, fila);
    envoltura.appendChild(fila);
    envoltura._fila = fila;

    const panel = document.createElement('div');
    panel.className = 'swipe-acciones';
    acciones.forEach(acc => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'swipe-accion' + (acc.clase ? ' ' + acc.clase : '');
        b.textContent = acc.etiqueta;
        b.addEventListener('click', (ev) => {
            ev.stopPropagation();
            cerrarFilaDeslizable(envoltura);
            if (acc.alPulsar) acc.alPulsar(fila, envoltura);
        });
        panel.appendChild(b);
    });
    envoltura.insertBefore(panel, fila);

    // Cerrar la fila abierta al tocar fuera (una sola abierta a la vez)
    if (!oyedeExteriorListo) {
        oyedeExteriorListo = true;
        document.addEventListener('pointerdown', (e) => {
            if (envolturaAbierta && !envolturaAbierta.contains(e.target)) cerrarFilaDeslizable(envolturaAbierta);
        }, true);
    }

    const anchoPanel = () => panel.offsetWidth || Math.max(1, acciones.length) * 92;

    let pid = null, x0 = 0, y0 = 0;
    let arrastrando = false, comprometido = false, miGesto = false;
    let muestras = [], quitarVentana = null, guardatouch = null;
    let ancho = 0, ultimoD = 0, tragoClick = false;

    const soltarGuardas = () => {
        if (quitarVentana) { quitarVentana(); quitarVentana = null; }
        if (guardatouch) { envoltura.removeEventListener('touchmove', guardatouch); guardatouch = null; }
    };
    const terminar = () => {
        soltarGuardas();
        if (miGesto) { marcarGesto(false); miGesto = false; }
        arrastrando = false; comprometido = false; pid = null; muestras = [];
    };
    const comerClick = () => { // el click que siguió a un arrastre no activa la fila
        tragoClick = true;
        setTimeout(() => { tragoClick = false; }, 350);
    };

    // Un arrastre (o un toque sobre la fila abierta) traga el click subsiguiente
    envoltura.addEventListener('click', (ev) => {
        if (!tragoClick) return;
        if (panel.contains(ev.target)) return; // los botones de acción nunca se tragan
        ev.stopPropagation();
        ev.preventDefault();
        tragoClick = false;
    }, true);

    const onDown = (e) => {
        if (arrastrando) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        pid = e.pointerId; x0 = e.clientX; y0 = e.clientY;
        arrastrando = true; comprometido = false;
        ultimoD = estaAbierta(envoltura) ? -anchoPanel() : 0;
        muestras = [{ t: performance.now(), x: e.clientX }];

        const mover = (ev) => { if (ev.pointerId === pid) onMove(ev); };
        const soltar = (ev) => {
            if (ev.pointerId !== pid) return;
            if (ev.type === 'pointercancel') { if (comprometido) { snapFinal(); } terminar(); }
            else onUp(ev);
        };
        quitarVentana = () => {
            window.removeEventListener('pointermove', mover);
            window.removeEventListener('pointerup', soltar);
            window.removeEventListener('pointercancel', soltar);
        };
        window.addEventListener('pointermove', mover, { passive: false });
        window.addEventListener('pointerup', soltar);
        window.addEventListener('pointercancel', soltar);
    };

    const onMove = (e) => {
        if (!arrastrando) return;
        const dx = e.clientX - x0, dy = e.clientY - y0;

        if (!comprometido) {
            if (hayGestoActivo()) { terminar(); return; }
            if (Math.abs(dy) > UMBRAL_ARRANQUE && Math.abs(dy) > Math.abs(dx) * DOMINIO_DIRECCION) {
                terminar(); return; // vertical → el scroll es del sistema
            }
            if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * DOMINIO_DIRECCION) {
                comprometido = true; miGesto = true; marcarGesto(true);
                ancho = anchoPanel();
                guardatouch = (ev) => ev.preventDefault();
                envoltura.addEventListener('touchmove', guardatouch, { passive: false });
                fila.style.transition = 'none'; // el dedo manda, sin animación
            } else return;
        }

        const base = estaAbierta(envoltura) ? -ancho : 0;
        let d = base + dx;
        if (d > 0) d *= 0.2;                        // goma hacia la derecha
        const min = -ancho - 60;
        if (d < min) d = min + (d - min) * 0.2;     // goma más allá del panel (largo = ejecutar)
        ultimoD = d;
        fila.style.transform = `translate3d(${d}px,0,0)`;
        muestras.push({ t: performance.now(), x: e.clientX });
        if (muestras.length > 6) muestras.shift();
    };

    // Acomoda la fila en su estado final (abierta o cerrada) con animación
    const snapFinal = (ejecutar = false) => {
        fila.style.transition = '';
        fila.style.transform = ejecutar ? '' : (ultimoD <= -ancho * 0.45 ? `translate3d(${-ancho}px,0,0)` : '');
        if (!ejecutar && ultimoD <= -ancho * 0.45) {
            envoltura.dataset.abierta = '1';
            envolturaAbierta = envoltura;
        } else {
            cerrarFilaDeslizable(envoltura);
        }
    };

    const onUp = (e) => {
        if (!arrastrando) return;

        if (!comprometido) {
            // Toc simple: si estaba abierta → cierra y traga el click (no "usa" la fila)
            const estabaAbierta = estaAbierta(envoltura);
            terminar();
            if (estabaAbierta) { comerClick(); cerrarFilaDeslizable(envoltura); }
            return;
        }

        const a = muestras[0] || { t: performance.now(), x: e.clientX };
        const b = muestras[muestras.length - 1] || a;
        const vx = (b.x - a.x) / Math.max(1, b.t - a.t);
        terminar();
        comerClick(); // cualquier arrastre traga el click que siga

        const rapido = vx < -0.9;
        const llegoAlFinal = ultimoD <= -(ancho + 20) || (ultimoD <= -(ancho * 0.8) && rapido);
        if (alEjecutarLargo && llegoAlFinal) {
            golpe(14); // háptico al ejecutar la acción principal por gesto
            envoltura.classList.add('swipe-ejecutando');
            fila.style.transition = '';
            fila.style.transform = '';
            if (envolturaAbierta === envoltura) { envolturaAbierta = null; }
            delete envoltura.dataset.abierta;
            alEjecutarLargo(fila, envoltura);
            return;
        }
        snapFinal();
    };

    fila.addEventListener('pointerdown', onDown);
};
