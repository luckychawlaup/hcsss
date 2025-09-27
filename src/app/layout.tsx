
"use client";

import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Suspense } from "react";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const initialSettings = {
    schoolName: "HCSSS",
    logoUrl: "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png",
    primaryColor: "hsl(358 80% 47%)",
    accentColor: "hsl(358 80% 47%)",
  };
  
  const metadata: Metadata = {
    title: "HCSSS",
    description: `Student Dashboard for HCSSS`,
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
            <Suspense>
              {children}
            </Suspense>
            <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
