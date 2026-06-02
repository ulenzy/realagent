import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, signInAnonymously, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, initializeFirestore, doc, getDocFromServer, collection, addDoc, updateDoc, deleteDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Providers
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

// Error handler helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
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
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Global Authentication Error Crashlytics simulation helper
export function logAuthFailureToCrashlytics(error: any, contextStr: string) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errCode = error?.code || 'unknown';
  console.error(`[Firebase Crashlytics Simulated] Authentication Failure! Context: ${contextStr}, Code: ${errCode}, Message: ${errMsg}`);
  
  // Save securely to firestore to allow administrators to monitor client problems
  addDoc(collection(db, 'crashlytics_logs'), {
    timestamp: Timestamp.now(),
    type: 'auth_failure',
    context: contextStr,
    errorMessage: errMsg,
    errorCode: errCode,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
  }).catch((err) => {
    console.warn('Failed to commit log to simulate Crashlytics in Sandbox:', err);
  });
}
