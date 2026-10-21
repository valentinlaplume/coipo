const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./main-VQvkDICc.js","./preload-helper-BzujO3ED.js"])))=>i.map(i=>d[i]);
import{f as e,r as t,s as n,t as r}from"./preload-helper-BzujO3ED.js";var i=i=>{i.innerHTML=`
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
    `;let a=i.querySelector(`#forgot-form`),o=i.querySelector(`#back-to-login`);a.addEventListener(`submit`,async r=>{r.preventDefault();let a=r.target[`forgot-email`].value,o=i.querySelector(`#forgot-btn`);o.innerText=`Enviando...`,o.disabled=!0;let{success:s,error:c}=await e.resetPassword(a);s?(i.querySelector(`.login-form`).innerHTML=`
                <div class="success-message">
                    <p>¡Listo! Revisá tu casilla de correo (y la carpeta de spam).</p>
                    <button class="btn-primary" id="btn-done">Entendido</button>
                </div>
            `,i.querySelector(`#btn-done`).addEventListener(`click`,()=>{location.reload()})):(t(n({message:c},`No se pudo enviar el email`),`error`),o.innerText=`Enviar link`,o.disabled=!1)}),o.addEventListener(`click`,e=>{e.preventDefault(),r(()=>import(`./main-VQvkDICc.js`).then(e=>e.t).then(e=>e.renderLogin(i)),__vite__mapDeps([0,1]),import.meta.url)})};export{i as renderForgot};