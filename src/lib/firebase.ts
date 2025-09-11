
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";

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

// Function to sign in the principal securely. We will assign a static UID.
const signInPrincipal = async () => {
    try {
        const userCredential = await signInAnonymously(auth);
        // This is a workaround to assign a predictable UID for rules purposes.
        // In a real-world scenario, you'd use custom tokens with admin privileges.
        // For this demo, we are mocking this by expecting the anonymous user to be the principal.
        // The security rules will check for a specific hardcoded UID.
        // To make this work, we need to ensure our anonymous user has that UID.
        // This is not directly possible, so our rule will be based on the fact that ONLY the principal signs in this way.
        // A better rule would be to check a custom claim after a proper admin login flow.
        
        // For our purpose, the security rule will be simplified to allow writes from any authenticated user,
        // and we will rely on the app's logic to restrict this to the principal.
        // Let's adjust the login logic and rules.
        console.log("Principal signed in with UID:", userCredential.user.uid);

    } catch (error) {
        console.error("Error signing in principal anonymously:", error);
    }
}

// Let's modify the security rule idea. We can't assign a static UID.
// So, we'll have to make the rules more permissive and rely on app logic.
// This is not ideal for production but will work for this prototype.

export { app, db, auth };
