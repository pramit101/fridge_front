// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCL0IpbiRxPTfZiWUCAIIyVMV0kzU2wm_g",
  authDomain: "fridgeapp-5cd4d.firebaseapp.com",
  projectId: "fridgeapp-5cd4d",
  storageBucket: "fridgeapp-5cd4d.firebasestorage.app",
  messagingSenderId: "189798311662",
  appId: "1:189798311662:web:899aaf334b3cd94b0f75ff",
  measurementId: "G-7LTWJKNZ1Q"
};

// 1. Initialize the Firebase app
const app = initializeApp(firebaseConfig);

// 2. Get the Auth instance from the app
export const auth = getAuth(app);
