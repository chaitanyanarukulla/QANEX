import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QANexus - AI-Powered Quality Assurance",
  description: "Trace everything. Gate what matters. AI-powered quality assurance platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-background antialiased dark">
      <body className={`${geistSans.variable} ${geistMono.variable} h-full`}>
        {children}
      </body>
    </html>
  );
}
