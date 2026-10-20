// src/services/ingredient-lookup.service.js
export const buscarIngredienteEnOFF = async (nombreIngrediente) => {
    // 1. Validar entrada
    if (!nombreIngrediente || typeof nombreIngrediente !== 'string') {
        console.warn('Nombre de ingrediente inválido');
        return null;
    }

    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(nombreIngrediente)}&search_simple=1&action=process&json=1&page_size=1`;
    
    try {
        // 2. Agregar timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos
        
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        // 3. Verificar status HTTP
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        
        // 4. Validar estructura de datos
        if (!data?.products || !Array.isArray(data.products) || data.products.length === 0) {
            return null;
        }

        const producto = data.products[0];
        const nutrientes = producto.nutriments || {};
        
        // 5. Helper para obtener nutrientes de forma segura
        const obtenerNutriente = (key, factor = 1) => {
            const valor = nutrientes[key];
            return typeof valor === 'number' ? valor * factor : 0;
        };

        return {
            nombre: producto.product_name || 'Desconocido',
            marca: producto.brands || null,
            pais: producto.countries || null,
            por_100g: {
                calorias: obtenerNutriente('energy-kcal_100g'),
                proteinas: obtenerNutriente('proteins_100g'),
                carbohidratos: obtenerNutriente('carbohydrates_100g'),
                fibra: obtenerNutriente('fiber_100g'),
                grasas: obtenerNutriente('fat_100g'),
                grasas_saturadas: obtenerNutriente('saturated-fat_100g'),
                sodio_mg: obtenerNutriente('sodium_100g', 1000),
                potasio_mg: obtenerNutriente('potassium_100g'),
                azucar: obtenerNutriente('sugars_100g'),
            }
        };
    } catch (error) {
        // 6. Mejor manejo de errores
        if (error.name === 'AbortError') {
            console.warn(`Timeout buscando "${nombreIngrediente}" en OFF`);
        } else {
            console.warn(`Error buscando "${nombreIngrediente}" en OFF:`, error.message);
        }
        return null;
    }
};