// src/views/diario/diario.view.js
// DIARIO (historial semanal) — SÓLO LECTURA.
// Lee el resumen_diario de los 7 días (sin leer las comidas individuales) y
// reutiliza la caché en memoria del dashboard cuando el día ya está cargado.
// No usa IA ni onSnapshot. Tocar un día abre el dashboard existente en esa
// fecha; al volver, el gesto restaura el Diario en la misma semana.

import { db } from '../../firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';
import { calcularPlanNutricional } from '../../utils/nutrition-logic.js';
import { renderDashboard, obtenerDiaCache } from '../dashboard/dashboard.view.js';
import { renderPerfil } from '../perfil/perfil.view.js';
import { renderSugerencias } from '../sugerencias/sugerencias.view.js';
import { alRenderizar } from '../../utils/gestos.js';
import { bottomNavHTML, conectarBottomNav } from '../../components/bottom-nav.js';
import {
    TOLERANCIA_RANGO,
    aClaveFecha,
    calcularResumenSemana,
    diasDeSemana,
    esSemanaFutura,
    estaEnRango,
    etiquetaCortaDia,
    etiquetaDia,
    lunesDe,
    rangoSemanaTexto,
    resumenTieneComidas,
    semanaAnterior,
    semanaSiguiente,
} from '../../utils/diario.logic.mjs';

const esc = (texto) => String(texto ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const kcalTexto = (valor) => Math.round(Number(valor) || 0).toLocaleString('es-AR');

const proteinaTexto = (valor) => {
    if (valor === null || valor === undefined) return '—';
    return String(Math.round(Number(valor) || 0));
};

const numeroResumen = (valor) =>
    typeof valor === 'number' && Number.isFinite(valor) ? valor : 0;

let secuenciaRender = 0;

const cargarSemana = async (userId, fechas) => {
    const filas = await Promise.all(fechas.map(async (fecha) => {
        const cache = obtenerDiaCache(fecha);
        if (cache) {
            return { fecha, cache, snap: null };
        }
        const snap = await getDoc(doc(db, 'usuarios', userId, 'resumen_diario', fecha));
        return { fecha, cache: null, snap };
    }));

    return filas.map(({ fecha, cache, snap }) => {
        let resumen = {};
        let tieneRegistro = false;

        if (cache) {
            resumen = cache.resumen || {};
            tieneRegistro = (cache.ingestas || []).length > 0;
        } else if (snap?.exists()) {
            resumen = snap.data() || {};
            tieneRegistro = resumenTieneComidas(resumen);
        }

        return {
            fecha,
            tieneRegistro,
            kcal: tieneRegistro ? numeroResumen(resumen.acumulado_calorias) : 0,
            proteina: tieneRegistro ? numeroResumen(resumen.acumulado_proteinas) : 0,
        };
    });
};

const htmlSemana = (semana, hoyClave) => {
    const siguiente = semanaSiguiente(semana);
    const puedeAvanzar = !esSemanaFutura(siguiente, hoyClave);
    const esActual = semana === lunesDe(hoyClave);

    return `
        <section class="diario-semana" aria-label="Semana del historial">
            <button type="button" class="diario-flecha" data-semana="-1"
                    aria-label="Semana anterior">‹</button>
            <div class="diario-semana-centro">
                <strong class="diario-rango">${esc(rangoSemanaTexto(semana))}</strong>
                <span class="diario-semana-sub">${esActual ? 'Semana actual' : 'Historial'}</span>
            </div>
            <button type="button" class="diario-flecha" data-semana="1"
                    aria-label="Semana siguiente" ${puedeAvanzar ? '' : 'disabled'}>›</button>
        </section>`;
};

const htmlGrafico = (datos, meta) => {
    const valores = datos.filter(d => d.tieneRegistro).map(d => d.kcal);
    const techo = Math.max(meta, ...valores, 1) * 1.12;
    const porcentaje = (valor) => Math.max(0, Math.min(100, (Number(valor) / techo) * 100));
    const metaPct = meta > 0 ? porcentaje(meta) : null;
    const resumenAccesible = datos.map(d => `${etiquetaDia(d.fecha)}: ${d.tieneRegistro ? `${kcalTexto(d.kcal)} kcal` : 'sin registro'}`).join('. ');

    const barras = datos.map(d => {
        const enRango = d.tieneRegistro && estaEnRango(d.kcal, meta);
        const altura = Math.max(2, porcentaje(d.kcal));
        return `
            <div class="diario-col">
                <div class="diario-barra-slot">
                    ${d.tieneRegistro
                        ? `<span class="diario-barra${enRango ? ' en-rango' : ''}" style="height:${altura}%"></span>`
                        : '<span class="diario-sin-registro"></span>'}
                </div>
                <span class="diario-dia">${esc(etiquetaCortaDia(d.fecha))}</span>
            </div>`;
    }).join('');

    return `
        <section class="diario-card" aria-label="Calorías por día">
            <div class="diario-card-head">
                <h2>Calorías por día</h2>
                <span class="diario-meta-texto">${meta > 0 ? `Meta ${kcalTexto(meta)} kcal` : 'Sin meta'}</span>
            </div>
            <div class="diario-grafico">
                <div class="diario-barras" role="img" aria-label="${esc(resumenAccesible)}">
                    ${metaPct !== null
                        ? `<div class="diario-meta-linea" style="bottom:${metaPct}%" aria-hidden="true"></div>`
                        : ''}
                    ${barras}
                </div>
                <div class="diario-leyenda" aria-hidden="true">
                    <span><i class="diario-swatch en-rango"></i>En rango</span>
                    <span><i class="diario-swatch"></i>Fuera de rango</span>
                    ${meta > 0 ? '<span><i class="diario-swatch meta"></i>Meta</span>' : ''}
                </div>
            </div>
        </section>`;
};

const htmlResumen = (datos, meta) => {
    const resumen = calcularResumenSemana(datos, meta, TOLERANCIA_RANGO);
    const promedioKcal = resumen.promedioKcal === null ? '—' : kcalTexto(resumen.promedioKcal);
    const promedioProteina = proteinaTexto(resumen.promedioProteina);

    return `
        <section class="diario-card diario-resumen" aria-label="Resumen de la semana">
            <div class="diario-resumen-item">
                <span class="diario-resumen-label">Promedio</span>
                <strong class="diario-resumen-valor">${promedioKcal}${resumen.promedioKcal === null ? '' : ' <small>kcal</small>'}</strong>
            </div>
            <div class="diario-resumen-item">
                <span class="diario-resumen-label">En rango</span>
                <strong class="diario-resumen-valor">${resumen.diasEnRango} <small>de ${resumen.diasConRegistro}</small></strong>
            </div>
            <div class="diario-resumen-item">
                <span class="diario-resumen-label">Proteína</span>
                <strong class="diario-resumen-valor">${promedioProteina}${resumen.promedioProteina === null ? '' : ' <small>g</small>'}</strong>
            </div>
            ${resumen.diasConRegistro === 0
                ? '<p class="diario-vacio">Todavía no hay comidas registradas esta semana.</p>'
                : ''}
        </section>`;
};

const htmlLista = (datos) => {
    const filas = [...datos].reverse().map(d => `
        <button type="button" class="diario-fila" data-diario-fecha="${esc(d.fecha)}"
                aria-label="${esc(`${etiquetaDia(d.fecha)}: ${d.tieneRegistro ? `${kcalTexto(d.kcal)} kcal` : 'sin registro'}`)}">
            <span class="diario-fila-fecha">${esc(etiquetaDia(d.fecha))}</span>
            <span class="diario-fila-kcal${d.tieneRegistro ? '' : ' vacia'}">${d.tieneRegistro ? `${kcalTexto(d.kcal)} kcal` : 'Sin registro'}</span>
            <span class="diario-fila-chevron" aria-hidden="true">›</span>
        </button>`).join('');

    return `
        <section class="diario-dias" aria-labelledby="diario-dias-titulo">
            <h2 id="diario-dias-titulo">Días</h2>
            <div class="diario-lista">${filas}</div>
        </section>`;
};

const htmlCargando = () => `
    <section class="diario-card" aria-hidden="true">
        <div class="skeleton-linea skeleton-ancho-40"></div>
        <div class="diario-skeleton-grafico" style="margin-top:16px">
            <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
    </section>
    <section class="diario-card diario-skeleton-resumen" aria-hidden="true">
        <div class="skeleton-linea skeleton-ancho-60"></div>
        <div class="skeleton-linea skeleton-ancho-40" style="margin-top:10px"></div>
    </section>
    <section class="diario-skeleton-lista" aria-hidden="true">
        ${Array.from({ length: 7 }, () => `
            <div class="skeleton-fila">
                <div class="skeleton-linea skeleton-ancho-60"></div>
                <div class="skeleton-linea skeleton-ancho-40"></div>
            </div>`).join('')}
    </section>`;

/**
 * @param {HTMLElement} container
 * @param {object} userData
 * @param {{semana?: string}} [opciones] lunes YYYY-MM-DD de la semana a mostrar
 */
export const renderDiario = async (container, userData, opciones = {}) => {
    const miSecuencia = ++secuenciaRender;
    const hoyClave = aClaveFecha(new Date());
    const semanaActual = lunesDe(hoyClave);
    let semana = opciones.semana || semanaActual;
    if (esSemanaFutura(semana, hoyClave)) semana = semanaActual;

    alRenderizar('diario', () => renderDiario(container, userData, { semana }));

    const plan = userData.plan_nutricional || calcularPlanNutricional(userData);
    const meta = Number(plan?.kcal) || 0;
    const userId = userData.uid;

    const conectar = () => {
        conectarBottomNav(container, {
            hoy: () => renderDashboard(container, userData),
            diario: () => {},
            registrar: async () => {
                await renderDashboard(container, userData);
                container.querySelector('[data-nav="registrar"]')?.click();
            },
            sugerencias: () => renderSugerencias(container, userData),
            perfil: () => renderPerfil(container, userData),
        });

        container.querySelectorAll('[data-semana]').forEach(btn => {
            btn.onclick = () => {
                const delta = Number(btn.dataset.semana);
                const destino = delta > 0 ? semanaSiguiente(semana) : semanaAnterior(semana);
                if (esSemanaFutura(destino, hoyClave)) return;
                renderDiario(container, userData, { semana: destino });
            };
        });

        container.querySelectorAll('[data-diario-fecha]').forEach(btn => {
            btn.onclick = () => {
                const fecha = new Date(`${btn.dataset.diarioFecha}T12:00:00`);
                // id distinto de 'hoy': al volver con el gesto, se restaura el
                // Diario (con esta misma semana) y no se pierde el historial.
                renderDashboard(container, userData, fecha, { idHistorial: 'diario-dia' });
            };
        });
    };

    const pintar = (datos, { cargando = false, error = null } = {}) => {
        container.innerHTML = `
            <div class="dashboard-layout fade-in vista-diario">
                <header class="dash-header">
                    <div class="header-titles">
                        <p class="date-text">HISTORIAL</p>
                        <h1>Diario</h1>
                    </div>
                </header>

                ${htmlSemana(semana, hoyClave)}

                ${cargando
                    ? htmlCargando()
                    : error
                        ? `<p class="diario-error">${esc(error)}</p>`
                        : `${htmlGrafico(datos, meta)}${htmlResumen(datos, meta)}${htmlLista(datos)}`}

                ${bottomNavHTML('diario')}
            </div>`;
        conectar();
    };

    pintar([], { cargando: true });

    try {
        const datos = await cargarSemana(userId, diasDeSemana(semana));
        if (miSecuencia !== secuenciaRender || !container.querySelector('.vista-diario')) return;
        pintar(datos);
    } catch (e) {
        console.error('Error al cargar el Diario:', e);
        if (miSecuencia !== secuenciaRender || !container.querySelector('.vista-diario')) return;
        pintar([], { error: 'No pudimos cargar la semana. Probá de nuevo en un momento.' });
    }
};
