// src/views/register/register.view.js
import { authService } from '../../services/auth.service.js';
import { mostrarToast, textoError } from '../dashboard/dashboard.view.js';

export const renderRegister = (container) => {
    container.innerHTML = `
        <div class="login-container fade-in">
            <div class="login-header">
                <h1 class="login-title">Crear cuenta</h1>
                <p class="login-subtitle">Empezá tu camino saludable con Coipo</p>
            </div>

            <form id="register-form" class="login-form">
                <div class="input-group">
                    <label for="reg-email">Email</label>
                    <input type="email" id="reg-email" placeholder="tu@email.com" required>
                </div>

                <div class="input-group">
                    <label for="reg-password">Contraseña</label>
                    <input type="password" id="reg-password" placeholder="Mínimo 6 caracteres" required>
                </div>

                <button type="submit" class="btn-primary" id="register-btn">
                    Registrarme
                </button>
            </form>

            <div class="login-footer">
                <p>¿Ya tenés cuenta? <a href="#" id="go-to-login">Iniciá sesión</a></p>
            </div>
        </div>
    `;

    const registerForm = container.querySelector('#register-form');
    const goToLogin = container.querySelector('#go-to-login');

    // Lógica de Registro
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target['reg-email'].value;
        const password = e.target['reg-password'].value;

        const submitBtn = container.querySelector('#register-btn');
        submitBtn.innerText = "Creando cuenta...";
        submitBtn.disabled = true;

        const { user, error } = await authService.registerWithEmail(email, password);

        if (user) {
            // El observador de sesión (main.js) lleva al onboarding — sin alerts
            return;
        }
        mostrarToast(textoError({ message: error }, 'No se pudo crear la cuenta'), 'error');
        submitBtn.innerText = "Registrarme";
        submitBtn.disabled = false;
    });

    // Navegación de vuelta al Login
    goToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        // Importación dinámica para evitar referencias circulares
        import('../login/login.view').then(module => {
            module.renderLogin(container);
        });
    });
};