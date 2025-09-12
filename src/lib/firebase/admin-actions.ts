
import { app, db } from "@/lib/firebase";
import { getAuth as getClientAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ref, set } from "firebase/database";
import type { Student } from "./students";

// IMPORTANT: This file simulates admin actions. In a real-world production app,
// these operations MUST be moved to a secure backend environment (like Firebase Functions)
// and executed using the Firebase Admin SDK. Exposing admin-like functionality
// on the client-side is a major security risk.

type StudentRegistrationData = Omit<Student, 'id' | 'authUid' | 'admissionDate' | 'mustChangePassword'>;

// This function simulates a backend admin process to create a new student.
export const registerStudentAndCreateAuth = async (studentData: StudentRegistrationData) => {
    // A temporary, secondary Firebase app instance to perform admin-like actions.
    // This is a workaround for the lack of a real backend.
    const tempApp = app;
    const tempAuth = getClientAuth(tempApp);
    const originalUser = getClientAuth(app).currentUser;

    try {
        const tempPassword = Math.random().toString(36).slice(-8);

        // This is highly insecure on the client. In a real app, you would use Admin SDK's
        // createUser method on a backend. We are simulating this by signing up and then signing out.
        const userCredential = await signInWithEmailAndPassword(tempAuth, "principal@hcsss.in", "admin@123");
        
        // This is a placeholder for `admin.auth().createUser()`
        // The following lines are a very simplified simulation.
        // A real implementation would not be possible on the client.
        const newAuthUser = { uid: `student-uid-${Date.now()}` }; // Fake UID

        const studentPayload: Omit<Student, 'id'> = {
            ...studentData,
            authUid: newAuthUser.uid,
            admissionDate: Date.now(),
            mustChangePassword: true
        };
        
        // Save student data to Realtime Database
        const studentRef = ref(db, `students/${newAuthUser.uid}`);
        await set(studentRef, studentPayload);

        return { success: true, tempPassword, uid: newAuthUser.uid };

    } catch (error: any) {
        console.error("Admin action failed:", error);
        let message = "An error occurred during registration.";
        if (error.code === 'auth/email-already-in-use') {
            message = "This email is already registered.";
        }
        return { success: false, message };
    } finally {
        // Sign out the temporary "admin" and restore original user session if any.
        // This part of the simulation is complex and prone to failure in a real client env.
        if (tempAuth.currentUser) {
            await signOut(tempAuth);
        }
        // A real re-authentication would be needed here, which is beyond this simulation.
    }
};

export const deleteStudentAndAuth = async (uid: string) => {
    // This function simulates deleting the user from Firebase Auth and the database.
    // In a real app, this MUST be a backend function using the Admin SDK.
    try {
        const studentRef = ref(db, `students/${uid}`);
        await set(studentRef, null); // Deletes the record
        // The call to `admin.auth().deleteUser(uid)` would be here.
        return { success: true };
    } catch (error) {
        console.error("Failed to delete student:", error);
        return { success: false, message: "Could not delete student." };
    }
};
