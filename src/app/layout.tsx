
import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

// This function runs on the server and cannot have user-specific logic or auth.
// Using static default values to prevent permission errors.
export const metadata: Metadata = {
    title: "Hilton Convent School",
    description: `Student Dashboard for Hilton Convent School`,
    icons: {
      icon: "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png",
    },
};


export const viewport: Viewport = {
   themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // initialSettings is passed to the client-side provider to avoid a flicker.
  // The provider will then subscribe to real-time updates.
  const initialSettings = {
    schoolName: "Hilton Convent School",
    logoUrl: "https://cnvwsxlwpvyjxemgpdks.supabase.co/storage/v1/object/public/files/hcsss.png",
    primaryColor: "hsl(217, 91%, 60%)",
    accentColor: "hsl(258, 90%, 66%)",
  };

  return (
    <html lang="en" className={`${poppins.variable}`} suppressHydrationWarning>
      <head/>
      <body className="antialiased bg-background">
        <ThemeProvider settings={initialSettings}>
            {children}
            <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
