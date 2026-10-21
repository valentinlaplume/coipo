const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./register.view-Ch852J6V.js","./preload-helper-BzujO3ED.js","./forgot.view-CC8Q_sQd.js"])))=>i.map(i=>d[i]);
import{a as e,c as t,d as n,f as r,i,l as a,m as o,n as s,o as c,p as l,r as u,s as d,t as f,u as p}from"./preload-helper-BzujO3ED.js";import{onAuthStateChanged as m}from"https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";import{doc as h,getDoc as g,serverTimestamp as _,setDoc as v}from"https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";var y=Object.defineProperty,b=(e,t)=>{let n={};for(var r in e)y(n,r,{get:e[r],enumerable:!0});return t||y(n,Symbol.toStringTag,{value:`Module`}),n},x=e=>{e.innerHTML=`
        <div class="splash-container fade-in">
            <div class="splash-content">
                <div class="splash-brand">
                    <img src="./src/assets/logo.png" alt="Coipo Profesor - Nutrición Inteligente" class="splash-logo-image">
                    <h1 class="logo-text">coipo</h1>
                </div>
                <span class="splash-tagline">Nutrición inteligente</span>
                
                <div class="splash-progress-track">
                    <div class="splash-progress-fill" id="splash-fill" style="width: 0%"></div>
                </div>
                <span class="splash-status" id="splash-status">Iniciando Coipo...</span>
            </div>
        </div>
    `},S=(e,t)=>{let n=document.getElementById(`splash-fill`),r=document.getElementById(`splash-status`);n&&(n.style.width=`${e}%`),r&&(r.innerText=t)},C=b({renderLogin:()=>w}),w=t=>{t.innerHTML=`
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
    `;let n=t.querySelector(`#google-login-btn`),a=t.querySelector(`#login-form`);n.addEventListener(`click`,async()=>{n.innerText=`Cargando...`,n.disabled=!0;let{user:e,error:t}=await r.loginWithGoogle();e?z(e):(n.innerText=`Continuar con Google`,n.disabled=!1,u(d({message:t},`No se pudo iniciar sesión`),`error`))}),a.addEventListener(`submit`,async n=>{n.preventDefault();let a=n.target.email.value,o=n.target.password.value;i(t.querySelector(`#login-btn`),`Ingresando...`);let{user:s,error:c}=await r.loginWithEmail(a,o);s||(e(t.querySelector(`#login-btn`)),u(d({message:c},`Email o contraseña incorrectos`),`error`))}),t.querySelector(`#go-to-register`).addEventListener(`click`,e=>{e.preventDefault(),f(()=>import(`./register.view-Ch852J6V.js`).then(e=>{e.renderRegister(t)}),__vite__mapDeps([0,1]),import.meta.url)}),t.querySelector(`#forgot-link`).addEventListener(`click`,e=>{e.preventDefault(),f(()=>import(`./forgot.view-CC8Q_sQd.js`).then(e=>e.renderForgot(t)),__vite__mapDeps([2,1]),import.meta.url)})},T={sexo:``,edad:``,altura:``,peso:``,objetivo:``,tipo_dieta:``,ritmo_semanal:300,alimentos_favoritos:[],frecuencia_comidas:4,meta_agua:3200,nivel_actividad:``,pasos_diarios:5e3,horas_sueno:7,lesiones:``},E=1,D=8,O=e=>{e.innerHTML=`
        <div class="onboarding-layout">
            <header class="onboarding-header">
                <button id="btn-back" class="btn-icon hidden">←</button>
                <div class="progress-container">
                    <div class="progress-bar" id="progress-bar"></div>
                </div>
                <span class="step-indicator" id="step-indicator"></span>
            </header>
            <main class="onboarding-content" id="step-content"></main>
            <footer class="onboarding-footer">
                <button class="btn-primary full-width" id="btn-next">Continuar</button>
            </footer>
        </div>
    `;let t=e.querySelector(`#btn-next`),n=e.querySelector(`#btn-back`);A(E,e),k(e),t.addEventListener(`click`,()=>{P()&&(F(),E<D?(E++,A(E,e),k(e)):I())}),n.addEventListener(`click`,()=>{E>1&&(E--,A(E,e),k(e))})},k=e=>{let t=e.querySelector(`#progress-bar`),n=e.querySelector(`#step-indicator`),r=e.querySelector(`#btn-back`),i=e.querySelector(`#btn-next`);t.style.width=`${E/D*100}%`,n.innerText=`${E} de ${D}`,r.classList.toggle(`hidden`,E===1),i.innerText=E===D?`Finalizar`:`Continuar`},A=(e,t)=>{let r=t.querySelector(`#step-content`);switch(r.innerHTML=``,e){case 1:T.edad||=25,T.altura||=170,T.peso||=70,T.sexo||=`hombre`,r.innerHTML=`
                <div class="step-header">
                    <h2>Datos base</h2>
                    <p>Ajustá tus valores para un cálculo exacto.</p>
                </div>
                <div class="onboarding-cards-container">
                    <div class="input-card">
                        <label class="card-label">Sexo biológico</label>
                        <div class="pill-group">
                            <button class="pill ${T.sexo===`hombre`?`active`:``}" data-type="sexo" data-value="hombre">Hombre</button>
                            <button class="pill ${T.sexo===`mujer`?`active`:``}" data-type="sexo" data-value="mujer">Mujer</button>
                        </div>
                    </div>
                    <div class="input-card">
                        <label class="card-label">Edad</label>
                        <div class="counter-control">
                            <button class="cnt-btn" id="minus-edad">−</button>
                            <span class="value-display" id="display-edad">${T.edad}</span>
                            <button class="cnt-btn" id="plus-edad">+</button>
                        </div>
                    </div>
                    <div class="input-card">
                        <div class="label-row">
                            <label class="card-label">Altura</label>
                            <span class="value-badge" id="display-altura">${T.altura} cm</span>
                        </div>
                        <input type="range" id="input-altura" min="140" max="220" step="1" value="${T.altura}" class="modern-slider">
                    </div>
                    <div class="input-card">
                        <div class="label-row">
                            <label class="card-label">Peso actual</label>
                            <span class="value-badge primary" id="display-peso">${T.peso.toFixed(1)} kg</span>
                        </div>
                        <input type="range" id="input-peso" min="40" max="150" step="0.1" value="${T.peso}" class="modern-slider">
                    </div>
                </div>
            `;let e=r.querySelector(`#display-edad`);r.querySelector(`#minus-edad`).onclick=()=>{T.edad>15&&(T.edad--,e.innerText=T.edad)},r.querySelector(`#plus-edad`).onclick=()=>{T.edad<90&&(T.edad++,e.innerText=T.edad)};let t=(e,t)=>{let n=r.querySelector(`#input-${e}`),i=r.querySelector(`#display-${e}`);n.oninput=n=>{let r=parseFloat(n.target.value);i.innerText=`${e===`peso`?r.toFixed(1):r}${t}`,T[e]=r}};t(`altura`,` cm`),t(`peso`,` kg`),r.querySelectorAll(`.pill[data-type="sexo"]`).forEach(e=>{e.onclick=e=>{r.querySelectorAll(`.pill[data-type="sexo"]`).forEach(e=>e.classList.remove(`active`)),e.currentTarget.classList.add(`active`),T.sexo=e.currentTarget.dataset.value}});break;case 2:r.innerHTML=`
                <div class="step-header"><h2>Tu meta</h2><p>¿Qué buscamos lograr?</p></div>
                <div class="options-vertical">
                    <button class="option-card ${T.objetivo===`perder_peso`?`active`:``}" data-value="perder_peso">
                        <strong>📉 Perder Peso</strong>
                        <span>Déficit calórico controlado</span>
                    </button>
                    <button class="option-card ${T.objetivo===`mantener`?`active`:``}" data-value="mantener">
                        <strong>⚖️ Mantener</strong>
                        <span>Composición corporal estable</span>
                    </button>
                    <button class="option-card ${T.objetivo===`volumen`?`active`:``}" data-value="volumen">
                        <strong>💪 Ganar Músculo</strong>
                        <span>Superávit para síntesis muscular</span>
                    </button>
                </div>
            `,j(r,`objetivo`);break;case 3:r.innerHTML=`
                <div class="step-header"><h2>Ritmo semanal</h2><p>Gramos por semana que querés mover.</p></div>
                <div class="slider-container">
                    <div class="weight-display"><span id="weight-val">${T.ritmo_semanal}</span> g</div>
                    <input type="range" id="ritmo" min="100" max="1000" step="50" value="${T.ritmo_semanal}">
                </div>
            `,r.querySelector(`#ritmo`).oninput=e=>{r.querySelector(`#weight-val`).innerText=e.target.value,T.ritmo_semanal=parseInt(e.target.value)};break;case 4:T.tipo_dieta||=`omnivoro`,r.innerHTML=`
                <div class="step-header">
                    <h2>Tipo de alimentación</h2>
                    <p>Esto ajusta tus metas de micronutrientes y fuentes de nutrientes.</p>
                </div>
                <div class="options-vertical">
                    <button class="option-card ${T.tipo_dieta===`omnivoro`?`active`:``}" data-value="omnivoro">
                        <strong>🍗 Omnívoro</strong>
                        <span>Como de todo: carnes, lácteos, vegetales</span>
                    </button>
                    <button class="option-card ${T.tipo_dieta===`pescetariano`?`active`:``}" data-value="pescetariano">
                        <strong>🐟 Pescetariano</strong>
                        <span>Sin carne roja ni pollo, sí pescado</span>
                    </button>
                    <button class="option-card ${T.tipo_dieta===`vegetariano`?`active`:``}" data-value="vegetariano">
                        <strong>🥗 Vegetariano</strong>
                        <span>Sin carnes, sí lácteos y huevos</span>
                    </button>
                    <button class="option-card ${T.tipo_dieta===`vegano`?`active`:``}" data-value="vegano">
                        <strong>🌱 Vegano</strong>
                        <span>Solo alimentos de origen vegetal</span>
                    </button>
                </div>
                <div class="diet-info-box" id="diet-info">
                    ${N(T.tipo_dieta)}
                </div>
            `,r.querySelectorAll(`.option-card`).forEach(e=>e.onclick=e=>{r.querySelectorAll(`.option-card`).forEach(e=>e.classList.remove(`active`)),e.currentTarget.classList.add(`active`),T.tipo_dieta=e.currentTarget.dataset.value,r.querySelector(`#diet-info`).innerHTML=N(T.tipo_dieta)});break;case 5:let i={"Proteínas Animales":[{id:`pollo`,nombre:`Pollo 🍗`},{id:`vaca_magra`,nombre:`Carne de Vaca (Magra) 🥩`},{id:`pescado_blanco`,nombre:`Pescado Blanco 🐟`},{id:`salmon_atun`,nombre:`Salmón/Atún 🍣`},{id:`huevos`,nombre:`Huevos Enteros 🥚`},{id:`claras`,nombre:`Claras de Huevo 🥛`},{id:`cerdo_magro`,nombre:`Cerdo Magro 🥓`},{id:`pavo`,nombre:`Pavo 🦃`}],"Proteínas Vegetales y Suplementos":[{id:`whey_protein`,nombre:`Whey Protein 🥛`},{id:`soja_arveja`,nombre:`Proteína de Soja/Arveja 🌿`},{id:`tofu`,nombre:`Tofu 🧊`},{id:`tempeh`,nombre:`Tempeh 🥗`},{id:`seitan`,nombre:`Seitán 🌾`},{id:`legumbres_proteina`,nombre:`Legumbres (Lentejas/Garbanzos) 🫘`}],"Carbohidratos Complejos":[{id:`avena`,nombre:`Avena en Hojuelas 🥣`},{id:`arroz_integral`,nombre:`Arroz Integral/Yamani 🌾`},{id:`quinoa`,nombre:`Quinoa 🥗`},{id:`papa_batata`,nombre:`Papa/Batata 🥔`},{id:`cuscus`,nombre:`Cuscús 🥙`},{id:`legumbres_carbo`,nombre:`Legumbres (fuente carbos) 🫛`}],"Harinas y Panificados":[{id:`harina_arvejas`,nombre:`Harina de Arvejas 🟢`},{id:`harina_almendras`,nombre:`Harina de Almendras 🥥`},{id:`pan_integral`,nombre:`Pan Integral/Semillas 🍞`},{id:`fideos_legumbres`,nombre:`Fideos de Legumbres 🍝`},{id:`harina_avena`,nombre:`Harina de Avena 🌾`},{id:`fideos_integrales`,nombre:`Fideos Integrales 🥖`}],"Vegetales (Fibra y Micros)":[{id:`espinaca_kale`,nombre:`Espinaca/Kale 🥬`},{id:`brocoli_coliflor`,nombre:`Brócoli/Coliflor 🥦`},{id:`esparragos`,nombre:`Espárragos 🎋`},{id:`zucchini_zapallito`,nombre:`Zucchini/Zapallito 🥒`},{id:`pimientos`,nombre:`Pimientos 🫑`},{id:`zanahoria`,nombre:`Zanahoria 🥕`},{id:`champinones`,nombre:`Champiñones 🍄`}],"Frutas e Hidratación":[{id:`banana`,nombre:`Banana 🍌`},{id:`frutilla_arandano`,nombre:`Frutillas/Arándanos 🍓`},{id:`manzana_pera`,nombre:`Manzana/Pera 🍎`},{id:`citricos`,nombre:`Cítricos 🍊`},{id:`sandia_melon`,nombre:`Sandía/Melón 🍉`}],"Grasas Saludables":[{id:`palta`,nombre:`Palta 🥑`},{id:`nueces_almendras`,nombre:`Nueces/Almendras 🌰`},{id:`pasta_mani`,nombre:`Pasta de Maní 🥜`},{id:`aceite_oliva`,nombre:`Aceite de Oliva Extra Virgen 🫒`},{id:`semillas`,nombre:`Semillas (Chía/Lino) 🌻`}],"Lácteos y Otros":[{id:`yogur_griego`,nombre:`Yogur Griego/Natural 🍦`},{id:`queso_magro`,nombre:`Queso Magro/Tybo 🧀`},{id:`leche_vegetal`,nombre:`Leche de Almendras/Coco 🥥`},{id:`ricotta_magra`,nombre:`Ricotta Magra 🥛`}]};r.innerHTML=`
                <div class="step-container-fixed">
                    <div class="step-header">
                        <h2>Mapa de Alimentos</h2>
                        <p>Seleccioná lo que solés comer. Usaremos esto para tus recetas.</p>
                    </div>
                    <div class="food-selector-wrapper">
                        ${Object.keys(i).map(e=>`
                            <div class="food-category-block">
                                <h3>${e}</h3>
                                <div class="food-grid-pills">
                                    ${i[e].map(e=>`
                                        <button class="food-pill ${T.alimentos_favoritos.includes(e.id)?`active`:``}"
                                                data-id="${e.id}">
                                            ${e.nombre}
                                        </button>
                                    `).join(``)}
                                </div>
                            </div>
                        `).join(``)}
                    </div>
                </div>
            `,M(r);break;case 6:r.innerHTML=`
                <div class="step-header"><h2>Actividad</h2><p>¿Cuánto te movés al día?</p></div>
                <div class="options-vertical">
                    <button class="option-card ${T.nivel_actividad===`sedentario`?`active`:``}" data-value="sedentario">
                        <strong>🪑 Sedentario</strong><span>Oficina / Poco movimiento</span>
                    </button>
                    <button class="option-card ${T.nivel_actividad===`ligero`?`active`:``}" data-value="ligero">
                        <strong>🚶 Ligero</strong><span>1-3 días de gym</span>
                    </button>
                    <button class="option-card ${T.nivel_actividad===`moderado`?`active`:``}" data-value="moderado">
                        <strong>🏃 Moderado</strong><span>3-5 días de gym</span>
                    </button>
                    <button class="option-card ${T.nivel_actividad===`intenso`?`active`:``}" data-value="intenso">
                        <strong>⚡ Muy Activo</strong><span>Entrenamiento diario fuerte</span>
                    </button>
                    <button class="option-card ${T.nivel_actividad===`atleta`?`active`:``}" data-value="atleta">
                        <strong>🏅 Atleta</strong><span>Doble sesión / élite</span>
                    </button>
                </div>
            `,j(r,`nivel_actividad`);break;case 7:r.innerHTML=`
                <div class="step-header">
                    <h2>Sintonía Fina</h2>
                    <p>Datos adicionales para ajustar tu recuperación y metabolismo.</p>
                </div>
                <div class="extra-metrics-container">
                    <div class="metric-box">
                        <label>Pasos diarios promedio 👣</label>
                        <div class="metric-display"><span id="steps-val">${T.pasos_diarios}</span></div>
                        <input type="range" id="pasos" min="2000" max="15000" step="500" value="${T.pasos_diarios}">
                        <span class="metric-info">El NEAT influye hasta un 30% en tu gasto total.</span>
                    </div>
                    <div class="metric-box">
                        <label>Horas de sueño 😴</label>
                        <div class="pill-group" id="sleep-pills">
                            ${[5,6,7,8,9].map(e=>`
                                <button class="pill ${T.horas_sueno==e?`active`:``}" data-value="${e}">${e}h</button>
                            `).join(``)}
                        </div>
                    </div>
                    <div class="metric-box">
                        <label>¿Alguna lesión o condición médica? 🩹</label>
                        <textarea id="lesiones" placeholder="Ej: Tendinitis rotuliana, asma, etc." rows="3">${T.lesiones}</textarea>
                    </div>
                </div>
            `,r.querySelector(`#pasos`).oninput=e=>{r.querySelector(`#steps-val`).innerText=e.target.value,T.pasos_diarios=parseInt(e.target.value)},r.querySelectorAll(`#sleep-pills .pill`).forEach(e=>{e.onclick=e=>{r.querySelectorAll(`#sleep-pills .pill`).forEach(e=>e.classList.remove(`active`)),e.target.classList.add(`active`),T.horas_sueno=parseInt(e.target.dataset.value)}});break;case 8:let a=n(T);T.plan_nutricional=a,T.meta_agua=a.agua;let o=a.omega3.epa_dha_mg?`EPA+DHA: <b>${a.omega3.epa_dha_mg}mg</b>`:`ALA: <b>${a.omega3.ala_mg}mg</b>`,s=a.vitaminaB12.requiere_suplemento?`<div class="diet-alert">⚠️ ${a.vitaminaB12.nota}</div>`:``,c=a.omega3.nota?`<div class="diet-alert">💊 ${a.omega3.nota}</div>`:``,l={omnivoro:`🍗 Omnívoro`,pescetariano:`🐟 Pescetariano`,vegetariano:`🥗 Vegetariano`,vegano:`🌱 Vegano`};r.innerHTML=`
                <div class="step-header">
                    <h2>¡Todo listo para tu transformación!</h2>
                    <p>Revisá tu perfil y ajustá los últimos detalles.</p>
                </div>

                <div class="review-container">
                    <div class="review-section">
                        <h3>👤 Perfil Personal</h3>
                        <div class="info-grid">
                            <div class="info-tag"><b>Edad:</b> ${T.edad} años</div>
                            <div class="info-tag"><b>Peso:</b> ${T.peso} kg</div>
                            <div class="info-tag"><b>Altura:</b> ${T.altura} cm</div>
                            <div class="info-tag"><b>Objetivo:</b> <span class="highlight">${{perder_peso:`Perder Peso`,mantener:`Mantener`,volumen:`Ganar Músculo`}[T.objetivo]}</span></div>
                            <div class="info-tag"><b>Dieta:</b> <span class="highlight">${l[T.tipo_dieta]}</span></div>
                        </div>
                    </div>

                    <div class="review-section">
                        <h3>⚡ Tu Meta Diaria</h3>
                        <div class="main-cards">
                            <div class="result-card primary">
                                <span>Calorías Meta</span>
                                <strong>${a.kcal} kcal</strong>
                            </div>
                            <div class="result-card secondary">
                                <span>Agua Sugerida</span>
                                <strong>${(a.agua/1e3).toFixed(1)} L</strong>
                            </div>
                        </div>
                        <div class="macros-bar-container">
                            <div class="macro-item"><span class="dot prot"></span><span>Proteína: <b>${a.proteina}g</b></span></div>
                            <div class="macro-item"><span class="dot carb"></span><span>Carbos: <b>${a.carbos}g</b></span></div>
                            <div class="macro-item"><span class="dot fat"></span><span>Grasas: <b>${a.grasas}g</b></span></div>
                            <div class="macro-item"><span class="dot fiber"></span><span>Fibra: <b>${a.fibra}g</b></span></div>
                        </div>
                    </div>

                    <div class="review-section">
                        <h3>❤️ Vitalidad y Micros</h3>
                        <p class="section-desc">Metas ajustadas a tu dieta <b>${l[T.tipo_dieta]}</b>.</p>
                        <div class="micros-grid">
                            <div class="micro-pill">Magnesio: <b>${a.magnesio}mg</b></div>
                            <div class="micro-pill">Potasio: <b>${a.potasio}mg</b></div>
                            <div class="micro-pill">${o}</div>
                            <div class="micro-pill">Calcio: <b>${a.calcio}mg</b></div>
                            <div class="micro-pill">Sodio máx: <b>${a.sodio}mg</b></div>
                            <div class="micro-pill">Hierro: <b>${a.hierro}mg</b></div>
                            <div class="micro-pill">Zinc: <b>${a.zinc}mg</b></div>
                            <div class="micro-pill">Vit. D: <b>${a.vitaminaD} UI</b></div>
                            <div class="micro-pill">B12: <b>${a.vitaminaB12.meta_mcg}mcg</b></div>
                        </div>
                        ${s}
                        ${c}
                    </div>

                    <div class="review-section">
                        <div class="adjustment-box">
                            <label>¿En cuántas comidas querés dividir el día?</label>
                            <div class="pill-group" id="freq-comidas">
                                ${[3,4,5,6].map(e=>`
                                    <button class="pill ${T.frecuencia_comidas==e?`active`:``}" data-value="${e}">${e}</button>
                                `).join(``)}
                            </div>
                            <p class="info-text" id="proteina-por-comida">
                                Ideal para repartir tus <b>${Math.round(a.proteina/T.frecuencia_comidas)}g</b> de proteína por comida.
                            </p>
                        </div>
                        <div class="health-note">
                            <label>Notas de Salud:</label>
                            <p>${T.lesiones||`Sin lesiones reportadas. ¡Todo despejado!`}</p>
                        </div>
                    </div>
                </div>
            `,r.querySelectorAll(`#freq-comidas .pill`).forEach(e=>{e.onclick=e=>{r.querySelectorAll(`#freq-comidas .pill`).forEach(e=>e.classList.remove(`active`));let t=parseInt(e.target.dataset.value);e.target.classList.add(`active`),T.frecuencia_comidas=t,r.querySelector(`#proteina-por-comida`).innerHTML=`Ideal para repartir tus <b>${Math.round(a.proteina/t)}g</b> de proteína por comida.`}});break}},j=(e,t)=>{e.querySelectorAll(`.option-card`).forEach(n=>n.onclick=n=>{e.querySelectorAll(`.option-card`).forEach(e=>e.classList.remove(`active`)),n.currentTarget.classList.add(`active`),T[t]=n.currentTarget.dataset.value})},M=e=>{e.querySelectorAll(`.food-pill`).forEach(e=>e.onclick=e=>{let t=e.currentTarget;t.classList.toggle(`active`);let n=t.dataset.id;t.classList.contains(`active`)?T.alimentos_favoritos.includes(n)||T.alimentos_favoritos.push(n):T.alimentos_favoritos=T.alimentos_favoritos.filter(e=>e!==n)})},N=e=>({omnivoro:`
            <p>✅ <b>Sin restricciones.</b> Tu plan incluirá todas las fuentes de nutrientes.</p>`,pescetariano:`
            <p>🐟 Tu plan prioriza <b>pescado como fuente de Omega-3 EPA+DHA</b> y proteína de calidad. Sin carne roja ni pollo.</p>`,vegetariano:`
            <p>🥗 Tu meta de <b>proteína sube un 10%</b> por menor biodisponibilidad vegetal.<br>
            Tu meta de <b>hierro sube un 80%</b> (hierro no hemo se absorbe 2-3x peor).<br>
            Tu meta de <b>zinc sube un 50%</b> (fitatos reducen la absorción).<br>
            Se incluye <b>alerta de B12</b> — necesitás suplemento.</p>`,vegano:`
            <p>🌱 Todo lo del vegetariano, más:<br>
            Tu meta de <b>calcio sube un 15%</b> (sin lácteos).<br>
            <b>Omega-3</b> vía ALA aumentado + recomendación de aceite de algas (DHA).<br>
            <b>B12 y Vitamina D</b> solo por suplemento.</p>`})[e]||``,P=()=>{switch(E){case 1:return!!(T.sexo&&T.edad&&T.altura&&T.peso);case 2:return!!T.objetivo;case 4:return!!T.tipo_dieta;case 6:return!!T.nivel_actividad;default:return!0}},F=()=>{E===7&&(T.lesiones=document.getElementById(`lesiones`)?.value||``)},I=async()=>{let e=l.currentUser;if(!e){u(`No hay una sesión activa`,`warning`),setTimeout(()=>location.reload(),1500);return}let t=document.getElementById(`btn-next`);t.innerText=`Guardando perfil...`,t.disabled=!0;try{let t={...T,uid:e.uid,email:e.email,onboarding_completado:!0,fecha_registro:_(),configuracion_app:{notificaciones:!0,unidad_medida:`metrico`}};await v(h(o,`usuarios`,e.uid),t),console.log(`¡Perfil guardado con éxito en Firestore!`),window.location.reload()}catch(e){console.error(`Error al finalizar el onboarding:`,e),u(d(e,`No se pudieron guardar tus datos`),`error`),t.innerText=`Finalizar`,t.disabled=!1}},L=document.querySelector(`#app`);async function R(){t(),a(),x(L),S(30,`Iniciando Coipo...`),m(l,async e=>{p(),s(),e?(S(70,`Verificando perfil...`),await z(e)):(S(100,`¡Bienvenido!`),setTimeout(()=>w(L),500))})}async function z(e){try{let t=await g(h(o,`usuarios`,e.uid));t.exists()&&t.data().onboarding_completado?c(L,t.data()):O(L)}catch(e){console.error(`Error al verificar el perfil del usuario:`,e),S(100,`No pudimos cargar tu perfil 😕`),setTimeout(()=>w(L),800)}}R();export{C as t};