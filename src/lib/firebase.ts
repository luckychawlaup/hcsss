
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA5BScSQ_PjDjpAfIBHCeo5grpSr2i04eM",
  authDomain: "hilton-convent-school.firebaseapp.com",
  databaseURL: "https://hilton-convent-school-default-rtdb.firebaseio.com",
  projectId: "hilton-convent-school",
  storageBucket: "hilton-convent-school.appspot.com",
  messagingSenderId: "438196355297",
  appId: "1:438196355297:web:7d868f78190eff375977a0"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);
const auth = getAuth(app);


export { app, db, auth };
