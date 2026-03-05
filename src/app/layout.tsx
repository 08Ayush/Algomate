import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../contexts/ThemeContext";
import { SemesterModeProvider } from "../contexts/SemesterModeContext";
import { ConfirmDialogProvider } from "../components/ui/ConfirmDialog";
import { Toaster } from "react-hot-toast";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "Algomate - AI-Powered Timetable Scheduling",
  description: "Algomate is an AI-powered platform that helps educational institutions automate and optimize academic scheduling with intelligent algorithms.",
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
            <ConfirmDialogProvider>
              {children}
              <Toaster
                position="top-right"
                gutter={12}
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#fff',
                    color: '#1f2937',
                    borderRadius: '14px',
                    boxShadow: '0 10px 40px rgba(77,134,156,0.18)',
                    border: '1px solid rgba(77,134,156,0.15)',
                    padding: '14px 18px',
                    fontSize: '14px',
                    fontWeight: '500',
                    maxWidth: '420px',
                  },
                  success: {
                    iconTheme: { primary: '#4D869C', secondary: '#fff' },
                    style: {
                      background: '#f0faf8',
                      borderLeft: '4px solid #4D869C',
                    },
                  },
                  error: {
                    iconTheme: { primary: '#ef4444', secondary: '#fff' },
                    style: {
                      background: '#fff5f5',
                      borderLeft: '4px solid #ef4444',
                    },
                  },
                  loading: {
                    iconTheme: { primary: '#4D869C', secondary: '#CDE8E5' },
                    style: {
                      background: '#f0faf8',
                      borderLeft: '4px solid #7AB2B2',
                    },
                  },
                }}
              />
            </ConfirmDialogProvider>
          </SemesterModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
