
import Header from "@/components/dashboard/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function TermsAndConditionsPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="Terms & Conditions" />
      <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Terms &amp; Conditions</CardTitle>
               <p className="text-muted-foreground pt-2">
                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Please read these terms and conditions carefully before using
                our school management application.
              </p>

              <h3 className="font-semibold text-lg">1. Acceptance of Terms</h3>
              <p>
                By accessing and using this application, you accept and agree to
                be bound by the terms and provision of this agreement.
              </p>

              <h3 className="font-semibold text-lg">2. User Accounts</h3>
              <p>
                You are responsible for safeguarding your account credentials
                and for any activities or actions under your account. You agree
                to notify us immediately upon becoming aware of any breach of
                security or unauthorized use of your account.
              </p>
              
              <h3 className="font-semibold text-lg">3. Appropriate Use</h3>
              <p>
                You agree to use the application only for lawful, educational,
                and administrative purposes as intended by the school. You may not
                use the application in a way that is disruptive, harmful, or
                infringes on the rights of others.
              </p>

              <h3 className="font-semibold text-lg">4. Intellectual Property</h3>
              <p>
                The Service and its original content, features, and
                functionality are and will remain the exclusive property of
                Hilton Convent Senior Secondary School and its licensors.
              </p>
              
               <h3 className="font-semibold text-lg">5. Limitation Of Liability</h3>
              <p>
                In no event shall Hilton Convent Senior Secondary School, nor its directors,
                employees, partners, agents, suppliers, or affiliates, be liable
                for any indirect, incidental, special, consequential or punitive
                damages, including without limitation, loss of profits, data,
                use, goodwill, or other intangible losses.
              </p>

              <h3 className="font-semibold text-lg">6. Changes</h3>
              <p>
                We reserve the right, at our sole discretion, to modify or
                replace these Terms at any time. We will provide notice of any
                changes by posting the new Terms and Conditions on this page.
              </p>

              <h3 className="font-semibold text-lg">Contact Us</h3>
              <p>
                If you have any questions about these Terms, please contact us at support@hiltonconvent.com.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
