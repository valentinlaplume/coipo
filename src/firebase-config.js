// src/firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { FIREBASE_CONFIG_PERSONAL } from "./config/config.js"; // Importamos tus keys

// Inicializamos la App de Firebase
const app = initializeApp(FIREBASE_CONFIG_PERSONAL);

// Exportamos las instancias listas para usar
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Configuración opcional para el login de Google
googleProvider.setCustomParameters({ prompt: 'select_account' });