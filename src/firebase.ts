// src/firebase.ts
import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics"; // 1. Add this import
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

// Your configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWYdxdIQBxrdquciY0TC-KQNID7sBaVfs",
  authDomain: "rentapp-baa9c.firebaseapp.com",
  projectId: "rentapp-baa9c",
  storageBucket: "rentapp-baa9c.firebasestorage.app",
  messagingSenderId: "840668550478",
  appId: "1:840668550478:web:3130e20c878ae127537a1f",
  measurementId: "G-SYMGST6ZCC"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Services
// Enable Offline Persistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});
export const analytics = getAnalytics(app); // 2. Activate Analytics
export const auth = getAuth(app);
export const functions = getFunctions(app);
export const storage = getStorage(app); // Initialize Storage