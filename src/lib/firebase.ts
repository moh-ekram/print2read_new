/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

// Real Firebase Configuration structure using VITE_ prefix environment variables
const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyAvRhzJrt8YlELCTWqFOr4AMns8Q5zIp3k",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "readtoprint.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "readtoprint",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "readtoprint.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "776993866881",
  appId: env.VITE_FIREBASE_APP_ID || "1:776993866881:web:964a9b0c3f945cf3687980",
};

// Check if valid Firebase credentials are provided
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY" &&
  firebaseConfig.authDomain
);

let firebaseApp;
let firebaseAuth: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    firebaseAuth = getAuth(firebaseApp);
    console.log("Firebase initialized successfully with real configuration.");
  } catch (error) {
    console.warn("Failed to initialize Firebase with real credentials, falling back to Sandbox:", error);
  }
} else {
  console.log("No Firebase config found. Running in high-fidelity local Sandbox mode.");
}

export { firebaseAuth, isFirebaseConfigured };
