
import { db } from "@/lib/firebase";
import {
  ref,
  push,
  set,
  get,
  query,
  orderByChild,
  equalTo,
  onValue,
} from "firebase/database";
import type { DataSnapshot } from "firebase/database";

const SALARY_COLLECTION = "salaries";

export interface SalaryItem {
    name: string;
    amount: number;
}

export interface SalarySlip {
    id: string;
    teacherId: string;
    month: string; // e.g., "July 2024"
    generatedAt: number;
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
        generatedAt: Date.now(),
    };

    const slipsRef = ref(db, SALARY_COLLECTION);
    const newSlipRef = push(slipsRef);
    await set(newSlipRef, slipWithTotals);
    return newSlipRef.key;
};

// Get a single salary slip by its ID
export const getSalarySlipById = async (slipId: string): Promise<SalarySlip | null> => {
    const slipRef = ref(db, `${SALARY_COLLECTION}/${slipId}`);
    const snapshot = await get(slipRef);
    if (snapshot.exists()) {
        return { id: snapshot.key, ...snapshot.val() };
    }
    return null;
};

// Get all salary slips for a specific teacher with real-time updates
export const getSalarySlipsForTeacher = (
    teacherId: string,
    callback: (slips: SalarySlip[]) => void
) => {
    const slipsRef = ref(db, SALARY_COLLECTION);
    const slipsQuery = query(slipsRef, orderByChild("teacherId"), equalTo(teacherId));

    const unsubscribe = onValue(slipsQuery, (snapshot: DataSnapshot) => {
        const slips: SalarySlip[] = [];
        if (snapshot.exists()) {
            const data = snapshot.val();
            for (const id in data) {
                slips.push({ id, ...data[id] });
            }
        }
        callback(slips.sort((a, b) => b.generatedAt - a.generatedAt));
    });

    return unsubscribe;
};

    