import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

// Firebase configuration from environment variables
// Falls back to hardcoded values if env vars are not set (for development)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBo9VsJMft4Qqap5oUmQowwbjiMQErloqU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "in3devoneuralai.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "in3devoneuralai",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "in3devoneuralai.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "708037023303",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:708037023303:web:f0d5b319b05aa119288362",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-FNENMQ3BMF"
};

// Initialize Firebase App FIRST
const app = initializeApp(firebaseConfig);

// Validate Firebase configuration
console.log('🔧 Firebase configuration validation:', {
  projectId: app.options.projectId,
  storageBucket: app.options.storageBucket,
  authDomain: app.options.authDomain,
  apiKey: app.options.apiKey ? 'Configured' : 'Missing',
  appId: app.options.appId ? 'Configured' : 'Missing'
});

// Check for required configuration
if (!app.options.storageBucket) {
  console.error('❌ Firebase Storage bucket not configured!');
  console.error('💡 Make sure storageBucket is set in your Firebase config');
}

if (!app.options.apiKey) {
  console.error('❌ Firebase API key not configured!');
  console.error('💡 Make sure apiKey is set in your Firebase config');
}

// Initialize core services immediately
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Storage with error handling
let storage: ReturnType<typeof getStorage> | null = null;

const initializeStorage = () => {
  if (typeof window !== 'undefined') {
    try {
      if (!app.options.storageBucket) {
        throw new Error('Storage bucket not configured');
      }
      
      storage = getStorage(app);
      console.log('✅ Firebase Storage initialized successfully');
      console.log('📦 Storage bucket:', app.options.storageBucket);
    } catch (error) {
      console.error('❌ Firebase Storage initialization failed:', error);
      storage = null;
    }
  }
};

// Initialize analytics only if supported and in browser environment
let analytics = null;

const initializeAnalytics = async () => {
  try {
    if (typeof window !== 'undefined' && await isSupported()) {
      analytics = getAnalytics(app);
      console.log('✅ Firebase Analytics initialized');
    }
  } catch (error) {
    console.warn('Analytics initialization failed:', error);
  }
};

// Initialize Functions with error handling
let functions: ReturnType<typeof getFunctions> | undefined = undefined;

const initializeFunctions = () => {
  if (typeof window !== 'undefined') {
    try {
      functions = getFunctions(app);
      console.log('✅ Firebase Functions initialized');
      
      // Connect to emulator in development
      const isLocalhost = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1');
      
      const shouldUseEmulator = import.meta.env.DEV || 
                                import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === 'true' ||
                                isLocalhost;
      
      if (shouldUseEmulator) {
        try {
          connectFunctionsEmulator(functions, 'localhost', 5001);
          console.log('🔧 Connected to Functions emulator on localhost:5001');
        } catch (error: any) {
          // Ignore error if already connected (common when hot-reloading)
          if (!error.message?.includes('already been called')) {
            console.warn('Functions emulator connection failed:', error);
          }
        }
      }
    } catch (error) {
      console.warn('Functions initialization failed:', error);
    }
  }
};

// Initialize services
if (typeof window !== 'undefined') {
  // Initialize storage immediately
  initializeStorage();
  
  // Initialize analytics asynchronously
  initializeAnalytics();
  
  // Initialize functions
  initializeFunctions();
}

export { analytics, functions, storage };
export default app; 