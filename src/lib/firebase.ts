/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, doc, getDocFromServer } from "firebase/firestore";

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
  env.VITE_FIREBASE_API_KEY && 
  env.VITE_FIREBASE_API_KEY !== "YOUR_FIREBASE_API_KEY" &&
  env.VITE_FIREBASE_API_KEY !== "AIzaSyAvRhzJrt8YlELCTWqFOr4AMns8Q5zIp3k"
);

let firebaseApp;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = getFirestore(firebaseApp);
    console.log("Firebase initialized successfully with real configuration.");

    // Validate connection to Firestore as required by platform constraints
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(firebaseDb!, "test", "connection"));
      } catch (error) {
        if (error instanceof Error && error.message.includes("the client is offline")) {
          console.error("Please check your Firebase configuration: Client is offline.");
        } else {
          console.log("Firestore connection test completed (expected if database is empty/unconfigured):", error);
        }
      }
    };
    testConnection();
  } catch (error) {
    console.warn("Failed to initialize Firebase with real credentials, falling back to Sandbox:", error);
  }
} else {
  console.log("No Firebase config found. Running in high-fidelity local Sandbox mode.");
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: firebaseAuth?.currentUser?.uid,
      email: firebaseAuth?.currentUser?.email,
      emailVerified: firebaseAuth?.currentUser?.emailVerified,
      isAnonymous: firebaseAuth?.currentUser?.isAnonymous,
      tenantId: firebaseAuth?.currentUser?.tenantId,
      providerInfo: firebaseAuth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { firebaseAuth, firebaseDb, isFirebaseConfigured };
