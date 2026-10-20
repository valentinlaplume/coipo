// src/services/product-scanner.service.js
import { 
    doc, getDoc, setDoc, updateDoc, increment, serverTimestamp, writeBatch
} from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';
import { db } from "../firebase-config.js";
import { buscarProductoPorNombreSimilar } from './openfoodfacts.service.js';

// ─────────────────────────────────────────────────────────────
// CONSTANTES Y HELPERS
// ─────────────────────────────────────────────────────────────
const TIMEOUT_MS = 5000;

const normalizarId = (texto) => 
    texto.toLowerCase().trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_");

const obtenerNutriente = (nutrientes = {}, key, factor = 1) => {
    const valor = nutrientes[key];
    return typeof valor === 'number' && !isNaN(valor) ? Number(valor) * factor : 0;
};

const redondear = (valor, decimales = 1) => {
    if (typeof valor !== 'number' || isNaN(valor)) return 0;
    return Math.round(valor * Math.pow(10, decimales)) / Math.pow(10, decimales);
};

// ─────────────────────────────────────────────────────────────
// FETCH CON TIMEOUT
// ─────────────────────────────────────────────────────────────
const fetchConTimeout = async (url, timeout = TIMEOUT_MS) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
};

// ─────────────────────────────────────────────────────────────
// 1. BUSCAR EN OPEN FOOD FACTS POR CÓDIGO
// ─────────────────────────────────────────────────────────────
export const buscarEnOpenFoodFacts = async (barcode) => {
    if (!barcode || typeof barcode !== 'string') {
        console.warn('❌ Código de barras inválido');
        return null;
    }

    try {
        const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
        const res = await fetchConTimeout(url);

        if (!res.ok) {
            console.warn(`⚠️ HTTP ${res.status} para código ${barcode}`);
            return null;
        }

        const data = await res.json();
        if (data.status !== 1 || !data.product) {
            return null;
        }

        const p = data.product;
        const n = p.nutriments ?? {};

        return {
            barcode,
            nombre: p.product_name || p.product_name_es || 'Producto sin nombre',
            marca: p.brands ?? null,
            imagen_url: p.image_front_url ?? null,
            por_100g: {
                calorias: obtenerNutriente(n, 'energy-kcal_100g'),
                proteinas: obtenerNutriente(n, 'proteins_100g'),
                carbohidratos: obtenerNutriente(n, 'carbohydrates_100g'),
                grasas: obtenerNutriente(n, 'fat_100g'),
                fibra: obtenerNutriente(n, 'fiber_100g'),
                sodio_mg: obtenerNutriente(n, 'sodium_100g', 1000),
                potasio_mg: obtenerNutriente(n, 'potassium_100g'),
                magnesio_mg: obtenerNutriente(n, 'magnesium_100g'),
                calcio_mg: obtenerNutriente(n, 'calcium_100g'),
                hierro_mg: obtenerNutriente(n, 'iron_100g'),
                zinc_mg: obtenerNutriente(n, 'zinc_100g'),
                omega3: {
                    ala_mg: obtenerNutriente(n, 'alpha-linolenic-acid_100g'),
                    epa_dha_mg: obtenerNutriente(n, 'epa_100g') + obtenerNutriente(n, 'dha_100g')
                }
            },
            fuente: 'openfoodfacts'
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn(`⏱️ Timeout buscando código ${barcode}`);
        } else {
            console.warn(`❌ Error en OFF (código):`, error.message);
        }
        return null;
    }
};

// ─────────────────────────────────────────────────────────────
// 2. BUSCAR EN OPEN FOOD FACTS POR NOMBRE (sin Cloud Function)
// ─────────────────────────────────────────────────────────────
export const buscarEnOpenFoodFactsPorNombre = async (nombreIngrediente) => {
    if (!nombreIngrediente || typeof nombreIngrediente !== 'string') {
        console.warn('❌ Nombre de ingrediente inválido');
        return null;
    }

    try {
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(nombreIngrediente)}&search_simple=1&action=process&json=1&page_size=1`;
        
        const res = await fetchConTimeout(url);
        
        if (!res.ok) {
            console.warn(`⚠️ HTTP ${res.status} en búsqueda por nombre`);
            return null;
        }

        const data = await res.json();
        
        if (!data.products || !Array.isArray(data.products) || data.products.length === 0) {
            console.log(`⚠️ No hay resultados para "${nombreIngrediente}"`);
            return null;
        }

        const p = data.products[0];
        const n = p.nutriments || {};

        return {
            nombre: p.product_name || nombreIngrediente,
            por_100g: {
                calorias: obtenerNutriente(n, 'energy-kcal_100g'),
                proteinas: obtenerNutriente(n, 'proteins_100g'),
                carbohidratos: obtenerNutriente(n, 'carbohydrates_100g'),
                grasas: obtenerNutriente(n, 'fat_100g'),
                fibra: obtenerNutriente(n, 'fiber_100g'),
                sodio_mg: obtenerNutriente(n, 'sodium_100g', 1000),
                potasio_mg: obtenerNutriente(n, 'potassium_100g'),
                magnesio_mg: obtenerNutriente(n, 'magnesium_100g'),
                calcio_mg: obtenerNutriente(n, 'calcium_100g'),
                hierro_mg: obtenerNutriente(n, 'iron_100g'),
                zinc_mg: obtenerNutriente(n, 'zinc_100g'),
                omega3: {
                    ala_mg: obtenerNutriente(n, 'alpha-linolenic-acid_100g'),
                    epa_dha_mg: obtenerNutriente(n, 'epa_100g') + obtenerNutriente(n, 'dha_100g')
                }
            }
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn(`⏱️ Timeout buscando "${nombreIngrediente}"`);
        } else {
            console.warn(`❌ Error en OFF (nombre):`, error.message);
        }
        return null;
    }
};

// ─────────────────────────────────────────────────────────────
// 3. BUSCAR PRODUCTO (BD local → OFF por código)
// ─────────────────────────────────────────────────────────────
export const buscarProducto = async (barcode) => {
    if (!barcode) return null;

    try {
        const ref = doc(db, 'productos_globales', barcode);
        const snap = await getDoc(ref);

        if (snap.exists()) {
            console.log('✅ Producto encontrado en BD local');
            await updateDoc(ref, { 
                veces_escaneado: increment(1),
                ultimo_escaneo: serverTimestamp()
            });
            return { ...snap.data(), fuente: 'base_propia' };
        }

        // Si no existe en BD, buscar en OFF
        console.log(`🔍 Buscando código ${barcode} en OpenFoodFacts...`);
        const productoOFF = await buscarEnOpenFoodFacts(barcode);
        return productoOFF;
    } catch (error) {
        console.warn(`❌ Error buscando producto:`, error.message);
        return null;
    }
};

// ─────────────────────────────────────────────────────────────
// 4. GUARDAR PRODUCTO NUEVO
// ─────────────────────────────────────────────────────────────
export const guardarProducto = async (userId, productoData) => {
    if (!userId || !productoData?.barcode) {
        console.warn('❌ Faltan datos: userId o barcode');
        return false;
    }

    try {
        const { barcode } = productoData;
        const ref = doc(db, 'productos_globales', barcode);
        const snap = await getDoc(ref);

        if (snap.exists()) {
            await updateDoc(ref, {
                veces_escaneado: increment(1),
                ultimo_aportante: userId,
                ultimo_escaneo: serverTimestamp()
            });
            console.log('📈 Producto existente actualizado');
            return true;
        }

        await setDoc(ref, {
            ...productoData,
            aportado_por: userId,
            verificado: false,
            veces_escaneado: 1,
            creado_el: serverTimestamp()
        });
        console.log('✅ Producto nuevo guardado:', productoData.nombre);
        return true;
    } catch (error) {
        console.error('❌ Error guardando producto:', error.message);
        return false;
    }
};

// ─────────────────────────────────────────────────────────────
// 5. CALCULAR MACROS PARA UNA CANTIDAD DADA
// ─────────────────────────────────────────────────────────────
export const calcularPorcion = (producto, gramos) => {
    if (!producto?.por_100g || typeof gramos !== 'number' || gramos <= 0) {
        console.warn('❌ Datos inválidos para calcular porción');
        return null;
    }

    const factor = gramos / 100;
    const p = producto.por_100g;

    return {
        alimento: producto.nombre,
        marca: producto.marca || null,
        gramos_estimados: gramos,
        calorias: redondear(p.calorias * factor, 1),
        proteinas: redondear(p.proteinas * factor, 1),
        carbohidratos: redondear(p.carbohidratos * factor, 1),
        grasas: redondear(p.grasas * factor, 1),
        fibra: redondear(p.fibra * factor, 1),
        sodio_mg: redondear(p.sodio_mg * factor, 0),
        potasio_mg: redondear(p.potasio_mg * factor, 0),
        magnesio_mg: redondear(p.magnesio_mg * factor, 0),
        calcio_mg: redondear(p.calcio_mg * factor, 0),
        hierro_mg: redondear(p.hierro_mg * factor, 1),
        zinc_mg: redondear(p.zinc_mg * factor, 1),
        omega3: {
            ala_mg: redondear(p.omega3.ala_mg * factor, 0),
            epa_dha_mg: redondear(p.omega3.epa_dha_mg * factor, 0)
        },
        fuente_datos: producto.fuente
    };
};

// ─────────────────────────────────────────────────────────────
// 6. OBTENER INGREDIENTE (BD local → OFF por nombre)
// ─────────────────────────────────────────────────────────────
export const obtenerIngrediente = async (nombreIngrediente, marca = null) => {
    if (!nombreIngrediente || typeof nombreIngrediente !== 'string') {
        console.warn('❌ Nombre de ingrediente inválido');
        return null;
    }

    try {
        const id = normalizarId(nombreIngrediente);
        const ref = doc(db, 'ingredientes_base', id);
        const snap = await getDoc(ref);

        // 1. Buscar en BD local
        if (snap.exists()) {
            console.log('✅ Ingrediente encontrado en BD local');
            return { id, ...snap.data(), fuente: 'base_propia' };
        }

        // 2. Buscar en OFF con SIMILITUD (mejor coincidencia, no el primero que aparezca)
        //    Con marca → si la marca no está en OFF, reintenta con el producto base
        console.log(`🔍 Buscando "${nombreIngrediente}"${marca ? ` (marca: ${marca})` : ''} en OpenFoodFacts...`);
        const fromOFF = await buscarProductoPorNombreSimilar(nombreIngrediente, marca);

        if (fromOFF) {
            if (fromOFF.es_generica) {
                console.log(`ℹ️ "${nombreIngrediente}" → match genérico "${fromOFF.nombre}" (marca "${marca}" sin dato en OFF)`);
            }
            // Guardar en BD para próximas búsquedas
            await setDoc(ref, {
                nombre: fromOFF.nombre,
                por_100g: fromOFF.por_100g,
                fuente: 'openfoodfacts',
                es_generica: !!fromOFF.es_generica,
                creado_el: serverTimestamp()
            });
            console.log('✅ Ingrediente guardado en BD para caché');
            return { id, ...fromOFF, fuente: 'openfoodfacts' };
        }

        console.warn(`⚠️ No se encontró "${nombreIngrediente}" en OpenFoodFacts`);
        return null;
    } catch (error) {
        console.error(`❌ Error obteniendo ingrediente:`, error.message);
        return null;
    }
};

// ─────────────────────────────────────────────────────────────
// 7. GUARDAR MÚLTIPLES PRODUCTOS (BATCH)
// ─────────────────────────────────────────────────────────────
export const guardarProductosBatch = async (productos) => {
    if (!Array.isArray(productos) || productos.length === 0) {
        console.warn('❌ Array de productos vacío');
        return false;
    }

    try {
        const batch = writeBatch(db);
        
        productos.forEach(p => {
            if (p.barcode) {
                const ref = doc(db, 'productos_globales', p.barcode);
                batch.set(ref, {
                    ...p,
                    creado_el: serverTimestamp()
                });
            }
        });

        await batch.commit();
        console.log(`✅ ${productos.length} productos guardados en batch`);
        return true;
    } catch (error) {
        console.error('❌ Error en batch save:', error.message);
        return false;
    }
};

// ─────────────────────────────────────────────────────────────
// 8. BUSCAR MÚLTIPLES INGREDIENTES EN PARALELO
// ─────────────────────────────────────────────────────────────
export const obtenerIngredientes = async (arrayNombres) => {
    if (!Array.isArray(arrayNombres) || arrayNombres.length === 0) {
        return [];
    }

    try {
        const resultados = await Promise.all(
            arrayNombres.map(nombre => obtenerIngrediente(nombre))
        );
        
        // Filtrar nulls
        return resultados.filter(r => r !== null);
    } catch (error) {
        console.error('❌ Error buscando múltiples ingredientes:', error.message);
        return [];
    }
};