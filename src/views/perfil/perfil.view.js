// src/views/perfil/perfil.view.js
// PERFIL: datos del onboarding editables + meta diaria + sesión.
// Al guardar se recalcula el plan_nutricional (kcal/macros/micros) igual que al
// terminar el onboarding, y el dashboard toma los nuevos valores al instante.
import { doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';
import { auth, db } from '../../firebase-config.js';
import { authService } from '../../services/auth.service.js';
import { calcularPlanNutricional } from '../../utils/nutrition-logic.js';
import { renderDashboard, mostrarToast, ponerCargando, quitarCargando } from '../dashboard/dashboard.view.js';
import { renderSugerencias } from '../sugerencias/sugerencias.view.js';
import { temaActual, elegirTema, TEMA_OSCURO, TEMA_CLARO } from '../../utils/tema.js';
import { alRenderizar } from '../../utils/gestos.js';

const esc = (texto) => String(texto ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const LABELS = {
    objetivo: { perder_peso: 'Perder Peso', mantener: 'Mantener', volumen: 'Ganar Músculo' },
    tipo_dieta: { omnivoro: 'Omnívoro', pescetariano: 'Pescetariano', vegetariano: 'Vegetariano', vegano: 'Vegano' }
};

// Opciones del filtro duro de restricciones (también se usan en Sugerencias)
const RESTRICCIONES_OPCIONES = [
    { v: 'sin_lactosa', l: 'Sin lactosa' },
    { v: 'sin_gluten', l: 'Sin gluten' },
    { v: 'sin_huevo', l: 'Sin huevo' },
    { v: 'sin_frutos_secos', l: 'Sin frutos secos' },
    { v: 'sin_mariscos', l: 'Sin mariscos' },
    { v: 'vegetariano', l: 'Vegetariano' },
    { v: 'vegano', l: 'Vegano' }
];

export const renderPerfil = (container, userData) => {
    // Gestos (etapa 2): queda en la pila → arrastre desde el borde = volver
    alRenderizar('perfil', () => renderPerfil(container, userData));
    const uid = userData.uid || auth.currentUser?.uid;
    const email = userData.email || auth.currentUser?.email || 'sin email';

    // Borrador de trabajo: se guarda en Firestore únicamente al tocar "Guardar"
    const borrador = {
        sexo: userData.sexo || 'hombre',
        edad: Number(userData.edad) || 25,
        altura: Number(userData.altura) || 170,
        peso: Number(userData.peso) || 70,
        objetivo: userData.objetivo || 'mantener',
        tipo_dieta: userData.tipo_dieta || 'omnivoro',
        ritmo_semanal: Number(userData.ritmo_semanal) || 300,
        nivel_actividad: userData.nivel_actividad || 'ligero',
        pasos_diarios: Number(userData.pasos_diarios) || 5000,
        horas_sueno: Number(userData.horas_sueno) || 7,
        frecuencia_comidas: Number(userData.frecuencia_comidas) || 4,
        lesiones: userData.lesiones || '',
        alimentos_favoritos: Array.isArray(userData.alimentos_favoritos) ? [...userData.alimentos_favoritos] : [],
        restricciones: Array.isArray(userData.restricciones) ? [...userData.restricciones] : []
    };

    // Meta diaria guardada (solo lectura en esta vista)
    const plan = userData.plan_nutricional || calcularPlanNutricional(userData);

    // Identidad para el hero
    const username = email.split('@')[0];
    const iniciales = username.slice(0, 2).toUpperCase();
    const nombreVisible = username.replace(/[._-]+/g, ' ').trim();
    let fechaMiembro = '';
    try {
        const f = userData.fecha_registro;
        const fecha = f?.toDate ? f.toDate() : (f?.seconds ? new Date(f.seconds * 1000) : null);
        if (fecha) fechaMiembro = fecha.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    } catch (e) { /* sin fecha */ }

    const omega3Txt = plan.omega3?.epa_dha_mg
        ? `EPA+DHA: <b>${plan.omega3.epa_dha_mg}mg</b>`
        : `Omega-3 ALA: <b>${plan.omega3?.ala_mg ?? 0}mg</b>`;

    container.innerHTML = `
        <div class="dashboard-layout fade-in">
            <header class="dash-header">
                <div class="header-titles">
                    <p class="date-text">MI PERFIL</p>
                </div>
            </header>

            <div class="content-scrollable">
                <!-- HERO: identidad -->
                <section class="perfil-hero">
                    <div class="perfil-avatar">${esc(iniciales)}</div>
                    <div class="perfil-hero-info">
                        <strong>${esc(nombreVisible)}</strong>
                        <span>${esc(email)}</span>
                        ${fechaMiembro ? `<span class="perfil-miembro">Miembro desde ${fechaMiembro}</span>` : ''}
                    </div>
                </section>

                <!-- META DIARIA (solo lectura) -->
                <section class="perfil-seccion">
                    <div class="perfil-seccion-titulo"><span>⚡</span><h3>Tu meta diaria</h3></div>
                    <div class="perfil-meta-grid">
                        <div class="perfil-meta-kcal"><b>${plan.kcal}</b><span>kcal</span></div>
                        <div class="perfil-meta-agua"><b>${(plan.agua / 1000).toFixed(1)}L</b><span>agua</span></div>
                    </div>
                    <div class="macros-bar-container">
                        <div class="macro-item"><span class="dot prot"></span><span>Proteína: <b>${plan.proteina}g</b></span></div>
                        <div class="macro-item"><span class="dot carb"></span><span>Carbos: <b>${plan.carbos}g</b></span></div>
                        <div class="macro-item"><span class="dot fat"></span><span>Grasas: <b>${plan.grasas}g</b></span></div>
                        <div class="macro-item"><span class="dot fiber"></span><span>Fibra: <b>${plan.fibra}g</b></span></div>
                    </div>
                    <div class="micros-grid" style="margin-top: 12px;">
                        <div class="micro-pill">Magnesio: <b>${plan.magnesio}mg</b></div>
                        <div class="micro-pill">Potasio: <b>${plan.potasio}mg</b></div>
                        <div class="micro-pill">${omega3Txt}</div>
                        <div class="micro-pill">Calcio: <b>${plan.calcio}mg</b></div>
                        <div class="micro-pill">Sodio máx: <b>${plan.sodio}mg</b></div>
                        <div class="micro-pill">Hierro: <b>${plan.hierro}mg</b></div>
                        <div class="micro-pill">Zinc: <b>${plan.zinc}mg</b></div>
                        <div class="micro-pill">Vit. D: <b>${plan.vitaminaD} UI</b></div>
                        <div class="micro-pill">B12: <b>${plan.vitaminaB12.meta_mcg}mcg</b></div>
                    </div>
                    <p class="perfil-nota">Esta meta se recalcula sola cuando guardás cambios en tus datos.</p>
                </section>

                <!-- DATOS PERSONALES -->
                <section class="perfil-seccion">
                    <div class="perfil-seccion-titulo"><span>👤</span><h3>Datos personales</h3></div>

                    <div class="perfil-campo">
                        <label class="card-label">Sexo biológico</label>
                        <div class="pill-group">
                            <button class="pill ${borrador.sexo === 'hombre' ? 'active' : ''}" data-key="sexo" data-value="hombre">Hombre</button>
                            <button class="pill ${borrador.sexo === 'mujer' ? 'active' : ''}" data-key="sexo" data-value="mujer">Mujer</button>
                        </div>
                    </div>

                    <div class="perfil-campo">
                        <label class="card-label">Edad</label>
                        <div class="counter-control">
                            <button class="cnt-btn" id="perfil-minus-edad">−</button>
                            <span class="value-display" id="perfil-edad-val">${borrador.edad}</span>
                            <button class="cnt-btn" id="perfil-plus-edad">+</button>
                        </div>
                    </div>

                    <div class="perfil-campo">
                        <div class="label-row">
                            <label class="card-label">Altura</label>
                            <span class="value-badge" id="perfil-altura-val">${borrador.altura} cm</span>
                        </div>
                        <input type="range" id="perfil-altura" min="140" max="220" step="1" value="${borrador.altura}" class="modern-slider">
                    </div>

                    <div class="perfil-campo">
                        <div class="label-row">
                            <label class="card-label">Peso actual</label>
                            <span class="value-badge primary" id="perfil-peso-val">${borrador.peso.toFixed(1)} kg</span>
                        </div>
                        <input type="range" id="perfil-peso" min="40" max="150" step="0.1" value="${borrador.peso}" class="modern-slider">
                    </div>
                </section>

                <!-- OBJETIVO Y ALIMENTACIÓN -->
                <section class="perfil-seccion">
                    <div class="perfil-seccion-titulo"><span>🎯</span><h3>Objetivo y alimentación</h3></div>

                    <div class="perfil-campo">
                        <label class="card-label">Tu meta</label>
                        <button class="option-card ${borrador.objetivo === 'perder_peso' ? 'active' : ''}" data-key="objetivo" data-value="perder_peso">
                            <strong>📉 Perder Peso</strong><span>Déficit calórico controlado</span>
                        </button>
                        <button class="option-card ${borrador.objetivo === 'mantener' ? 'active' : ''}" data-key="objetivo" data-value="mantener">
                            <strong>⚖️ Mantener</strong><span>Composición corporal estable</span>
                        </button>
                        <button class="option-card ${borrador.objetivo === 'volumen' ? 'active' : ''}" data-key="objetivo" data-value="volumen">
                            <strong>💪 Ganar Músculo</strong><span>Superávit para síntesis muscular</span>
                        </button>
                    </div>

                    <div class="perfil-campo">
                        <div class="label-row">
                            <label class="card-label">Ritmo semanal</label>
                            <span class="value-badge" id="perfil-ritmo-val">${borrador.ritmo_semanal} g</span>
                        </div>
                        <input type="range" id="perfil-ritmo" min="100" max="1000" step="50" value="${borrador.ritmo_semanal}">
                    </div>

                    <div class="perfil-campo">
                        <label class="card-label">Tipo de alimentación</label>
                        <button class="option-card ${borrador.tipo_dieta === 'omnivoro' ? 'active' : ''}" data-key="tipo_dieta" data-value="omnivoro">
                            <strong>🍗 Omnívoro</strong><span>Como de todo: carnes, lácteos, vegetales</span>
                        </button>
                        <button class="option-card ${borrador.tipo_dieta === 'pescetariano' ? 'active' : ''}" data-key="tipo_dieta" data-value="pescetariano">
                            <strong>🐟 Pescetariano</strong><span>Sin carne roja ni pollo, sí pescado</span>
                        </button>
                        <button class="option-card ${borrador.tipo_dieta === 'vegetariano' ? 'active' : ''}" data-key="tipo_dieta" data-value="vegetariano">
                            <strong>🥗 Vegetariano</strong><span>Sin carnes, sí lácteos y huevos</span>
                        </button>
                        <button class="option-card ${borrador.tipo_dieta === 'vegano' ? 'active' : ''}" data-key="tipo_dieta" data-value="vegano">
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
                            ${RESTRICCIONES_OPCIONES.map(r => `
                                <button class="pill ${borrador.restricciones.includes(r.v) ? 'active' : ''}" data-rest="${r.v}">${r.l}</button>`).join('')}
                        </div>
                        <p class="perfil-nota">Se aplican siempre en el asistente de sugerencias: las recetas que las incumplen se descartan antes de cualquier consulta.</p>
                    </div>
                </section>

                <!-- ESTILO DE VIDA -->
                <section class="perfil-seccion">
                    <div class="perfil-seccion-titulo"><span>⚡</span><h3>Estilo de vida</h3></div>

                    <div class="perfil-campo">
                        <label class="card-label">Actividad</label>
                        <button class="option-card ${borrador.nivel_actividad === 'sedentario' ? 'active' : ''}" data-key="nivel_actividad" data-value="sedentario">
                            <strong>🪑 Sedentario</strong><span>Oficina / Poco movimiento</span>
                        </button>
                        <button class="option-card ${borrador.nivel_actividad === 'ligero' ? 'active' : ''}" data-key="nivel_actividad" data-value="ligero">
                            <strong>🚶 Ligero</strong><span>1-3 días de gym</span>
                        </button>
                        <button class="option-card ${borrador.nivel_actividad === 'moderado' ? 'active' : ''}" data-key="nivel_actividad" data-value="moderado">
                            <strong>🏃 Moderado</strong><span>3-5 días de gym</span>
                        </button>
                        <button class="option-card ${borrador.nivel_actividad === 'intenso' ? 'active' : ''}" data-key="nivel_actividad" data-value="intenso">
                            <strong>⚡ Muy Activo</strong><span>Entrenamiento diario fuerte</span>
                        </button>
                        <button class="option-card ${borrador.nivel_actividad === 'atleta' ? 'active' : ''}" data-key="nivel_actividad" data-value="atleta">
                            <strong>🏅 Atleta</strong><span>Doble sesión / élite</span>
                        </button>
                    </div>

                    <div class="perfil-campo">
                        <div class="label-row">
                            <label class="card-label">Pasos diarios</label>
                            <span class="value-badge" id="perfil-pasos-val">${borrador.pasos_diarios}</span>
                        </div>
                        <input type="range" id="perfil-pasos" min="2000" max="15000" step="500" value="${borrador.pasos_diarios}">
                    </div>

                    <div class="perfil-campo">
                        <label class="card-label">Horas de sueño</label>
                        <div class="pill-group">
                            ${[5, 6, 7, 8, 9].map(h => `
                                <button class="pill ${borrador.horas_sueno == h ? 'active' : ''}" data-key="horas_sueno" data-value="${h}">${h}h</button>
                            `).join('')}
                        </div>
                    </div>

                    <div class="perfil-campo">
                        <label class="card-label">Comidas por día</label>
                        <div class="pill-group">
                            ${[3, 4, 5, 6].map(n => `
                                <button class="pill ${borrador.frecuencia_comidas == n ? 'active' : ''}" data-key="frecuencia_comidas" data-value="${n}">${n}</button>
                            `).join('')}
                        </div>
                    </div>
                </section>

                <!-- SALUD -->
                <section class="perfil-seccion">
                    <div class="perfil-seccion-titulo"><span>🩹</span><h3>Salud</h3></div>
                    <textarea id="lesiones" placeholder="Ej: Tendinitis rotuliana, asma, etc." rows="3">${esc(borrador.lesiones)}</textarea>
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
                        <b>${esc(email)}</b>
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
    `;

    // ── Estado de "sucio" + barra sticky ──
    let sucio = false;
    const barraGuardado = container.querySelector('#barra-guardar');
    const marcarSucio = () => {
        if (!sucio) {
            sucio = true;
            barraGuardado.style.display = 'flex';
        }
    };

    // ── Controles: pills (sexo, sueño, comidas) ──
    container.querySelectorAll('.pill[data-key]').forEach(pill => {
        pill.onclick = (e) => {
            const key = e.currentTarget.dataset.key;
            container.querySelectorAll(`.pill[data-key="${key}"]`).forEach(p => p.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const valor = e.currentTarget.dataset.value;
            borrador[key] = (key === 'horas_sueno' || key === 'frecuencia_comidas') ? parseInt(valor) : valor;
            marcarSucio();
        };
    });

    // ── Controles: restricciones (multi-selección) ──
    container.querySelectorAll('#perfil-restricciones .pill').forEach(chip => {
        chip.onclick = () => {
            chip.classList.toggle('active');
            const v = chip.dataset.rest;
            borrador.restricciones = chip.classList.contains('active')
                ? [...new Set([...borrador.restricciones, v])]
                : borrador.restricciones.filter(x => x !== v);
            marcarSucio();
        };
    });

    // ── Apariencia: modo oscuro (se aplica al instante; no pasa por "Guardar") ──
    const btnTema = container.querySelector('#toggle-tema');
    if (btnTema) {
        btnTema.setAttribute('aria-pressed', String(temaActual() === TEMA_OSCURO));
        btnTema.onclick = async () => {
            const nuevo = temaActual() === TEMA_OSCURO ? TEMA_CLARO : TEMA_OSCURO;
            elegirTema(nuevo);
            btnTema.setAttribute('aria-pressed', String(nuevo === TEMA_OSCURO));
            // Nube (mejor esfuerzo): para restaurarlo en otros dispositivos
            try { await updateDoc(doc(db, 'usuarios', uid), { tema: nuevo }); }
            catch (e) { console.warn('No se pudo sincronizar el tema:', e); }
        };
    }

    // ── Controles: option-cards (objetivo, dieta, actividad) ──
    container.querySelectorAll('.option-card[data-key]').forEach(card => {
        card.onclick = (e) => {
            const key = e.currentTarget.dataset.key;
            container.querySelectorAll(`.option-card[data-key="${key}"]`).forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
            borrador[key] = e.currentTarget.dataset.value;
            marcarSucio();
        };
    });

    // ── Controles: contador de edad ──
    const edadDisplay = container.querySelector('#perfil-edad-val');
    container.querySelector('#perfil-minus-edad').onclick = () => {
        if (borrador.edad > 15) {
            borrador.edad--;
            edadDisplay.innerText = borrador.edad;
            marcarSucio();
        }
    };
    container.querySelector('#perfil-plus-edad').onclick = () => {
        if (borrador.edad < 90) {
            borrador.edad++;
            edadDisplay.innerText = borrador.edad;
            marcarSucio();
        }
    };

    // ── Controles: sliders (altura, peso, ritmo, pasos) ──
    const setupSlider = (id, key, formatear) => {
        const slider = container.querySelector(`#perfil-${id}`);
        const display = container.querySelector(`#perfil-${id}-val`);
        slider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            borrador[key] = val;
            display.innerText = formatear(val);
            marcarSucio();
        };
    };
    setupSlider('altura', 'altura', v => `${v} cm`);
    setupSlider('peso', 'peso', v => `${v.toFixed(1)} kg`);
    setupSlider('ritmo', 'ritmo_semanal', v => `${v} g`);
    setupSlider('pasos', 'pasos_diarios', v => `${v}`);

    // ── Controles: lesiones ──
    container.querySelector('#lesiones').oninput = (e) => {
        borrador.lesiones = e.target.value;
        marcarSucio();
    };

    // ── Guardar: recalcula el plan y actualiza Firestore ──
    container.querySelector('#guardar-cambios').onclick = async (ev) => {
        if (!(borrador.peso >= 30 && borrador.altura >= 100 && borrador.edad >= 15)) {
            mostrarToast('Revisá peso, altura y edad', 'warning');
            return;
        }
        const btn = ev.currentTarget;
        ponerCargando(btn, 'Guardando...');
        try {
            const planNuevo = calcularPlanNutricional(borrador);
            const payload = { ...borrador, plan_nutricional: planNuevo, meta_agua: planNuevo.agua };
            await updateDoc(doc(db, 'usuarios', uid), payload);

            // El dashboard usa este mismo objeto → nuevas metas al instante en "Hoy"
            Object.assign(userData, payload);
            mostrarToast('Cambios guardados', 'success');
            renderPerfil(container, userData); // vista fresca con la meta nueva
        } catch (e) {
            console.error('Error guardando perfil:', e);
            mostrarToast('No se pudo guardar el perfil', 'error');
        } finally {
            quitarCargando(btn);
        }
    };

    // ── Descartar cambios ──
    container.querySelector('#descartar-cambios').onclick = () => {
        renderPerfil(container, userData);
    };

    // ── Sesión: cerrar con confirmación inline (sin alerts) ──
    const btnCerrar = container.querySelector('#cerrar-sesion-btn');
    const confirmSesion = container.querySelector('#confirmar-sesion');
    btnCerrar.onclick = () => {
        btnCerrar.style.display = 'none';
        confirmSesion.style.display = 'block';
    };
    container.querySelector('#cancelar-sesion').onclick = () => {
        confirmSesion.style.display = 'none';
        btnCerrar.style.display = 'block';
    };
    container.querySelector('#si-cerrar-sesion').onclick = async (ev) => {
        const btn = ev.currentTarget;
        ponerCargando(btn, 'Saliendo...');
        try {
            // El observador de auth de main.js nos lleva al Login automáticamente
            await authService.logout();
        } catch (e) {
            console.error('Error al cerrar sesión:', e);
            mostrarToast('No se pudo cerrar la sesión', 'error');
            quitarCargando(btn);
        }
    };

    // ── Navegación de la nav ──
    const protegerNavegacion = (irA) => {
        if (sucio) {
            mostrarToast('Guardá o descartá los cambios primero', 'warning');
            return;
        }
        irA();
    };

    container.querySelector('#nav-hoy-perfil').onclick = () => {
        protegerNavegacion(() => renderDashboard(container, userData));
    };

    container.querySelector('#nav-sugerencias-perfil').onclick = () => {
        protegerNavegacion(() => renderSugerencias(container, userData));
    };

    container.querySelector('#nav-registrar-perfil').onclick = () => {
        protegerNavegacion(async () => {
            await renderDashboard(container, userData);
            // El ➕ del dashboard abre el modal de Nueva Ingesta
            const btnRegistrar = document.getElementById('nav-registrar');
            if (btnRegistrar) btnRegistrar.click();
        });
    };
};
