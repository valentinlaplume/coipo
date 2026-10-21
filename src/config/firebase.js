// src/config/firebase.js
// Config PÚBLICA de Firebase para el cliente (Firestore + Auth).
//
// Cómo llegan los valores:
//   1. Con Vite (npm run dev / npm run build) → import.meta.env.VITE_* se
//      reemplaza por los valores de .env dentro del bundle.
//   2. Sin Vite (HTML servido crudo: Firebase Hosting, Live Server, file://)
//      → import.meta.env NO existe: usamos el respaldo opcional
//      window.__COIPO_FIREBASE__ si está definido en index.html.
//   3. Sin ninguna de las dos → no lanzamos TypeError: avisamos en consola
//      con instrucciones claras.
//
// ⚠️ Las variables SECRETAS (GROQ_API_KEYS, GROQ_MODELS, FIREBASE_PROJECT_ID,
//    ALLOWED_ORIGIN) NUNCA se leen desde acá ni desde ningún módulo del cliente.
//    Viven solo en .env y las usa netlify/functions/sugerencias.js.

// Respaldo manual para servir el HTML sin bundler (ver index.html)
const RESPALDO = (typeof globalThis === 'object' && globalThis.__COIPO_FIREBASE__) || {};

// `import.meta.env?.` es a propósito: sin Vite el objeto no existe y el
// optional chaining evita el "Cannot read properties of undefined".
export const firebaseConfig = {
    apiKey:             import.meta.env?.VITE_FIREBASE_API_KEY             || RESPALDO.apiKey,
    authDomain:         import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN         || RESPALDO.authDomain,
    projectId:          import.meta.env?.VITE_FIREBASE_PROJECT_ID          || RESPALDO.projectId,
    storageBucket:      import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET      || RESPALDO.storageBucket,
    messagingSenderId:  import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || RESPALDO.messagingSenderId,
    appId:              import.meta.env?.VITE_FIREBASE_APP_ID              || RESPALDO.appId
};

// Falta de configuración → aviso claro en consola (la app fallará al inicializar)
const VARIABLES = {
    apiKey: 'VITE_FIREBASE_API_KEY',
    authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
    projectId: 'VITE_FIREBASE_PROJECT_ID',
    storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
    messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
    appId: 'VITE_FIREBASE_APP_ID'
};

const FALTANTES = Object.entries(VARIABLES)
    .filter(([clave]) => !firebaseConfig[clave])
    .map(([, nombre]) => nombre);

if (FALTANTES.length > 0) {
    console.error(
        `❌ [Firebase] Falta la config pública: ${FALTANTES.join(', ')}. ` +
        'Opción A (recomendada): corré la app con Vite — `npm run dev` o `npm run build` — ' +
        'para que esas variables se lean de .env. ' +
        'Opción B: si servís el HTML sin Vite, pegá tu config pública en ' +
        'window.__COIPO_FIREBASE__ (hay una plantilla comentada en index.html).'
    );
}

export default firebaseConfig;
