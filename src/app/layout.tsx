
"use client";

import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import AuthProvider from "@/components/auth/AuthProvider";
import { usePathname } from "next/navigation";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

const publicPaths = [
    "/login",
    "/auth/student/login",
    "/auth/teacher/login",
    "/auth/principal/login",
    "/auth/owner/login",
    "/auth/student/forgot-password",
    "/auth/teacher/forgot-password",
    "/auth/update-password",
    "/auth/callback",
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isPublicPage = publicPaths.some(path => pathname.startsWith(path));

  const initialSettings = {
    schoolName: "Hilton Convent School",
    logoUrl: "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png",
    primaryColor: "hsl(358 80% 47%)",
    accentColor: "hsl(358 80% 47%)",
  };
  
  const metadata: Metadata = {
    title: "Hilton Convent School",
    description: `Student Dashboard for Hilton Convent School`,
    icons: {
      icon: initialSettings.logoUrl,
    },
  };

  const viewport: Viewport = {
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: 'white' },
      { media: '(prefers-color-scheme: dark)', color: 'black' },
    ],
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  };


  return (
    <html lang="en" className={`${poppins.variable}`} suppressHydrationWarning>
      <head/>
      <body className="antialiased bg-background">
        <ThemeProvider settings={initialSettings}>
            {isPublicPage ? (
                children
            ) : (
                <AuthProvider>
                    {children}
                </AuthProvider>
            )}
            <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
