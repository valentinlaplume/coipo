


// ## Resumen de lo que hace cada dieta
// ```
// omnivoro      → todo normal, EPA+DHA directo del pescado/carne
// pescetariano  → igual que omnívoro en omega-3, sin carne roja
// vegetariano   → proteína +10%, hierro x1.8, zinc x1.5, B12 con alerta, ALA x1.6
// vegano        → todo lo anterior + calcio +15% + alerta aceite de algas

export const calcularPlanNutricional = (data) => {
    const {
        edad,
        peso,
        altura,
        sexo,
        objetivo,
        nivel_actividad,
        tipo_dieta = 'omnivoro' // 'omnivoro' | 'pescetariano' | 'vegetariano' | 'vegano'
    } = data;

    const esHombre = sexo === 'hombre';
    const esMujer = !esHombre;

    // ─────────────────────────────────────────────────────────────
    // 1. TMB — Mifflin-St Jeor (Mifflin et al., 1990)
    // ─────────────────────────────────────────────────────────────
    let tmb = (10 * peso) + (6.25 * altura) - (5 * edad);
    tmb = esHombre ? tmb + 5 : tmb - 161;

    // ─────────────────────────────────────────────────────────────
    // 2. GASTO ENERGÉTICO TOTAL — PAL (OMS/FAO 2001)
    // ─────────────────────────────────────────────────────────────
    const factoresActividad = {
        'sedentario': 1.2,
        'ligero':     1.375,
        'moderado':   1.55,
        'intenso':    1.725,
        'atleta':     1.9
    };
    const mantenimiento = tmb * (factoresActividad[nivel_actividad] ?? 1.2);

    // ─────────────────────────────────────────────────────────────
    // 3. CALORÍAS META — Déficit/Superávit sostenible
    //    Ref: Trexler et al., 2014 | ISSN 2014
    // ─────────────────────────────────────────────────────────────
    let kcalMeta;
    if (objetivo === 'perder_peso') {
        kcalMeta = mantenimiento * 0.80;
    } else if (objetivo === 'volumen') {
        kcalMeta = mantenimiento * 1.10;
    } else {
        kcalMeta = mantenimiento;
    }
    // Piso de seguridad OMS: evita deficiencias micronutricionales
    const kcalMinima = esHombre ? 1500 : 1200;
    kcalMeta = Math.max(kcalMeta, kcalMinima);

    // ─────────────────────────────────────────────────────────────
    // 4. PROTEÍNA — Por edad, objetivo y dieta
    //    Ref: ISSN Position Stand 2017 | ESPEN 2019
    //
    //    Las dietas vegetarianas/veganas usan proteína de menor
    //    calidad biológica (menor PDCAAS/DIAAS), por lo que se
    //    incrementa el ratio un 10% para compensar.
    //    Ref: Rogerson, 2017 — Journal of the ISSN
    // ─────────────────────────────────────────────────────────────
    let ratioProteina;

    if (edad >= 65) {
        const proteinaAdultoMayor = {
            'perder_peso': 1.8,
            'volumen':     1.6,
            'mantener':    1.2
        };
        ratioProteina = proteinaAdultoMayor[objetivo] ?? 1.2;
    } else {
        const proteinaPorObjetivo = {
            'perder_peso': 2.2,
            'volumen':     1.8,
            'mantener':    1.6
        };
        ratioProteina = proteinaPorObjetivo[objetivo] ?? 1.6;
    }

    // Ajuste por baja biodisponibilidad proteica en dietas plant-based
    if (tipo_dieta === 'vegetariano' || tipo_dieta === 'vegano') {
        ratioProteina = +(ratioProteina * 1.1).toFixed(2); // +10% compensación DIAAS
    }

    const proteinaGrams = Math.round(peso * ratioProteina);

    // ─────────────────────────────────────────────────────────────
    // 5. GRASAS — Con piso mínimo por salud hormonal
    //    Mínimo 0.7g/kg (Hamalainen et al., 1984 | ISSN)
    // ─────────────────────────────────────────────────────────────
    const ratioGrasa = objetivo === 'mantener' ? 0.30 : 0.25;
    const grasaCalculada = Math.round((kcalMeta * ratioGrasa) / 9);
    const grasaMinima = Math.round(peso * 0.7);
    const grasaGrams = Math.max(grasaCalculada, grasaMinima);

    // ─────────────────────────────────────────────────────────────
    // 6. CARBOHIDRATOS — Con piso mínimo cerebral (OMS: 100g/día)
    // ─────────────────────────────────────────────────────────────
    const kcalRestantes = kcalMeta - (proteinaGrams * 4) - (grasaGrams * 9);
    const carboGrams = Math.max(Math.round(kcalRestantes / 4), 100);

    // kcal real resultante de los macros finales
    const kcalReal = (proteinaGrams * 4) + (grasaGrams * 9) + (carboGrams * 4);

    // ─────────────────────────────────────────────────────────────
    // 7. FIBRA — EFSA/OMS: 14g por 1000 kcal
    // ─────────────────────────────────────────────────────────────
    const fibraGrams = Math.round((kcalMeta / 1000) * 14);

    // ─────────────────────────────────────────────────────────────
    // 8. AGUA — EFSA: 35ml/kg + ajuste por actividad
    // ─────────────────────────────────────────────────────────────
    let aguaMl = peso * 35;
    if      (nivel_actividad === 'atleta')   aguaMl += 1000;
    else if (nivel_actividad === 'intenso')  aguaMl += 750;
    else if (nivel_actividad === 'moderado') aguaMl += 500;

    // ─────────────────────────────────────────────────────────────
    // 9. MICRONUTRIENTES
    // ─────────────────────────────────────────────────────────────

    // — SODIO (mg) ————————————————————————————————————————————————
    // OMS: <2000mg | AHA: <2300mg general, <1500mg si >50 años
    const sodio = edad > 50 ? 1500 : 2300;

    // — MAGNESIO (mg) —————————————————————————————————————————————
    // NIH RDA diferenciado por sexo y edad
    let magnesio;
    if      (edad < 19)  magnesio = esHombre ? 410 : 360; // 14–18 años
    else if (edad <= 30) magnesio = esHombre ? 400 : 310; // 19–30 años
    else                 magnesio = esHombre ? 420 : 320; // 31+ años

    // — POTASIO (mg) ——————————————————————————————————————————————
    // OMS: 3510mg mínimo | Atletas: 4700mg (AI EEUU)
    const potasio = nivel_actividad === 'sedentario' ? 3500 : 4700;

    // — CALCIO (mg) ———————————————————————————————————————————————
    // NIH diferenciado por edad
    // Veganos: sin lácteos, se aumenta 15% por menor biodisponibilidad
    // del calcio vegetal (oxalatos inhiben absorción). Ref: Weaver et al., 1999
    let calcioBase;
    if      (edad < 18)  calcioBase = 1300;
    else if (edad > 70)  calcioBase = 1200;
    else                 calcioBase = 1000;

    const calcio = tipo_dieta === 'vegano'
        ? Math.round(calcioBase * 1.15)
        : calcioBase;

    // — VITAMINA D (UI) ———————————————————————————————————————————
    // NIH RDA: adultos 600 UI | >70 años: 800 UI
    const vitaminaD = edad > 70 ? 800 : 600;

    // — HIERRO (mg) ———————————————————————————————————————————————
    // NIH diferenciado por sexo/edad
    // Vegetarianos/veganos: el hierro no hemo (vegetal) tiene
    // biodisponibilidad del ~10% vs ~25% del hemo (animal).
    // La OMS recomienda multiplicar la meta x1.8 en dietas plant-based.
    let hierroBase;
    if      (edad < 19)                  hierroBase = esHombre ? 11 : 15;
    else if (esMujer && edad <= 50)      hierroBase = 18;
    else                                 hierroBase = 8;

    const hierro = (tipo_dieta === 'vegetariano' || tipo_dieta === 'vegano')
        ? Math.round(hierroBase * 1.8)
        : hierroBase;

    // — ZINC (mg) —————————————————————————————————————————————————
    // NIH RDA por sexo/edad
    // Vegetarianos/veganos: los fitatos de granos y legumbres reducen
    // absorción ~30%. OMS recomienda aumentar entre 50% en dietas veganas.
    // Ref: Hunt, 2003 — Journal of Nutrition
    let zincBase;
    if      (edad < 19)  zincBase = esHombre ? 11 : 9;
    else                 zincBase = esHombre ? 11 : 8;

    const zinc = (tipo_dieta === 'vegetariano' || tipo_dieta === 'vegano')
        ? Math.round(zincBase * 1.5)
        : zincBase;

    // — VITAMINA B12 (mcg) ————————————————————————————————————————
    // NIH RDA adultos: 2.4mcg/día
    // Vegetarianos y veganos no tienen fuentes dietéticas confiables.
    // Se marca necesidad de suplementación. Ref: NIH | Watanabe, 2007
    const vitaminaB12 = {
        meta_mcg: 2.4,
        requiere_suplemento: tipo_dieta === 'vegano' || tipo_dieta === 'vegetariano',
        nota: (tipo_dieta === 'vegano' || tipo_dieta === 'vegetariano')
            ? 'La B12 no está presente en alimentos vegetales. Se requiere suplementación diaria o semanal.'
            : null
    };

    // — OMEGA-3 ———————————————————————————————————————————————————
    // Ref: AHA | OMS | NIH | Davis & Kris-Etherton, 2003
    //
    // Omnívoro / Pescetariano:
    //   → Meta principal: 500mg EPA+DHA/día (OMS — prevención cardiovascular)
    //   → ALA: referencia adicional (AHA)
    //
    // Vegetariano / Vegano:
    //   → No consumen EPA/DHA directamente.
    //   → Solo ALA (semillas, nueces). Conversión a EPA/DHA: 5–10% (OMS).
    //   → Meta ALA aumentada para compensar la baja conversión.
    //   → Se recomienda alga DHA como alternativa vegana a fish oil.
    //   Ref: Geppert et al., 2005 | Sarter et al., 2015
    let omega3;

    if (tipo_dieta === 'omnivoro' || tipo_dieta === 'pescetariano') {
        omega3 = {
            epa_dha_mg: 500,        // Meta principal OMS (cardiovascular)
            ala_mg: esHombre ? 1600 : 1100, // Referencia AHA adicional
            fuentes: tipo_dieta === 'pescetariano'
                ? ['salmón', 'sardinas', 'atún', 'caballa', 'suplemento fish oil']
                : ['salmón', 'sardinas', 'atún', 'nueces', 'semillas de lino', 'suplemento fish oil'],
            nota: null
        };
    } else {
        // Vegetariano / Vegano
        // ALA aumentado ~60% para intentar cubrir conversión baja a EPA/DHA
        const alaBase = esHombre ? 1600 : 1100;
        omega3 = {
            epa_dha_mg: null,       // No aplica — no consumen directamente
            ala_mg: Math.round(alaBase * 1.6), // Meta aumentada por baja conversión
            fuentes: ['semillas de chía', 'semillas de lino', 'nueces', 'cáñamo', 'aceite de lino'],
            nota: 'La conversión de ALA a EPA/DHA es del 5–10%. Se recomienda suplementar con aceite de algas (alga DHA) para cubrir la meta cardiovascular de 500mg EPA+DHA.'
        };
    }

    // ─────────────────────────────────────────────────────────────
    // RETURN
    // ─────────────────────────────────────────────────────────────
    return {
        // Energía
        tmb:           Math.round(tmb),
        mantenimiento: Math.round(mantenimiento),
        kcal:          Math.round(kcalReal),

        // Macronutrientes
        proteina: proteinaGrams,
        grasas:   grasaGrams,
        carbos:   carboGrams,
        fibra:    fibraGrams,

        // Hidratación
        agua: Math.round(aguaMl),

        // Micronutrientes
        sodio,
        magnesio,
        potasio,
        calcio,
        vitaminaD,
        hierro,
        zinc,
        vitaminaB12,
        omega3,

        // Metadata útil para la UI
        meta: {
            tipo_dieta,
            ajuste_proteina_dieta: tipo_dieta === 'vegetariano' || tipo_dieta === 'vegano'
                ? '+10% por baja biodisponibilidad proteica vegetal (DIAAS)'
                : null
        }
    };
};
