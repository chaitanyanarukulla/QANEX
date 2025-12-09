'use client';

import { createContext, useContext, useState, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

const ToastContext = createContext<{ showToast: (msg: string, type: ToastType) => void } | null>(null);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={\`px-4 py-2 rounded shadow-lg text-white text-sm animate-in slide-in-from-bottom-5 fade-in duration-300 \${
                    toast.type === 'success' ? 'bg-green-600' :
                        toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
                }\`}
                    >
                {toast.message}
            </div>
                ))}
        </div>
        </ToastContext.Provider >
    );
}
