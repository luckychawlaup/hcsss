
import Header from "@/components/dashboard/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function RefundPolicyPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header title="Refund Policy" />
      <main className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Refund Policy</CardTitle>
              <p className="text-muted-foreground pt-2">
                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center gap-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <AlertTriangle className="h-8 w-8 flex-shrink-0 text-destructive" />
                    <div>
                        <h3 className="font-bold text-destructive">No Refund Policy</h3>
                        <p className="text-sm text-destructive/90">
                           All fees once paid are non-refundable and non-transferable under any circumstances.
                        </p>
                    </div>
                </div>

              <div className="space-y-4 text-muted-foreground">
                <p>
                    Hilton Convent Senior Secondary School operates on a strict no-refund policy for all payments made towards school fees. This includes, but is not limited to:
                </p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>Admission Fees</li>
                    <li>Annual Tuition Fees</li>
                    <li>Quarterly or Monthly Fee Installments</li>
                    <li>Transportation Fees</li>
                    <li>Examination Fees</li>
                    <li>Any other miscellaneous charges or levies.</li>
                </ul>
                <p>
                    This policy is enforced to ensure the stable financial planning and operation of the school's resources, infrastructure, and staffing throughout the academic year.
                </p>
                <p>
                    By enrolling your child at our school, you acknowledge and agree to this non-refundable fee policy. We advise parents and guardians to carefully consider this before making any payment.
                </p>
              </div>

               <h3 className="font-semibold text-lg pt-4">Contact Us</h3>
              <p>
                If you have any questions regarding this policy, please contact the school administration before making a payment.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
