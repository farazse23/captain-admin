// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connection state monitoring
let isOnline = navigator.onLine;

// Enable/disable network based on connectivity
const handleOnline = async () => {
  if (!isOnline) {
    console.log('🌐 Internet connection restored, enabling Firebase network...');
    try {
      await enableNetwork(db);
      isOnline = true;
    } catch (error) {
      console.warn('Firebase network enable failed:', error.message);
    }
  }
};

const handleOffline = async () => {
  if (isOnline) {
    console.log('📴 Internet connection lost, enabling offline mode...');
    try {
      await disableNetwork(db);
      isOnline = false;
    } catch (error) {
      console.warn('Firebase network disable failed:', error.message);
    }
  }
};

// Add event listeners for connection changes
window.addEventListener('online', handleOnline);
window.addEventListener('offline', handleOffline);

// Initialize connection state
if (!navigator.onLine) {
  handleOffline();
}

export default app;
