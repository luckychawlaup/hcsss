
'use server'

import PrincipalDashboard from "@/components/principal/PrincipalDashboard";
import AuthProvider from "@/components/auth/AuthProvider";
import { getStudents } from "@/lib/firebase/students";
import { getTeachers } from "@/lib/firebase/teachers";
import type { Student } from "@/lib/firebase/students";
import type { Teacher } from "@/lib/firebase/teachers";
import { Suspense } from "react";

// Helper function to fetch data and handle cleanup
async function fetchData<T>(fetcher: (callback: (data: T[]) => void) => () => void): Promise<T[]> {
  return new Promise((resolve) => {
    const unsubscribe = fetcher((data) => {
      unsubscribe();
      resolve(data);
    });
  });
}

export default async function PrincipalPage() {
    const students = await fetchData<Student>(getStudents);
    const teachers = await fetchData<Teacher>(getTeachers);

    return (
        <AuthProvider>
            <PrincipalDashboard allStudents={students} allTeachers={teachers} />
        </AuthProvider>
    );
}
