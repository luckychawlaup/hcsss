import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "hilton-convent-school.firebaseapp.com",
  projectId: "hilton-convent-school",
  storageBucket: "hilton-convent-school.appspot.com",
  messagingSenderId: "438196355297",
  appId: "1:438196355297:web:7d868f78190eff375977a0"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
