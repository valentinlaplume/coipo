// src/views/splash/splash.view.js

// ELIMINAMOS: import logoPNG from '../../assets/logo.png'; 
// En Vanilla JS, usamos la ruta relativa directamente en el HTML.

export const renderSplash = (container) => {
    // Definimos la ruta como un string relativo al index.html
    const logoPath = './src/assets/logo.png'; 

    container.innerHTML = `
        <div class="splash-container fade-in">
            <div class="splash-content">
                <div class="splash-brand">
                    <img src="${logoPath}" alt="Coipo Profesor - Nutrición Inteligente" class="splash-logo-image">
                    <h1 class="logo-text">coipo</h1>
                </div>
                <span class="splash-tagline">Nutrición inteligente</span>
                
                <div class="splash-progress-track">
                    <div class="splash-progress-fill" id="splash-fill" style="width: 0%"></div>
                </div>
                <span class="splash-status" id="splash-status">Iniciando Coipo...</span>
            </div>
        </div>
    `;
};

export const updateSplashProgress = (percentage, statusText) => {
    const fill = document.getElementById('splash-fill');
    const status = document.getElementById('splash-status');
    if (fill) fill.style.width = `${percentage}%`;
    if (status) status.innerText = statusText;
};