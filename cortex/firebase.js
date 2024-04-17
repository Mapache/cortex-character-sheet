// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js"
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-analytics.js"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCAYdCceX7EXBok393JHQfI9foXFHftZjs",
    authDomain: "cortex-character-sheet.firebaseapp.com",
    projectId: "cortex-character-sheet",
    storageBucket: "cortex-character-sheet.appspot.com",
    messagingSenderId: "815978726011",
    appId: "1:815978726011:web:e8f5817cf5be4da58198de",
    measurementId: "G-PB75BZ97PC"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const analytics = getAnalytics(app)