import { initializeApp, getApps, getApp } from "firebase/app"
import { getDatabase } from "firebase/database"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Validate required config
if (!firebaseConfig.databaseURL) {
  console.error("[v0] Firebase Database URL is missing. Please ensure NEXT_PUBLIC_FIREBASE_DATABASE_URL is set.")
  console.error("[v0] Expected format: https://YOUR-PROJECT-ID-default-rtdb.firebaseio.com")
}

if (!firebaseConfig.projectId) {
  console.error("[v0] Firebase Project ID is missing. Please ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID is set.")
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
const database = getDatabase(app)
const auth = getAuth(app)

export { app, database, auth }
