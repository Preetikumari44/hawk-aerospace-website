import { Platform } from 'react-native';
import { authApi } from './api';

let firebaseModule = null;

// ONLY these phone numbers get the fixed development OTP code (123456).
// Every OTHER number must go through REAL Firebase SMS verification (mandatory).
// Format: +<countrycode><number>, comma-separated. e.g. +911234567890,+919876543210
const DEFAULT_TEST_NUMBERS = '+919898989898,+919999999999,+919999999998,+918888888889,+918080808080,+918888888888,+918989898989,+918989898989';
const TEST_PHONE_NUMBERS = ((typeof process !== 'undefined' && process.env?.REACT_APP_TEST_PHONE_NUMBERS) || DEFAULT_TEST_NUMBERS)
  .split(',')
  .map((n) => n.trim())
  .filter(Boolean);

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyA64tFiEvx2_2MOleWrClBVT6PM4mVROus',
  authDomain: 'aerosystem-2d36c.firebaseapp.com',
  projectId: 'aerosystem-2d36c',
  storageBucket: 'aerosystem-2d36c.firebasestorage.app',
  messagingSenderId: '1052847495761',
  appId: '1:1052847495761:web:391e9f947d0435eae43670',
  measurementId: 'G-23JT3MPBL7',
};

const isTestPhoneNumber = (phoneNumber) => {
  const normalized = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
  return TEST_PHONE_NUMBERS.includes(normalized);
};

const FRIENDLY_AUTH_ERRORS = {
  'auth/too-many-requests': 'Too many OTP requests from this device. Please wait a few minutes and try again.',
  'auth/invalid-verification-code': 'The code you entered is incorrect. Please check and try again.',
  'auth/verification-code-not-found': 'The code you entered is incorrect. Please check and try again.',
  'auth/code-expired': 'The code has expired. Please resend the OTP and try again.',
  'auth/session-expired': 'The code has expired. Please resend the OTP and try again.',
  'auth/invalid-phone-number': 'The mobile number is not valid. Please check and try again.',
  'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
  'auth/operation-not-allowed': 'SMS verification is not enabled for this project yet.',
};

/**
 * Normalise an authentication error thrown by either the Firebase JS SDK, the
 * React Native Firebase SDK or the backend API into a consistent object with a
 * stable `code` and a user-friendly `message`, and expose the raw error as `raw`.
 */
export const classifyAuthError = (error) => {
  if (!error) {
    return { code: null, message: null, raw: error };
  }

  const rawCode = error?.code;
  const rawMessage = error?.message;

  // Backend errors carry an HTTP message but no Firebase code.
  if (!rawCode) {
    return { code: null, message: rawMessage, raw: error };
  }

  const message = FRIENDLY_AUTH_ERRORS[rawCode] || rawMessage;
  return { code: rawCode, message, raw: error };
};

export const verifyPhoneNumber = async (phoneNumber, forceResending = false) => {
  try {
    // 1) Development test numbers: fixed OTP via backend (no Firebase SMS needed)
    if (isTestPhoneNumber(phoneNumber)) {
      await authApi.requestOtp(phoneNumber);
      return { _devOtp: true, phoneNumber };
    }

    // 2) ALL real numbers: REAL OTP via Firebase Auth (mandatory)
    if (Platform.OS === 'web') {
      const { initializeApp } = await import('firebase/app');
      const { getAuth, signInWithPhoneNumber, RecaptchaVerifier } = await import('firebase/auth');

      if (!firebaseModule) {
        const app = initializeApp(FIREBASE_CONFIG);
        const auth = getAuth(app);
        const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
        firebaseModule = { auth, recaptchaVerifier };
      }

      const confirmationResult = await signInWithPhoneNumber(
        firebaseModule.auth,
        phoneNumber,
        firebaseModule.recaptchaVerifier,
      );

      return { _confirmationResult: confirmationResult, phoneNumber };
    }

    // Native (Android/iOS): uses the config baked into google-services.json
    const rnAuth = require('@react-native-firebase/auth').default;
    if (!firebaseModule) {
      firebaseModule = { auth: rnAuth() };
    }

    // forceResend: true sends a brand-new SMS for resend flows instead of silently
    // reusing (or invalidating) the previous verification session.
    const confirmationResult = await firebaseModule.auth.signInWithPhoneNumber(
      phoneNumber,
      forceResending,
    );
    return { _confirmationResult: confirmationResult, phoneNumber };
  } catch (error) {
    const classified = classifyAuthError(error);
    const normalized = new Error(classified.message || 'Could not dispatch verification SMS.');
    normalized.code = classified.code;
    normalized.raw = error;
    throw normalized;
  }
};

export const confirmOtp = async (verificationContext, otp) => {
  // Development test numbers: verify via backend fixed OTP
  if (verificationContext._devOtp) {
    return authApi.verifyOtp({
      phone: verificationContext.phoneNumber,
      otpCode: otp,
    });
  }

  try {
    // Real numbers: confirm the Firebase SMS code, then send the ID token to the backend
    const confirmationResult = verificationContext._confirmationResult;
    const userCredential = await confirmationResult.confirm(otp);

    const firebaseIdToken = await userCredential.user.getIdToken();
    const phoneNumber = userCredential.user.phoneNumber || verificationContext.phoneNumber;

    return authApi.verifyOtp({
      phone: phoneNumber,
      firebaseIdToken,
    });
  } catch (error) {
    const classified = classifyAuthError(error);
    const normalized = new Error(classified.message || 'The OTP code submitted is incorrect or has expired.');
    normalized.code = classified.code;
    normalized.raw = error;
    throw normalized;
  }
};

export const dbRef = () => {
  throw new Error('Direct Firebase database access has not been configured for this project.');
};

/**
 * Guest-flow OTP confirm (Refer & Earn no-login applications).
 * Verifies the Firebase SMS code and returns the phone number + Firebase ID
 * token WITHOUT creating a backend session — the token is sent with the guest
 * application / guest file upload so the backend can prove phone ownership.
 * Development test numbers have no Firebase user; they fall back to the full
 * backend verify (which creates a session — caller must then use the
 * authenticated application endpoint instead).
 */
export const confirmOtpPhoneOnly = async (verificationContext, otp) => {
  if (verificationContext._devOtp) {
    const authResponse = await authApi.verifyOtp({
      phone: verificationContext.phoneNumber,
      otpCode: otp,
    });
    return {
      phoneNumber: verificationContext.phoneNumber,
      firebaseIdToken: null,
      authed: true,
      authResponse,
    };
  }

  try {
    const confirmationResult = verificationContext._confirmationResult;
    const userCredential = await confirmationResult.confirm(otp);
    const firebaseIdToken = await userCredential.user.getIdToken();
    const phoneNumber = userCredential.user.phoneNumber || verificationContext.phoneNumber;
    if (!firebaseIdToken) {
      throw new Error('Could not verify phone number. Please try again.');
    }
    return { phoneNumber, firebaseIdToken, authed: false };
  } catch (error) {
    const classified = classifyAuthError(error);
    const normalized = new Error(classified.message || 'The OTP code submitted is incorrect or has expired.');
    normalized.code = classified.code;
    normalized.raw = error;
    throw normalized;
  }
};

/**
 * Firebase Auth helpers used for the native SMS auto-verification flow.
 * Firebase's signInWithPhoneNumber already runs Google's SMS Retriever, so when
 * the OTP SMS arrives the phone is verified SILENTLY and the Firebase user is
 * signed in - no SMS permission, no custom SMS listener, no crash.
 */
const getNativeAuth = () => {
  if (Platform.OS === 'web') return null;
  try {
    return require('@react-native-firebase/auth').default;
  } catch (error) {
    return null;
  }
};

export const getCurrentFirebaseUser = () => {
  try {
    return getNativeAuth()?.currentUser || null;
  } catch (error) {
    return null;
  }
};

export const getFirebaseIdToken = async (firebaseUser) => {
  if (!firebaseUser) return null;
  try {
    return await firebaseUser.getIdToken();
  } catch (error) {
    return null;
  }
};

// Returns an unsubscribe function. On web (where @react-native-firebase is a
// stub) this is a no-op.
export const onFirebaseAuthStateChanged = (listener) => {
  const auth = getNativeAuth();
  if (!auth) return () => { };
  try {
    return auth.onAuthStateChanged(listener);
  } catch (error) {
    return () => { };
  }
};

// Compare phone numbers ignoring formatting (+91 98765 43210 == +919876543210).
export const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '');
