

"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Loader2, AlertCircle, CheckCircle, Copy, UserPlus, CalendarIcon, Plus, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import { addStudent } from "@/lib/supabase/students";
import { createClient } from "@/lib/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";


const classes = ["Nursery", "LKG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const sections = ["A", "B"];
const defaultSeniorSubjects = ["Physics", "Chemistry", "Maths", "Biology", "Computer Science", "English", "Commerce", "Accounts", "Economics"];


interface AddStudentFormProps {
    onStudentAdded: () => void;
}

export default function AddStudentForm({ onStudentAdded }: AddStudentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ name: string, email: string } | null>(null);
  const [customSubject, setCustomSubject] = useState("");
  const [seniorSubjects, setSeniorSubjects] = useState(defaultSeniorSubjects);
  
  // State for form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState<FileList | null>(null);
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [address, setAddress] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [admissionDate, setAdmissionDate] = useState<Date | undefined>(new Date());
  const [dob, setDob] = useState<Date | undefined>();
  const [aadharCard, setAadharCard] = useState<FileList | null>(null);
  const [aadharNumber, setAadharNumber] = useState("");
  const [optedSubjects, setOptedSubjects] = useState<string[]>([]);
  const [fatherPhone, setFatherPhone] = useState("");
  const [motherPhone, setMotherPhone] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  
  const { toast } = useToast();
  const supabase = createClient();


  const handleAddCustomSubject = () => {
    if (customSubject.trim() && !seniorSubjects.includes(customSubject.trim())) {
        const newSubject = customSubject.trim();
        setSeniorSubjects(prev => [...prev, newSubject]);
        setOptedSubjects(prev => [...prev, newSubject]);
        setCustomSubject("");
    }
  }


  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessInfo(null);
    
    let tempAuthUser = null;

    try {
        if(!name || !email || !fatherName || !motherName || !address || !selectedClass || !selectedSection || !admissionDate || !dob) {
            throw new Error("Please fill out all required fields.");
        }
        if(!fatherPhone && !motherPhone && !studentPhone) {
            throw new Error("At least one phone number is required.");
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: Math.random().toString(36).slice(-8), // Weak temp password
            options: {
                data: { full_name: name, role: 'student' },
                email_confirm: true,
            }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("User creation failed.");
        
        tempAuthUser = authData.user;

        const studentDataPayload = {
            name, email, father_name: fatherName, mother_name: motherName, address, class: selectedClass, section: selectedSection, admission_date: admissionDate.getTime(), date_of_birth: dob.toISOString().split('T')[0], opted_subjects: optedSubjects, aadhar_number: aadharNumber, father_phone: fatherPhone, mother_phone: motherPhone, student_phone: studentPhone, photo: photo?.[0], aadharCard: aadharCard?.[0]
        };

        await addStudent(tempAuthUser.id, studentDataPayload as any);

        setSuccessInfo({ name: name, email: email });
        toast({
            title: "Student Admitted Successfully!",
            description: `${name}'s account has been created. The student will need to use the 'Forgot Password' feature to set their password.`,
        });
        
    } catch (e: any) {
        if (tempAuthUser) {
            console.warn("An error occurred after user creation. Manual auth user cleanup may be required for:", tempAuthUser.id);
        }
        
        let errorMessage = `An unexpected error occurred: ${e.message}`;
        if (e.message.includes('User already registered')) {
            errorMessage = "This email is already in use by another account. Please use a different email.";
        }
        setError(errorMessage);
        console.error("Error adding student: ", e);

    } finally {
        setIsLoading(false);
    }
  }


  const handleAddAnother = () => {
    setSuccessInfo(null);
  }

  if (successInfo) {
    return (
        <Alert variant="default" className="bg-primary/10 border-primary/20 mt-6">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Student Admitted!</AlertTitle>
            <AlertDescription className="space-y-4">
                <p><strong>{successInfo.name}</strong> has been admitted with the email <strong>{successInfo.email}</strong>.</p>
                <p>The student's account has been created. A password reset must be initiated for them to log in.</p>
                 <div className="flex gap-2 pt-2">
                    <Button onClick={handleAddAnother}>
                        <UserPlus className="mr-2" />
                        Admit Another Student
                    </Button>
                    <Button variant="outline" onClick={onStudentAdded}>View Student List</Button>
                 </div>
            </AlertDescription>
        </Alert>
    )
  }

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><Label>Full Name</Label><Input placeholder="e.g., Rohan Kumar" value={name} onChange={(e) => setName(e.target.value)} /></div>
                 <div><Label>Email Address</Label><Input type="email" placeholder="student@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label>Student Photo (Optional)</Label><Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files)} /></div>
                <div className="flex flex-col space-y-2"><Label>Date of Birth</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !dob && "text-muted-foreground")}>{dob ? dob.toLocaleDateString() : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={dob} onSelect={setDob} disabled={(date) => date > new Date() || date < new Date("2000-01-01")} initialFocus /></PopoverContent></Popover></div>
                 <div className="flex flex-col space-y-2"><Label>Admission Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !admissionDate && "text-muted-foreground")}>{admissionDate ? admissionDate.toLocaleDateString() : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={admissionDate} onSelect={setAdmissionDate} initialFocus /></PopoverContent></Popover></div>
                 <div><Label>Class</Label><Select onValueChange={setSelectedClass}><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger><SelectContent>{classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                 <div><Label>Section</Label><Select onValueChange={setSelectedSection}><SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger><SelectContent>{sections.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                 <div><Label>Father's Name</Label><Input placeholder="e.g., Anil Kumar" value={fatherName} onChange={(e) => setFatherName(e.target.value)} /></div>
                 <div><Label>Mother's Name</Label><Input placeholder="e.g., Sunita Kumar" value={motherName} onChange={(e) => setMotherName(e.target.value)} /></div>
                <div><Label>Father's Phone</Label><Input placeholder="+91..." value={fatherPhone} onChange={(e) => setFatherPhone(e.target.value)} /></div>
                <div><Label>Mother's Phone</Label><Input placeholder="+91..." value={motherPhone} onChange={(e) => setMotherPhone(e.target.value)} /></div>
                <div><Label>Student's Phone (Optional)</Label><Input placeholder="+91..." value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} /></div>
                 <div><Label>Aadhar Number (Optional)</Label><Input placeholder="xxxx-xxxx-xxxx" value={aadharNumber} onChange={(e) => setAadharNumber(e.target.value)} /></div>
                <div><Label>Aadhar Card (Optional)</Label><Input type="file" accept="image/*,application/pdf" onChange={(e) => setAadharCard(e.target.files)} /></div>
                 <div className="md:col-span-2"><Label>Address</Label><Textarea placeholder="Enter full residential address" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            </div>

            {(selectedClass === "11th" || selectedClass === "12th") && (
                <>
                <Separator/>
                <div>
                    <div className="mb-4">
                        <Label className="text-base">Opted Subjects for Class {selectedClass}</Label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {seniorSubjects.map((subject) => (
                            <div key={subject} className="flex flex-row items-start space-x-3 space-y-0">
                                <Checkbox
                                    id={subject}
                                    checked={optedSubjects.includes(subject)}
                                    onCheckedChange={(checked) => {
                                        return checked
                                            ? setOptedSubjects([...optedSubjects, subject])
                                            : setOptedSubjects(optedSubjects.filter((value) => value !== subject));
                                    }}
                                />
                                <Label htmlFor={subject} className="font-normal">{subject}</Label>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                        <Input 
                            placeholder="Add custom subject"
                            value={customSubject}
                            onChange={(e) => setCustomSubject(e.target.value)}
                        />
                        <Button type="button" onClick={handleAddCustomSubject}>
                            <Plus className="mr-2" /> Add
                        </Button>
                    </div>
                </div>
                </>
            )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Admit Student & Create Account
          </Button>
        </form>
    </>
  );
}
