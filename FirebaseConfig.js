// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage  from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCU5IBoZE7jZTvSKfTCnj5SXLlJuPBcrbU",
  authDomain: "need-proyojon.firebaseapp.com",
  projectId: "need-proyojon",
  storageBucket: "need-proyojon.firebasestorage.app",
  messagingSenderId: "962322311450",
  appId: "1:962322311450:web:f5b2263dc08222690aa4a3",
  measurementId: "G-Q1J035BWHJ"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

let analytics;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

export { app, auth };
