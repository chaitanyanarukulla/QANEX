import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Changed from Geist, Geist_Mono
import "./globals.css";
import { ToastProvider } from "@/components/ui/use-toast";
import { QueryProvider } from "@/components/providers/QueryProvider";

const inter = Inter({ subsets: ["latin"] }); // Standard Inter font

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
      <body className={`${inter.className} h-full`}>
        <QueryProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
