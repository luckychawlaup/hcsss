
'use client';

import { useState, useEffect } from "react";
import PrincipalDashboard from "@/components/principal/PrincipalDashboard";
import AuthProvider from "@/components/auth/AuthProvider";
import { get, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import type { Student } from "@/lib/firebase/students";
import type { Teacher } from "@/lib/firebase/teachers";

export default function PrincipalPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStudents = async (): Promise<Student[]> => {
            const studentsRef = ref(db, 'students');
            const snapshot = await get(studentsRef);
            if (snapshot.exists()) {
                const data = snapshot.val();
                return Object.keys(data).map(id => ({ id, srn: id, ...data[id] }));
            }
            return [];
        };

        const fetchTeachers = async (): Promise<Teacher[]> => {
            const teachersRef = ref(db, 'teachers');
            const snapshot = await get(teachersRef);
            if (snapshot.exists()) {
                const data = snapshot.val();
                return Object.keys(data).map(id => ({ id, ...data[id] }));
            }
            return [];
        };

        const loadData = async () => {
            setIsLoading(true);
            try {
                const [studentData, teacherData] = await Promise.all([
                    fetchStudents(),
                    fetchTeachers()
                ]);
                setStudents(studentData);
                setTeachers(teacherData);
            } catch (error) {
                console.error("Failed to fetch principal data:", error);
                // Handle error appropriately, maybe show an error message
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    return (
        <AuthProvider>
            <PrincipalDashboard allStudents={students} allTeachers={teachers} />
        </AuthProvider>
    );
}
