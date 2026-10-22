// src/services/sesion-http.mjs
// Fetch autenticado con UN reintento ante 401.
//
// Problema que resuelve: Firebase puede devolver un ID token cacheado que el
// servidor ya no acepta (reloj, rotación, sesión vieja). Ante el primer 401 se
// fuerza una renovación con getIdToken(true) y se repite la request UNA sola
// vez. Si el segundo intento también da 401, la sesión se considera rechazada.
//
// El servidor devuelve códigos estables en `{ error }` para 401/403:
//   sin_token | token_invalido | origen_no_permitido
// Así la UI distingue "pedir login", "no pudimos verificar tu sesión" y
// "error de configuración del servidor" sin mirar textos humanos.
//
// Lógica pura con fetch y usuario inyectables: se testea en Node sin
// navegador ni Firebase (tests/sesion-http.test.mjs).

export const ERROR_SESION = Object.freeze({
    SIN_USUARIO: 'SIN_USUARIO',
    SIN_TOKEN: 'SIN_TOKEN',
    TOKEN_INVALIDO: 'TOKEN_INVALIDO',
    TOKEN_RECHAZADO: 'TOKEN_RECHAZADO',
    CONFIG_SERVIDOR: 'CONFIG_SERVIDOR'
});

const conToken = (opciones, token) => ({
    ...opciones,
    headers: {
        ...((opciones && opciones.headers) || {}),
        Authorization: `Bearer ${token}`
    }
});

// Lee el código del cuerpo sin consumir la Response original.
const leerCodigo = async (respuesta) => {
    if (!respuesta || typeof respuesta.clone !== 'function') return null;
    try {
        const cuerpo = await respuesta.clone().json();
        return typeof cuerpo?.error === 'string' ? cuerpo.error : null;
    } catch {
        return null;
    }
};

const clasificar = (status, codigo) => {
    if (codigo === 'sin_token') return ERROR_SESION.SIN_TOKEN;
    if (codigo === 'token_invalido') return ERROR_SESION.TOKEN_INVALIDO;
    // Cualquier 403 que no sea de token es configuración (típicamente CORS).
    if (codigo === 'origen_no_permitido' || status === 403) return ERROR_SESION.CONFIG_SERVIDOR;
    return ERROR_SESION.TOKEN_RECHAZADO;
};

/**
 * Hace una request con Bearer y reintenta una vez tras un 401.
 *
 * @param {object}   solicitud
 * @param {object|null} solicitud.usuario auth.currentUser (o null)
 * @param {string}   solicitud.url
 * @param {object}   [solicitud.opciones] opciones de fetch (method, body, headers, signal…)
 * @param {Function} [solicitud.fetchImpl] fetch inyectable para tests
 * @returns {Promise<{respuesta: Response|null, errorSesion: string|null, reintentado: boolean}>}
 *   `errorSesion` es null cuando la respuesta final no es un error de sesión.
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

    if (respuesta.status === 403) {
        const codigo = await leerCodigo(respuesta);
        return {
            respuesta,
            errorSesion: clasificar(403, codigo),
            reintentado: false
        };
    }

    if (respuesta.status !== 401) {
        return { respuesta, errorSesion: null, reintentado: false };
    }

    const codigoInicial = await leerCodigo(respuesta);

    // Un único reintento con token forzado (getIdToken(true)).
    try {
        token = await usuario.getIdToken(true);
    } catch {
        return {
            respuesta,
            errorSesion: clasificar(401, codigoInicial),
            reintentado: true
        };
    }
    if (!token) {
        return {
            respuesta,
            errorSesion: clasificar(401, codigoInicial),
            reintentado: true
        };
    }

    respuesta = await fetchImpl(url, conToken(opciones, token));
    const codigoFinal = await leerCodigo(respuesta);

    return {
        respuesta,
        errorSesion: respuesta.status === 401 || respuesta.status === 403
            ? clasificar(respuesta.status, codigoFinal)
            : null,
        reintentado: true
    };
};
