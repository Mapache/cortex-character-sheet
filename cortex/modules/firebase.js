import { firebaseConfig } from "./firebase-config.js"

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js"
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-analytics.js"
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js"
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js"

// Initialize Firebase
export const app = initializeApp(firebaseConfig)
export const analytics = getAnalytics(app)
export const auth = getAuth(app)
export const db = getFirestore(app)

if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  connectFirestoreEmulator(db, "localhost", 8080) // Firestore emulator
  connectAuthEmulator(auth, "http://localhost:9099") // Authentication emulator
}