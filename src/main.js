// main.js
// import { onAuthStateChanged } from "firebase/auth";
// import { doc, getDoc } from "firebase/firestore";

import { auth, db } from './firebase-config.js'; // Asegurate de tener este archivo
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

import { renderSplash, updateSplashProgress } from './views/splash/splash.view.js';
import { renderLogin } from './views/login/login.view.js';
import { renderOnboarding } from './views/onboarding/onboarding.view.js';
import { renderDashboard, limpiarCacheDashboard } from './views/dashboard/dashboard.view.js';
import { iniciarTema } from './utils/tema.js';
import { activarSwipeBack, reiniciarHistorial } from './utils/gestos.js';

const appDiv = document.querySelector('#app');

async function startApp() {
    // 0. Tema (claro/oscuro): el inline de index.html ya lo aplicó; acá
    //    enganchamos los cambios del sistema si el usuario nunca eligió.
    iniciarTema();

    // 0b. Gestos (etapa 2): "volver" deslizando desde el borde izquierdo.
    //     Se activa una sola vez; sólo actúa con >1 pantalla en el historial
    //     y nunca con un modal abierto.
    activarSwipeBack();

    // 1. Mostrar Splash inicial
    renderSplash(appDiv);
    updateSplashProgress(30, "Iniciando Coipo...");

    // 2. Escuchar cambios en la autenticación (El Observador)
    // Esto se dispara automáticamente cuando el usuario se loguea o desloguea
    onAuthStateChanged(auth, async (user) => {
        // Historial nuevo por sesión: nunca "volver" restaure otra cuenta
        reiniciarHistorial();

        // Siempre limpiamos el cache del dashboard: evita que otro usuario
        // vea los datos del anterior (o datos viejos tras cerrar sesión)
        limpiarCacheDashboard();

        if (user) {
            updateSplashProgress(70, "Verificando perfil...");
            await verificarDestinoUsuario(user);
        } else {
            updateSplashProgress(100, "¡Bienvenido!");
            // Esperamos un toque para que se vea el 100% y mandamos al Login
            setTimeout(() => renderLogin(appDiv), 500);
        }
    });
}

// 3. Función de Tráfico: Decide Onboarding vs Dashboard
export async function verificarDestinoUsuario(user) {
    try {
        const userRef = doc(db, "usuarios", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && userSnap.data().onboarding_completado) {
            renderDashboard(appDiv, userSnap.data()); // <--- PASAMOS LOS DATOS
        } else {
            renderOnboarding(appDiv);
        }
    } catch (error) {
        // Sin este catch, un error de Firestore/red dejaba el splash cargando eternamente
        console.error("Error al verificar el perfil del usuario:", error);
        updateSplashProgress(100, "No pudimos cargar tu perfil 😕");
        setTimeout(() => renderLogin(appDiv), 800);
    }
}



startApp();