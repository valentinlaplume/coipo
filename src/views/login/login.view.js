// src/views/login/login.view.js
import { authService } from '../../services/auth.service.js';
import { verificarDestinoUsuario } from '../../main.js';
import { mostrarToast, textoError, ponerCargando, quitarCargando } from '../dashboard/dashboard.view.js';

export const renderLogin = (container) => {
    container.innerHTML = `
        <div class="login-container fade-in">
            <div class="login-header">
                <h1 class="login-title">¡Hola!</h1>
                <p class="login-subtitle">Ingresá a tu cuenta de Coipo</p>
            </div>

            <form id="login-form" class="login-form">
                <div class="input-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" placeholder="tu@email.com" required>
                </div>

                <div class="input-group">
                    <label for="password">Contraseña</label>
                    <input type="password" id="password" placeholder="••••••••" required>
                    <a href="#" id="forgot-link" style="font-size: 0.8rem; text-align: center; margin-top: 5px; color: var(--coipo-text-muted); text-decoration: none;">Recuperar mi cuenta</a>
                </div>

                <button type="submit" class="btn-primary" id="login-btn">
                    Ingresar
                </button>
            </form>

            <div class="login-divider">
                <span>O</span>
            </div>

            <button class="btn-google" id="google-login-btn">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo">
                Continuar con Google
            </button>

            <div class="login-footer">
                <p>¿No tenés cuenta? <a href="#" id="go-to-register">Regístrate</a></p>
            </div>
        </div>
    `;

    // Dentro de renderLogin en src/views/login/login.view.js
    const googleBtn = container.querySelector('#google-login-btn');
    const loginForm = container.querySelector('#login-form');

    // Entrar con google
    googleBtn.addEventListener('click', async () => {
        googleBtn.innerText = "Cargando...";
        googleBtn.disabled = true;

        const { user, error } = await authService.loginWithGoogle();

        if (user) {
            // En lugar de un alert, verificamos el estado del usuario
            verificarDestinoUsuario(user);
        } else {
            googleBtn.innerText = "Continuar con Google";
            googleBtn.disabled = false;
            mostrarToast(textoError({ message: error }, 'No se pudo iniciar sesión'), 'error');
        }
    });

    // Entrar
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;

        ponerCargando(container.querySelector('#login-btn'), 'Ingresando...');

        const { user, error } = await authService.loginWithEmail(email, password);
        
        if (user) {
            // El observador de sesión (main.js) redirige solo — la navegación es la confirmación
            return;
        }
        quitarCargando(container.querySelector('#login-btn'));
        mostrarToast(textoError({ message: error }, 'Email o contraseña incorrectos'), 'error');
    });

    // Registro de cuenta
    const goToRegister = container.querySelector('#go-to-register');

    goToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        import('../register/register.view').then(module => {
            module.renderRegister(container);
        });
    });

    // Recupero de cuenta
    const forgotLink = container.querySelector('#forgot-link');
    forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        import('../forgot-password/forgot.view').then(m => m.renderForgot(container));
    });
};