// src/views/forgot-password/forgot.view.js
import { authService } from '../../services/auth.service.js';
import { mostrarToast, textoError } from '../dashboard/dashboard.view.js';

export const renderForgot = (container) => {
    container.innerHTML = `
        <div class="login-container fade-in">
            <div class="login-header">
                <h1 class="login-title">Recuperar cuenta</h1>
                <p class="login-subtitle">Te enviaremos un link para elegir una nueva contraseña.</p>
            </div>

            <form id="forgot-form" class="login-form">
                <div class="input-group">
                    <label for="forgot-email">Tu Email</label>
                    <input type="email" id="forgot-email" placeholder="tu@email.com" required>
                </div>

                <button type="submit" class="btn-primary" id="forgot-btn">
                    Enviar link
                </button>
            </form>

            <div class="login-footer">
                <p><a href="#" id="back-to-login">Volver al inicio</a></p>
            </div>
        </div>
    `;

    const forgotForm = container.querySelector('#forgot-form');
    const backBtn = container.querySelector('#back-to-login');

    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target['forgot-email'].value;
        const submitBtn = container.querySelector('#forgot-btn');

        submitBtn.innerText = "Enviando...";
        submitBtn.disabled = true;

        const { success, error } = await authService.resetPassword(email);

        if (success) {
            // Cambiamos el contenido para confirmar el envío
            container.querySelector('.login-form').innerHTML = `
                <div class="success-message">
                    <p>¡Listo! Revisá tu casilla de correo (y la carpeta de spam).</p>
                    <button class="btn-primary" id="btn-done">Entendido</button>
                </div>
            `;
            container.querySelector('#btn-done').addEventListener('click', () => {
                location.reload(); // O volver al login
            });
        } else {
            mostrarToast(textoError({ message: error }, 'No se pudo enviar el email'), 'error');
            submitBtn.innerText = "Enviar link";
            submitBtn.disabled = false;
        }
    });

    backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        import('../login/login.view').then(m => m.renderLogin(container));
    });
};