import * as functions from 'firebase-functions';
import cors from 'cors';
import fetch from 'node-fetch';

// Inicializar CORS
const corsHandler = cors({ origin: true });

export const proxyOFF = functions.https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
        try {
            const { nombreIngrediente } = request.body;

            if (!nombreIngrediente) {
                return response.status(400).json({ error: 'nombreIngrediente requerido' });
            }

            const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(nombreIngrediente)}&search_simple=1&action=process&json=1&page_size=1`;
            
            const res = await fetch(url);
            const data = await res.json();

            if (!data.products || data.products.length === 0) {
                return response.status(404).json({ error: 'Producto no encontrado' });
            }

            const p = data.products[0];
            const n = p.nutriments || {};

            const resultado = {
                nombre: p.product_name || nombreIngrediente,
                por_100g: {
                    calorias: Number(n['energy-kcal_100g']) || 0,
                    proteinas: Number(n['proteins_100g']) || 0,
                    carbohidratos: Number(n['carbohydrates_100g']) || 0,
                    grasas: Number(n['fat_100g']) || 0,
                    fibra: Number(n['fiber_100g']) || 0,
                    sodio_mg: (Number(n['sodium_100g']) || 0) * 1000,
                    potasio_mg: Number(n['potassium_100g']) || 0,
                    magnesio_mg: Number(n['magnesium_100g']) || 0,
                    calcio_mg: Number(n['calcium_100g']) || 0,
                    hierro_mg: Number(n['iron_100g']) || 0,
                    zinc_mg: Number(n['zinc_100g']) || 0,
                    omega3: {
                        ala_mg: Number(n['alpha-linolenic-acid_100g']) || 0,
                        epa_dha_mg: (Number(n['epa_100g'] || 0) + Number(n['dha_100g'] || 0)) || 0
                    }
                }
            };

            return response.status(200).json(resultado);
        } catch (error) {
            console.error('Error en proxyOFF:', error);
            return response.status(500).json({ 
                error: 'Error buscando en OFF',
                details: error.message 
            });
        }
    });
});