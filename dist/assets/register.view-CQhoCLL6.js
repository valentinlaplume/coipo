const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./main-VNGwVBYm.js","./preload-helper-BVZ4TIVS.js"])))=>i.map(i=>d[i]);
import{f as e,r as t,s as n,t as r}from"./preload-helper-BVZ4TIVS.js";var i=i=>{i.innerHTML=`
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
    `;let a=i.querySelector(`#register-form`),o=i.querySelector(`#go-to-login`);a.addEventListener(`submit`,async r=>{r.preventDefault();let a=r.target[`reg-email`].value,o=r.target[`reg-password`].value,s=i.querySelector(`#register-btn`);s.innerText=`Creando cuenta...`,s.disabled=!0;let{user:c,error:l}=await e.registerWithEmail(a,o);c||(t(n({message:l},`No se pudo crear la cuenta`),`error`),s.innerText=`Registrarme`,s.disabled=!1)}),o.addEventListener(`click`,e=>{e.preventDefault(),r(()=>import(`./main-VNGwVBYm.js`).then(e=>e.t).then(e=>{e.renderLogin(i)}),__vite__mapDeps([0,1]),import.meta.url)})};export{i as renderRegister};