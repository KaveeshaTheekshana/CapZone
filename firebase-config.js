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

// =========================================================================
// 🌐 Dedicated Tab Authentication Interceptor
// Forces Google Auth to open as a dedicated TAB inside the SAME browser window
// instead of a floating popup window, with CapZone branding.
// =========================================================================
if (typeof window !== 'undefined' && !window.__capzone_auth_tab_interceptor_set) {
  window.__capzone_auth_tab_interceptor_set = true;
  const _nativeWindowOpen = window.open;
  window.open = function (url, target, features) {
    const isAuth = !url || url === 'about:blank' || (typeof url === 'string' && (url.includes('google') || url.includes('auth') || url.includes('firebase')));
    if (isAuth || (features && (features.includes('width=') || features.includes('height=')))) {
      // By omitting features, modern browsers open it as a dedicated new TAB in the same window
      const authTab = _nativeWindowOpen.call(window, url || 'about:blank', target);
      if (authTab) {
        try {
          if (!url || url === 'about:blank') {
            authTab.document.title = "CapZone - Google Sign-In";
            if (authTab.document.body) {
              authTab.document.body.style.backgroundColor = "#080c15";
              authTab.document.body.style.color = "#ffffff";
              authTab.document.body.style.fontFamily = "sans-serif";
              authTab.document.body.style.display = "flex";
              authTab.document.body.style.alignItems = "center";
              authTab.document.body.style.justifyContent = "center";
              authTab.document.body.style.height = "100vh";
              authTab.document.body.style.margin = "0";
              authTab.document.body.innerHTML = `
                <div style="text-align: center;">
                  <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #ffffff;">CapZone</h2>
                  <p style="margin: 0; font-size: 14px; color: #94a3b8;">Connecting to Google Authentication...</p>
                </div>
              `;
            }
          }
        } catch (e) {}
      }
      return authTab;
    }
    return _nativeWindowOpen.call(window, url, target, features);
  };
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
