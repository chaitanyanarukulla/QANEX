'use client';

import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { ToastProvider } from '@/components/ui/use-toast';
import { TourProvider } from '@/components/tours/TourProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ToastProvider>
        <TourProvider>
          <ProtectedRoute>
            <div className="h-full overflow-hidden flex">
              <Sidebar />
              <main className="flex flex-col flex-1 h-full overflow-hidden bg-muted/20">
                <Navbar />
                <div className="flex-1 overflow-y-auto p-6">
                  {children}
                </div>
              </main>
            </div>
          </ProtectedRoute>
        </TourProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
