import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  initializeAuth,
  getAuth,
  browserLocalPersistence,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

let dynamicConfig = null;
try {
  const saved = localStorage.getItem('capzone_firebase_config');
  if (saved) dynamicConfig = JSON.parse(saved);
} catch (e) { }

const defaultFirebaseConfig = {
  apiKey: "AIzaSyDfOe9hCH1G74b96Q7DI-v6c_96AIe-_QE",
  authDomain: "capzone-e601c.firebaseapp.com",
  projectId: "capzone-e601c",
  storageBucket: "capzone-e601c.firebasestorage.app",
  messagingSenderId: "1037276369412",
  appId: "1:1037276369412:web:6d00e5a3c2e3cb22cb9b51",
  measurementId: "G-1C7KGVGZB4"
};

const firebaseConfig = (dynamicConfig && dynamicConfig.apiKey) ? dynamicConfig : defaultFirebaseConfig;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with robust multi-layer persistence and popupRedirectResolver
let auth;
try {
  auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
    popupRedirectResolver: browserPopupRedirectResolver
  });
} catch (e) {
  try {
    auth = getAuth(app);
  } catch (e2) {
    console.warn("Auth init fallback notice:", e2);
  }
}
if (!auth) {
  try {
    auth = getAuth(app);
  } catch (e) { }
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// =========================================================================
// 🚀 Universal Google Login Helper
// Works seamlessly across BOTH Mobile & Desktop without 3rd-party cookie issues!
// =========================================================================
async function loginWithGoogle() {
  if (!auth) throw new Error("Authentication module failed to initialize. Please check network/adblocker.");
  
  // 1. Attempt native popup across ALL devices (Desktop & Mobile)
  // This bypasses iOS Safari and Android Chrome cross-site tracking / 3rd-party cookie blocks!
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return cred;
  } catch (error) {
    console.warn("[Auth] signInWithPopup notice:", error.code, error.message);

    // If user deliberately closed the popup window, throw so caller displays a peaceful info toast
    if (error.code === 'auth/popup-closed-by-user') {
      throw error;
    }

    // 2. If popup is strictly blocked by the browser environment (e.g. restrictive in-app webview)
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
      console.log("[Auth] Popup blocked by browser environment. Falling back to signInWithRedirect...");
      try {
        await signInWithRedirect(auth, googleProvider);
        return null;
      } catch (redirErr) {
        console.error("[Auth] signInWithRedirect fallback error:", redirErr);
        throw redirErr;
      }
    }

    throw error;
  }
}

export {
  app,
  auth,
  googleProvider,
  loginWithGoogle,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  browserPopupRedirectResolver,
  onAuthStateChanged,
  signOut
};
