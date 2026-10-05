import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  initializeAuth, 
  getAuth, 
  browserLocalPersistence, 
  indexedDBLocalPersistence, 
  inMemoryPersistence, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
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

// Initialize Auth with multi-layer persistence fallback (prioritizing localStorage so IndexedDB closing errors never break login)
let auth;
try {
  auth = initializeAuth(app, {
    persistence: [browserLocalPersistence, indexedDBLocalPersistence, inMemoryPersistence]
  });
} catch (e) {
  auth = getAuth(app);
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, onAuthStateChanged, signOut };
