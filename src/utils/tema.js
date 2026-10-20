// src/utils/tema.js — modo claro/oscuro de la app
// Preferencia explícita (localStorage) > preferencia del sistema.
// El script inline en index.html ya aplica esto antes del primer pintado;
// acá queda la lógica para cambiarlo en vivo y escuchar el sistema.

export const TEMA_CLARO = 'claro';
export const TEMA_OSCURO = 'oscuro';
const KEY = 'coipo_tema';

const metaThemeColor = () => document.querySelector('meta[name="theme-color"]');

export const temaGuardado = () => {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
};

export const temaActual = () =>
    document.documentElement.getAttribute('data-tema') === TEMA_OSCURO ? TEMA_OSCURO : TEMA_CLARO;

export const aplicarTema = (tema) => {
    if (tema === TEMA_OSCURO) document.documentElement.setAttribute('data-tema', TEMA_OSCURO);
    else document.documentElement.removeAttribute('data-tema');
    const m = metaThemeColor();
    if (m) m.setAttribute('content', tema === TEMA_OSCURO ? '#14161A' : '#F5F7F4');
};

// Cambio del usuario: aplica al instante y lo recuerda en este dispositivo
export const elegirTema = (tema) => {
    aplicarTema(tema);
    try { localStorage.setItem(KEY, tema); } catch (e) { /* modo privado */ }
};

// Arranque: si el usuario nunca eligió, seguimos al sistema (y sus cambios en vivo)
export const iniciarTema = () => {
    const guardado = temaGuardado();
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    aplicarTema(guardado || (mq && mq.matches ? TEMA_OSCURO : TEMA_CLARO));
    if (mq && !guardado) {
        mq.addEventListener('change', (e) => aplicarTema(e.matches ? TEMA_OSCURO : TEMA_CLARO));
    }
};
