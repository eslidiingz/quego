"use client";

import {
  initializeApp,
  getApps,
  getApp,
  type FirebaseApp,
} from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/**
 * Browser Firebase app — used ONLY for Phone Auth (send the OTP SMS via
 * invisible reCAPTCHA, then confirm the 6-digit code). The web config below is
 * PUBLIC by Firebase's design: the API key merely identifies the project, it
 * authorizes nothing, so it ships in the client bundle via NEXT_PUBLIC_ vars.
 *
 * Deliberately NOT initializing Analytics — it isn't needed for auth and
 * `getAnalytics()` throws during SSR/build. Keep this module auth-only.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

/** The browser Auth instance, with the OTP SMS localized to the device language. */
export function getFirebaseAuth(): Auth {
  const auth = getAuth(getFirebaseApp());
  auth.useDeviceLanguage();
  return auth;
}
