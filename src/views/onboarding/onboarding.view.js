// src/views/onboarding/onboarding.view.js
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';
import { auth, db } from "../../firebase-config.js";
import { calcularPlanNutricional } from '../../utils/nutrition-logic.js';
import { mostrarToast, textoError } from '../dashboard/dashboard.view.js';

let userData = {
    sexo: '',
    edad: '',
    altura: '',
    peso: '',
    objetivo: '',
    tipo_dieta: '',          // NUEVO
    ritmo_semanal: 300,
    alimentos_favoritos: [],
    frecuencia_comidas: 4,
    meta_agua: 3200,
    nivel_actividad: '',
    pasos_diarios: 5000,
    horas_sueno: 7,
    lesiones: '',
};

let currentStep = 1;
const totalSteps = 8; // +1 por el nuevo paso de tipo de dieta

export const renderOnboarding = (container) => {
    container.innerHTML = `
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
    `;

    const btnNext = container.querySelector('#btn-next');
    const btnBack = container.querySelector('#btn-back');

    renderStep(currentStep, container);
    updateUI(container);

    btnNext.addEventListener('click', () => {
        if (validateCurrentStep()) {
            saveCurrentStepData();
            if (currentStep < totalSteps) {
                currentStep++;
                renderStep(currentStep, container);
                updateUI(container);
            } else {
                finishOnboarding();
            }
        }
    });

    btnBack.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            renderStep(currentStep, container);
            updateUI(container);
        }
    });
};

const updateUI = (container) => {
    const progressBar = container.querySelector('#progress-bar');
    const stepIndicator = container.querySelector('#step-indicator');
    const btnBack = container.querySelector('#btn-back');
    const btnNext = container.querySelector('#btn-next');

    progressBar.style.width = `${(currentStep / totalSteps) * 100}%`;
    stepIndicator.innerText = `${currentStep} de ${totalSteps}`; // FIX: era hardcoded "1 de 5"

    btnBack.classList.toggle('hidden', currentStep === 1);
    btnNext.innerText = currentStep === totalSteps ? "Finalizar" : "Continuar";
};

const renderStep = (step, container) => {
    const content = container.querySelector('#step-content');
    content.innerHTML = '';

    switch (step) {

        // ─────────────────────────────────────────────
        // PASO 1: BIOMETRÍA
        // ─────────────────────────────────────────────
        case 1:
            if (!userData.edad)   userData.edad = 25;
            if (!userData.altura) userData.altura = 170;
            if (!userData.peso)   userData.peso = 70.0;
            if (!userData.sexo)   userData.sexo = 'hombre';

            content.innerHTML = `
                <div class="step-header">
                    <h2>Datos base</h2>
                    <p>Ajustá tus valores para un cálculo exacto.</p>
                </div>
                <div class="onboarding-cards-container">
                    <div class="input-card">
                        <label class="card-label">Sexo biológico</label>
                        <div class="pill-group">
                            <button class="pill ${userData.sexo === 'hombre' ? 'active' : ''}" data-type="sexo" data-value="hombre">Hombre</button>
                            <button class="pill ${userData.sexo === 'mujer' ? 'active' : ''}" data-type="sexo" data-value="mujer">Mujer</button>
                        </div>
                    </div>
                    <div class="input-card">
                        <label class="card-label">Edad</label>
                        <div class="counter-control">
                            <button class="cnt-btn" id="minus-edad">−</button>
                            <span class="value-display" id="display-edad">${userData.edad}</span>
                            <button class="cnt-btn" id="plus-edad">+</button>
                        </div>
                    </div>
                    <div class="input-card">
                        <div class="label-row">
                            <label class="card-label">Altura</label>
                            <span class="value-badge" id="display-altura">${userData.altura} cm</span>
                        </div>
                        <input type="range" id="input-altura" min="140" max="220" step="1" value="${userData.altura}" class="modern-slider">
                    </div>
                    <div class="input-card">
                        <div class="label-row">
                            <label class="card-label">Peso actual</label>
                            <span class="value-badge primary" id="display-peso">${userData.peso.toFixed(1)} kg</span>
                        </div>
                        <input type="range" id="input-peso" min="40" max="150" step="0.1" value="${userData.peso}" class="modern-slider">
                    </div>
                </div>
            `;

            const valEdadDisplay = content.querySelector('#display-edad');
            content.querySelector('#minus-edad').onclick = () => {
                if (userData.edad > 15) { userData.edad--; valEdadDisplay.innerText = userData.edad; }
            };
            content.querySelector('#plus-edad').onclick = () => {
                if (userData.edad < 90) { userData.edad++; valEdadDisplay.innerText = userData.edad; }
            };

            const setupSlider = (idName, unit) => {
                const slider = content.querySelector(`#input-${idName}`);
                const display = content.querySelector(`#display-${idName}`);
                slider.oninput = (e) => {
                    const val = parseFloat(e.target.value);
                    display.innerText = `${idName === 'peso' ? val.toFixed(1) : val}${unit}`;
                    userData[idName] = val;
                };
            };
            setupSlider('altura', ' cm');
            setupSlider('peso', ' kg');

            content.querySelectorAll('.pill[data-type="sexo"]').forEach(pill => {
                pill.onclick = (e) => {
                    content.querySelectorAll('.pill[data-type="sexo"]').forEach(p => p.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    userData.sexo = e.currentTarget.dataset.value;
                };
            });
            break;

        // ─────────────────────────────────────────────
        // PASO 2: OBJETIVO
        // FIX: 'ganar_musculo' → 'volumen' para que coincida con nutrition-logic.js
        // ─────────────────────────────────────────────
        case 2:
            content.innerHTML = `
                <div class="step-header"><h2>Tu meta</h2><p>¿Qué buscamos lograr?</p></div>
                <div class="options-vertical">
                    <button class="option-card ${userData.objetivo === 'perder_peso' ? 'active' : ''}" data-value="perder_peso">
                        <strong>📉 Perder Peso</strong>
                        <span>Déficit calórico controlado</span>
                    </button>
                    <button class="option-card ${userData.objetivo === 'mantener' ? 'active' : ''}" data-value="mantener">
                        <strong>⚖️ Mantener</strong>
                        <span>Composición corporal estable</span>
                    </button>
                    <button class="option-card ${userData.objetivo === 'volumen' ? 'active' : ''}" data-value="volumen">
                        <strong>💪 Ganar Músculo</strong>
                        <span>Superávit para síntesis muscular</span>
                    </button>
                </div>
            `;
            setupOptionCards(content, 'objetivo');
            break;

        // ─────────────────────────────────────────────
        // PASO 3: RITMO SEMANAL
        // ─────────────────────────────────────────────
        case 3:
            content.innerHTML = `
                <div class="step-header"><h2>Ritmo semanal</h2><p>Gramos por semana que querés mover.</p></div>
                <div class="slider-container">
                    <div class="weight-display"><span id="weight-val">${userData.ritmo_semanal}</span> g</div>
                    <input type="range" id="ritmo" min="100" max="1000" step="50" value="${userData.ritmo_semanal}">
                </div>
            `;
            content.querySelector('#ritmo').oninput = (e) => {
                content.querySelector('#weight-val').innerText = e.target.value;
                userData.ritmo_semanal = parseInt(e.target.value);
            };
            break;

        // ─────────────────────────────────────────────
        // PASO 4: TIPO DE DIETA — NUEVO
        // ─────────────────────────────────────────────
        case 4:
            if (!userData.tipo_dieta) userData.tipo_dieta = 'omnivoro';

            content.innerHTML = `
                <div class="step-header">
                    <h2>Tipo de alimentación</h2>
                    <p>Esto ajusta tus metas de micronutrientes y fuentes de nutrientes.</p>
                </div>
                <div class="options-vertical">
                    <button class="option-card ${userData.tipo_dieta === 'omnivoro' ? 'active' : ''}" data-value="omnivoro">
                        <strong>🍗 Omnívoro</strong>
                        <span>Como de todo: carnes, lácteos, vegetales</span>
                    </button>
                    <button class="option-card ${userData.tipo_dieta === 'pescetariano' ? 'active' : ''}" data-value="pescetariano">
                        <strong>🐟 Pescetariano</strong>
                        <span>Sin carne roja ni pollo, sí pescado</span>
                    </button>
                    <button class="option-card ${userData.tipo_dieta === 'vegetariano' ? 'active' : ''}" data-value="vegetariano">
                        <strong>🥗 Vegetariano</strong>
                        <span>Sin carnes, sí lácteos y huevos</span>
                    </button>
                    <button class="option-card ${userData.tipo_dieta === 'vegano' ? 'active' : ''}" data-value="vegano">
                        <strong>🌱 Vegano</strong>
                        <span>Solo alimentos de origen vegetal</span>
                    </button>
                </div>
                <div class="diet-info-box" id="diet-info">
                    ${getDietInfoText(userData.tipo_dieta)}
                </div>
            `;

            // Al elegir una dieta, actualizamos la tarjeta informativa dinámicamente
            content.querySelectorAll('.option-card').forEach(c => c.onclick = (e) => {
                content.querySelectorAll('.option-card').forEach(card => card.classList.remove('active'));
                e.currentTarget.classList.add('active');
                userData.tipo_dieta = e.currentTarget.dataset.value;
                content.querySelector('#diet-info').innerHTML = getDietInfoText(userData.tipo_dieta);
            });
            break;

        // ─────────────────────────────────────────────
        // PASO 5: MAPA DE ALIMENTOS
        // ─────────────────────────────────────────────
        case 5:
            const categoriasComida = {
                "Proteínas Animales": [
                    { id: 'pollo', nombre: 'Pollo 🍗' }, { id: 'vaca_magra', nombre: 'Carne de Vaca (Magra) 🥩' },
                    { id: 'pescado_blanco', nombre: 'Pescado Blanco 🐟' }, { id: 'salmon_atun', nombre: 'Salmón/Atún 🍣' },
                    { id: 'huevos', nombre: 'Huevos Enteros 🥚' }, { id: 'claras', nombre: 'Claras de Huevo 🥛' },
                    { id: 'cerdo_magro', nombre: 'Cerdo Magro 🥓' }, { id: 'pavo', nombre: 'Pavo 🦃' }
                ],
                "Proteínas Vegetales y Suplementos": [
                    { id: 'whey_protein', nombre: 'Whey Protein 🥛' }, { id: 'soja_arveja', nombre: 'Proteína de Soja/Arveja 🌿' },
                    { id: 'tofu', nombre: 'Tofu 🧊' }, { id: 'tempeh', nombre: 'Tempeh 🥗' }, { id: 'seitan', nombre: 'Seitán 🌾' },
                    { id: 'legumbres_proteina', nombre: 'Legumbres (Lentejas/Garbanzos) 🫘' }
                ],
                "Carbohidratos Complejos": [
                    { id: 'avena', nombre: 'Avena en Hojuelas 🥣' }, { id: 'arroz_integral', nombre: 'Arroz Integral/Yamani 🌾' },
                    { id: 'quinoa', nombre: 'Quinoa 🥗' }, { id: 'papa_batata', nombre: 'Papa/Batata 🥔' },
                    { id: 'cuscus', nombre: 'Cuscús 🥙' }, { id: 'legumbres_carbo', nombre: 'Legumbres (fuente carbos) 🫛' }
                ],
                "Harinas y Panificados": [
                    { id: 'harina_arvejas', nombre: 'Harina de Arvejas 🟢' }, { id: 'harina_almendras', nombre: 'Harina de Almendras 🥥' },
                    { id: 'pan_integral', nombre: 'Pan Integral/Semillas 🍞' }, { id: 'fideos_legumbres', nombre: 'Fideos de Legumbres 🍝' },
                    { id: 'harina_avena', nombre: 'Harina de Avena 🌾' }, { id: 'fideos_integrales', nombre: 'Fideos Integrales 🥖' }
                ],
                "Vegetales (Fibra y Micros)": [
                    { id: 'espinaca_kale', nombre: 'Espinaca/Kale 🥬' }, { id: 'brocoli_coliflor', nombre: 'Brócoli/Coliflor 🥦' },
                    { id: 'esparragos', nombre: 'Espárragos 🎋' }, { id: 'zucchini_zapallito', nombre: 'Zucchini/Zapallito 🥒' },
                    { id: 'pimientos', nombre: 'Pimientos 🫑' }, { id: 'zanahoria', nombre: 'Zanahoria 🥕' },
                    { id: 'champinones', nombre: 'Champiñones 🍄' }
                ],
                "Frutas e Hidratación": [
                    { id: 'banana', nombre: 'Banana 🍌' }, { id: 'frutilla_arandano', nombre: 'Frutillas/Arándanos 🍓' },
                    { id: 'manzana_pera', nombre: 'Manzana/Pera 🍎' }, { id: 'citricos', nombre: 'Cítricos 🍊' },
                    { id: 'sandia_melon', nombre: 'Sandía/Melón 🍉' }
                ],
                "Grasas Saludables": [
                    { id: 'palta', nombre: 'Palta 🥑' }, { id: 'nueces_almendras', nombre: 'Nueces/Almendras 🌰' },
                    { id: 'pasta_mani', nombre: 'Pasta de Maní 🥜' }, { id: 'aceite_oliva', nombre: 'Aceite de Oliva Extra Virgen 🫒' },
                    { id: 'semillas', nombre: 'Semillas (Chía/Lino) 🌻' }
                ],
                "Lácteos y Otros": [
                    { id: 'yogur_griego', nombre: 'Yogur Griego/Natural 🍦' }, { id: 'queso_magro', nombre: 'Queso Magro/Tybo 🧀' },
                    { id: 'leche_vegetal', nombre: 'Leche de Almendras/Coco 🥥' }, { id: 'ricotta_magra', nombre: 'Ricotta Magra 🥛' }
                ]
            };

            content.innerHTML = `
                <div class="step-container-fixed">
                    <div class="step-header">
                        <h2>Mapa de Alimentos</h2>
                        <p>Seleccioná lo que solés comer. Usaremos esto para tus recetas.</p>
                    </div>
                    <div class="food-selector-wrapper">
                        ${Object.keys(categoriasComida).map(cat => `
                            <div class="food-category-block">
                                <h3>${cat}</h3>
                                <div class="food-grid-pills">
                                    ${categoriasComida[cat].map(f => `
                                        <button class="food-pill ${userData.alimentos_favoritos.includes(f.id) ? 'active' : ''}"
                                                data-id="${f.id}">
                                            ${f.nombre}
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            setupFoodPills(content);
            break;

        // ─────────────────────────────────────────────
        // PASO 6: ACTIVIDAD FÍSICA
        // FIX: 'activo' → 'intenso' para que coincida con nutrition-logic.js
        // ─────────────────────────────────────────────
        case 6:
            content.innerHTML = `
                <div class="step-header"><h2>Actividad</h2><p>¿Cuánto te movés al día?</p></div>
                <div class="options-vertical">
                    <button class="option-card ${userData.nivel_actividad === 'sedentario' ? 'active' : ''}" data-value="sedentario">
                        <strong>🪑 Sedentario</strong><span>Oficina / Poco movimiento</span>
                    </button>
                    <button class="option-card ${userData.nivel_actividad === 'ligero' ? 'active' : ''}" data-value="ligero">
                        <strong>🚶 Ligero</strong><span>1-3 días de gym</span>
                    </button>
                    <button class="option-card ${userData.nivel_actividad === 'moderado' ? 'active' : ''}" data-value="moderado">
                        <strong>🏃 Moderado</strong><span>3-5 días de gym</span>
                    </button>
                    <button class="option-card ${userData.nivel_actividad === 'intenso' ? 'active' : ''}" data-value="intenso">
                        <strong>⚡ Muy Activo</strong><span>Entrenamiento diario fuerte</span>
                    </button>
                    <button class="option-card ${userData.nivel_actividad === 'atleta' ? 'active' : ''}" data-value="atleta">
                        <strong>🏅 Atleta</strong><span>Doble sesión / élite</span>
                    </button>
                </div>
            `;
            setupOptionCards(content, 'nivel_actividad');
            break;

        // ─────────────────────────────────────────────
        // PASO 7: SINTONÍA FINA
        // ─────────────────────────────────────────────
        case 7:
            content.innerHTML = `
                <div class="step-header">
                    <h2>Sintonía Fina</h2>
                    <p>Datos adicionales para ajustar tu recuperación y metabolismo.</p>
                </div>
                <div class="extra-metrics-container">
                    <div class="metric-box">
                        <label>Pasos diarios promedio 👣</label>
                        <div class="metric-display"><span id="steps-val">${userData.pasos_diarios}</span></div>
                        <input type="range" id="pasos" min="2000" max="15000" step="500" value="${userData.pasos_diarios}">
                        <span class="metric-info">El NEAT influye hasta un 30% en tu gasto total.</span>
                    </div>
                    <div class="metric-box">
                        <label>Horas de sueño 😴</label>
                        <div class="pill-group" id="sleep-pills">
                            ${[5, 6, 7, 8, 9].map(h => `
                                <button class="pill ${userData.horas_sueno == h ? 'active' : ''}" data-value="${h}">${h}h</button>
                            `).join('')}
                        </div>
                    </div>
                    <div class="metric-box">
                        <label>¿Alguna lesión o condición médica? 🩹</label>
                        <textarea id="lesiones" placeholder="Ej: Tendinitis rotuliana, asma, etc." rows="3">${userData.lesiones}</textarea>
                    </div>
                </div>
            `;

            content.querySelector('#pasos').oninput = (e) => {
                content.querySelector('#steps-val').innerText = e.target.value;
                userData.pasos_diarios = parseInt(e.target.value);
            };
            content.querySelectorAll('#sleep-pills .pill').forEach(btn => {
                btn.onclick = (e) => {
                    content.querySelectorAll('#sleep-pills .pill').forEach(p => p.classList.remove('active'));
                    e.target.classList.add('active');
                    userData.horas_sueno = parseInt(e.target.dataset.value);
                };
            });
            break;

        // ─────────────────────────────────────────────
        // PASO 8: RESUMEN FINAL
        // FIX: omega3 ahora es objeto → se renderizan sus propiedades correctamente
        // ─────────────────────────────────────────────
        case 8:
            const plan = calcularPlanNutricional(userData);
            userData.plan_nutricional = plan;
            userData.meta_agua = plan.agua;

            // Texto omega3 según tipo de dieta
            const omega3Text = plan.omega3.epa_dha_mg
                ? `EPA+DHA: <b>${plan.omega3.epa_dha_mg}mg</b>`
                : `ALA: <b>${plan.omega3.ala_mg}mg</b>`;

            // Alerta B12 si aplica
            const b12Alert = plan.vitaminaB12.requiere_suplemento
                ? `<div class="diet-alert">⚠️ ${plan.vitaminaB12.nota}</div>`
                : '';

            // Alerta omega3 vegano
            const omega3Alert = plan.omega3.nota
                ? `<div class="diet-alert">💊 ${plan.omega3.nota}</div>`
                : '';

            const labelDieta = {
                omnivoro: '🍗 Omnívoro', pescetariano: '🐟 Pescetariano',
                vegetariano: '🥗 Vegetariano', vegano: '🌱 Vegano'
            };
            const labelObjetivo = {
                perder_peso: 'Perder Peso', mantener: 'Mantener', volumen: 'Ganar Músculo'
            };

            content.innerHTML = `
                <div class="step-header">
                    <h2>¡Todo listo para tu transformación!</h2>
                    <p>Revisá tu perfil y ajustá los últimos detalles.</p>
                </div>

                <div class="review-container">
                    <div class="review-section">
                        <h3>👤 Perfil Personal</h3>
                        <div class="info-grid">
                            <div class="info-tag"><b>Edad:</b> ${userData.edad} años</div>
                            <div class="info-tag"><b>Peso:</b> ${userData.peso} kg</div>
                            <div class="info-tag"><b>Altura:</b> ${userData.altura} cm</div>
                            <div class="info-tag"><b>Objetivo:</b> <span class="highlight">${labelObjetivo[userData.objetivo]}</span></div>
                            <div class="info-tag"><b>Dieta:</b> <span class="highlight">${labelDieta[userData.tipo_dieta]}</span></div>
                        </div>
                    </div>

                    <div class="review-section">
                        <h3>⚡ Tu Meta Diaria</h3>
                        <div class="main-cards">
                            <div class="result-card primary">
                                <span>Calorías Meta</span>
                                <strong>${plan.kcal} kcal</strong>
                            </div>
                            <div class="result-card secondary">
                                <span>Agua Sugerida</span>
                                <strong>${(plan.agua / 1000).toFixed(1)} L</strong>
                            </div>
                        </div>
                        <div class="macros-bar-container">
                            <div class="macro-item"><span class="dot prot"></span><span>Proteína: <b>${plan.proteina}g</b></span></div>
                            <div class="macro-item"><span class="dot carb"></span><span>Carbos: <b>${plan.carbos}g</b></span></div>
                            <div class="macro-item"><span class="dot fat"></span><span>Grasas: <b>${plan.grasas}g</b></span></div>
                            <div class="macro-item"><span class="dot fiber"></span><span>Fibra: <b>${plan.fibra}g</b></span></div>
                        </div>
                    </div>

                    <div class="review-section">
                        <h3>❤️ Vitalidad y Micros</h3>
                        <p class="section-desc">Metas ajustadas a tu dieta <b>${labelDieta[userData.tipo_dieta]}</b>.</p>
                        <div class="micros-grid">
                            <div class="micro-pill">Magnesio: <b>${plan.magnesio}mg</b></div>
                            <div class="micro-pill">Potasio: <b>${plan.potasio}mg</b></div>
                            <div class="micro-pill">${omega3Text}</div>
                            <div class="micro-pill">Calcio: <b>${plan.calcio}mg</b></div>
                            <div class="micro-pill">Sodio máx: <b>${plan.sodio}mg</b></div>
                            <div class="micro-pill">Hierro: <b>${plan.hierro}mg</b></div>
                            <div class="micro-pill">Zinc: <b>${plan.zinc}mg</b></div>
                            <div class="micro-pill">Vit. D: <b>${plan.vitaminaD} UI</b></div>
                            <div class="micro-pill">B12: <b>${plan.vitaminaB12.meta_mcg}mcg</b></div>
                        </div>
                        ${b12Alert}
                        ${omega3Alert}
                    </div>

                    <div class="review-section">
                        <div class="adjustment-box">
                            <label>¿En cuántas comidas querés dividir el día?</label>
                            <div class="pill-group" id="freq-comidas">
                                ${[3, 4, 5, 6].map(n => `
                                    <button class="pill ${userData.frecuencia_comidas == n ? 'active' : ''}" data-value="${n}">${n}</button>
                                `).join('')}
                            </div>
                            <p class="info-text" id="proteina-por-comida">
                                Ideal para repartir tus <b>${Math.round(plan.proteina / userData.frecuencia_comidas)}g</b> de proteína por comida.
                            </p>
                        </div>
                        <div class="health-note">
                            <label>Notas de Salud:</label>
                            <p>${userData.lesiones || 'Sin lesiones reportadas. ¡Todo despejado!'}</p>
                        </div>
                    </div>
                </div>
            `;

            content.querySelectorAll('#freq-comidas .pill').forEach(btn => {
                btn.onclick = (e) => {
                    content.querySelectorAll('#freq-comidas .pill').forEach(p => p.classList.remove('active'));
                    const val = parseInt(e.target.dataset.value);
                    e.target.classList.add('active');
                    userData.frecuencia_comidas = val;
                    content.querySelector('#proteina-por-comida').innerHTML =
                        `Ideal para repartir tus <b>${Math.round(plan.proteina / val)}g</b> de proteína por comida.`;
                };
            });
            break;
    }
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

// FIX: setupOptionCards ahora recibe el key como parámetro (era hardcoded 'objetivo')
const setupOptionCards = (content, key) => {
    content.querySelectorAll('.option-card').forEach(c => c.onclick = (e) => {
        content.querySelectorAll('.option-card').forEach(card => card.classList.remove('active'));
        e.currentTarget.classList.add('active');
        userData[key] = e.currentTarget.dataset.value;
    });
};

const setupFoodPills = (content) => {
    content.querySelectorAll('.food-pill').forEach(p => p.onclick = (e) => {
        const target = e.currentTarget;
        target.classList.toggle('active');
        const foodId = target.dataset.id;
        if (target.classList.contains('active')) {
            if (!userData.alimentos_favoritos.includes(foodId)) userData.alimentos_favoritos.push(foodId);
        } else {
            userData.alimentos_favoritos = userData.alimentos_favoritos.filter(f => f !== foodId);
        }
    });
};

// Texto informativo dinámico del paso de tipo de dieta
const getDietInfoText = (tipo) => {
    const info = {
        omnivoro: `
            <p>✅ <b>Sin restricciones.</b> Tu plan incluirá todas las fuentes de nutrientes.</p>`,
        pescetariano: `
            <p>🐟 Tu plan prioriza <b>pescado como fuente de Omega-3 EPA+DHA</b> y proteína de calidad. Sin carne roja ni pollo.</p>`,
        vegetariano: `
            <p>🥗 Tu meta de <b>proteína sube un 10%</b> por menor biodisponibilidad vegetal.<br>
            Tu meta de <b>hierro sube un 80%</b> (hierro no hemo se absorbe 2-3x peor).<br>
            Tu meta de <b>zinc sube un 50%</b> (fitatos reducen la absorción).<br>
            Se incluye <b>alerta de B12</b> — necesitás suplemento.</p>`,
        vegano: `
            <p>🌱 Todo lo del vegetariano, más:<br>
            Tu meta de <b>calcio sube un 15%</b> (sin lácteos).<br>
            <b>Omega-3</b> vía ALA aumentado + recomendación de aceite de algas (DHA).<br>
            <b>B12 y Vitamina D</b> solo por suplemento.</p>`
    };
    return info[tipo] || '';
};

// ─────────────────────────────────────────────────────────────
// VALIDACIÓN Y GUARDADO
// ─────────────────────────────────────────────────────────────
const validateCurrentStep = () => {
    switch (currentStep) {
        case 1: return !!(userData.sexo && userData.edad && userData.altura && userData.peso);
        case 2: return !!userData.objetivo;
        case 4: return !!userData.tipo_dieta;
        case 6: return !!userData.nivel_actividad;
        default: return true;
    }
};

const saveCurrentStepData = () => {
    if (currentStep === 7) {
        userData.lesiones = document.getElementById('lesiones')?.value || '';
    }
};

const finishOnboarding = async () => {
    const user = auth.currentUser;
    if (!user) {
        mostrarToast('No hay una sesión activa', 'warning');
        setTimeout(() => location.reload(), 1500); // al recargar cae en el login
        return;
    }

    const btnNext = document.getElementById('btn-next');
    btnNext.innerText = "Guardando perfil...";
    btnNext.disabled = true;

    try {
        const perfilCompleto = {
            ...userData,
            uid: user.uid,
            email: user.email,
            onboarding_completado: true,
            fecha_registro: serverTimestamp(),
            configuracion_app: {
                notificaciones: true,
                unidad_medida: 'metrico'
            }
        };

        await setDoc(doc(db, "usuarios", user.uid), perfilCompleto);
        console.log("¡Perfil guardado con éxito en Firestore!");
        window.location.reload();

    } catch (error) {
        console.error("Error al finalizar el onboarding:", error);
        mostrarToast(textoError(error, 'No se pudieron guardar tus datos'), 'error');
        btnNext.innerText = "Finalizar";
        btnNext.disabled = false;
    }
};