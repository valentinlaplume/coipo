// src/utils/analisis-comida.mjs
// Arranca analizarComida() y deja SIEMPRE manejado el canal de micros.
//
// analizarComida() devuelve dos promesas derivadas: `rapido` y `microsPromise`.
// Si `rapido` falla (por ejemplo SESION_INVALIDA o SIN_SESION), `microsPromise`
// también rechaza. Si el llamador todavía no le adjuntó un catch, el navegador
// reporta un unhandledrejection aunque el error principal sí se muestre.
//
// Este helper adjunta el catch de micros en el mismo tick y devuelve una
// promesa que resuelve null cuando fallan. El error principal (`rapido`) sigue
// rechazando para que el llamador muestre el mensaje con el toast.

export const iniciarAnalisisComida = (analizar, texto, alFallarMicros = null) => {
    const { rapido, microsPromise } = analizar(texto);

    const micros = Promise.resolve(microsPromise).catch(error => {
        if (typeof alFallarMicros === 'function') alFallarMicros(error);
        return null;
    });

    return { rapido, micros };
};
