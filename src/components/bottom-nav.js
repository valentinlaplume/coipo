// src/components/bottom-nav.js
// ÚNICO componente de navegación inferior: mismo HTML y mismo aspecto en
// Dashboard, Diario, Sugerencias y Perfil. Las vistas sólo pasan handlers.

const ITEM = (destino, icono, texto, activo) => `
    <button type="button" class="nav-item${activo ? ' active' : ''}"
            data-nav="${destino}"
            ${activo ? 'aria-current="page"' : ''}>
        <span class="nav-icon" aria-hidden="true">${icono}</span>
        <span class="nav-texto">${texto}</span>
    </button>`;

/**
 * HTML de la barra: Hoy · Diario · [+] Registrar · Sugerencias · Perfil.
 * @param {'hoy'|'diario'|'sugerencias'|'perfil'} activo
 */
export const bottomNavHTML = (activo) => `
    <nav class="bottom-nav" aria-label="Navegación principal">
        ${ITEM('hoy', '🏠', 'Hoy', activo === 'hoy')}
        ${ITEM('diario', '📅', 'Diario', activo === 'diario')}
        <button type="button" class="nav-item nav-add" data-nav="registrar"
                aria-label="Registrar comida">
            <span class="nav-add-circle" aria-hidden="true">+</span>
            <span class="nav-add-label">Registrar</span>
        </button>
        ${ITEM('sugerencias', '💡', 'Ideas', activo === 'sugerencias')}
        ${ITEM('perfil', '⚙️', 'Perfil', activo === 'perfil')}
    </nav>`;

/**
 * Conecta los botones de la barra ya insertada en el contenedor.
 * @param {HTMLElement} container
 * @param {Record<string, Function>} handlers
 */
export const conectarBottomNav = (container, handlers = {}) => {
    const nav = container.querySelector('.bottom-nav');
    if (!nav) return;
    nav.querySelectorAll('[data-nav]').forEach(btn => {
        const accion = handlers[btn.dataset.nav];
        btn.onclick = typeof accion === 'function' ? accion : null;
    });
};
