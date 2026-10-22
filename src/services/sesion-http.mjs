// src/services/sesion-http.mjs
// Fetch autenticado con UN reintento ante 401.
//
// Problema que resuelve: Firebase puede devolver un ID token cacheado que el
// servidor ya no acepta (reloj, rotación, sesión vieja). Ante el primer 401 se
// fuerza una renovación con getIdToken(true) y se repite la request UNA sola
// vez. Si el segundo intento también da 401, la sesión se considera rechazada.
//
// Distingue dos causas para que la UI no diga siempre "tu sesión expiró":
//   - SIN_USUARIO: no hay auth.currentUser → pedir login.
//   - TOKEN_RECHAZADO: había usuario, pero el servidor rechazó el token
//     incluso después de renovarlo → mensaje genérico de verificación.
//
// Lógica pura con fetch y usuario inyectables: se testea en Node sin
// navegador ni Firebase (tests/sesion-http.test.mjs).

export const ERROR_SESION = Object.freeze({
    SIN_USUARIO: 'SIN_USUARIO',
    TOKEN_RECHAZADO: 'TOKEN_RECHAZADO'
});

const conToken = (opciones, token) => ({
    ...opciones,
    headers: {
        ...((opciones && opciones.headers) || {}),
        Authorization: `Bearer ${token}`
    }
});

/**
 * Hace una request con Bearer y reintenta una vez tras un 401.
 *
 * @param {object}   solicitud
 * @param {object|null} solicitud.usuario auth.currentUser (o null)
 * @param {string}   solicitud.url
 * @param {object}   [solicitud.opciones] opciones de fetch (method, body, headers, signal…)
 * @param {Function} [solicitud.fetchImpl] fetch inyectable para tests
 * @returns {Promise<{respuesta: Response|null, errorSesion: string|null, reintentado: boolean}>}
 *   `errorSesion` es null cuando la respuesta final NO es un 401 por sesión.
 */
export const pedirConSesion = async ({
    usuario,
    url,
    opciones = {},
    fetchImpl = fetch
}) => {
    if (!usuario) {
        return { respuesta: null, errorSesion: ERROR_SESION.SIN_USUARIO, reintentado: false };
    }

    let token;
    try {
        token = await usuario.getIdToken();
    } catch {
        return { respuesta: null, errorSesion: ERROR_SESION.TOKEN_RECHAZADO, reintentado: false };
    }
    if (!token) {
        return { respuesta: null, errorSesion: ERROR_SESION.TOKEN_RECHAZADO, reintentado: false };
    }

    let respuesta = await fetchImpl(url, conToken(opciones, token));
    if (respuesta.status !== 401) {
        return { respuesta, errorSesion: null, reintentado: false };
    }

    // Un único reintento con token forzado (getIdToken(true)).
    try {
        token = await usuario.getIdToken(true);
    } catch {
        return { respuesta, errorSesion: ERROR_SESION.TOKEN_RECHAZADO, reintentado: true };
    }
    if (!token) {
        return { respuesta, errorSesion: ERROR_SESION.TOKEN_RECHAZADO, reintentado: true };
    }

    respuesta = await fetchImpl(url, conToken(opciones, token));
    return {
        respuesta,
        errorSesion: respuesta.status === 401 ? ERROR_SESION.TOKEN_RECHAZADO : null,
        reintentado: true
    };
};
