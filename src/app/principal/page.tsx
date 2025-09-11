
'use server'

import PrincipalDashboard from "@/components/principal/PrincipalDashboard";
import AuthProvider from "@/components/auth/AuthProvider";
import { get, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import type { Student } from "@/lib/firebase/students";
import type { Teacher } from "@/lib/firebase/teachers";

async function fetchStudents(): Promise<Student[]> {
  const studentsRef = ref(db, 'students');
  const snapshot = await get(studentsRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.keys(data).map(id => ({ id, srn: id, ...data[id] }));
  }
  return [];
}

async function fetchTeachers(): Promise<Teacher[]> {
  const teachersRef = ref(db, 'teachers');
  const snapshot = await get(teachersRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.keys(data).map(id => ({ id, ...data[id] }));
  }
  return [];
}

export default async function PrincipalPage() {
    const students = await fetchStudents();
    const teachers = await fetchTeachers();

    return (
        <AuthProvider>
            <PrincipalDashboard allStudents={students} allTeachers={teachers} />
        </AuthProvider>
    );
}
