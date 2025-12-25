import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { ENV } from '../../utils/env';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (app) {
    return app;
  }

  const apiKey = ENV.FIREBASE_API_KEY();
  const authDomain = ENV.FIREBASE_AUTH_DOMAIN();
  const projectId = ENV.FIREBASE_PROJECT_ID();
  const storageBucket = ENV.FIREBASE_STORAGE_BUCKET();
  const messagingSenderId = ENV.FIREBASE_MESSAGING_SENDER_ID();
  const appId = ENV.FIREBASE_APP_ID();

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    console.warn('Firebase configuration incomplete. Firebase features will be disabled.');
    return null;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
  } else {
    const firebaseConfig = {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
    };

    try {
      app = initializeApp(firebaseConfig);
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      return null;
    }
  }

  return app;
}

export async function getFirestoreInstance(): Promise<Firestore | null> {
  if (db) {
    return db;
  }

  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    return null;
  }

  try {
    db = getFirestore(firebaseApp);

    try {
      await enableIndexedDbPersistence(db);
    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn('Firestore persistence failed: Multiple tabs open. Offline persistence disabled.');
      } else if (error.code === 'unimplemented') {
        console.warn('Firestore persistence not supported in this browser.');
      } else {
        console.warn('Firestore persistence error:', error);
      }
    }

    return db;
  } catch (error) {
    console.error('Failed to get Firestore instance:', error);
    return null;
  }
}

export function isFirebaseAvailable(): boolean {
  return getFirebaseApp() !== null;
}

