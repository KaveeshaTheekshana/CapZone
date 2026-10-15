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

// Initialize Auth with multi-layer persistence and popupRedirectResolver
let auth;
try {
  auth = initializeAuth(app, {
    persistence: [browserLocalPersistence, indexedDBLocalPersistence, inMemoryPersistence],
    popupRedirectResolver: browserPopupRedirectResolver
  });
} catch (e) {
  try {
    auth = getAuth(app);
  } catch (e2) {
    console.warn("Auth init failed, falling back to inMemory:", e2);
    try {
      auth = initializeAuth(app, {
        persistence: inMemoryPersistence,
        popupRedirectResolver: browserPopupRedirectResolver
      });
    } catch (e3) {
      console.error("Critical Auth Init Failure:", e3);
    }
  }
}
if (!auth) {
  try {
    auth = getAuth(app);
  } catch (e) { }
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Resilient Google Login Helper: tries popup first, then explicit resolver, and supports redirect fallback
async function loginWithGoogle() {
  if (!auth) throw new Error("Authentication module failed to initialize. Please check network/adblocker.");
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.warn("Primary Google popup error:", error.code, error.message);
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
      console.log("Popup blocked. Switching to signInWithRedirect...");
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    // Try with browserPopupRedirectResolver explicitly if resolver wasn't attached
    try {
      return await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
    } catch (err2) {
      if (err2.code === 'auth/popup-blocked') {
        console.log("Secondary popup blocked. Switching to signInWithRedirect...");
        await signInWithRedirect(auth, googleProvider);
        return null;
      }
      throw error;
    }
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
