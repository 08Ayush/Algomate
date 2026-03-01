import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../contexts/ThemeContext";
import { SemesterModeProvider } from "../contexts/SemesterModeContext";
import { ConfirmDialogProvider } from "../components/ui/ConfirmDialog";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "Academic Compass - Your Educational Journey Starts Here",
  description: "Academic Compass helps students navigate their educational journey with personalized guidance, resources, and tools for academic success.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <SemesterModeProvider>
            {children}
          </SemesterModeProvider>
          <ConfirmDialogProvider>
            {children}
          </ConfirmDialogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
