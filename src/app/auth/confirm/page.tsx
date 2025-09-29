
"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";

function AuthConfirmationContent() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing your confirmation...");
  const [title, setTitle] = useState("Please wait");
  const supabase = createClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for explicit errors in URL first, as provided by Supabase redirects
    const errorCode = searchParams.get("error_code");
    const errorDescription = searchParams.get("error_description");

    if (errorCode || errorDescription) {
        setStatus("error");
        setTitle("Link Invalid or Expired");
        setMessage(errorDescription || "This confirmation link is either invalid or has expired. Please try again.");
        return;
    }

    // If no errors in URL, listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN") {
          setStatus("success");
          setTitle("Email Verified!");
          setMessage("Your account has been successfully verified. You can now log in.");
        } else if (event === "USER_UPDATED") {
          setStatus("success");
          setTitle("Email Updated!");
          setMessage("Your email address has been successfully updated.");
        }
      }
    );

    // Set a timeout to handle cases where no event is fired (e.g., expired link)
    const timer = setTimeout(() => {
        if (status === 'loading') {
             setStatus("error");
             setTitle("Confirmation Failed");
             setMessage("The confirmation could not be completed. The link may be invalid or has expired. Please request a new one.");
        }
    }, 10000); // 10 seconds timeout

    return () => {
      authListener.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [supabase, searchParams, status]);

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">{message}</p>
          </div>
        );
      case "success":
        return (
          <Alert variant="default" className="bg-primary/10 border-primary/20">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">{title}</AlertTitle>
            <AlertDescription className="space-y-4">
              {message}
              <div className="pt-2">
                <Button asChild>
                  <Link href="/login">Proceed to Login</Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        );
      case "error":
        return (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription className="space-y-4">
                {message}
                 <div className="pt-2">
                    <Button asChild variant="secondary">
                        <Link href="/login">Back to Login</Link>
                    </Button>
                </div>
            </AlertDescription>
          </Alert>
        );
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Image
            src={"/hcsss.png"}
            alt="School Logo"
            width={80}
            height={80}
            className="mb-4 rounded-full mx-auto"
            priority
          />
           <h1 className="text-2xl font-bold text-primary">Account Confirmation</h1>
        </div>
        <div>
            {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default function AuthConfirmationPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <AuthConfirmationContent />
        </Suspense>
    )
}
