// src/views/sugerencias/sugerencias.view.js
// Chat de sugerencias: asistente de BOTONES (no chat libre).
// 1) Muestra el restante del día → 2) el usuario elige un intent →
// 3) el asistente pregunta contexto paso a paso (dulce/salado, hambre,
//    ayuno, entreno) → 4) llama a la IA Groq con el top de recetas ya
//    filtrado en local → 5) las cifras finales las calcula SIEMPRE la app
//    (regla de tres) → 6) "Registrar" carga la comida en un toque.

import { db } from '../../firebase-config.js';
import {
    doc, getDoc, collection, getDocs, addDoc, updateDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';
import { calcularPlanNutricional } from '../../utils/nutrition-logic.js';
import { obtenerRecetas, registrarIngestaDesdeReceta } from '../../services/db/receta.service.js';
import { crearRegistroComida } from '../../services/db/meal.service.js';
import { calcularIngestaDesdeGramos } from '../../utils/receta-math.js';
import {
    INTENTOS, MOMENTOS, momentoPorHora, calcularRestantes, evaluarRestante,
    OPCIONES_MINIMAS, KCAL_MINIMAS_DIA, mensajePiso, sanitizarTextoLibre,
    preguntasParaIntent, deducirAyunoPorHora, restriccionesEfectivas,
    aplicarFiltrosRestricciones, excluirUsadasHoy, preRanking, valorarReceta,
    recetasParaPayload, objetivoDesdeUsuario, construirPayloadIA, gramosPorFactor
} from '../../utils/sugerencias-logic.js';
import { consultarSugerencias } from '../../services/ai/sugerencias.service.js';
import { renderDashboard, mostrarToast, ponerCargando, quitarCargando, invalidarCacheDia } from '../dashboard/dashboard.view.js';
import { renderPerfil } from '../perfil/perfil.view.js';
import { alRenderizar } from '../../utils/gestos.js';

// ── utilidades locales ──────────────────────────────────────────────────
const esc = (t) => String(t ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const r1 = (v) => Math.round((Number(v) || 0) * 10) / 10;
const r0 = (v) => Math.round(Number(v) || 0);
const getISO = (fecha) => {
    const d = new Date(fecha);
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
};

const ETIQUETAS_INTENT = {
    [INTENTOS.QUE_COMER]: '¿Qué puedo comer?',
    [INTENTOS.COMPLETAR_PROTEINA]: 'Completar mi proteína',
    [INTENTOS.ENTRAR_EN_CALORIAS]: 'Algo que entre en mis calorías',
    [INTENTOS.COMIDA_ACTUAL]: 'Qué como ahora',
    [INTENTOS.LIVIANO]: 'Algo liviano',
    [INTENTOS.CENA_FINAL]: 'Cerrar el día',
    [INTENTOS.GUSTO]: 'Darme un gusto',
    [INTENTOS.LIBRE]: 'Quiero comer otra cosa',
    [INTENTOS.ALTERNATIVA]: 'No tengo un ingrediente'
};
const ETIQUETA_MOMENTO = {
    desayuno: 'Desayuno', almuerzo: 'Almuerzo', merienda: 'Merienda',
    cena: 'Cena', snack: 'Snack'
};

export const renderSugerencias = async (container, userData) => {
    // Gestos (etapa 2): queda en la pila → arrastre desde el borde = volver
    alRenderizar('sug', () => renderSugerencias(container, userData));
    const uid = userData.uid;
    const hoy = getISO(new Date());
    const hora = new Date().getHours();
    const plan = userData.plan_nutricional || calcularPlanNutricional(userData);
    const restricciones = restriccionesEfectivas(userData);

    // ── estado local ──
    let resumenLocal = {};
    let recetasTodas = [];
    let idsUsados = [];
    let restantes = { kcal: 0, p: 0, c: 0, g: 0 };
    let momento = momentoPorHora(hora);
    let excluirUsadas = userData.config_sugerencias?.excluir_usadas !== false;
    let contexto = {};
    let intentElegido = null;
    let textoLibre = '';
    let pendiente = null;   // resuelve la espera actual (para "Empezar de nuevo")
    let generacion = 0;     // invalida respuestas de la IA de una conversación vieja

    // ── template ────────────────────────────────────────────────────────
    container.innerHTML = `
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
                        ${MOMENTOS.map(m => `
                            <button class="pill ${m === momento ? 'active' : ''}" data-momento="${m}">
                                ${ETIQUETA_MOMENTO[m]}
                            </button>`).join('')}
                    </div>
                </div>

                <label class="sug-excluir">
                    <input type="checkbox" id="sug-excluir-usadas" ${excluirUsadas ? 'checked' : ''}>
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
                <button class="nav-item" id="nav-perfil-sug">
                    <span class="nav-icon">⚙️</span><span class="nav-texto">Perfil</span>
                </button>
            </nav>
        </div>
    `;

    const chat = container.querySelector('#sug-chat');

    // ── helpers de conversación ─────────────────────────────────────────
    const desplazar = (el) => { try { el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) { /* noop */ } };

    const burbujaAsistente = (html) => {
        const b = document.createElement('div');
        b.className = 'sug-bubble sug-asistente';
        b.innerHTML = html;
        chat.appendChild(b);
        desplazar(b);
        return b;
    };
    const burbujaUsuario = (texto) => {
        const b = document.createElement('div');
        b.className = 'sug-bubble sug-usuario';
        b.textContent = texto;
        chat.appendChild(b);
        desplazar(b);
        return b;
    };

    // Espera cancelable: el usuario puede reiniciar mientras pregunta
    const nuevaEspera = (montar) => new Promise(resolve => {
        const responder = (valor) => { pendiente = null; resolve(valor); };
        pendiente = () => { pendiente = null; resolve(null); };
        montar(responder);
    });

    // ── header: restantes en vivo ───────────────────────────────────────
    const actualizarHeader = () => {
        container.querySelector('#sug-kcal-valor').textContent = r0(Math.max(0, restantes.kcal));
        const pct = (valor, meta) => Math.max(0, Math.min(100, (valor / (Number(meta) || 1)) * 100));
        container.querySelector('#sug-barra-p').style.width = `${pct(restantes.p, plan.proteina)}%`;
        container.querySelector('#sug-barra-c').style.width = `${pct(restantes.c, plan.carbos)}%`;
        container.querySelector('#sug-barra-g').style.width = `${pct(restantes.g, plan.grasas)}%`;
        container.querySelector('#sug-val-p').textContent = `${r0(Math.max(0, restantes.p))} / ${r0(plan.proteina)} g`;
        container.querySelector('#sug-val-c').textContent = `${r0(Math.max(0, restantes.c))} / ${r0(plan.carbos)} g`;
        container.querySelector('#sug-val-g').textContent = `${r0(Math.max(0, restantes.g))} / ${r0(plan.grasas)} g`;
    };

    // ── filtros locales SIEMPRE antes de la IA ──────────────────────────
    const topRecetasParaIA = () => {
        let lista = recetasTodas.filter(r =>
            (r.totales_macros_porcion || r.totales_macros_completa) && (r.ingredientes?.length || r.totales_macros_completa));
        lista = aplicarFiltrosRestricciones(lista, restricciones);   // restricciones: filtro duro local
        if (excluirUsadas) lista = excluirUsadasHoy(lista, idsUsados);
        const valoradas = lista.map(valorarReceta).filter(r => r.kcal > 0);
        return recetasParaPayload(preRanking(valoradas, restantes, intentElegido));
    };

    // ── registro en un toque ────────────────────────────────────────────
    const descontarDelDia = (kcal, p, c, g) => {
        restantes.kcal = r1(restantes.kcal - kcal);
        restantes.p = r1(restantes.p - p);
        restantes.c = r1(restantes.c - c);
        restantes.g = r1(restantes.g - g);
        actualizarHeader();
        invalidarCacheDia(hoy);
    };

    const mensajeSiCompleto = () => {
        const gate = evaluarRestante(restantes);
        if (gate.accion === 'COMPLETADO') burbujaAsistente(`<p class="sug-nota">${gate.mensaje}</p>`);
    };

    const registrarReceta = async (receta, gramos, calc, btn) => {
        const actualizador = ponerCargando(btn, 'Registrando...');
        try {
            await registrarIngestaDesdeReceta(uid, hoy, receta, gramos);
            idsUsados.push(String(receta.id));
            descontarDelDia(
                calc.macros.total_calorias, calc.macros.total_proteinas,
                calc.macros.total_carbohidratos, calc.macros.total_grasas
            );
            btn.disabled = true;
            btn.innerText = 'Registrada ✓';
            btn.classList.add('sug-registrado');
            btn.closest('.sug-card')?.classList.add('sug-card-ok');
            mostrarToast('Registrado en el diario', 'success');
            mensajeSiCompleto();
        } catch (e) {
            console.error('Error registrando sugerencia:', e);
            quitarCargando(btn);
            mostrarToast('No pude registrar. Probá de nuevo.', 'error');
        }
    };

    const registrarItem = async (item, btn) => {
        ponerCargando(btn, 'Registrando...');
        try {
            await crearRegistroComida(uid, { items: [item] }, hoy, 'sugerencia-libre');
            descontarDelDia(item.calorias, item.proteinas, item.carbohidratos, item.grasas);
            btn.disabled = true;
            btn.innerText = 'Registrada ✓';
            btn.classList.add('sug-registrado');
            btn.closest('.sug-card')?.classList.add('sug-card-ok');
            mostrarToast('Registrado en el diario', 'success');
            mensajeSiCompleto();
        } catch (e) {
            console.error('Error registrando sugerencia:', e);
            quitarCargando(btn);
            mostrarToast('No pude registrar. Probá de nuevo.', 'error');
        }
    };

    const votar = async (tarjeta, voto, ref) => {
        tarjeta.querySelectorAll('.sug-voto').forEach(b => b.classList.remove('activo'));
        tarjeta.querySelector(`.sug-voto[data-v="${voto}"]`)?.classList.add('activo');
        try {
            await addDoc(collection(db, 'usuarios', uid, 'feedback_sugerencias'), {
                intent: intentElegido, momento, voto, ref, creado_el: serverTimestamp()
            });
        } catch (e) { console.warn('Feedback no guardado:', e); }
    };

    // ── tarjetas de resultado ───────────────────────────────────────────
    const tarjetaBase = () => {
        const t = document.createElement('article');
        t.className = 'sug-card';
        chat.appendChild(t);
        desplazar(t);
        return t;
    };

    const htmlVotos = `
        <div class="sug-votos">
            <button class="sug-voto" data-v="up" title="Me sirve">👍</button>
            <button class="sug-voto" data-v="down" title="No me sirve">👎</button>
        </div>`;

    const pintarSugerencia = (s) => {
        const receta = recetasTodas.find(x => String(x.id) === String(s.receta_id));
        if (!receta) return; // id que ya no existe: se ignora
        const v = valorarReceta(receta);
        const gramos = gramosPorFactor(receta, s.factor);

        // CIFRAS FINALES: regla de tres local, jamás de la IA
        let calc = null;
        try { calc = gramos > 0 ? calcularIngestaDesdeGramos(receta, gramos) : null; } catch (e) { calc = null; }
        const kcal = calc ? calc.macros.total_calorias : r0(v.kcal * s.factor);
        const p = calc ? calc.macros.total_proteinas : r1(v.p * s.factor);
        const c = calc ? calc.macros.total_carbohidratos : r1(v.c * s.factor);
        const g = calc ? calc.macros.total_grasas : r1(v.g * s.factor);

        const t = tarjetaBase();
        t.innerHTML = `
            <div class="sug-card-top">
                <h4>${esc(receta.nombre)}</h4>
                <span class="sug-factor">×${s.factor}</span>
            </div>
            ${gramos > 0 ? `<p class="sug-porcion">Comé <b>${Math.round(gramos)} g</b> de esta receta</p>` : ''}
            <div class="sug-macros">
                <span class="sug-m-kcal">${r0(kcal)}<small>kcal</small></span>
                <span>P ${r1(p)} g</span>
                <span>C ${r1(c)} g</span>
                <span>G ${r1(g)} g</span>
            </div>
            ${s.motivo ? `<p class="sug-motivo">${esc(s.motivo)}</p>` : ''}
            <div class="sug-card-acciones">
                <button class="btn-primary sug-btn-registrar" ${calc ? '' : 'disabled'}>Registrar</button>
                ${htmlVotos}
            </div>`;

        const btn = t.querySelector('.sug-btn-registrar');
        if (calc) btn.onclick = () => registrarReceta(receta, gramos, calc, btn);
        t.querySelector('.sug-voto[data-v="up"]').onclick = () => votar(t, 'up', { receta_id: String(receta.id) });
        t.querySelector('.sug-voto[data-v="down"]').onclick = () => votar(t, 'down', { receta_id: String(receta.id) });
    };

    const pintarLibre = (libre) => {
        const t = tarjetaBase();
        t.classList.add('sug-card-libre');
        t.innerHTML = `
            <div class="sug-card-top">
                <h4>${esc(libre.nombre)}</h4>
                <span class="sug-pill">Estimación aproximada</span>
            </div>
            <div class="sug-libre-campos">
                <label>kcal<input type="number" min="0" step="1" data-c="kcal" value="${r0(libre.kcal)}"></label>
                <label>Proteínas (g)<input type="number" min="0" step="0.1" data-c="p" value="${r1(libre.p)}"></label>
                <label>Carbos (g)<input type="number" min="0" step="0.1" data-c="c" value="${r1(libre.c)}"></label>
                <label>Grasas (g)<input type="number" min="0" step="0.1" data-c="g" value="${r1(libre.g)}"></label>
            </div>
            ${libre.motivo ? `<p class="sug-motivo">${esc(libre.motivo)}</p>` : ''}
            <div class="sug-card-acciones">
                <button class="btn-primary sug-btn-registrar">Registrar</button>
                ${htmlVotos}
            </div>`;

        const btn = t.querySelector('.sug-btn-registrar');
        btn.onclick = () => {
            const leer = (k) => Math.max(0, Number(t.querySelector(`input[data-c="${k}"]`).value) || 0);
            registrarItem({
                alimento: libre.nombre,
                calorias: leer('kcal'), proteinas: leer('p'),
                carbohidratos: leer('c'), grasas: leer('g'), fibra: 0,
                confianza: 'media'
            }, btn);
        };
        t.querySelector('.sug-voto[data-v="up"]').onclick = () => votar(t, 'up', { libre: libre.nombre });
        t.querySelector('.sug-voto[data-v="down"]').onclick = () => votar(t, 'down', { libre: libre.nombre });
    };

    const pintarOpcionesMinimas = (gate) => {
        burbujaAsistente(`<p>Te quedan menos de 100 kcal. Algo chico:</p>`);
        gate.opciones.forEach(op => {
            const t = tarjetaBase();
            t.innerHTML = `
                <div class="sug-card-top">
                    <h4>${esc(op.nombre)}</h4>
                    <span class="sug-pill">Estimación aproximada</span>
                </div>
                <div class="sug-macros">
                    <span class="sug-m-kcal">${r0(op.kcal)}<small>kcal</small></span>
                    <span>P ${r1(op.p)} g</span><span>C ${r1(op.c)} g</span><span>G ${r1(op.g)} g</span>
                </div>
                <div class="sug-card-acciones">
                    <button class="btn-primary sug-btn-registrar">Registrar</button>
                </div>`;
            const btn = t.querySelector('.sug-btn-registrar');
            btn.onclick = () => registrarItem({
                alimento: op.nombre, calorias: op.kcal, proteinas: op.p,
                carbohidratos: op.c, grasas: op.g, fibra: 0, confianza: 'media'
            }, btn);
        });
        const aviso = mensajePiso(plan.kcal - restantes.kcal, restantes.kcal);
        if (aviso) burbujaAsistente(`<p class="sug-nota">${esc(aviso)}</p>`);
    };

    // ── preguntas de contexto (una por vez) ─────────────────────────────
    const hacerPregunta = (q) => nuevaEspera(resolver => {
        const pre = q.clave === 'ayuno' ? deducirAyunoPorHora(hora) : null;
        const b = burbujaAsistente(`
            <p class="sug-pregunta">${esc(q.texto)}</p>
            ${pre ? `<span class="sug-pista">Por tu hora, parece: ${pre === 'rompio' ? 'ya comiste' : 'sigo en ayuno'}</span>` : ''}
            <div class="sug-opciones">
                ${q.opciones.map(o => `<button class="pill ${o.v === pre ? 'sug-pre' : ''}" data-v="${o.v}">${esc(o.l)}</button>`).join('')}
            </div>`);
        b.querySelectorAll('.pill').forEach(btn => {
            btn.onclick = () => {
                burbujaUsuario(btn.textContent.trim());
                const v = btn.dataset.v;
                b.remove();
                resolver(v);
            };
        });
    });

    const pedirTexto = () => nuevaEspera(resolver => {
        const b = burbujaAsistente(`
            <p class="sug-pregunta">${intentElegido === INTENTOS.ALTERNATIVA
                ? '¿Qué ingrediente te falta o qué querés cambiar?'
                : '¿Qué se te antoja?'}</p>
            <textarea class="sug-textarea" id="sug-texto" maxlength="100"
                placeholder="Máx. 100 caracteres"></textarea>
            <div class="sug-texto-pie">
                <span class="sug-counter" id="sug-counter">0/100</span>
                <button class="btn-primary" id="sug-enviar">Pedir idea</button>
            </div>`);
        const ta = b.querySelector('#sug-texto');
        const counter = b.querySelector('#sug-counter');
        ta.oninput = () => { counter.textContent = `${ta.value.length}/100`; };
        b.querySelector('#sug-enviar').onclick = () => {
            const limpio = sanitizarTextoLibre(ta.value);
            if (!limpio) { mostrarToast('Escribí algo primero', 'warning'); return; }
            burbujaUsuario(limpio);
            b.remove();
            resolver(limpio);
        };
        setTimeout(() => ta.focus(), 150);
    });

    // ── consulta a la IA (con gates locales) ────────────────────────────
    const pedirSugerencias = async () => {
        // Gates ANTES de cualquier llamada
        const gate = evaluarRestante(restantes);
        if (gate.accion === 'COMPLETADO') { burbujaAsistente(`<p class="sug-nota">${gate.mensaje}</p>`); return; }
        if (gate.accion === 'MINIMAS') { pintarOpcionesMinimas(gate); return; }

        const gen = generacion;
        const pensando = burbujaAsistente(`
            <div class="sug-pensando"><span class="btn-spinner"></span> Pensando ideas…</div>`);
        try {
            const payload = construirPayloadIA({
                intent: intentElegido,
                momento,
                objetivo: objetivoDesdeUsuario(userData),
                contexto,
                restante: restantes,
                restricciones,
                recetas: topRecetasParaIA(),
                textoLibre
            });
            const r = await consultarSugerencias(payload);
            if (gen !== generacion) return;   // el usuario reinició: descartar
            pensando.remove();

            if (r.error === 'completado') { burbujaAsistente(`<p class="sug-nota">${esc(r.mensaje || 'Ya completaste tus calorías de hoy')}</p>`); return; }
            if (r.error === 'fuera_de_tema') { burbujaAsistente('<p>Con eso no puedo ayudarte: solo sugiero ideas de comida. Probá contarme qué querés comer.</p>'); return; }
            if (r.error === 'consulta_profesional') { burbujaAsistente('<p>Eso mejor te lo puede responder un profesional de la salud.</p>'); return; }

            const hayAlgo = (r.sugerencias?.length || r.libre);
            if (!hayAlgo && !r.nota) throw new Error('respuesta vacía');

            if (r.sugerencias?.length) burbujaAsistente('<p>Estas son mis ideas:</p>');
            (r.sugerencias || []).forEach(pintarSugerencia);
            if (r.libre) pintarLibre(r.libre);
            if (r.nota) burbujaAsistente(`<p class="sug-nota">${esc(r.nota)}</p>`);

            const fin = document.createElement('div');
            fin.className = 'sug-fin';
            fin.innerHTML = `
                <button class="sug-fin-btn" id="sug-otra">Pedir otra idea</button>
                <button class="sug-fin-btn" id="sug-reiniciar-2">↺ Empezar de nuevo</button>`;
            chat.appendChild(fin);
            desplazar(fin);
            fin.querySelector('#sug-otra').onclick = () => pedirSugerencias();
            fin.querySelector('#sug-reiniciar-2').onclick = () => reiniciar();
        } catch (e) {
            if (gen !== generacion) return;   // reiniciado mientras fallaba
            pensando.remove();
            const b = burbujaAsistente(`<p>${esc(e?.message || 'No pude responder ahora.')}</p>`);
            const acc = document.createElement('div');
            acc.className = 'sug-error-btns';
            acc.innerHTML = `
                <button class="sug-fin-btn" id="sug-reintentar">Reintentar</button>
                <button class="sug-fin-btn" id="sug-reiniciar-3">↺ Empezar de nuevo</button>`;
            b.appendChild(acc);
            desplazar(b);
            acc.querySelector('#sug-reintentar').onclick = () => { b.remove(); pedirSugerencias(); };
            acc.querySelector('#sug-reiniciar-3').onclick = () => reiniciar();
        }
    };

    // ── flujo guiado: intent → preguntas → consulta ─────────────────────
    const flujo = async () => {
        const preguntas = preguntasParaIntent(intentElegido, hora);
        for (const q of preguntas) {
            const resp = await hacerPregunta(q);
            if (resp === null) return;         // reiniciado por el usuario
            contexto[q.clave] = resp;
        }
        if (intentElegido === INTENTOS.LIBRE || intentElegido === INTENTOS.ALTERNATIVA) {
            const texto = await pedirTexto();
            if (texto === null) return;
            textoLibre = texto;
        }
        await pedirSugerencias();
    };

    const elegirIntent = (btn) => {
        const intent = btn.dataset.intent;
        if (!intent) return;
        intentElegido = intent;
        contexto = {};
        textoLibre = '';
        burbujaUsuario(ETIQUETAS_INTENT[intent]);
        btn.closest('.sug-bubble')?.remove();   // la grilla de intents desaparece
        flujo();
    };

    const pintarIntents = () => {
        burbujaAsistente(`
            <p>¿Qué te propongo?</p>
            <div class="sug-intents">
                ${Object.entries(ETIQUETAS_INTENT).map(([k, label]) =>
                    `<button class="sug-intent" data-intent="${k}">${esc(label)}</button>`).join('')}
            </div>`);
        chat.querySelectorAll('.sug-intent').forEach(b => { b.onclick = () => elegirIntent(b); });
    };

    // ── arranque según el restante (sin llamadas a la IA si no corresponde) ──
    const iniciar = () => {
        generacion++;
        chat.innerHTML = '';
        pendiente = null;
        contexto = {}; intentElegido = null; textoLibre = '';

        const gate = evaluarRestante(restantes);
        if (gate.accion === 'COMPLETADO') {
            burbujaAsistente(`<p class="sug-nota">${gate.mensaje}</p>`);
            return;
        }
        if (gate.accion === 'MINIMAS') { pintarOpcionesMinimas(gate); return; }
        burbujaAsistente('<p>Acá van ideas según lo que te falta hoy.</p>');
        pintarIntents();
    };

    const reiniciar = () => {
        if (pendiente) pendiente();
        iniciar();
        desplazar(chat.firstElementChild || chat);
    };

    // ── navegación ──────────────────────────────────────────────────────
    container.querySelector('#nav-hoy-sug').onclick = () => renderDashboard(container, userData);
    container.querySelector('#nav-registrar-sug').onclick = async () => {
        await renderDashboard(container, userData);
        document.getElementById('nav-registrar')?.click();
    };
    container.querySelector('#nav-perfil-sug').onclick = () => renderPerfil(container, userData);

    // ── momento editable ────────────────────────────────────────────────
    container.querySelectorAll('#sug-momento-chips .pill').forEach(chip => {
        chip.onclick = () => {
            momento = chip.dataset.momento;
            container.querySelectorAll('#sug-momento-chips .pill').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        };
    });

    // ── configuración: excluir recetas usadas hoy (persistida) ──────────
    container.querySelector('#sug-excluir-usadas').onchange = (e) => {
        excluirUsadas = e.target.checked;
        updateDoc(doc(db, 'usuarios', uid), {
            config_sugerencias: { excluir_usadas: excluirUsadas }
        }).then(() => {
            userData.config_sugerencias = { ...(userData.config_sugerencias || {}), excluir_usadas: excluirUsadas };
        }).catch(err => console.warn('No se guardó la configuración:', err));
    };

    container.querySelector('#sug-reiniciar').onclick = () => reiniciar();

    // ── datos del día ───────────────────────────────────────────────────
    burbujaAsistente('<div class="sug-pensando"><span class="btn-spinner"></span> Cargando tu día…</div>');
    try {
        const [snapResumen, snapComidas, recetas] = await Promise.all([
            getDoc(doc(db, 'usuarios', uid, 'resumen_diario', hoy)),
            getDocs(collection(db, 'usuarios', uid, 'ingestas_diarias', hoy, 'comidas')),
            obtenerRecetas(uid)
        ]);
        resumenLocal = snapResumen.exists() ? snapResumen.data() : {};
        idsUsados = [];
        snapComidas.forEach(d => {
            (d.data().alimentos || []).forEach(a => { if (a.receta_id) idsUsados.push(String(a.receta_id)); });
        });
        recetasTodas = recetas;
        restantes = calcularRestantes(plan, resumenLocal);
        actualizarHeader();
        iniciar();
    } catch (e) {
        console.error('Error cargando datos de sugerencias:', e);
        chat.innerHTML = '';
        burbujaAsistente(`
            <p>No pude cargar tus datos. Revisá la conexión.</p>
            <div class="sug-error-btns">
                <button class="sug-fin-btn" id="sug-recargar">Recargar</button>
            </div>`);
        chat.querySelector('#sug-recargar').onclick = () => renderSugerencias(container, userData);
    }
};
