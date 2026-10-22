import { db } from '../../firebase-config.js';
import { doc, getDoc, collection, getDocs,serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';
import { calcularPlanNutricional } from '../../utils/nutrition-logic.js';
// Chips de momento del día en "Nueva Ingesta": misma regla de horas que el
// asistente de sugerencias (lógica pura, sin dependencias nuevas)
import { momentoPorHora } from '../../utils/sugerencias-logic.js';
import { iniciarAnalisisComida } from '../../utils/analisis-comida.mjs';
// import { analizarComida, keyManager } from '../../services/ai/gemini.service.js';
import { analizarComida, groqKeyManager
    , analizarReceta
 } from '../../services/ai/groq.service.js';
import { crearRegistroComida, eliminarIngesta, restaurarIngesta, actualizarHidratacion, enriquecerRegistroConMicros
 } from '../../services/db/meal.service.js';
import { recalcularResumenDia } from '../../services/db/resumen-dia.service.js';
import { necesitaRecalculoDia } from '../../services/db/resumen-dia.logic.mjs';
 import { guardarReceta, obtenerRecetas, registrarIngestaDesdeReceta,
    procesarReceta,
    prepararRecetaParaGuardar,
    eliminarReceta,
    restaurarReceta,
    actualizarReceta
 } from '../../services/db/receta.service.js';
 import { obtenerPesoTotalReceta, prepararExtrasParaIngesta,
    calcularIngestaDesdeGramos, construirIngestaCompleta
 } from '../../utils/receta-math.js';
import { buscarProducto, calcularPorcion, guardarProducto
 } from '../../services/product-scanner.service.js';
import { buscarAlimentos, productoDesdeResultado
 } from '../../services/buscar-alimentos.service.js';
import { buscarProductosUsuario, guardarItemsComoProductos, registrarUsoProducto
 } from '../../services/productos-usuario.service.js';
import { renderPerfil } from '../perfil/perfil.view.js';
import { renderSugerencias } from '../sugerencias/sugerencias.view.js';
import { renderDiario } from '../diario/diario.view.js';
import { bottomNavHTML, conectarBottomNav } from '../../components/bottom-nav.js';
import { elegirTema, temaGuardado } from '../../utils/tema.js';
import { hacerDeslizable, alRenderizar, hacerFilaDeslizable } from '../../utils/gestos.js';

// --- ESTADO DE CACHE GLOBAL ---
// Guardamos los datos aquí para no volver a pedirlos a Firebase al cambiar de día
let cacheSemanal = {};
let cacheUserId = null; // Para evitar filtrar datos entre usuarios
let contadorAguaLocal = 0;
// Días con una reparación de totales en curso (evita disparos duplicados).
const recalculosEnCurso = new Set();

// Se llama desde main.js al cambiar/cerrar sesión
export const limpiarCacheDashboard = () => {
    cacheSemanal = {};
    cacheUserId = null;
};

// Invalida un día puntual (lo usan Perfil/Sugerencias tras registrar algo)
export const invalidarCacheDia = (dateKey) => {
    delete cacheSemanal[dateKey];
};

// Lectura de sólo lectura para el Diario: reutiliza las ingestas/resumen ya
// cargados por el dashboard sin volver a pedir comidas a Firestore.
export const obtenerDiaCache = (dateKey) => cacheSemanal[dateKey] || null;

// Escape básico para inyectar texto externo (IA, productos, usuario) en HTML
const esc = (texto) => String(texto ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Nombre visible de una ingesta: la receta muestra SU nombre (no la lista de ingredientes).
// OJO: debe vivir a nivel de MÓDULO — renderDashboard la usa en su primera pasada de render.
const nombreIngesta = (ingesta) => {
    const propio = String(ingesta?.descripcion || ingesta?.descripcion_original || '').trim();
    if (propio) return propio.length > 38 ? propio.substring(0, 38) + '…' : propio;
    if (ingesta?.formato === 'receta') return 'Receta guardada'; // registros viejos sin nombre
    const n = (ingesta?.alimentos || []).map(a => a.alimento).filter(Boolean).join(', ');
    return n.length > 38 ? n.substring(0, 38) + '…' : (n || 'Comida');
};

// --- TOAST UTILITY ---
// Un solo aviso a la vez, arriba de la nav, con icono tintado (sin emojis).
export let toastTimeout = null;
export const mostrarToast = (mensaje, tipo = 'info', duracion = 2600, accion = null) => {
    document.querySelectorAll('.toast-notification').forEach(t => t.remove());
    if (toastTimeout) clearTimeout(toastTimeout);

    const iconos = { success: '✓', error: '✕', warning: '!', info: 'i' };
    const accionHtml = accion
        ? `<button type="button" class="toast-accion">${esc(accion.etiqueta)}</button>`
        : '';

    const toast = document.createElement('div');
    toast.className = `toast-notification ${tipo}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
        <span class="toast-icon" aria-hidden="true">${iconos[tipo] || 'i'}</span>
        <span class="toast-mensaje">${esc(mensaje)}</span>
        ${accionHtml}
        <div class="toast-progress"><div class="toast-progress-bar" style="animation-duration: ${duracion}ms;"></div></div>
    `;
    document.body.appendChild(toast);

    // Forzar reflow y mostrar (entrada con slide suave)
    toast.offsetHeight;
    toast.classList.add('show');

    const barra = toast.querySelector('.toast-progress-bar');
    if (barra) barra.style.animation = `shrink ${duracion}ms linear forwards`;
    toastTimeout = setTimeout(() => cerrarToast(toast), duracion);

    // Acción opcional del aviso (p. ej. "Deshacer" tras borrar por gesto):
    // cierra el toast y ejecuta — el botón de la fila sigue existiendo como alternativa
    if (accion) {
        const btnAccion = toast.querySelector('.toast-accion');
        if (btnAccion) {
            btnAccion.onclick = () => {
                clearTimeout(toastTimeout);
                accion.alPulsar();
                cerrarToast(toast);
            };
        }
    }

    // Cerrar deslizando (celular): swipe horizontal
    let x0 = null;
    toast.addEventListener('touchstart', (e) => {
        x0 = e.touches[0].clientX;
        toast.classList.add('toast-arrastrando');
    }, { passive: true });
    toast.addEventListener('touchmove', (e) => {
        if (x0 === null) return;
        const dx = e.touches[0].clientX - x0;
        toast.style.transform = `translateX(${dx}px)`;
    }, { passive: true });
    toast.addEventListener('touchend', (e) => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0;
        toast.classList.remove('toast-arrastrando');
        if (Math.abs(dx) > 48) {
            clearTimeout(toastTimeout);
            toast.style.transform = `translateX(${dx > 0 ? 140 : -140}px)`;
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 200);
        } else {
            toast.style.transform = ''; // vuelve a su lugar
        }
        x0 = null;
    }, { passive: true });
};
const cerrarToast = (toast) => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
};

// Errores crudos (Firebase, red, IA) → mensajes cortos y claros
export const textoError = (error, fallback) => {
    const cod = String(error?.code || '');
    const msg = String(error?.message || '');
    if (cod === 'permission-denied' || /permission denied/i.test(msg)) return 'No tenés permiso para esta acción';
    if (cod === 'unavailable' || /network|failed to fetch|load failed/i.test(msg)) return 'Sin conexión — probá de nuevo';
    if (cod === 'resource-exhausted' || /\b429\b|quota/i.test(msg)) return 'Demasiados pedidos — esperá un minuto';
    if (cod === 'deadline-exceeded' || /timeout|aborted/i.test(msg)) return 'Tardó demasiado — probá de nuevo';
    if (/email-already-in-use|already been registered/i.test(msg)) return 'Ese email ya está registrado';
    if (/weak-password/i.test(msg)) return 'La contraseña necesita al menos 6 caracteres';
    if (/invalid-email|malformed-email/i.test(msg)) return 'El email no es válido';
    if (/invalid-credential|wrong-password|invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos';
    if (/too-many-requests/i.test(msg)) return 'Demasiados intentos — esperá un minuto';
    if (cod) return fallback;                                              // Firebase poco común
    if (msg && msg.length < 100 && !/^Firebase:/i.test(msg)) return msg;   // error propio, ya en castellano
    return fallback;
};

// Modal propio para pedir gramos (nunca prompt() del navegador)
// valorInicial: p. ej. la porción de la etiqueta del producto (OFF la trae).
// porcionG: si existe, se ofrece el chip "1 porción (X g)" (si no, 100 g).
export const pedirGramos = (titulo, valorInicial = 100, porcionG = null) => new Promise(resolve => {
    const valor = Number(valorInicial) > 0 ? Number(valorInicial) : 100;
    const porcion = Number(porcionG) > 0 ? Number(porcionG) : null;
    const porcionTexto = porcion ? String(Math.round(porcion * 10) / 10) : '';
    document.querySelectorAll('.toast-notification').forEach(t => t.remove()); // nada tapa el modal
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    overlay.innerHTML = `
        <div class="modal-content" style="width: 88%; max-width: 340px;">
            <h3 style="margin: 0 0 2px; font-size: 1.05rem;">¿Cuántos gramos comiste?</h3>
            <p style="margin: 0 0 12px; font-size: 0.82rem; color: var(--coipo-text-muted);">${esc(titulo)}</p>
            ${porcion ? `<button type="button" class="porcion-chip${valor === porcion ? ' active' : ''}" id="pedir-gramos-porcion">1 porción (${esc(porcionTexto)} g)</button>` : ''}
            <input type="number" id="pedir-gramos-input" inputmode="decimal" min="1" step="1" value="${esc(String(valor))}"
                style="width: 100%; box-sizing: border-box; padding: 12px; font-size: 1.25rem; text-align: center;
                       font-weight: 700; border: 1px solid var(--coipo-surface); border-radius: 12px;
                       background: var(--coipo-bg); color: var(--coipo-text);">
            <div style="display: flex; gap: 10px; margin-top: 14px;">
                <button class="btn-secondary" id="pedir-gramos-cancel" style="flex: 1;">Cancelar</button>
                <button class="btn-primary" id="pedir-gramos-ok" style="flex: 2;">Registrar</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#pedir-gramos-input');
    setTimeout(() => { input.focus(); input.select(); }, 120);

    // Chip "1 porción (X g)": completa el input con la porción de OFF.
    const chipPorcion = overlay.querySelector('#pedir-gramos-porcion');
    if (chipPorcion) {
        chipPorcion.onclick = () => {
            input.value = porcionTexto;
            chipPorcion.classList.add('active');
            input.focus();
            input.select();
        };
        input.addEventListener('input', () => {
            const actual = parseFloat(String(input.value).replace(',', '.'));
            chipPorcion.classList.toggle('active', actual === porcion);
        });
    }

    const cerrar = (valor) => { overlay.remove(); resolve(valor); };
    overlay.querySelector('#pedir-gramos-ok').onclick = () => {
        const g = parseFloat(String(input.value).replace(',', '.'));
        cerrar(g > 0 ? g : null);
    };
    overlay.querySelector('#pedir-gramos-cancel').onclick = () => cerrar(null);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(null); });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') overlay.querySelector('#pedir-gramos-ok').click();
    });

    // Gestos: arrastrar hacia abajo cierra; avisa si cambió el valor de gramos
    hacerDeslizable(overlay, {
        cerrar: () => cerrar(null),
        sucio: () => {
            const v = String(input.value).trim();
            return v !== '' && v !== String(valor); // el valor inicial: nada escrito
        },
    });
});

// --- LOADING: spinner en botones (IA / DB) ---
// ponerCargando devuelve un updater para cambiar el texto sin perder el spinner.
export const ponerCargando = (btn, texto = 'Procesando...') => {
    if (!btn) return () => {};
    if (!btn.dataset.labelOriginal) btn.dataset.labelOriginal = btn.innerText;
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span><span class="btn-cargando-texto">${esc(texto)}</span>`;
    return (nuevoTexto) => {
        const span = btn.querySelector('.btn-cargando-texto');
        if (span) span.textContent = nuevoTexto;
    };
};
export const quitarCargando = (btn) => {
    if (!btn) return;
    btn.disabled = false;
    if (btn.dataset.labelOriginal !== undefined) {
        btn.innerText = btn.dataset.labelOriginal;
        delete btn.dataset.labelOriginal;
    }
};

// --- UTILIDADES ---
// 1. Corregimos getISO para que no dependa del horario UTC del sistema
const getISO = (fecha) => {
    // Esto crea un string YYYY-MM-DD basado en la hora LOCAL del usuario
    // evitando que el UTC desplace el día
    const d = new Date(fecha);
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000))
        .toISOString()
        .split('T')[0];
};

// 2. Ajustamos obtenerLunes para que trabaje correctamente
const obtenerLunes = (fecha) => {
    const d = new Date(fecha);
    d.setHours(12, 0, 0, 0); // Limpiamos horas
    const day = d.getDay();
    // Ajuste para que Lunes sea el día 1
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
};

// --- FUNCIÓN DE CARGA MASIVA ---
const cargarSemanaEnCache = async (userId, fechaReferencia) => {
    const lunes = obtenerLunes(fechaReferencia);
    const promesas = [];

    for (let i = 0; i < 7; i++) {
        const dia = new Date(lunes);
        dia.setDate(lunes.getDate() + i);
        const dateKey = getISO(dia);

        // Solo cargamos si no está ya en el cache
        if (!cacheSemanal[dateKey]) {
            promesas.push((async () => {
                const docRef = doc(db, 'usuarios', userId, 'resumen_diario', dateKey);
                const colRef = collection(db, 'usuarios', userId, 'ingestas_diarias', dateKey, 'comidas');
                
                const [resSnap, mealsSnap] = await Promise.all([getDoc(docRef), getDocs(colRef)]);
                
                cacheSemanal[dateKey] = {
                    resumen: resSnap.exists() ? resSnap.data() : { 
                        acumulado_calorias: 0, acumulado_proteinas: 0, acumulado_carbohidratos: 0, 
                        acumulado_grasas: 0, acumulado_fibra: 0, vasos_agua: 0 
                    },
                    ingestas: mealsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                };
            })());
        }
    }
    await Promise.all(promesas);
};

// --- FUNCIÓN PRINCIPAL ---
// --- GESTOS (etapa 1): swipe-down para cerrar cada modal/sheet ---
// Se llama en cada render: re-registra los closures frescos; el adjuntado
// de eventos es idempotente (dataset.gestosListo) — nunca se apilan listeners.
const activarGestosDeModales = () => {
    const registrar = (sel, ops) => {
        const el = document.querySelector(sel);
        if (el) hacerDeslizable(el, ops);
    };

    // Nueva Ingesta (hoja completa: buscar producto → receta → IA) — sucio si
    // dejó texto en la descripción O una consulta de búsqueda a medio camino
    registrar('#modal-registro', {
        cerrar: '#cerrar-ingesta',
        sucio: () => ((document.getElementById('texto-comida')?.value || '').trim() !== '' ||
                      (document.getElementById('buscar-alimento-input')?.value || '').trim() !== ''),
    });

    // Confirmación de borrado — cancelar es la opción segura: nunca pide descartar
    registrar('#modal-confirm', { cerrar: '#cancelar-borrado' });

    // Escáner: la cámara no arrastra; sí el encabezado y el pie
    registrar('#modal-scanner', { cerrar: '#cerrar-scanner', bloquearSel: '#reader-wrapper' });

    // Nueva Receta: formulario (vista 1) o previsualización sin guardar (vista 2)
    registrar('#modal-receta', {
        cerrar: '#cancelar-receta',
        sucio: () => ((document.getElementById('texto-receta')?.value || '').trim() !== '' ||
                      (document.getElementById('nombre-receta')?.value || '').trim() !== ''),
    });

    // Selector de Mis Recetas — sólo lectura, cierra limpio
    registrar('#modal-select-receta', { cerrar: '#cancelar-select-receta' });

    // Detalle de receta — si está abierto el sub-confirm de eliminación,
    // el arrastre primero cancela ESE (nunca borra por gesto sin su confirmación)
    registrar('#modal-detalle-receta', {
        cerrar: () => {
            const conf = document.getElementById('detalle-confirmar-eliminar');
            const enConfirmacion = conf && conf.style.display && conf.style.display !== 'none';
            const btn = document.getElementById(enConfirmacion ? 'cancelar-eliminar-receta' : 'cerrar-detalle-receta');
            if (btn) btn.click();
        },
    });

    // Gramos consumidos — sucio si escribió gramos o extras
    registrar('#modal-porciones-receta', {
        cerrar: '#cancelar-porciones',
        sucio: () => ((document.getElementById('input-gramos-receta')?.value || '').trim() !== '' ||
                      (document.getElementById('extras-receta')?.value || '').trim() !== ''),
    });
};

export const renderDashboard = async (container, userData, fechaParaMostrar = new Date(), opciones = {}) => {
    const userId = userData.uid;
    const idHistorial = opciones.idHistorial || 'hoy';
    const volverARender = (fecha = fechaParaMostrar) =>
        renderDashboard(container, userData, fecha, opciones);

    // Gestos (etapa 1): arrastrar hacia abajo cierra cada modal/sheet
    activarGestosDeModales();

    // Gestos (etapa 2): esta pantalla queda en la pila → el arrastre desde el
    // borde izquierdo vuelve a la anterior (y actualiza el "restaurar" si es
    // el mismo id: cambio de día, re-render tras registrar/borrar).
    // Cuando el día se abre desde el Diario, se usa un id propio para que el
    // gesto de volver restaure el Diario (con la misma semana) en vez de Hoy.
    alRenderizar(idHistorial, () => renderDashboard(container, userData, fechaParaMostrar, opciones));

    // Tema elegido en otro dispositivo (si acá nunca se eligió uno, manda el sistema)
    try { if (userData.tema && !temaGuardado()) elegirTema(userData.tema); } catch (e) { /* sin tema en la nube */ }
    const dateKey = getISO(fechaParaMostrar);

    // Si cambió el usuario, descartamos todo el cache (evita ver datos de otro usuario)
    if (cacheUserId !== userId) {
        cacheSemanal = {};
        cacheUserId = userId;
    }

    // 1. CARGA INTELIGENTE: Si no tenemos el día en cache, cargamos toda la semana
    if (!cacheSemanal[dateKey]) {
        // Opcional: mostrar un mini loader aquí
        await cargarSemanaEnCache(userId, fechaParaMostrar);
    }

    // Extraemos los datos del cache
    const { resumen, ingestas } = cacheSemanal[dateKey];
    console.log(ingestas.sort((a, b) => (a.creado_el?.seconds || 0) - (b.creado_el?.seconds || 0)))
    contadorAguaLocal = resumen.vasos_agua || 0;

    // ── DATOS CONOCIDOS vs. DESCONOCIDOS ──────────────────────────────────
    // Los productos de OFF pueden venir sin fibra/sodio/micros: se guardan
    // como null ("sin dato"), no como 0. La UI muestra "—" y los totales no
    // suman 0 por un valor desconocido.
    // Día sin comidas: el consumo 0 es un dato conocido (no "sin datos").
    // Se recalcula al borrar (optimista) y en el render inicial.
    const calcularDatosConocidos = () => {
        const hayMicro = (campoTotal, campoItem) => ingestas.length === 0 || ingestas.some(i =>
            typeof (i.resumen_micros || {})[campoTotal] === 'number' ||
            (i.alimentos || []).some(a => typeof (a || {})[campoItem] === 'number'));
        return {
            fibra: ingestas.length === 0 ||
                ingestas.some(i => typeof (i.resumen_macros || {}).total_fibra === 'number'),
            micros: {
                sodio: hayMicro('total_sodio_mg', 'sodio_mg'),
                potasio: hayMicro('total_potasio_mg', 'potasio_mg'),
                magnesio: hayMicro('total_magnesio_mg', 'magnesio_mg'),
                calcio: hayMicro('total_calcio_mg', 'calcio_mg'),
                hierro: hayMicro('total_hierro_mg', 'hierro_mg'),
                vitaminaD: hayMicro('total_vitamina_d_ui', 'vitamina_d_ui'),
                omega3: ingestas.length === 0 || ingestas.some(i =>
                    typeof i.resumen_micros?.total_omega3?.ala_mg === 'number' ||
                    (i.alimentos || []).some(a => typeof a.omega3?.ala_mg === 'number'))
            }
        };
    };
    const { fibra: hayDatosFibra, micros: microsConDatos } = calcularDatosConocidos();
    // "—" cuando no hay dato; el valor formateado si lo hay.
    const valorConDatos = (valor, hayDato, decimales = 0, sufijo = '') =>
        hayDato ? `${(Number(valor) || 0).toFixed(decimales)}${sufijo}` : '—';
    const plan = userData.plan_nutricional || calcularPlanNutricional(userData);
    console.log(resumen)
    console.log(plan)
    const kcalConsumidas = resumen.acumulado_calorias || 0;
    const porcentaje = Math.min((kcalConsumidas / plan.kcal) * 100, 100);
    const totalVasosMeta = Math.round(plan.agua / 250);

    // ── ACTUALIZACIÓN OPTIMISTA ──
    // Borrar una ingesta no recarga el dashboard: se descuenta del objeto resumen
    // y se refrescan los números del DOM al instante (estilo Gmail/WhatsApp).
    const restarDelResumen = (ingesta) => {
        const m = ingesta.resumen_macros || {};
        const mi = ingesta.resumen_micros || {};
        const restar = (acum, val) => Math.max(0, (Number(acum) || 0) - (Number(val) || 0));
        resumen.acumulado_calorias = restar(resumen.acumulado_calorias, m.total_calorias);
        resumen.acumulado_proteinas = restar(resumen.acumulado_proteinas, m.total_proteinas);
        resumen.acumulado_carbohidratos = restar(resumen.acumulado_carbohidratos, m.total_carbohidratos);
        resumen.acumulado_grasas = restar(resumen.acumulado_grasas, m.total_grasas);
        resumen.acumulado_fibra = restar(resumen.acumulado_fibra, m.total_fibra);
        resumen.acumulado_sodio_mg = restar(resumen.acumulado_sodio_mg, mi.total_sodio_mg);
        resumen.acumulado_potasio_mg = restar(resumen.acumulado_potasio_mg, mi.total_potasio_mg);
        resumen.acumulado_magnesio_mg = restar(resumen.acumulado_magnesio_mg, mi.total_magnesio_mg);
        resumen.acumulado_calcio_mg = restar(resumen.acumulado_calcio_mg, mi.total_calcio_mg);
        resumen.acumulado_hierro_mg = restar(resumen.acumulado_hierro_mg, mi.total_hierro_mg);
        resumen.acumulado_vitamina_d_ui = restar(resumen.acumulado_vitamina_d_ui, mi.total_vitamina_d_ui);
        resumen.acumulado_omega3_ala_mg = restar(resumen.acumulado_omega3_ala_mg, mi.total_omega3?.ala_mg);
    };

    const actualizarResumenDOM = () => {
        // Al borrar una ingesta, "conocido" puede cambiar (p. ej. queda solo
        // un producto sin fibra): recalcular antes de pintar.
        const conocidos = calcularDatosConocidos();
        const kcal = Number(resumen.acumulado_calorias) || 0;
        const vKcal = container.querySelector('.main-kcal .value');
        if (vKcal) vKcal.textContent = Math.round(plan.kcal - kcal);
        const vCons = container.querySelector('.secondary-stats .consumed-color');
        if (vCons) vCons.textContent = Math.round(kcal);
        const barra = container.querySelector('.timeline-progress');
        if (barra) barra.style.width = `${Math.min((kcal / plan.kcal) * 100, 100)}%`;

        // Macros — orden del template: Proteínas, Carbos, Grasas, Fibra
        [
            ['acumulado_proteinas', 'proteina'],
            ['acumulado_carbohidratos', 'carbos'],
            ['acumulado_grasas', 'grasas'],
            ['acumulado_fibra', 'fibra']
        ].forEach(([kAcum, kMeta], i) => {
            const card = container.querySelectorAll('.macros-grid .macro-card')[i];
            if (!card) return;
            const conocido = kAcum !== 'acumulado_fibra' || conocidos.fibra;
            const acum = Number(resumen[kAcum]) || 0;
            const meta = Number(plan[kMeta]) || 1;
            const pct = Math.round((acum / meta) * 100);
            const vals = card.querySelector('.macro-values');
            if (vals) vals.textContent = `${conocido ? acum.toFixed(0) : '—'} / ${meta}g`;
            const fill = card.querySelector('.progress-fill');
            if (fill) fill.style.width = conocido ? `${Math.min(pct, 100)}%` : '0%';
            const pctEl = card.querySelector('.progress-percent');
            if (pctEl) pctEl.textContent = conocido ? `${pct}%` : '—';
        });

        // Micros — orden del template: sodio, potasio, magnesio, calcio, hierro, vit D, omega-3
        [
            ['acumulado_sodio_mg', 'sodio', 0, 'mg', conocidos.micros.sodio],
            ['acumulado_potasio_mg', 'potasio', 0, ' mg', conocidos.micros.potasio],
            ['acumulado_magnesio_mg', 'magnesio', 0, ' mg', conocidos.micros.magnesio],
            ['acumulado_calcio_mg', 'calcio', 0, ' mg', conocidos.micros.calcio],
            ['acumulado_hierro_mg', 'hierro', 1, ' mg', conocidos.micros.hierro],
            ['acumulado_vitamina_d_ui', 'vitaminaD', 0, ' UI', conocidos.micros.vitaminaD],
            ['acumulado_omega3_ala_mg', 'omega3_ala', 0, 'mg', conocidos.micros.omega3]
        ].forEach(([kAcum, kMeta, dec, sufijo, conocido], i) => {
            const stat = container.querySelectorAll('.micros-grid .micro-stat')[i];
            if (!stat) return;
            const acum = Number(resumen[kAcum]) || 0;
            const meta = Number(plan[kMeta]) || 1;
            const vals = stat.querySelector('.micro-value');
            if (vals) vals.textContent = `${conocido ? acum.toFixed(dec) : '—'} / ${meta}${sufijo}`;
            const fill = stat.querySelector('.micro-fill');
            if (fill) fill.style.width = conocido ? `${Math.min((acum / meta) * 100, 100)}%` : '0%';
        });
    };

    // ── AUTO-REPARACIÓN DEL RESUMEN ──
    // Usa las comidas YA cargadas en caché (cero lecturas extra). Solo escribe
    // en Firestore cuando hace falta reparar. Si hay escrituras recientes
    // pendientes (micros_completos === false y creada hace <2 min), se saltea:
    // el resumen todavía puede estar a mitad de camino. Se reintenta al
    // reabrir el día.
    const repararResumenSiHaceFalta = () => {
        if (!necesitaRecalculoDia(ingestas, resumen)) return;
        if (recalculosEnCurso.has(dateKey)) return;

        recalculosEnCurso.add(dateKey);
        recalcularResumenDia(userId, dateKey, { ingestas })
            .then(({ resumen: corregido, corregido: huboCambio }) => {
                Object.assign(resumen, corregido);
                const diaActivo = document.querySelector('.day-item.active')?.dataset.date;
                if (diaActivo === dateKey) {
                    actualizarResumenDOM();
                    if (huboCambio) mostrarToast('Ajustamos los totales del día', 'info', 2200);
                }
            })
            .catch(e => console.warn('⚠️ No se pudo recalcular el día:', e))
            .finally(() => recalculosEnCurso.delete(dateKey));
    };
    repararResumenSiHaceFalta();

    // 2. RENDERIZADO DEL HTML
    container.innerHTML = `
        <div class="dashboard-layout fade-in">
            <header class="dash-header">
                <div class="header-titles">
                    <p class="date-text">${fechaParaMostrar.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).toUpperCase()}</p>
                </div>
                <div class="dash-header-actions">
                    <details class="day-menu" id="menu-dia">
                        <summary class="day-menu-trigger" aria-label="Opciones del día" title="Opciones del día">
                            <span aria-hidden="true">⋯</span>
                        </summary>
                        <div class="day-menu-panel">
                            <button type="button" class="day-menu-item" id="recalcular-dia">Recalcular día</button>
                        </div>
                    </details>
                    <div class="profile-avatar" id="avatar-perfil" title="Mi perfil" style="cursor: pointer;"><i class="icon-user"></i></div>
                </div>
            </header>

            ${generarHTMLCalendario(fechaParaMostrar)}

            <div class="content-scrollable">
                ${userData.lesiones ? `
                <div class="alert-pill">
                    <span class="pulse-dot"></span>
                    <p>Cuidado hoy con: <b>${esc(userData.lesiones)}</b></p>
                </div>` : ''}

                <section class="energy-timeline-section">
                    <div class="timeline-header">
                        <div class="main-kcal">
                            <span class="value">${Math.round(plan.kcal - kcalConsumidas, 0)}</span>
                            <span class="label">kcal restantes</span>
                        </div>
                        <div class="secondary-stats">
                            <span>Meta: <b>${plan.kcal}</b></span>
                            <span>Consumido: <b class="consumed-color">${Math.round(kcalConsumidas)}</b></span>
                        </div>
                    </div>
                    <div class="timeline-bar-bg">
                        <div class="timeline-progress" style="width: ${porcentaje}%"></div>
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
                                <span class="macro-values">${(resumen.acumulado_proteinas || 0).toFixed(0)} / ${plan.proteina}g</span>
                            </div>
                            <div class="progress-bar-container">
                                <div class="progress-fill prot" style="width: ${Math.min((resumen.acumulado_proteinas / plan.proteina) * 100, 100)}%"></div>
                            </div>
                            <div class="progress-percent">${Math.round((resumen.acumulado_proteinas / plan.proteina) * 100)}%</div>
                        </div>

                        <!-- Carbohidratos -->
                        <div class="macro-card">
                            <div class="macro-header">
                                <span class="macro-name">Carbos</span>
                                <span class="macro-values">${(resumen.acumulado_carbohidratos || 0).toFixed(0)} / ${plan.carbos}g</span>
                            </div>
                            <div class="progress-bar-container">
                                <div class="progress-fill carb" style="width: ${Math.min((resumen.acumulado_carbohidratos / plan.carbos) * 100, 100)}%"></div>
                            </div>
                            <div class="progress-percent">${Math.round((resumen.acumulado_carbohidratos / plan.carbos) * 100)}%</div>
                        </div>

                        <!-- Grasas -->
                        <div class="macro-card">
                            <div class="macro-header">
                                <span class="macro-name">Grasas</span>
                                <span class="macro-values">${(resumen.acumulado_grasas || 0).toFixed(0)} / ${plan.grasas}g</span>
                            </div>
                            <div class="progress-bar-container">
                                <div class="progress-fill fat" style="width: ${Math.min((resumen.acumulado_grasas / plan.grasas) * 100, 100)}%"></div>
                            </div>
                            <div class="progress-percent">${Math.round((resumen.acumulado_grasas / plan.grasas) * 100)}%</div>
                        </div>

                        <!-- Fibra -->
                        <div class="macro-card">
                            <div class="macro-header">
                                <span class="macro-name">Fibra</span>
                                <span class="macro-values">${valorConDatos(resumen.acumulado_fibra, hayDatosFibra)} / ${plan.fibra}g</span>
                            </div>
                            <div class="progress-bar-container">
                                <div class="progress-fill fiber" style="width: ${hayDatosFibra ? Math.min(((Number(resumen.acumulado_fibra) || 0) / plan.fibra) * 100, 100) : 0}%"></div>
                            </div>
                            <div class="progress-percent">${hayDatosFibra ? `${Math.round(((Number(resumen.acumulado_fibra) || 0) / plan.fibra) * 100)}%` : '—'}</div>
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
                                    <span class="micro-value">${valorConDatos(resumen.acumulado_sodio_mg, microsConDatos.sodio)} / ${plan.sodio}mg</span>
                                </div>
                                <div class="micro-progress-bg">
                                    <div class="micro-fill warning" style="width: ${microsConDatos.sodio ? Math.min(((Number(resumen.acumulado_sodio_mg) || 0) / plan.sodio) * 100, 100) : 0}%"></div>
                                </div>
                            </div>

                            <!-- Potasio -->
                            <div class="micro-stat">
                                <div class="micro-header-info">
                                    <span class="micro-label">Potasio</span>
                                    <span class="micro-value">${valorConDatos(resumen.acumulado_potasio_mg, microsConDatos.potasio)} / ${plan.potasio} mg</span>
                                </div>
                                <div class="micro-progress-bg">
                                    <div class="micro-fill" style="width: ${microsConDatos.potasio ? Math.min(((Number(resumen.acumulado_potasio_mg) || 0) / plan.potasio) * 100, 100) : 0}%"></div>
                                </div>
                            </div>

                            <!-- Magnesio -->
                            <div class="micro-stat">
                                <div class="micro-header-info">
                                    <span class="micro-label">Magnesio</span>
                                    <span class="micro-value">${valorConDatos(resumen.acumulado_magnesio_mg, microsConDatos.magnesio)} / ${plan.magnesio} mg</span>
                                </div>
                                <div class="micro-progress-bg">
                                    <div class="micro-fill" style="width: ${microsConDatos.magnesio ? Math.min(((Number(resumen.acumulado_magnesio_mg) || 0) / plan.magnesio) * 100, 100) : 0}%"></div>
                                </div>
                            </div>

                            <!-- Calcio -->
                            <div class="micro-stat">
                                <div class="micro-header-info">
                                    <span class="micro-label">Calcio</span>
                                    <span class="micro-value">${valorConDatos(resumen.acumulado_calcio_mg, microsConDatos.calcio)} / ${plan.calcio} mg</span>
                                </div>
                                <div class="micro-progress-bg">
                                    <div class="micro-fill" style="width: ${microsConDatos.calcio ? Math.min(((Number(resumen.acumulado_calcio_mg) || 0) / plan.calcio) * 100, 100) : 0}%"></div>
                                </div>
                            </div>

                            <!-- Hierro -->
                            <div class="micro-stat">
                                <div class="micro-header-info">
                                    <span class="micro-label">Hierro</span>
                                    <span class="micro-value">${valorConDatos(resumen.acumulado_hierro_mg, microsConDatos.hierro, 1)} / ${plan.hierro} mg </span>
                                </div>
                                <div class="micro-progress-bg">
                                    <div class="micro-fill" style="width: ${microsConDatos.hierro ? Math.min(((Number(resumen.acumulado_hierro_mg) || 0) / plan.hierro) * 100, 100) : 0}%"></div>
                                </div>
                            </div>

                            <!-- Vitamina D -->
                            <div class="micro-stat">
                                <div class="micro-header-info">
                                    <span class="micro-label">Vit. D</span>
                                    <span class="micro-value">${valorConDatos(resumen.acumulado_vitamina_d_ui, microsConDatos.vitaminaD)} / ${plan.vitaminaD} UI </span>
                                </div>
                                <div class="micro-progress-bg">
                                    <div class="micro-fill" style="width: ${microsConDatos.vitaminaD ? Math.min(((Number(resumen.acumulado_vitamina_d_ui) || 0) / plan.vitaminaD) * 100, 100) : 0}%"></div>
                                </div>
                            </div>

                            <!-- Omegas (Opcional según tu lógica) -->
                            <div class="micro-stat full-width">
                                <div class="micro-header-info">
                                    <span class="micro-label">Omega-3 (ALA)</span>
                                    <span class="micro-value">${valorConDatos(resumen.acumulado_omega3_ala_mg, microsConDatos.omega3)} / ${plan.omega3_ala || 1600}mg</span>
                                </div>
                                <div class="micro-progress-bg">
                                    <div class="micro-fill omega" style="width: ${microsConDatos.omega3 ? Math.min(((Number(resumen.acumulado_omega3_ala_mg) || 0) / (plan.omega3_ala || 1600)) * 100, 100) : 0}%"></div>
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
                        ${ingestas
                        // 1. Clonamos y ordenamos de más nueva a más vieja
                        .slice() 
                        .sort((a, b) => (a.creado_el?.seconds || 0) - (b.creado_el?.seconds || 0))
                        .map((ingesta, index) => {
                            const macros = ingesta.resumen_macros ?? {};
                            const microsListos = ingesta.micros_completos === true;
                            const m = ingesta.resumen_micros ?? {};

                            // Título: nombre de la receta o lo que escribió el usuario
                            const nombreCorto = nombreIngesta(ingesta);

                            // Detalle por ingrediente: SIEMPRE de MÁS a MENOS calorías
                            const itemsDetalle = [...(ingesta.alimentos || [])]
                                .sort((a, b) => (Number(b.calorias) || 0) - (Number(a.calorias) || 0));

                            const kcal = Math.round(macros.total_calorias || 0);
                            const prot = Number(macros.total_proteinas || 0).toFixed(1);
                            const carb = Number(macros.total_carbohidratos || 0).toFixed(1);
                            const gras = Number(macros.total_grasas || 0).toFixed(1);
                            // null = sin dato en este producto (nunca 0)
                            const fibr = macros.total_fibra == null ? null : Number(macros.total_fibra);

                            const microItems = microsListos ? [
                                m.total_hierro_mg ? { label: 'Fe', val: `${m.total_hierro_mg.toFixed(1)}mg` } : null,
                                m.total_calcio_mg ? { label: 'Ca', val: `${Math.round(m.total_calcio_mg)}mg` } : null,
                                m.total_magnesio_mg ? { label: 'Mg', val: `${Math.round(m.total_magnesio_mg)}mg` } : null,
                                m.total_zinc_mg ? { label: 'Zn', val: `${m.total_zinc_mg.toFixed(1)}mg` } : null,
                                m.total_vitamina_d_ui ? { label: 'Vit.D', val: `${Math.round(m.total_vitamina_d_ui)}UI` } : null,
                                m.total_vitamina_b12_mcg ? { label: 'B12', val: `${m.total_vitamina_b12_mcg.toFixed(1)}mcg` } : null,
                                m.total_omega3?.epa_dha_mg ? { label: 'EPA+DHA', val: `${Math.round(m.total_omega3.epa_dha_mg)}mg`, omega: true } : null,
                                m.total_omega3?.ala_mg ? { label: 'ALA', val: `${Math.round(m.total_omega3.ala_mg)}mg`, omega: true } : null,
                            ].filter(Boolean) : [];

                            return `
                            <div class="meal-card">
                                <div class="meal-card-header">
                                    <div class="meal-index">${index + 1}</div>
                                    <div class="meal-title-block">
                                        <span class="meal-name">${esc(nombreCorto)}</span>
                                        <span class="meal-time">${ingesta.creado_el?.seconds ? new Date(ingesta.creado_el.seconds * 1000).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                    </div>
                                    <div class="meal-kcal-block">
                                        <span class="meal-kcal-num">${kcal}</span>
                                        <span class="meal-kcal-label">kcal</span>
                                    </div>
                                    <button class="meal-delete-btn" data-id="${ingesta.id || index}" title="Eliminar">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                    </button>
                                </div>

                                <div class="meal-macros-row">
                                    <div class="macro-pill prot"><span class="pill-label">Proteína</span><span class="pill-val">${prot}g</span></div>
                                    <div class="macro-pill carb"><span class="pill-label">Carbos</span><span class="pill-val">${carb}g</span></div>
                                    <div class="macro-pill fat"><span class="pill-label">Grasas</span><span class="pill-val">${gras}g</span></div>
                                    <div class="macro-pill fiber"><span class="pill-label">Fibra</span><span class="pill-val">${fibr === null ? '—' : `${fibr.toFixed(1)}g`}</span></div>
                                </div>

                                ${microsListos && microItems.length > 0 ? `
                                    <div class="meal-micros-row">
                                        ${microItems.map(mi => `
                                            <span class="micro-chip ${mi.omega ? 'omega' : ''}">
                                                <span class="micro-chip-label">${mi.label}</span>
                                                <span class="micro-chip-val">${mi.val}</span>
                                            </span>
                                        `).join('')}
                                    </div>
                                ` : !microsListos ? `
                                    <div class="meal-micros-loading">
                                        <span class="loading-dot"></span>
                                        <span class="loading-dot"></span>
                                        <span class="loading-dot"></span>
                                        <span>Calculando micros...</span>
                                    </div>
                                ` : ''}

                                <!-- ACORDEÓN: detalle por ingrediente (oculto hasta tocar) -->
                                <button class="meal-detalle-toggle" type="button" aria-expanded="false">
                                    <span>Detalle (${itemsDetalle.length})</span>
                                    <svg class="meal-detalle-chev" width="14" height="14" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M6 9l6 6 6-6"/>
                                    </svg>
                                </button>
                                <div class="meal-detalle-cuerpo"><div>
                                    <div class="meal-items-list">
                                        ${itemsDetalle.map(item => `
                                            <div class="meal-item-container">
                                                <div class="meal-item-row">
                                                    <span class="meal-item-dot"></span>
                                                    <span class="meal-item-name">${esc(item.alimento)}</span>
                                                    <span class="meal-item-grams">${item.gramos_estimados ? `${item.gramos_estimados}g` : ''}</span>
                                                    <span class="meal-item-kcal">${Math.round(Number(item.calorias) || 0)} kcal</span>
                                                </div>
                                                <div class="meal-item-macros">
                                                    <span class="mi-prot">P ${Number(item.proteinas || 0).toFixed(1)}g</span>
                                                    <span class="mi-carb">C ${Number(item.carbohidratos || 0).toFixed(1)}g</span>
                                                    <span class="mi-fat">G ${Number(item.grasas || 0).toFixed(1)}g</span>
                                                    <span class="mi-fib">F ${item.fibra == null ? '—' : `${Number(item.fibra).toFixed(1)}g`}</span>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div></div>
                            </div>`;
                        }).join('')}

                        <div class="meal-item pending-new" id="boton-registro-texto" style="cursor: pointer;">
                            <div class="meal-badge b-next">${ingestas.length + 1}</div>
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
                                <span class="water-counter hydration-badge"><b id="vasos-tomados">${contadorAguaLocal}</b> / ${totalVasosMeta} vasos</span>
                            </span>
                            <span class="icon-arrow">▾</span>
                        </summary>
                        <div class="micros-content">
                            <div class="glasses-grid" id="glasses-container">
                                ${Array(totalVasosMeta).fill(0).map((_, i) => `
                                    <div class="glass-item ${i < contadorAguaLocal ? 'filled' : ''}" data-index="${i}">
                                        <span class="glass-icon">💧</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </details>
                </section>
            </div>

            ${bottomNavHTML('hoy')}
        </div>
    `;



    // Calendario: Cambio de día instantáneo
    container.querySelectorAll('.day-item').forEach(btn => {
        btn.onclick = () => {
            const nuevaFecha = new Date(btn.dataset.date + 'T12:00:00');
            volverARender(nuevaFecha);
        };
    });

    // Menú del día → "Recalcular día": relee las comidas y reescribe los
    // totales guardados (repara descuadres). Conserva los vasos de agua.
    const btnRecalcularDia = container.querySelector('#recalcular-dia');
    if (btnRecalcularDia) {
        btnRecalcularDia.onclick = async () => {
            const menu = container.querySelector('#menu-dia');
            if (menu) menu.open = false;
            btnRecalcularDia.disabled = true;
            try {
                const { corregido } = await recalcularResumenDia(userId, dateKey);
                delete cacheSemanal[dateKey];
                await volverARender();
                mostrarToast(
                    corregido ? 'Ajustamos los totales del día' : 'Los totales del día ya estaban bien',
                    corregido ? 'info' : 'success',
                    2200,
                );
            } catch (e) {
                console.error('Error al recalcular el día:', e);
                btnRecalcularDia.disabled = false;
                mostrarToast('No se pudo recalcular el día', 'error');
            }
        };
    }

    // Agua: Actualización optimista + Actualización de Cache
    const glasses = container.querySelectorAll('.glass-item');
    const counterDisplay = container.querySelector('#vasos-tomados');
    glasses.forEach((glass) => {
        glass.onclick = async () => {
            const sumando = !glass.classList.contains('filled');
            const cambio = sumando ? 1 : -1;
            if (contadorAguaLocal === 0 && cambio === -1) return;

            // Actualizar UI
            contadorAguaLocal += cambio;
            counterDisplay.innerText = contadorAguaLocal;
            glasses.forEach((g, i) => {
                if (i < contadorAguaLocal) g.classList.add('filled');
                else g.classList.remove('filled');
            });

            // Actualizar Cache para que si vuelve a este día el dato sea correcto
            cacheSemanal[dateKey].resumen.vasos_agua = contadorAguaLocal;

            // Actualizar DB
            try { await actualizarHidratacion(userId, dateKey, cambio); } catch (e) { console.error(e); }
        };
    });

    // ── Sección "Buscar alimento" (vive DENTRO de Nueva Ingesta) ────────────
    const inputBuscar  = document.getElementById('buscar-alimento-input');
    const estadoBuscar = document.getElementById('buscar-alimento-estado');
    const listaBuscar  = document.getElementById('buscar-alimento-resultados');
    const fuenteBuscar = document.getElementById('buscar-alimento-fuente');

    const HINT_BUSQUEDA = 'Escribí al menos 3 letras y tocá «Buscar».';
    const resetearBusqueda = () => {
        if (inputBuscar) inputBuscar.value = '';
        if (listaBuscar) listaBuscar.innerHTML = '';
        if (estadoBuscar) estadoBuscar.innerHTML = HINT_BUSQUEDA;
        if (fuenteBuscar) fuenteBuscar.innerHTML = '';
    };

    // Modales: Registro IA — se abre desde la tarjeta "¿Qué comiste?" O desde el ➕ de la nav
    const modalIA = document.getElementById('modal-registro');

    // ── Pestañas de la hoja (Buscar / Recetas / IA): solo se ve la activa ──
    const panelesIngesta = {
        buscar: document.getElementById('ingesta-panel-buscar'),
        recetas: document.getElementById('ingesta-panel-recetas'),
        ia: document.getElementById('ingesta-panel-ia'),
    };
    const activarTabIngesta = (cual) => {
        Object.entries(panelesIngesta).forEach(([clave, panel]) => {
            if (panel) panel.hidden = clave !== cual;
        });
        document.querySelectorAll('#modal-registro .ingesta-tab').forEach(tab => {
            const activa = tab.dataset.tab === cual;
            tab.classList.toggle('active', activa);
            tab.setAttribute('aria-selected', String(activa));
        });
        if (cual === 'recetas') cargarRecetasEnIngesta();
    };
    document.querySelectorAll('#modal-registro .ingesta-tab').forEach(tab => {
        tab.onclick = () => activarTabIngesta(tab.dataset.tab);
    });

    // ── Chips de momento: preselección por hora local, editable (solo UI) ──
    const contMomentos = document.getElementById('ingesta-momentos');
    if (contMomentos) {
        contMomentos.querySelectorAll('.ingesta-momento').forEach(chip => {
            chip.onclick = () => {
                contMomentos.querySelectorAll('.ingesta-momento').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            };
        });
    }
    const preseleccionarMomento = () => {
        if (!contMomentos) return;
        const sugerido = momentoPorHora(new Date().getHours());
        contMomentos.querySelectorAll('.ingesta-momento').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.momento === sugerido);
        });
    };

    // El CTA de IA arranca DESHABILITADO y se activa con el primer texto
    const textareaIA = document.getElementById('texto-comida');
    const btnAnalizarIA = document.getElementById('confirmar-modal');
    const sincronizarBotonIA = () => {
        if (btnAnalizarIA) btnAnalizarIA.disabled = !(textareaIA?.value || '').trim();
    };
    if (textareaIA) textareaIA.oninput = sincronizarBotonIA;
    sincronizarBotonIA();

    const abrirModalRegistro = () => {
        document.getElementById('texto-comida').value = "";
        sincronizarBotonIA();
        // Cada apertura arranca en la pestaña Buscar, con la búsqueda limpia y
        // el momento del día sugerido por la hora
        resetearBusqueda();
        activarTabIngesta('buscar');
        preseleccionarMomento();
        modalIA.style.display = "flex";
    };
    container.querySelector('#boton-registro-texto').onclick = abrirModalRegistro;

    // Cierre a un toque (✕ de la cabecera)
    const btnCerrarIngesta = document.getElementById('cerrar-ingesta');
    if (btnCerrarIngesta) btnCerrarIngesta.onclick = () => { modalIA.style.display = "none"; };

    document.getElementById('confirmar-modal').onclick = async () => {
        const btn         = document.getElementById('confirmar-modal');
        const descripcion = document.getElementById('texto-comida').value.trim();
        if (!descripcion) {
            // La IA es el ÚLTIMO camino: antes hay producto o receta
            mostrarToast('Escribí qué comiste — o buscá un producto / elegí una receta', 'warning');
            document.getElementById('texto-comida').focus();
            return;
        }

        const setTexto = ponerCargando(btn, 'Analizando...');

        const feedbackInterval = setInterval(() => {
            if (groqKeyManager.allOnCooldown()) {
                const seg = Math.ceil(groqKeyManager.msUntilNextKey() / 1000);
                setTexto(seg > 0 ? `Esperando API (${seg}s)...` : "Reintentando...");
            } else {
                setTexto("Analizando...");
            }
        }, 1000);

        try {
            // `micros` ya viene con su catch adjunto: si `rapido` falla por
            // sesión, no queda una promesa rechazada sin manejar.
            const { rapido, micros } = iniciarAnalisisComida(
                analizarComida,
                descripcion,
                e => console.warn('⚠️ Micros no disponibles:', e.message)
            );
            const datosMacros = await rapido;

            console.log(datosMacros)
            // En tu dashboard, donde procesas el botón de "Guardar":
            const fechaActualSeleccionada = document.querySelector('.day-item.active').dataset.date;

            // Y la llamas así:
            const docId = await crearRegistroComida(userId, datosMacros, fechaActualSeleccionada, descripcion);

            // Tus productos: cada item de esta comida (cargado a mano o
            // estimado con IA) queda en la colección personal del usuario, así
            // la próxima búsqueda por nombre lo encuentra ANTES que OFF
            guardarItemsComoProductos(userId, datosMacros.items)
                .catch(e => console.warn('⚠️ No se guardaron los productos propios:', e));
            
            delete cacheSemanal[dateKey];
            modalIA.style.display = "none";
            volverARender();

            micros
                .then(m => (m ? enriquecerRegistroConMicros(userId, dateKey, docId, m) : null))
                // Si el día se abrió mientras los micros estaban pendientes,
                // la caché quedó con micros_completos=false. Al terminar, se
                // invalida para que la próxima apertura relea y pueda
                // autoevaluar/reparar el resumen.
                .then(() => { delete cacheSemanal[dateKey]; })
                .catch(e => console.warn("⚠️ Micros no disponibles:", e.message));

        } catch (e) {
            console.error("Error al analizar comida:", e);

            const mensaje = String(e?.message || '');
            let msg;
            if (mensaje.startsWith('RATE_LIMIT')) {
                msg = "La IA está al límite — esperá 1 minuto";
            } else if (mensaje === 'TODAS_LAS_KEYS_INVALIDAS') {
                msg = "Error de configuración de API keys";
            } else {
                // Conserva los mensajes de sesión de ia-client.js
                // (SIN_SESION / SESION_INVALIDA) y el resto de errores amables.
                msg = textoError(e, "No se pudo analizar la comida. Intentá de nuevo.");
            }
            mostrarToast(msg, 'error');
        } finally {
            clearInterval(feedbackInterval);
            quitarCargando(btn);
        }
    };

    // ── Búsqueda de alimento (Tus productos + Open Food Facts) ──────────────
    // Sección 1️⃣ de la hoja "Nueva Ingesta": las coincidencias salen ahí
    // mismo, en un div con scroll propio. El USUARIO dispara la búsqueda
    // (botón «Buscar» o Enter): mientras escribe NO se pega ningún pedido a
    // Open Food Facts. Al elegir un resultado: pedirGramos (modal propio) →
    // regla de tres local (calcularPorcion, misma lógica que el escáner) →
    // crearRegistroComida.
    if (inputBuscar) {
        let peticion = 0;      // turno: descarta respuestas viejas si el usuario repite o sigue tipeando
        let buscando = null;   // consulta en vuelo (evita el doble disparo del mismo Enter/click)

        // Cerrar = volver a la hoja completa (la búsqueda vive dentro)
        const cerrarIngesta = () => { modalIA.style.display = 'none'; };

        const accionesSinResultados = (consulta) => `
            <div class="off-sin-resultados">No encontramos «<b>${esc(consulta)}</b>»</div>
            ${atajosRegistrar()}`;

        // Atajos siempre disponibles cuando NO hay nada que mostrar: la
        // alternativa es describirlo con IA o cargarlo a mano
        const atajosRegistrar = () => `
            <div class="off-acciones">
                <button type="button" class="btn-primary" data-accion="ia">🧠 Describir con IA</button>
                <button type="button" class="btn-secondary" data-accion="manual">✏️ Cargar manual</button>
            </div>`;

        // Los atajos NO registran solos: llevan a la pestaña IA de la MISMA
        // hoja. "Describir" precarga la consulta; "manual" deja el textarea
        // limpio para que escriba lo suyo.
        const enfocarIA = (consulta) => {
            const textarea = document.getElementById('texto-comida');
            if (!textarea) return;
            if (typeof consulta === 'string') textarea.value = consulta;
            sincronizarBotonIA();
            activarTabIngesta('ia');
            setTimeout(() => textarea.focus({ preventScroll: true }), 60);
        };

        const engancharAtajos = (consulta) => {
            estadoBuscar.querySelector('[data-accion="ia"]')
                ?.addEventListener('click', () => enfocarIA(consulta));
            estadoBuscar.querySelector('[data-accion="manual"]')
                ?.addEventListener('click', () => enfocarIA(null)); // que escriba lo suyo
        };

        const elegirAlimento = async (item) => {
            if (!item) return;
            const propio = item.fuente === 'propio';
            const etiqueta = item.marca ? `${item.nombre} (${item.marca})` : item.nombre;
            const origen = propio ? 'Tus productos' : 'Open Food Facts';

            // Sugerimos la porción de la etiqueta si la trae (si no, 100 g)
            const porcionG = Number(item.porcion_g) > 0 ? Number(item.porcion_g) : null;
            const gramos = await pedirGramos(etiqueta, porcionG || 100, porcionG);
            if (!gramos) return; // cancelado: sin toast, sin ruido

            const producto = productoDesdeResultado(item);
            const porcion = calcularPorcion(producto, gramos); // regla de tres, local, sin IA
            if (!porcion) {
                mostrarToast('No se pudieron calcular los macros del producto', 'error');
                return;
            }

            try {
                const fechaSeleccionada = document.querySelector('.day-item.active')?.dataset.date || dateKey;
                const docId = await crearRegistroComida(userId, { items: [porcion] }, fechaSeleccionada,
                    `${gramos} g de ${etiqueta} (${origen})`);

                // Micros que trajo OFF (sodio y otros): se guardan sin IA. Los
                // que falten quedan null y no suman al día. Marca la ingesta
                // como completa para que no quede "calculando micros" siempre.
                await enriquecerRegistroConMicros(userId, fechaSeleccionada, docId, { items_micros: [porcion] });

                // Producto propio: sube en las próximas búsquedas por cuánto se usa
                if (propio) registrarUsoProducto(userId, item.nombre, item.marca).catch(() => {});

                delete cacheSemanal[fechaSeleccionada];
                cerrarIngesta();
                await volverARender();
                mostrarToast(`${gramos} g de "${item.nombre}" registrados`, 'success');
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            } catch (e) {
                console.error('Error registrando alimento buscado:', e);
                mostrarToast('No se pudo registrar — probá de nuevo', 'error');
            }
        };

        // UI de la lista: 6 filas y un «Ver más». El listado se colapsa solo
        // cuando cambia la consulta, así no hay estado que resetear a mano.
        const RESULTADOS_VISIBLES = 6;
        let consultaExpandida = null;

        // Miniatura de 40 px: la foto del producto o un ícono de comida
        const miniatura = (item) => item.imagen
            ? `<img src="${esc(item.imagen)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`
            : '<span class="off-fila-icono" aria-hidden="true">🍽️</span>';

        const filaResultado = (item, indice) => {
            // "Sin marca" no aporta nada: el subtítulo del grupo ya dice de
            // dónde viene el producto
            const marca = (item.marca || '').trim();
            const conMarca = marca && marca !== 'Sin marca';
            return `
                <button type="button" class="off-fila" data-indice="${indice}" role="option">
                    ${miniatura(item)}
                    <span class="off-fila-texto">
                        <span class="off-fila-nombre">${esc(item.nombre)}</span>
                        ${conMarca ? `<span class="off-fila-marca">${esc(marca)}</span>` : ''}
                    </span>
                    <span class="off-fila-kcal">${Math.round(Number(item.kcal100) || 0)} kcal/100 g</span>
                    <span class="off-fila-chevron" aria-hidden="true">›</span>
                </button>`;
        };

        const pintarResultados = (resultados, consulta) => {
            // Agrupados por fuente: primero lo propio, después Open Food Facts.
            // Un grupo vacío no se muestra (y su subtítulo tampoco).
            const grupos = [
                { titulo: 'TUS PRODUCTOS', items: resultados.filter(r => r.fuente === 'propio') },
                { titulo: 'OPEN FOOD FACTS', items: resultados.filter(r => r.fuente !== 'propio') },
            ].filter(g => g.items.length);

            const total = grupos.reduce((n, g) => n + g.items.length, 0);
            const expandida = consultaExpandida === consulta;
            let restantes = expandida ? total : RESULTADOS_VISIBLES;

            listaBuscar.innerHTML = grupos.map(grupo => {
                const visibles = grupo.items.slice(0, Math.max(restantes, 0));
                restantes -= visibles.length;
                const filas = visibles
                    .map(item => filaResultado(item, resultados.indexOf(item))).join('');
                return `<div class="off-grupo">${grupo.titulo}</div>${filas}`;
            }).join('');

            estadoBuscar.innerHTML = `
                <div>${total} resultado${total === 1 ? '' : 's'} — tocá uno para registrar</div>`;
            if (fuenteBuscar) fuenteBuscar.innerHTML = pieDeFuente(resultados);

            listaBuscar.querySelectorAll('.off-fila').forEach(btn => {
                btn.onclick = () => elegirAlimento(resultados[Number(btn.dataset.indice)]);
            });

            // «Ver más»: aparece solo si quedaron filas fuera de las 6 visibles
            const btnMas = document.getElementById('buscar-alimento-ver-mas');
            const ocultos = Math.max(total - (expandida ? total : RESULTADOS_VISIBLES), 0);
            if (btnMas) {
                btnMas.hidden = ocultos === 0;
                btnMas.textContent = ocultos > 0 ? `Ver más (${ocultos})` : 'Ver más';
                btnMas.onclick = () => {
                    consultaExpandida = consulta;
                    pintarResultados(resultados, consulta);
                };
            }
        };

        // Crédito de los datos: "Tus productos" y/o "Datos de Open Food Facts"
        // (con link) según de dónde salga cada resultado de la lista
        const pieDeFuente = (resultados) => {
            const hayPropios = resultados.some(r => r.fuente === 'propio');
            const hayOFF = resultados.some(r => r.fuente !== 'propio');
            if (!hayPropios && !hayOFF) return '';

            const partes = [];
            if (hayPropios) partes.push('<span>Tus productos cargados</span>');
            if (hayOFF) {
                partes.push('<span>Datos de <a href="https://openfoodfacts.org" target="_blank" '
                    + 'rel="noopener noreferrer">Open Food Facts</a></span>');
            }
            return `<div class="off-fuente">${partes.join('<span class="off-fuente-sep">·</span>')}</div>`;
        };

        const ejecutarBusqueda = async (consulta, turno) => {
            // 1️⃣ Tus productos (Firestore del usuario): se buscan PRIMERO
            const propios = await buscarProductosUsuario(userId, consulta);
            if (turno !== peticion) return; // el usuario siguió escribiendo: basura vieja

            // 2️⃣ Open Food Facts (search-a-licious con respaldo de search.pl)
            const r = await buscarAlimentos(consulta);
            if (turno !== peticion) return;

            const combinados = [...propios, ...(r.resultados || [])].slice(0, 15);
            if (combinados.length) {
                pintarResultados(combinados, consulta);
                return;
            }

            // Nada que mostrar: se ofrecen las alternativas (IA / manual)
            listaBuscar.innerHTML = '';
            if (fuenteBuscar) fuenteBuscar.innerHTML = '';
            if (r.estado === 'error') {
                estadoBuscar.innerHTML = `
                    <div>${esc(r.mensaje || 'No se pudo buscar. Probá de nuevo.')}</div>
                    ${atajosRegistrar()}`;
            } else {
                estadoBuscar.innerHTML = accionesSinResultados(consulta);
            }
            engancharAtajos(consulta);
        };

        // Disparo EXPLÍCITO: botón «Buscar» o Enter en el input. Mientras el
        // usuario escribe NO se pega ningún pedido a Open Food Facts.
        const dispararBusqueda = () => {
            const consulta = inputBuscar.value.trim().replace(/\s+/g, ' ');
            if (consulta.length < 3) {
                listaBuscar.innerHTML = '';
                if (fuenteBuscar) fuenteBuscar.innerHTML = '';
                estadoBuscar.innerHTML = consulta.length ? 'Escribí al menos 3 letras para buscar.' : HINT_BUSQUEDA;
                return;
            }
            if (buscando === consulta) return; // esta misma consulta ya está en vuelo

            buscando = consulta;
            const turno = ++peticion;
            // Spinner NO bloqueante: el input sigue usable mientras carga
            estadoBuscar.innerHTML = '<span class="off-spinner" aria-hidden="true"></span>Buscando...';
            listaBuscar.innerHTML = '';
            if (fuenteBuscar) fuenteBuscar.innerHTML = '';
            ejecutarBusqueda(consulta, turno).finally(() => {
                if (buscando === consulta) buscando = null;
            });
        };

        // Mientras escribe: solo avanza el hint e invalida la respuesta en vuelo
        // (peticion++): los resultados ya no corresponden al texto actual.
        // (Asignación directa, no addEventListener: este input es estático y se
        //  re-renderiza el dashboard a cada rato — con listener se apilarían.)
        inputBuscar.oninput = () => {
            ++peticion;
            const consulta = inputBuscar.value.trim();
            listaBuscar.innerHTML = '';
            if (fuenteBuscar) fuenteBuscar.innerHTML = '';
            estadoBuscar.innerHTML = consulta.length < 3
                ? (consulta.length ? 'Escribí al menos 3 letras para buscar.' : HINT_BUSQUEDA)
                : 'Tocá «Buscar» o apretá Enter.';
        };

        // ✕ de limpiar (vive dentro del input): vacía el campo y dispara el
        // MISMO handler de arriba, que ya invalida los resultados en vuelo y
        // vuelve al hint
        const btnLimpiar = document.getElementById('buscar-alimento-limpiar');
        if (btnLimpiar) {
            btnLimpiar.onclick = () => {
                inputBuscar.value = '';
                inputBuscar.dispatchEvent(new Event('input', { bubbles: true }));
                inputBuscar.focus();
            };
            // La visibilidad la decide el CSS (:placeholder-shown); acá sólo
            // sincronizamos el atributo hidden para los lectores de pantalla
            const oninputPrevia = inputBuscar.oninput;
            inputBuscar.oninput = (e) => {
                if (oninputPrevia) oninputPrevia(e);
                btnLimpiar.hidden = inputBuscar.value.trim() === '';
            };
        }

        // Botón «Buscar» (type=button, no dispara submit): misma búsqueda de
        // siempre. Enter sigue andando por el <form> de alrededor (onsubmit).
        const btnBuscar = document.getElementById('buscar-alimento-boton');
        if (btnBuscar) btnBuscar.onclick = dispararBusqueda;

        const formularioBuscar = document.getElementById('buscar-alimento-form');
        if (formularioBuscar) {
            formularioBuscar.onsubmit = (e) => {
                e.preventDefault();
                dispararBusqueda();
            };
        }
    }

    // ── Pestaña Recetas: Mis Recetas con kcal/porción. Tocar una fila = usarla
    //    (mismo camino que "Usar Receta": va directo al paso de gramos) ──────
    const contRecetasIngesta = document.getElementById('ingesta-recetas-lista');
    const cargarRecetasEnIngesta = async () => {
        if (!contRecetasIngesta) return;
        contRecetasIngesta.innerHTML = [1, 2, 3].map(() => `
            <div class="skeleton-fila">
                <div class="skeleton-linea skeleton-ancho-60"></div>
                <div class="skeleton-linea skeleton-ancho-40"></div>
            </div>`).join('');
        try {
            const recetas = await obtenerRecetas(userId);
            if (!recetas.length) {
                contRecetasIngesta.innerHTML =
                    '<p class="ingesta-vacio">Todavía no tenés recetas guardadas.</p>';
                return;
            }
            const ordenadas = [...recetas].sort((a, b) => kcalTotalesReceta(b) - kcalTotalesReceta(a));
            contRecetasIngesta.innerHTML = ordenadas.map(r => `
                <button type="button" class="ingesta-receta-fila" data-id="${esc(r.id)}">
                    <span class="ingesta-receta-nombre">${esc(r.nombre)}</span>
                    <span class="ingesta-receta-kcal">${Math.round(r.totales_macros_porcion?.calorias || 0)} kcal/porción</span>
                    <span class="off-fila-chevron" aria-hidden="true">›</span>
                </button>`).join('');
            contRecetasIngesta.querySelectorAll('.ingesta-receta-fila').forEach(fila => {
                fila.onclick = () => {
                    const receta = ordenadas.find(r => r.id === fila.dataset.id);
                    if (!receta) return;
                    modalIA.style.display = 'none';
                    abrirModalGramos(receta);   // idéntico a "Usar Receta"
                };
            });
        } catch (e) {
            console.error('Error cargando recetas en Nueva Ingesta:', e);
            contRecetasIngesta.innerHTML =
                '<p class="ingesta-vacio">No se pudieron cargar tus recetas. Probá de nuevo.</p>';
        }
    };

    // "Crear una receta" dentro de la pestaña: mismo formulario de siempre
    const btnNuevaRecetaIngesta = document.getElementById('ingesta-nueva-receta');
    if (btnNuevaRecetaIngesta) {
        btnNuevaRecetaIngesta.onclick = () => {
            modalIA.style.display = 'none';
            const btnCrear = container.querySelector('#btn-registrar-receta');
            if (btnCrear) btnCrear.click(); else abrirSelectorRecetas();
        };
    }

    // Acordeón: mostrar/ocultar el detalle de ingredientes de cada tarjeta
    container.querySelectorAll('.meal-card .meal-detalle-toggle').forEach(btnDetalle => {
        btnDetalle.onclick = () => {
            const card = btnDetalle.closest('.meal-card');
            const abierto = card.classList.toggle('detalle-abierto');
            btnDetalle.setAttribute('aria-expanded', String(abierto));
        };
    });

    // ── Borrado de ingestas: UN solo camino para el botón y para el gesto ────
    // conDeshacer=false (botón): toast de éxito ya, la nube corre en background.
    // conDeshacer=true (gesto): espera la nube y ofrece "Deshacer" unos segundos.
    const ejecutarBorrado = async (ingesta, card, { conDeshacer = false } = {}) => {
        const nombre = nombreIngesta(ingesta);

        // 1️⃣ OPTIMISTA: la tarjeta sale al instante (animación de colapso) y el
        //    resumen del día se descuenta en vivo, sin esperar a la nube
        if (card) {
            // Si la tarjeta está envuelta (.swipe-row), se va la envoltura entera:
            // si no, quedaría suelta la vista del panel de acciones
            const aQuitar = card.closest('.swipe-row') || card;
            card.style.maxHeight = card.offsetHeight + 'px';
            card.classList.add('meal-eliminando');
            setTimeout(() => aQuitar.remove(), 260);
        }
        const idx = ingestas.findIndex(i => i.id === ingesta.id);
        if (idx > -1) ingestas.splice(idx, 1);
        restarDelResumen(ingesta);
        actualizarResumenDOM();

        // Renumerar las tarjetas restantes + badge de "próxima" ingesta
        container.querySelectorAll('.meal-card .meal-index').forEach((el, i) => { el.textContent = i + 1; });
        const badge = container.querySelector('#boton-registro-texto .meal-badge');
        if (badge) badge.textContent = ingestas.length + 1;

        const deshacer = async () => {
            try {
                await restaurarIngesta(userId, dateKey, ingesta);
                delete cacheSemanal[dateKey]; // el re-render descarga todo fresco
                volverARender();
            } catch (e) {
                console.error('Error deshaciendo el borrado:', e);
                mostrarToast('No se pudo deshacer', 'error');
            }
        };

        if (conDeshacer) {
            // 2️⃣ GESTO: sólo se ofrece "Deshacer" cuando la nube confirmó el borrado
            try {
                await eliminarIngesta(userId, dateKey, ingesta);
                delete cacheSemanal[dateKey];
                mostrarToast(`"${nombre}" eliminado`, 'info', 6000, { etiqueta: 'Deshacer', alPulsar: deshacer });
            } catch (e) {
                console.error('Error eliminando ingesta:', e);
                mostrarToast('No se pudo borrar — restaurado', 'error');
                delete cacheSemanal[dateKey]; // cache ya descontado → recargar fresco
                volverARender();
            }
        } else {
            mostrarToast(`"${nombre}" eliminado`, 'success');
            // La DB corre en segundo plano — si falla, se restaura todo con un render fresco
            eliminarIngesta(userId, dateKey, ingesta)
                .then(() => { delete cacheSemanal[dateKey]; })
                .catch(e => {
                    console.error('Error eliminando ingesta:', e);
                    mostrarToast('No se pudo borrar — restaurado', 'error');
                    delete cacheSemanal[dateKey]; // cache ya descontado → recargar fresco
                    volverARender();
                });
        }
    };

    // ── Gesto (etapa 3): deslizar una tarjeta hacia la izquierda revela
    //    "Eliminar"; un deslizamiento largo elimina directo (con "Deshacer") ──
    container.querySelectorAll('.meals-list .meal-card').forEach(card => {
        const borradoPorGesto = () => {
            const ingestaId = card.querySelector('.meal-delete-btn')?.dataset.id;
            const ingesta = ingestas.find(i => i.id === ingestaId);
            if (ingesta) ejecutarBorrado(ingesta, card, { conDeshacer: true });
        };
        hacerFilaDeslizable(card, {
            acciones: [{ etiqueta: 'Eliminar', clase: 'peligro', alPulsar: borradoPorGesto }],
            alEjecutarLargo: borradoPorGesto,
        });
    });

    // Modales: Borrado (el botón de la tarjeta pide confirmación — alternativa visible)
    const modalConfirm = document.getElementById('modal-confirm');
    container.querySelectorAll('.meal-delete-btn').forEach(btn => {
        btn.onclick = () => {
            // 1. Obtenemos el ID único guardado en el atributo data-id del botón
            const ingestaId = btn.dataset.id;
            
            // 2. Buscamos el objeto ingesta real dentro de tu array usando ese ID
            const ingesta = ingestas.find(i => i.id === ingestaId);
            
            // Salvaguarda por si acaso no encuentra el objeto en el array
            if (!ingesta) {
                console.error(`No se encontró la ingesta con ID: ${ingestaId}`);
                return;
            }

            // 3. Seteamos el texto del modal con el nombre correcto (receta → su nombre)
            document.getElementById('confirm-text').innerText = `¿Borrar "${nombreIngesta(ingesta)}"?`;
            modalConfirm.style.display = "flex";

            document.getElementById('confirmar-borrado').onclick = () => {
                modalConfirm.style.display = "none";
                ejecutarBorrado(ingesta, btn.closest('.meal-card'));
            };
        };
    });

    document.getElementById('cancelar-borrado').onclick = () => {
        modalConfirm.style.display = "none";
    };

    // ── Navegación inferior compartida ─────────────────────────────────────
    conectarBottomNav(container, {
        hoy: () => renderDashboard(container, userData, new Date(), { idHistorial: 'hoy' }),
        diario: () => renderDiario(container, userData),
        registrar: abrirModalRegistro,
        sugerencias: () => renderSugerencias(container, userData),
        perfil: () => renderPerfil(container, userData),
    });

    // PERFIL: también desde el avatar del header
    const avatarPerfil = container.querySelector('#avatar-perfil');
    if (avatarPerfil) avatarPerfil.onclick = () => renderPerfil(container, userData);

        // --- LÓGICA DEL ESCÁNER ---
    let html5QrCode = null;

    const detenerScanner = async () => {
        const modal = document.getElementById('modal-scanner');
        if (html5QrCode?.isScanning) {
            try {
                await html5QrCode.stop();
                html5QrCode.clear();
            } catch (e) {
                console.error("Error al limpiar scanner:", e);
            }
        }
        if (modal) modal.style.display = 'none';
    };

    // Asignar evento de cierre (global, no depende del container)
    const cerrarBtn = document.getElementById('cerrar-scanner');
    if (cerrarBtn) cerrarBtn.onclick = detenerScanner;

    const iniciarScanner = (onSuccess) => {
        const modal = document.getElementById('modal-scanner');
        modal.style.display = 'flex';
        
        if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");
        
        html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            async (decodedText) => {
                if (navigator.vibrate) navigator.vibrate(200);
                await detenerScanner();
                onSuccess(decodedText);
            },
            (err) => { /* ignorar errores de lectura continua */ }
        ).catch(err => {
            console.error("Error de cámara:", err);
            mostrarToast('No se pudo abrir la cámara', 'error');
            detenerScanner();
        });
    };

    // Botón: Escanear producto
    const btnEscaner = container.querySelector('#btn-escaner-producto');
    if (btnEscaner) {
        btnEscaner.onclick = () => {
            iniciarScanner(async (codigo) => {
                mostrarToast("Buscando producto...", "info");
                const producto = await buscarProducto(codigo);
                if (!producto) {
                    mostrarToast("Producto no encontrado", "error");
                    return;
                }

                // ✅ Guardar en la base global si viene de Open Food Facts
                if (producto.fuente === 'openfoodfacts') {
                    await guardarProducto(userData.uid, producto);
                    mostrarToast(`"${producto.nombre}" guardado`, "success");
                } else {
                    // Ya existía en nuestra DB, no lo guardamos de nuevo
                    console.log("Producto ya existente, no se guarda duplicado");
                }

                // Preguntar cuánto se comió (modal propio, nunca prompt del navegador)
                const porcionG = Number(producto.porcion_g) > 0 ? Number(producto.porcion_g) : null;
                const gramos = await pedirGramos(producto.nombre, porcionG || 100, porcionG);
                if (!gramos) return; // cancelado: sin toast, sin ruido

                const porcion = calcularPorcion(producto, gramos);
                if (!porcion) {
                    mostrarToast('No se pudieron calcular los macros del producto', 'error');
                    return;
                }

                // Fase 1: macros → Fase 2: micros (vienen de Open Food Facts)
                const docId = await crearRegistroComida(userId, { items: [porcion] }, dateKey, producto.nombre);
                await enriquecerRegistroConMicros(userId, dateKey, docId, { items_micros: [porcion] });

                // Invalidar cache del día activo y refrescar
                delete cacheSemanal[dateKey];
                await volverARender();

                const nombreProducto = producto.nombre?.length > 30
                    ? producto.nombre.substring(0, 27) + '...'
                    : producto.nombre;
                mostrarToast(`${gramos} g de "${nombreProducto}" registrados`, "success");
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            });
        };
    }

// ── Helpers compartidos de UI de recetas (paleta Coipo, SIEMPRE por kcal desc) ──
const kcalIngrediente = (i) =>
    Math.round((i.nutrientes_por_100g?.calorias ?? i.calorias ?? 0) * (i.cantidad_g ?? i.cantidad ?? 0) / 100);

// Macros TOTALES del ingrediente (por_100g × cantidad) — desglose "milimétrico"
const macrosIngrediente = (i) => {
    const p100 = i.nutrientes_por_100g || {};
    const f = (Number(i.cantidad_g ?? i.cantidad) || 0) / 100;
    const r1 = v => Math.round((Number(v) || 0) * f * 10) / 10;
    return { p: r1(p100.proteinas), c: r1(p100.carbohidratos), g: r1(p100.grasas), fib: r1(p100.fibra) };
};

// Chips de metadatos uniformes (filtra vacíos)
const htmlChipsReceta = (chips) => (chips || []).filter(Boolean)
    .map(c => `<span class="receta-chip">${esc(c)}</span>`).join('');

// Meta de la receta en FILAS APILADAS (label a la izquierda, valor a la derecha).
// Legible en celular: nada de datos uno al lado del otro.
const htmlMetaReceta = (filas) => {
    const items = (filas || []).filter(f => f && f.valor !== null && f.valor !== undefined && f.valor !== '');
    if (!items.length) return '';
    return `<div class="receta-meta-lista">` + items.map(f =>
        `<div class="receta-meta-fila"><span>${esc(f.label)}</span><b>${esc(String(f.valor))}</b></div>`
    ).join('') + `</div>`;
};

// Lista de ingredientes — BLOQUES APILADOS (nombre + kcal arriba, datos debajo).
// SIEMPRE ordenada de MÁS a MENOS calorías.
const htmlIngredientesReceta = (ings) => {
    if (!ings?.length) {
        return '<p style="color:var(--coipo-text-muted); font-size:0.85rem; margin:10px 4px;">Sin ingredientes registrados</p>';
    }
    const bloques = ings.map(i => {
        const g = i.cantidad_g ?? i.cantidad ?? 0;
        const kcal = kcalIngrediente(i);
        const fuente = i.fuente === 'openfoodfacts' ? 'datos reales'
            : (i.fuente === 'ia_estimado' ? 'estimado por IA'
                : (i.fuente === 'base_propia' ? 'base propia' : ''));
        const m = macrosIngrediente(i);
        const marca = i.marca ? `<span class="receta-ing-marca">${esc(i.marca)}</span>` : '';
        const meta = [marca ? `${marca} ` : '', `${g} g`, fuente].filter(Boolean).join(' · ');
        const tieneMacros = (m.p + m.c + m.g + m.fib) > 0;
        return `
        <div class="receta-ing-bloque">
            <div class="receta-ing-bloque-head">
                <span class="receta-ing-bloque-nombre">${esc(i.nombre || '')}</span>
                <span class="receta-ing-bloque-kcal">${kcal > 0 ? `${kcal} kcal` : '—'}</span>
            </div>
            <div class="receta-ing-bloque-meta">${meta}</div>
            ${tieneMacros ? `<div class="receta-ing-bloque-macros">P ${m.p} g · C ${m.c} g · G ${m.g} g${m.fib > 0 ? ` · F ${m.fib} g` : ''}</div>` : ''}
        </div>`;
    });
    // Orden descendente por calorías del ingrediente
    const orden = ings.map((i, idx) => ({ idx, kcal: kcalIngrediente(i) }))
        .sort((a, b) => b.kcal - a.kcal);
    return orden.map(o => bloques[o.idx]).join('');
};

// Tarjetas uniformes: Receta completa vs Por 100 g
const htmlTarjetasMacros = (completa, por100, labelCompleta = 'Receta completa') => {
    const campos = [
        ['calorias', 'Calorías', 'kcal'],
        ['proteinas', 'Proteínas', 'g'],
        ['carbohidratos', 'Carbohidratos', 'g'],
        ['grasas', 'Grasas', 'g'],
        ['fibra', 'Fibra', 'g']
    ];
    const fmt = (v, k) => k === 'calorias' ? Math.round(v || 0) : Math.round((v || 0) * 10) / 10;
    const lineas = (obj) => campos.map(([k, label, unidad]) =>
        `<div class="receta-macro-linea"><span>${label}</span><span><b>${fmt(obj?.[k], k)}</b> ${unidad}</span></div>`
    ).join('');
    return `
        <div class="receta-cards">
            <div class="receta-card">
                <div class="receta-card-titulo">${esc(labelCompleta)}</div>
                ${lineas(completa)}
            </div>
            <div class="receta-card receta-card-acento">
                <div class="receta-card-titulo">Por 100 g</div>
                ${lineas(por100)}
            </div>
        </div>`;
};

const modalReceta = document.getElementById('modal-receta');
const recetaFormVista = document.getElementById('receta-form');
const recetaPreviewVista = document.getElementById('receta-preview');
let recetaParaGuardar = null; // payload calculado, pendiente de confirmación del usuario
let recetaEditando = null;    // receta que se está EDITANDO (obj con id) — null = creación nueva

const verFormularioReceta = () => {
    recetaPreviewVista.style.display = 'none';
    recetaFormVista.style.display = 'block';
};

const btnNuevaReceta = container.querySelector('#btn-registrar-receta');
if (btnNuevaReceta) {
    btnNuevaReceta.onclick = () => {
        recetaEditando = null; // modo creación
        document.getElementById('receta-form-titulo').textContent = 'Crear Nueva Receta';
        document.getElementById('receta-form-hint').textContent =
            'Pegá o escribí la receta con todos sus ingredientes y cantidades. La IA calcula los macros y te los muestra antes de guardar.';
        document.getElementById('texto-receta').value = '';
        document.getElementById('nombre-receta').value = '';
        recetaParaGuardar = null;
        verFormularioReceta();
        modalReceta.style.display = 'flex';
    };
}

document.getElementById('cancelar-receta').onclick = () => {
    modalReceta.style.display = 'none';
    if (recetaEditando) {
        // Se venía de EDITAR → volver al detalle de esa receta
        const receta = recetaEditando;
        recetaEditando = null;
        recetaParaGuardar = null;
        abrirDetalleReceta(receta);
    }
};

// Vista previa uniforme: descripción + ingredientes por kcal + tarjetas completa/100g + avisos
const mostrarPreviewReceta = (payload, fallidos) => {
    document.getElementById('preview-nombre').textContent = payload.nombre;

    // Metadatos en FILAS apiladas (peso, rendimiento, porción) — legible en celular
    document.getElementById('preview-meta').innerHTML = htmlMetaReceta([
        { label: 'Peso total', valor: `${Math.round(payload.peso_total_g)} g` },
        { label: 'Rinde', valor: `${payload.porciones_totales} porciones` },
        { label: 'Peso por porción', valor: `${payload.peso_por_porcion_g} g` },
        { label: 'Kcal por porción', valor: `${Math.round(payload.totales_macros_porcion.calorias)} kcal` }
    ]);

    // Descripción que escribió el usuario (texto pegado)
    const descEl = document.getElementById('preview-desc');
    if (payload.descripcion) {
        descEl.textContent = payload.descripcion;
        descEl.style.display = 'block';
    } else {
        descEl.style.display = 'none';
    }

    // Ingredientes — ordenados de más a menos calorías
    document.getElementById('preview-ingredientes').innerHTML = htmlIngredientesReceta(payload.ingredientes);

    // Tarjetas: receta completa vs por 100 g
    document.getElementById('preview-tarjetas').innerHTML = htmlTarjetasMacros(
        payload.totales_macros_completa,
        payload.valores_por_100g,
        `Receta completa (${Math.round(payload.peso_total_g)}g)`
    );

    // Avisos de ingredientes no calculados
    const avisosEl = document.getElementById('preview-avisos');
    avisosEl.innerHTML = fallidos?.length
        ? `<div class="receta-aviso">⚠️ No se pudieron calcular: ${esc(fallidos.map(i => `${i.nombre} (${i.razon})`).join(', '))}</div>`
        : '';

    // Acción principal según modo: crear vs. guardar cambios de una edición
    document.getElementById('guardar-receta').innerText =
        recetaEditando ? 'Guardar cambios' : 'Guardar receta';

    recetaFormVista.style.display = 'none';
    recetaPreviewVista.style.display = 'block';
};

// PASO 1 — Calcular: extracción IA → nutrientes → vista previa (NO guarda todavía)
document.getElementById('confirmar-receta').onclick = async () => {
    const btn = document.getElementById('confirmar-receta');
    const descripcion = document.getElementById('texto-receta').value.trim();
    if (!descripcion) return;

    ponerCargando(btn, 'Calculando macros (IA + OFF)...');

    try {
        // Solo 2 inputs en el formulario: texto + nombre.
        // Nueva receta → 4 porciones; al EDITAR se conservan las originales.
        let nombreReceta = document.getElementById('nombre-receta').value.trim();
        const porciones = recetaEditando
            ? Math.max(1, Number(recetaEditando.porciones_totales) || 4)
            : 4;

        // 1️⃣ Extraer ingredientes con IA
        const datosExtraidos = await analizarReceta(descripcion);
        if (!datosExtraidos?.ingredientes?.length) {
            throw new Error('No se pudieron extraer ingredientes');
        }
        if (!nombreReceta) {
            nombreReceta = String(datosExtraidos.nombre_receta || '').trim() || 'Mi receta';
        }

        // 2️⃣ Convertir a gramos + nutrientes (OFF con similitud, fallback IA si OFF no tiene)
        const recetaProcesada = await procesarReceta(datosExtraidos);

        // 3️⃣ Payload canónico (completa + porción + micros + peso + por 100g) → vista previa
        recetaParaGuardar = prepararRecetaParaGuardar(recetaProcesada, descripcion, nombreReceta, porciones);
        mostrarPreviewReceta(recetaParaGuardar, recetaProcesada.ingredientesFallidos);

    } catch (e) {
        console.error(e);
        mostrarToast(textoError(e, 'No pude analizar la receta'), 'error');
    } finally {
        quitarCargando(btn);
    }
};

// Volver a editar la descripción (se descarta lo calculado)
document.getElementById('volver-receta').onclick = () => {
    recetaParaGuardar = null;
    verFormularioReceta();
};

// PASO 2 — Guardar receta tras confirmar la vista previa (crear o actualizar)
document.getElementById('guardar-receta').onclick = async () => {
    if (!recetaParaGuardar) { verFormularioReceta(); return; }
    const btn = document.getElementById('guardar-receta');
    const payload = recetaParaGuardar;
    const editando = recetaEditando; // capturar antes de limpiar el estado

    ponerCargando(btn, editando ? 'Guardando cambios...' : 'Guardando...');
    try {
        if (editando) {
            // ✏️ EDICIÓN: recálculo completo → se sobrescriben los campos del mismo doc
            await actualizarReceta(userId, editando.id, payload);
            const actualizada = { id: editando.id, ...payload };

            recetaEditando = null;
            recetaParaGuardar = null;
            modalReceta.style.display = 'none';
            verFormularioReceta();
            mostrarToast(`Receta "${payload.nombre}" actualizada`, 'success');

            // Refrescar la lista "Mis Recetas" (error de refresco no invalida la edición)
            try { await renderListaRecetas(); }
            catch (eLista) { console.warn('No se pudo refrescar la lista:', eLista); }

            // Reabrir el DETALLE con los valores recién recalculados
            abrirDetalleReceta(actualizada);
            return;
        }

        // ➕ CREACIÓN
        await guardarReceta(userId, payload);
        mostrarToast(`Receta "${payload.nombre}" guardada`, 'success');
        modalReceta.style.display = 'none';
        document.getElementById('texto-receta').value = '';
        document.getElementById('nombre-receta').value = '';
        recetaParaGuardar = null;
        verFormularioReceta();

        // Invalidar cache de recetas si existía
        if (window.recetasCache) delete window.recetasCache;
    } catch (e) {
        console.error(e);
        mostrarToast(textoError(e, editando ? 'No se pudieron guardar los cambios' : 'No se pudo guardar la receta'), 'error');
    } finally {
        quitarCargando(btn);
    }
};





// --- FLUJO: USAR RECETA GUARDADA (lista → detalle/eliminar → gramos → registrar) ---
const modalSelectReceta = document.getElementById('modal-select-receta');
const modalPorcionesReceta = document.getElementById('modal-porciones-receta');
const modalDetalleReceta = document.getElementById('modal-detalle-receta');
let recetaSeleccionada = null;
let recetaEnDetalle = null;
// Extras ya analizados para la receta abierta (texto + datos) — evita repetir llamadas a la IA
let extrasCalculados = null; // { texto, datos: {items, macros, micros, con_micros} }

// ── CÁLCULO EN VIVO ─────────────────────────────────────────────
// Regla de 3 instantánea mientras el usuario escribe los gramos.
// Usa EXACTAMENTE la misma función que "Registrar" → lo que se ve es lo que se guarda.
const renderCalculoVivo = () => {
    const cont = document.getElementById('calculo-vivo');
    const gramos = parseFloat(document.getElementById('input-gramos-receta').value) || 0;

    if (!recetaSeleccionada || gramos <= 0 || obtenerPesoTotalReceta(recetaSeleccionada) <= 0) {
        cont.style.display = 'none';
        return;
    }

    let soloReceta, total;
    try {
        soloReceta = calcularIngestaDesdeGramos(recetaSeleccionada, gramos);
        total = construirIngestaCompleta(recetaSeleccionada, gramos, extrasCalculados?.datos || null);
    } catch (e) {
        cont.style.display = 'none';
        return;
    }

    const m = total.macros;
    const r1 = v => Math.round((v || 0) * 10) / 10;
    const hayExtras = !!(extrasCalculados?.datos?.items?.length);

    // Micros del TOTAL (solo los que aportan > 0)
    const mi = total.micros || {};
    const microsChips = [
        ['total_sodio_mg', 'mg sodio', 0],
        ['total_potasio_mg', 'mg potasio', 0],
        ['total_magnesio_mg', 'mg magnesio', 0],
        ['total_calcio_mg', 'mg calcio', 0],
        ['total_hierro_mg', 'mg hierro', 1],
        ['total_zinc_mg', 'mg zinc', 1],
        ['total_vitamina_d_ui', 'UI vit D', 0],
        ['total_vitamina_b12_mcg', 'µg B12', 1]
    ].filter(([k]) => (Number(mi[k]) || 0) > 0.05)
        .map(([k, suf, dec]) => `<span class="receta-chip">${dec ? r1(mi[k]) : Math.round(mi[k])} ${suf}</span>`);
    if ((Number(mi.total_omega3?.ala_mg) || 0) > 0.05) {
        microsChips.push(`<span class="receta-chip">${Math.round(mi.total_omega3.ala_mg)}mg Ω3</span>`);
    }

    const desglose = hayExtras ? `
        <div class="receta-vivo-desglose">
            <span>Receta ${gramos}g: <b>${r1(soloReceta.macros.total_calorias)} kcal</b></span>
            <span>Extras: <b>${r1(extrasCalculados.datos.macros?.total_calorias || 0)} kcal</b></span>
        </div>` : '';

    // Porción respecto de la receta completa: "400 g ≈ 23,6% de 1.694 g"
    const porcPct = soloReceta.factor * 100;
    const porcChip = porcPct > 0.05
        ? `<span class="receta-chip">≈ ${(Math.round(porcPct * 10) / 10)}% de ${Math.round(soloReceta.peso_total_g)}g</span>`
        : '';

    // Tu porción DESGLOSADA ingrediente por ingrediente (cada uno × factor)
    const filasPorcion = total.alimentos
        .filter(a => a.es_ingrediente_receta)
        .map(a => `
            <div class="receta-vivo-ing">
                <span class="receta-vivo-ing-nombre" title="${esc(a.alimento)}">${esc(a.alimento)}${a.marca ? ` <i class="receta-ing-marca">${esc(a.marca)}</i>` : ''}</span>
                <span class="receta-vivo-ing-g">${r1(a.gramos_estimados)}g</span>
                <span class="receta-vivo-ing-kcal">${Math.round(a.calorias)} kcal</span>
            </div>`).join('');

    cont.innerHTML = `
        <div class="receta-vivo-head">
            <span class="receta-vivo-label">${gramos}g de receta${hayExtras ? ' + extras' : ''}</span>
            ${porcChip}${hayExtras ? '<span class="receta-chip receta-chip-acento">con extras</span>' : ''}
        </div>
        <div class="receta-vivo-kcal"><b>${Math.round(m.total_calorias)}</b><small>kcal</small></div>
        <div class="receta-vivo-macros">
            <span>Proteínas <b>${r1(m.total_proteinas)}g</b></span>
            <span>Carbos <b>${r1(m.total_carbohidratos)}g</b></span>
            <span>Grasas <b>${r1(m.total_grasas)}g</b></span>
            <span>Fibra <b>${r1(m.total_fibra)}g</b></span>
        </div>
        ${microsChips.length ? `<div class="receta-chips">${microsChips.join('')}</div>` : ''}
        ${filasPorcion ? `
        <details class="receta-acordeon">
            <summary class="receta-acordeon-resumen">
                <span>Tu porción, ingrediente por ingrediente</span>
                <span class="receta-acordeon-icono">▾</span>
            </summary>
            <div class="receta-vivo-ing-lista">${filasPorcion}</div>
        </details>` : ''}
        ${desglose}
    `;
    cont.style.display = 'block';
};

// Eventos del modal de gramos (registrados una vez)
document.getElementById('input-gramos-receta').oninput = renderCalculoVivo;

// Si edita el texto de los extras, el análisis guardado queda viejo → se limpia
document.getElementById('extras-receta').oninput = () => {
    const texto = document.getElementById('extras-receta').value.trim();
    if (extrasCalculados && texto !== extrasCalculados.texto) {
        extrasCalculados = null;
        renderCalculoVivo();
    }
};

// 🔍 Botón: analizar los extras con la IA y SUMARLOS al total en vivo
document.getElementById('calcular-extras-btn').onclick = async () => {
    const texto = document.getElementById('extras-receta').value.trim();
    if (!texto) {
        mostrarToast('Escribí los extras (ej: 2 claras de huevo)', 'warning');
        return;
    }
    if (extrasCalculados && extrasCalculados.texto === texto) {
        mostrarToast('Esos extras ya están calculados', 'success');
        return;
    }

    const btnE = document.getElementById('calcular-extras-btn');
    ponerCargando(btnE, 'Analizando extras...');
    try {
        const { rapido, micros } = iniciarAnalisisComida(
            analizarComida,
            texto,
            e => console.warn('Micros de extras no disponibles:', e.message)
        );
        const datosExtras = await rapido;
        const microsExtras = await micros;
        extrasCalculados = { texto, datos: prepararExtrasParaIngesta(datosExtras, microsExtras) };
        renderCalculoVivo();
        mostrarToast(`Extras: +${Math.round(extrasCalculados.datos.macros.total_calorias)} kcal al total`, 'success');
    } catch (e) {
        console.error('Error analizando extras:', e);
        extrasCalculados = null;
        renderCalculoVivo();
        mostrarToast(textoError(e, 'No se pudieron analizar los extras'), 'error');
    } finally {
        quitarCargando(btnE);
    }
};

// Abrir modal de GRAMOS (referencia por 100 g + cálculo EN VIVO, sin prefill)
const abrirModalGramos = (receta) => {
    recetaSeleccionada = receta;
    modalSelectReceta.style.display = 'none';
    extrasCalculados = null;

    // Chips de referencia: macros POR 100 g — lo relevante para extrapolár a cualquier gramo
    const pesoReceta = obtenerPesoTotalReceta(receta);
    const p100 = receta.valores_por_100g ??
        (pesoReceta > 0 && receta.totales_macros_completa
            ? Object.fromEntries(['calorias', 'proteinas', 'carbohidratos', 'grasas']
                .map(k => [k, (Number(receta.totales_macros_completa[k]) || 0) / pesoReceta * 100]))
            : null);
    const r1 = v => Math.round((v || 0) * 10) / 10;
    const infoPartes = p100 && Number(p100.calorias) > 0 ? [
        `${Math.round(p100.calorias)} kcal`,
        `${r1(p100.proteinas)}g P`,
        `${r1(p100.carbohidratos)}g C`,
        `${r1(p100.grasas)}g G`
    ] : [];

    document.getElementById('receta-nombre-porciones').textContent = receta.nombre;
    const infoEl = document.getElementById('receta-info-gramos');
    infoEl.innerHTML = infoPartes.length
        ? `<span class="receta-chip receta-chip-acento">Por 100 g</span>` + htmlChipsReceta(infoPartes)
        : '';
    infoEl.style.display = infoPartes.length ? '' : 'none';

    // Sin prefill engañoso: el usuario escribe los gramos y el total se ve EN VIVO
    document.getElementById('input-gramos-receta').value = '';
    document.getElementById('extras-receta').value = '';
    renderCalculoVivo(); // queda oculto hasta que haya gramos
    modalPorcionesReceta.style.display = 'flex';
};

// HTML del DETALLE de una receta (uniforme con la paleta, tolerante a recetas viejas)
const htmlDetalleReceta = (r) => {
    const peso = obtenerPesoTotalReceta(r);
    const porciones = Number(r.porciones_totales) || 1;
    const gPorcion = r.peso_por_porcion_g > 0 ? r.peso_por_porcion_g
        : (peso > 0 ? Math.round((peso / porciones) * 100) / 100 : 0);

    // Totales completos (fallback: porción × porciones)
    const completa = r.totales_macros_completa ??
        (r.totales_macros_porcion
            ? Object.fromEntries(Object.entries(r.totales_macros_porcion).map(([k, v]) => [k, (v || 0) * porciones]))
            : {});
    // Por 100g (guardado, o derivado de los totales)
    const por100 = r.valores_por_100g ??
        (peso > 0
            ? Object.fromEntries(Object.entries(completa).map(([k, v]) => [k, Math.round(((v || 0) / peso) * 100 * 100) / 100]))
            : {});

    const kcalPorcion = completa.calorias ? Math.round(completa.calorias / porciones) : 0;
    const metaHtml = htmlMetaReceta([
        { label: 'Peso total', valor: peso > 0 ? `${Math.round(peso)} g` : null },
        { label: 'Rinde', valor: `${porciones} porciones` },
        { label: 'Peso por porción', valor: gPorcion > 0 ? `${gPorcion} g` : null },
        { label: 'Kcal por porción', valor: kcalPorcion > 0 ? `${kcalPorcion} kcal` : null },
        { label: 'Kcal totales', valor: completa.calorias ? `${Math.round(completa.calorias)} kcal` : null }
    ]);

    // Micros por porción (solo los que aportan > 0)
    const micros = r.totales_micros_porcion || r.totales_micros || null;
    const microsChips = htmlChipsReceta(micros ? [
        micros.sodio_mg > 0 ? `${Math.round(micros.sodio_mg)}mg sodio` : '',
        micros.potasio_mg > 0 ? `${Math.round(micros.potasio_mg)}mg potasio` : '',
        micros.magnesio_mg > 0 ? `${Math.round(micros.magnesio_mg)}mg magnesio` : '',
        micros.calcio_mg > 0 ? `${Math.round(micros.calcio_mg)}mg calcio` : '',
        micros.hierro_mg > 0 ? `${Math.round(micros.hierro_mg * 10) / 10}mg hierro` : '',
        micros.zinc_mg > 0 ? `${Math.round(micros.zinc_mg * 10) / 10}mg zinc` : '',
        micros.omega3_ala_mg > 0 ? `${Math.round(micros.omega3_ala_mg)}mg Ω3 (ALA)` : ''
    ] : []);

    return `
        <h3>${esc(r.nombre)}</h3>
        ${metaHtml}
        ${r.descripcion ? `
        <details class="receta-acordeon">
            <summary class="receta-acordeon-resumen">
                <span>Descripción</span>
                <span class="receta-acordeon-icono">▾</span>
            </summary>
            <div class="receta-desc">${esc(r.descripcion)}</div>
        </details>` : ''}

        <div class="receta-seccion">Ingredientes · de más a menos calorías</div>
        <div class="receta-ing">
            ${htmlIngredientesReceta(r.ingredientes)}
        </div>

        <div class="receta-seccion">Macros</div>
        ${htmlTarjetasMacros(completa, por100, peso > 0 ? `Receta completa (${Math.round(peso)}g)` : 'Receta completa')}

        ${microsChips ? `
        <div class="receta-seccion">Micros por porción</div>
        <div class="receta-chips">${microsChips}</div>` : ''}
    `;
};

// Abrir el DETALLE de una receta (desde el ojito de la lista)
const abrirDetalleReceta = (receta) => {
    recetaEnDetalle = receta;
    document.getElementById('detalle-receta-contenido').innerHTML = htmlDetalleReceta(receta);
    // Volver a la vista de acciones (por si quedó visible el confirm de eliminar)
    document.getElementById('detalle-acciones').style.display = '';
    document.getElementById('detalle-confirmar-eliminar').style.display = 'none';
    modalDetalleReceta.style.display = 'flex';
};

// kcal totales de una receta (completa; fallback porción × porciones en recetas viejas)
const kcalTotalesReceta = (r) => Math.round(
    r.totales_macros_completa?.calorias ||
    (r.totales_macros_porcion?.calorias || 0) * (Number(r.porciones_totales) || 1) || 0);

// Lista de recetas — SIEMPRE de más a menos calorías (se re-renderiza tras eliminar)
const renderListaRecetas = async () => {
    const contenedor = document.getElementById('lista-recetas-container');
    const recetas = await obtenerRecetas(userId);

    if (recetas.length === 0) {
        contenedor.innerHTML = '<p style="color: var(--coipo-text-muted); text-align: center; padding: 24px 0;">Todavía no tenés recetas. Creá una con "Nueva Receta".</p>';
        return;
    }

    const ordenadas = [...recetas].sort((a, b) => kcalTotalesReceta(b) - kcalTotalesReceta(a));

    contenedor.innerHTML = ordenadas.map(r => {
        const peso = obtenerPesoTotalReceta(r);
        const pesoTxt = peso > 0 ? `${Math.round(peso)}g · ` : '';
        return `
        <div class="receta-fila" data-id="${r.id}">
            <div class="receta-fila-info">
                <strong>${esc(r.nombre)}</strong>
                <span>${pesoTxt}${r.porciones_totales || '?'} porciones · ${Math.round(r.totales_macros_porcion?.calorias || 0)} kcal/porción · ${kcalTotalesReceta(r)} kcal total</span>
            </div>
            <button class="receta-icon-btn receta-detalle-btn" data-id="${r.id}" title="Ver detalle" aria-label="Ver detalle">👁️</button>
            <button class="receta-icon-btn receta-icon-btn-eliminar receta-delete-btn" data-id="${r.id}" title="Eliminar receta" aria-label="Eliminar receta">🗑️</button>
        </div>
    `;
    }).join('');

    // Fila completa = usar la receta (va directo a los gramos)
    contenedor.querySelectorAll('.receta-fila').forEach(fila => {
        fila.onclick = () => {
            const receta = ordenadas.find(r => r.id === fila.dataset.id);
            if (receta) abrirModalGramos(receta);
        };
    });

    // 👁️ = detalle (no selecciona para usar)
    contenedor.querySelectorAll('.receta-detalle-btn').forEach(btnOjo => {
        btnOjo.onclick = (ev) => {
            ev.stopPropagation();
            const receta = ordenadas.find(r => r.id === btnOjo.dataset.id);
            if (receta) abrirDetalleReceta(receta);
        };
    });

    // 🗑️ = eliminar directo desde la lista (abre el detalle ya en el paso de confirmación)
    contenedor.querySelectorAll('.receta-delete-btn').forEach(btnDel => {
        btnDel.onclick = (ev) => {
            ev.stopPropagation();
            const receta = ordenadas.find(r => r.id === btnDel.dataset.id);
            if (!receta) return;
            abrirDetalleReceta(receta);
            mostrarConfirmEliminar();
        };
    });

    // ── Gesto (etapa 3): deslizar una fila revela Editar/Eliminar; un
    //    deslizamiento largo elimina directo (siempre con "Deshacer") ──
    const borradoRecetaPorGesto = async (fila) => {
        const receta = ordenadas.find(r => r.id === fila.dataset.id);
        if (!receta) return;
        const envoltura = fila.closest('.swipe-row') || fila;
        // Optimista: la fila colapsa al instante
        fila.style.maxHeight = fila.offsetHeight + 'px';
        fila.classList.add('swipe-eliminando');
        setTimeout(() => envoltura.remove(), 260);
        try {
            await eliminarReceta(userId, receta.id);
            if (window.recetasCache) delete window.recetasCache;
            mostrarToast(`"${receta.nombre}" eliminada`, 'info', 6000, {
                etiqueta: 'Deshacer',
                alPulsar: async () => {
                    try {
                        await restaurarReceta(userId, receta);
                        if (window.recetasCache) delete window.recetasCache;
                        await renderListaRecetas();
                        mostrarToast('Receta restaurada', 'success');
                    } catch (e) {
                        console.error('Error deshaciendo la eliminación:', e);
                        mostrarToast('No se pudo deshacer', 'error');
                    }
                },
            });
        } catch (e) {
            console.error('Error eliminando receta:', e);
            mostrarToast('No se pudo eliminar', 'error');
            renderListaRecetas().catch(() => {});
        }
    };

    contenedor.querySelectorAll('.receta-fila').forEach(fila => {
        hacerFilaDeslizable(fila, {
            acciones: [
                {
                    etiqueta: 'Editar',
                    clase: 'neutro',
                    alPulsar: (f) => {
                        const receta = ordenadas.find(r => r.id === f.dataset.id);
                        if (!receta) return;
                        // Mismo camino accesible que el botón "Editar" del detalle
                        abrirDetalleReceta(receta);
                        const btnEditar = document.getElementById('editar-receta-btn');
                        if (btnEditar) btnEditar.click();
                    },
                },
                { etiqueta: 'Eliminar', clase: 'peligro', alPulsar: (f) => borradoRecetaPorGesto(f) },
            ],
            alEjecutarLargo: (f) => borradoRecetaPorGesto(f),
        });
    });
};

// Abrir el selector de Mis Recetas al INSTANTE (con skeleton mientras carga la lista)
const abrirSelectorRecetas = async () => {
    const contenedor = document.getElementById('lista-recetas-container');
    if (contenedor) {
        contenedor.innerHTML = [1, 2, 3].map(() => `
            <div class="skeleton-fila">
                <div class="skeleton-linea skeleton-ancho-60"></div>
                <div class="skeleton-linea skeleton-ancho-40"></div>
            </div>`).join('');
    }
    modalSelectReceta.style.display = 'flex'; // se abre ya — la lista llega en segundo plano
    try {
        await renderListaRecetas();
    } catch (e) {
        console.error('Error cargando recetas:', e);
        if (contenedor) {
            contenedor.innerHTML = '<p style="color: var(--coipo-text-muted); text-align: center; padding: 24px 0;">No se pudieron cargar tus recetas. Cerrá y volvé a intentar.</p>';
        }
        mostrarToast('No se pudieron cargar tus recetas', 'error');
    }
};

const btnUsarReceta = container.querySelector('#btn-usar-receta');
if (btnUsarReceta) {
    btnUsarReceta.onclick = abrirSelectorRecetas;
}

// 🍲 El atajo "Elegir de Mis Recetas" del modal viejo ahora es la pestaña
//    "Recetas" de Nueva Ingesta (su lista vive en #ingesta-recetas-lista)

// --- DETALLE: cerrar / usar / eliminar con confirmación en el modal ---
document.getElementById('cerrar-detalle-receta').onclick = () => {
    modalDetalleReceta.style.display = 'none';
};

document.getElementById('usar-desde-detalle').onclick = () => {
    if (!recetaEnDetalle) return;
    const receta = recetaEnDetalle;
    modalDetalleReceta.style.display = 'none';
    abrirModalGramos(receta);
};

// ✏️ EDITAR: abre el formulario con la descripción actual → recalcular → guardar cambios
document.getElementById('editar-receta-btn').onclick = () => {
    if (!recetaEnDetalle) return;
    recetaEditando = recetaEnDetalle;
    recetaParaGuardar = null;

    // Prellenar los 2 inputs del formulario con la receta actual
    document.getElementById('receta-form-titulo').textContent = 'Editar Receta';
    document.getElementById('receta-form-hint').textContent =
        'Modificá la descripción de la receta y recalculá los macros. Se conservan las porciones originales.';
    document.getElementById('texto-receta').value = recetaEnDetalle.descripcion || '';
    document.getElementById('nombre-receta').value = recetaEnDetalle.nombre || '';

    modalDetalleReceta.style.display = 'none';
    verFormularioReceta();
    modalReceta.style.display = 'flex';
    document.getElementById('texto-receta').focus();
};

// Paso de confirmación dentro del modal de detalle (desde el botón o desde el 🗑️ de la lista)
const mostrarConfirmEliminar = () => {
    if (!recetaEnDetalle) return;
    document.getElementById('detalle-confirmar-texto').textContent =
        `¿Eliminar "${recetaEnDetalle.nombre}"? Esta acción no se puede deshacer.`;
    document.getElementById('detalle-acciones').style.display = 'none';
    document.getElementById('detalle-confirmar-eliminar').style.display = 'block';
};

document.getElementById('eliminar-receta-btn').onclick = mostrarConfirmEliminar;

document.getElementById('cancelar-eliminar-receta').onclick = () => {
    document.getElementById('detalle-acciones').style.display = '';
    document.getElementById('detalle-confirmar-eliminar').style.display = 'none';
};

document.getElementById('si-eliminar-receta').onclick = () => {
    if (!recetaEnDetalle) return;
    const receta = recetaEnDetalle;

    // 1️⃣ OPTIMISTA: cerrar al instante y sacar la fila de la lista con animación
    recetaEnDetalle = null;
    modalDetalleReceta.style.display = 'none';
    if (recetaSeleccionada?.id === receta.id) {
        recetaSeleccionada = null;
        modalPorcionesReceta.style.display = 'none';
    }

    const contLista = document.getElementById('lista-recetas-container');
    const fila = contLista?.querySelector(`.receta-fila[data-id="${receta.id}"]`);
    if (fila) {
        fila.style.maxHeight = fila.offsetHeight + 'px';
        fila.classList.add('meal-eliminando');
        setTimeout(() => {
            fila.remove();
            if (contLista && !contLista.querySelector('.receta-fila')) {
                contLista.innerHTML = '<p style="color: var(--coipo-text-muted); text-align: center; padding: 24px 0;">Todavía no tenés recetas. Creá una con "Nueva Receta".</p>';
            }
        }, 260);
    }

    mostrarToast(`Receta "${receta.nombre}" eliminada`, 'success');

    // 2️⃣ La DB corre en segundo plano — si falla, la lista se refresca y la receta vuelve
    eliminarReceta(userId, receta.id).catch(e => {
        console.error('Error eliminando receta:', e);
        mostrarToast('No se pudo borrar — restaurada', 'error');
        renderListaRecetas().catch(() => {});
    });
};

document.getElementById('cancelar-select-receta').onclick = () => {
    modalSelectReceta.style.display = 'none';
};

document.getElementById('cancelar-porciones').onclick = () => {
    modalPorcionesReceta.style.display = 'none';
};

document.getElementById('confirmar-porciones').onclick = async () => {
    if (!recetaSeleccionada) return;
    const btnP = document.getElementById('confirmar-porciones');
    const gramos = parseFloat(document.getElementById('input-gramos-receta').value) || 0;

    if (gramos <= 0) {
        mostrarToast('Ingresá los gramos de la porción que comiste', 'warning');
        return;
    }

    const extrasTexto = document.getElementById('extras-receta').value.trim();
    const extrasYaCalculados = !!(extrasTexto && extrasCalculados && extrasCalculados.texto === extrasTexto);

    ponerCargando(btnP, (extrasTexto && !extrasYaCalculados) ? 'Analizando extras...' : 'Registrando...');
    try {
        // 1️⃣ Extras opcionales (ej: "2 claras de huevo") → si ya se calcularon con el botón 🔍, se reutilizan (sin llamada extra a la IA)
        let extras = null;
        if (extrasTexto) {
            if (extrasYaCalculados) {
                extras = extrasCalculados.datos;
            } else {
                const { rapido, micros } = iniciarAnalisisComida(
                    analizarComida,
                    extrasTexto,
                    e => console.warn('Micros de extras no disponibles:', e.message)
                );
                const datosExtras = await rapido;
                const microsExtras = await micros;
                extras = prepararExtrasParaIngesta(datosExtras, microsExtras);
            }
        }

        // 2️⃣ Regla de 3 por gramos + extras → una sola ingesta combinada
        await registrarIngestaDesdeReceta(userId, dateKey, recetaSeleccionada, gramos, extras);
        delete cacheSemanal[dateKey];
        modalPorcionesReceta.style.display = 'none';
        const nombre = recetaSeleccionada.nombre;
        recetaSeleccionada = null;
        extrasCalculados = null;
        document.getElementById('extras-receta').value = '';
        mostrarToast(`${gramos} g de "${nombre}"${extras ? ' + extras' : ''} registrados`, 'success');
        volverARender();
    } catch (e) {
        console.error('Error registrando receta:', e);
        mostrarToast(textoError(e, 'No se pudo registrar la receta'), 'error');
    } finally {
        quitarCargando(btnP);
    }
};



}; // cierre llave gral




// Reutilizamos tu función original del calendario
const generarHTMLCalendario = (fechaSeleccionada) => {
    const lunes = obtenerLunes(fechaSeleccionada);
    const nombresDias = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    
    // Ahora estos dos valores siempre darán el día local correcto
    const hoyISO = getISO(new Date()); 
    const seleccionadaISO = getISO(fechaSeleccionada);

    let html = `<div class="weekly-calendar">`;
    for (let i = 0; i < 7; i++) {
        const d = new Date(lunes);
        d.setDate(lunes.getDate() + i);
        const iso = getISO(d);
        
        const esHoy = iso === hoyISO;
        const esSeleccionado = iso === seleccionadaISO;

        html += `
            <button class="day-item ${esSeleccionado ? 'active' : ''} ${esHoy ? 'is-today' : ''}" data-date="${iso}">
                <span class="day-name">${nombresDias[i]}</span>
                <span class="day-number">${d.getDate()}</span>
            </button>`;
    }
    return html + `</div>`;
};
