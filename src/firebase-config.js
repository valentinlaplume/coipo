// src/firebase-config.js
// Inicialización de Firebase con la config pública de .env (prefijo VITE_).
// Antes se importaba desde el módulo de config local; esa config se mudó
// a .env y ya no existe en ese archivo.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { firebaseConfig } from "./config/firebase.js";

// Inicializamos la App de Firebase
const app = initializeApp(firebaseConfig);

// Exportamos las instancias listas para usar
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Configuración opcional para el login de Google
googleProvider.setCustomParameters({ prompt: 'select_account' });
