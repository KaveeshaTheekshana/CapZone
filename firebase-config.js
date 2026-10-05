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
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDfOe9hCH1G74b96Q7DI-v6c_96AIe-_QE",
  authDomain: "capzone-e601c.firebaseapp.com",
  projectId: "capzone-e601c",
  storageBucket: "capzone-e601c.firebasestorage.app",
  messagingSenderId: "1037276369412",
  appId: "1:1037276369412:web:6d00e5a3c2e3cb22cb9b51",
  measurementId: "G-1C7KGVGZB4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with browserPopupRedirectResolver and multi-layer persistence
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

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Reliable Google Login Helper that explicitly passes browserPopupRedirectResolver
async function loginWithGoogle() {
  if (!auth) throw new Error("Authentication module failed to initialize. Please check network/adblocker.");
  return await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
}

export { 
  app,
  auth, 
  googleProvider, 
  loginWithGoogle,
  signInWithPopup, 
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
