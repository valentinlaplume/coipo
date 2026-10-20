// src/services/auth.service.js
import { 
    signInWithPopup, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signOut ,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js"

import { auth, googleProvider } from "../firebase-config.js";

export const authService = {
    // Entrar con Google
    loginWithGoogle: async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return { user: result.user, error: null };
        } catch (error) {
            console.error("Error Google Auth:", error.code);
            return { user: null, error: error.message };
        }
    },

    // Entrar con Email/Pass
    loginWithEmail: async (email, password) => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            return { user: result.user, error: null };
        } catch (error) {
            return { user: null, error: error.message };
        }
    },

    // Registro (Por si el usuario va a "Regístrate")
    registerWithEmail: async (email, password) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            return { user: result.user, error: null };
        } catch (error) {
            return { user: null, error: error.message };
        }
    },

    // RECUPERAR CONTRASEÑA
    resetPassword: async (email) => {
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true, error: null };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    logout: () => signOut(auth)
};