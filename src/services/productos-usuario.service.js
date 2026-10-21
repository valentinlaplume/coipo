// src/services/productos-usuario.service.js
// Productos cargados por el USUARIO: los que cargó a mano o los que estimó
// con IA y quedaron guardados en su colección personal
// `usuarios/{uid}/productos` (las reglas de Firestore ya dejan leer/escribir
// las subcolecciones del propio usuario).
//
// Es la PRIMERA fuente de la búsqueda de alimentos (ver
// src/services/buscar-alimentos.service.js y dashboard.view.js): si el usuario
// ya cargó "flan casero", aparece antes que cualquier resultado de Open Food
// Facts. La coincidencia es por texto normalizado (minúsculas, sin tildes,
// espacios simples), tolerando que falte o sobre una palabra.
//
// Los documentos se guardan con el MISMO shape que usa el escáner
// (`{ nombre, marca, por_100g }` más los metadatos de esta base), así que
// `productoDesdeResultado` los puede consumir igual que a los de OFF.

import { db } from '../firebase-config.js';
import {
    collection, doc, getDocs, increment, limit, query, serverTimestamp, setDoc, updateDoc
} from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

const COLECCION = 'productos';
const MAX_LEIDOS = 200;   // tope de lecturas por búsqueda (base personal chica)
const MAX_RESULTADOS = 5; // cuántos productos propios mostramos como máximo
const MIN_COINCIDENCIA = 3;

// Minúsculas, sin tildes, espacios simples (mismo criterio que el backend)
export const normalizarTexto = (texto) => String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// Id determinístico: "Flan casero / La Serenísima" → "flan-casero-la-serenisima"
// (mismo producto cargado dos veces → el mismo doc, se actualiza en vez de duplicar)
const idProducto = (nombre, marca) => {
    const base = normalizarTexto(`${nombre || ''} ${marca || ''}`)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
    return base || `p-${Date.now()}`;
};

// null/undefined/'' → null (sin dato). Number(null) daría 0: no queremos
// convertir "no hay dato" en consumo cero.
const numero = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

// ── Coincidencia por texto ──────────────────────────────────────────────────
// 0 = exacto · 1 = empieza con · 2 = todas las palabras · 3 = la más distintiva
const puntuar = (consulta, texto) => {
    if (!texto || !consulta) return -1;
    if (texto === consulta) return 0;
    if (texto.startsWith(consulta)) return 1;

    const palabras = consulta.split(' ').filter(p => p.length >= MIN_COINCIDENCIA);
    if (!palabras.length) return -1;

    if (palabras.length > 1 && palabras.every(p => texto.includes(p))) return 2;

    const clave = palabras.reduce((mejor, p) => (p.length >= mejor.length ? p : mejor), palabras[0]);
    return texto.includes(clave) ? 3 : -1;
};

// ── Documento de Firestore → resultado con el MISMO shape que los de OFF ────
const aResultado = (d) => {
    const por100 = d && typeof d.por_100g === 'object' ? d.por_100g : {};
    const kcal100 = numero(por100.calorias);
    const nombre = typeof d.nombre === 'string' ? d.nombre.trim() : '';

    // Mismo criterio que el backend: sin nombre o sin kcal/100 g → descartado
    if (!nombre || kcal100 === null || kcal100 <= 0) return null;

    return {
        codigo: null,
        nombre,
        marca: typeof d.marca === 'string' && d.marca.trim() ? d.marca.trim() : null,
        imagen: typeof d.imagen_url === 'string' ? d.imagen_url : null,
        kcal100,
        p100: numero(por100.proteinas) ?? 0,
        c100: numero(por100.carbohidratos) ?? 0,
        g100: numero(por100.grasas) ?? 0,
        // Micros: null = sin dato (se muestran como "—")
        fibra100: numero(por100.fibra),
        sodio100_mg: numero(por100.sodio_mg),
        azucares100: numero(por100.azucares_g),
        porcion_g: numero(d.porcion_g),
        fuente: 'propio'
    };
};

/**
 * Busca en la colección del usuario por texto normalizado sin tildes.
 * Devuelve los mismos campos que el backend, listos para pintar.
 * Nunca tira: si Firestore no responde, devolvemos [] y sigue Open Food Facts.
 */
export const buscarProductosUsuario = async (uid, consulta) => {
    if (!uid) return [];
    const texto = normalizarTexto(consulta);
    if (texto.length < MIN_COINCIDENCIA) return [];

    try {
        const col = collection(db, 'usuarios', uid, COLECCION);
        const snap = await getDocs(query(col, limit(MAX_LEIDOS)));

        const coincidencias = [];
        snap.forEach((docSnap) => {
            const d = docSnap.data() || {};
            const haystack = normalizarTexto(`${d.nombre || ''} ${d.marca || ''}`);
            const puntos = puntuar(texto, haystack);
            if (puntos < 0) return;

            const resultado = aResultado(d);
            if (resultado) coincidencias.push({ puntos, veces: numero(d.veces_usado) || 0, resultado });
        });

        return coincidencias
            .sort((a, b) => a.puntos - b.puntos || b.veces - a.veces)
            .slice(0, MAX_RESULTADOS)
            .map(c => c.resultado);
    } catch (e) {
        console.warn('⚠️ Sin productos propios (Firestore):', e?.message || e);
        return [];
    }
};

/**
 * Guarda un producto del usuario (cargado a mano o estimado con IA).
 * Se llama al registrar la comida: así la próxima búsqueda ya lo encuentra.
 */
export const guardarProductoUsuario = async (uid, producto) => {
    if (!uid || !producto?.nombre) return false;

    const kcal = numero(producto.por_100g?.calorias);
    if (kcal === null || kcal <= 0) return false; // sin kcal no sirve para buscar

    try {
        const ref = doc(db, 'usuarios', uid, COLECCION, idProducto(producto.nombre, producto.marca));
        await setDoc(ref, {
            nombre: String(producto.nombre).trim().slice(0, 120),
            marca: producto.marca ? String(producto.marca).trim().slice(0, 80) : null,
            imagen_url: typeof producto.imagen_url === 'string' ? producto.imagen_url : null,
            porcion_g: numero(producto.porcion_g),
            por_100g: {
                calorias: kcal,
                proteinas: numero(producto.por_100g.proteinas) ?? 0,
                carbohidratos: numero(producto.por_100g.carbohidratos) ?? 0,
                grasas: numero(producto.por_100g.grasas) ?? 0,
                fibra: numero(producto.por_100g.fibra),
                sodio_mg: numero(producto.por_100g.sodio_mg),
                azucares_g: numero(producto.por_100g.azucares_g)
            },
            origen: producto.origen === 'manual' ? 'manual' : 'ia',
            veces_usado: increment(1),
            creado_el: serverTimestamp(),
            uso_el: serverTimestamp()
        }, { merge: true });
        return true;
    } catch (e) {
        console.warn('⚠️ No se pudo guardar el producto propio:', e?.message || e);
        return false;
    }
};

/**
 * Guarda en lote los items de una comida registrada (IA o manual).
 * Cada item viene en formato porción ({ alimento, marca, gramos_estimados,
 * calorias, ... }): se convierte a por 100 g con regla de tres INVERSA.
 * Nunca corta el registro de la comida: los errores solo se avisan.
 */
export const guardarItemsComoProductos = async (uid, items) => {
    if (!uid || !Array.isArray(items) || items.length === 0) return;

    for (const item of items) {
        const gramos = Number(item?.gramos_estimados) || 0;
        if (!item?.alimento || gramos <= 0) continue;
        // Los que ya vinieron de Open Food Facts NO se guardan acá: los cubre
        // la propia búsqueda de OFF (evita duplicados en la lista)
        if (item.fuente_datos === 'openfoodfacts') continue;

        const f = 100 / gramos; // porción → por 100 g
        await guardarProductoUsuario(uid, {
            nombre: item.alimento,
            marca: item.marca || null,
            origen: item.origen || 'ia',
            por_100g: {
                calorias: (Number(item.calorias) || 0) * f,
                proteinas: (Number(item.proteinas) || 0) * f,
                carbohidratos: (Number(item.carbohidratos) || 0) * f,
                grasas: (Number(item.grasas) || 0) * f,
                fibra: item.fibra == null ? null : (Number(item.fibra) || 0) * f
            }
        });
    }
};

/** Marca el uso de un producto propio (sube en futuras búsquedas). */
export const registrarUsoProducto = async (uid, nombre, marca) => {
    if (!uid || !nombre) return;
    try {
        const ref = doc(db, 'usuarios', uid, COLECCION, idProducto(nombre, marca));
        await updateDoc(ref, {
            veces_usado: increment(1),
            uso_el: serverTimestamp()
        });
    } catch (e) {
        console.warn('⚠️ No se pudo registrar el uso:', e?.message || e);
    }
};

// Auxiliares para tests
export const _interno = { puntuar, aResultado, idProducto, COLECCION, MAX_RESULTADOS };
