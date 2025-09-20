
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  getDoc,
  doc,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
} from "firebase/firestore";

const SALARY_COLLECTION = "salaries";

export interface SalaryItem {
    name: string;
    amount: number;
}

export interface SalarySlip {
    id: string;
    teacherId: string;
    month: string; // e.g., "July 2024"
    generatedAt: Timestamp;
    basicSalary: number;
    earnings: SalaryItem[];
    deductions: SalaryItem[];
    netSalary: number;
    status: "Paid" | "Pending";
}

// Add a new salary slip
export const addSalarySlip = async (slipData: Omit<SalarySlip, 'id' | 'generatedAt' | 'netSalary'>) => {
    const totalEarnings = slipData.basicSalary + slipData.earnings.reduce((acc, earn) => acc + earn.amount, 0);
    const totalDeductions = slipData.deductions.reduce((acc, ded) => acc + ded.amount, 0);
    const netSalary = totalEarnings - totalDeductions;

    const slipWithTotals: Omit<SalarySlip, 'id'> = {
        ...slipData,
        netSalary,
        generatedAt: Timestamp.now(),
    };

    const newDocRef = await addDoc(collection(db, SALARY_COLLECTION), slipWithTotals);
    return newDocRef.id;
};

// Get a single salary slip by its ID
export const getSalarySlipById = async (slipId: string): Promise<SalarySlip | null> => {
    const slipRef = doc(db, SALARY_COLLECTION, slipId);
    const docSnap = await getDoc(slipRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as SalarySlip;
    }
    return null;
};

// Get all salary slips for a specific teacher with real-time updates
export const getSalarySlipsForTeacher = (
    teacherId: string,
    callback: (slips: SalarySlip[]) => void
) => {
    const q = query(
      collection(db, SALARY_COLLECTION),
      where("teacherId", "==", teacherId),
      orderBy("generatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const slips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalarySlip));
        callback(slips);
    });

    return unsubscribe;
};
