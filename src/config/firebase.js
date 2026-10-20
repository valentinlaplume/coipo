// src/services/firebase.js
// import { initializeApp } from "firebase/app";
// import { getAuth, GoogleAuthProvider } from "firebase/auth";
// import { getFirestore } from "firebase/firestore";

// import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
// import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
// import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// import { FIREBASE_CONFIG_PERSONAL } from "./config/config"; // Importamos tus keys


// import { FIREBASE_CONFIG_PERSONAL } from "./config.js"; // Importamos tus keys reales

// // Inicializamos la App con tu configuración de coachnutricional-5da25
// const app = initializeApp(FIREBASE_CONFIG_PERSONAL);

// // Exportamos las herramientas listas para usar
// export const auth = getAuth(app);
// export const googleProvider = new GoogleAuthProvider();
// export const db = getFirestore(app);

// // Opcional: Configurar Google para que siempre pida elegir cuenta (útil en desarrollo)
// googleProvider.setCustomParameters({ prompt: 'select_account' });