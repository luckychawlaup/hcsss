
import Header from "@/components/dashboard/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="Privacy Policy" />
      <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Policy</CardTitle>
              <p className="text-muted-foreground pt-2">
                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Hilton Convent Senior Secondary School ("we," "our," or "us") is
                committed to protecting your privacy. This Privacy Policy
                explains how we collect, use, disclose, and safeguard your
                information when you use our school management application.
              </p>

              <h3 className="font-semibold text-lg">Information We Collect</h3>
              <p>
                We may collect personal identification information from Students
                and Teachers in a variety of ways, including, but not limited
                to, when users enroll in the School, use the Application, and in
                connection with other activities, services, features, or
                resources we make available. Information collected includes:
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Student Information: Name, class, section, SRN, contact
                  details, attendance records, marks, and other academic data.
                </li>
                <li>
                  Teacher Information: Name, contact details, subjects taught,
                  and employment-related data.
                </li>
                <li>
                  Parent/Guardian Information: Names and contact details.
                </li>
              </ul>

              <h3 className="font-semibold text-lg">How We Use Your Information</h3>
              <p>
                We use the information we collect to operate and maintain our
                school management system, including:
              </p>
               <ul className="list-disc list-inside space-y-1">
                <li>To manage student records, attendance, and grades.</li>
                <li>To facilitate communication between the school, teachers, students, and parents.</li>
                <li>To process leave requests and manage payroll.</li>
                <li>To improve our application and services.</li>
              </ul>

              <h3 className="font-semibold text-lg">Data Security</h3>
              <p>
                We use administrative, technical, and physical security
                measures to help protect your personal information. While we
                have taken reasonable steps to secure the personal information
                you provide to us, please be aware that despite our efforts, no
                security measures are perfect or impenetrable.
              </p>

              <h3 className="font-semibold text-lg">Contact Us</h3>
              <p>
                If you have questions or comments about this Privacy Policy,
                please contact us at support@hiltonconvent.com.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
