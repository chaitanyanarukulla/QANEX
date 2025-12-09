import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function WelcomeModal() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const hasSeen = localStorage.getItem('hasSeenWelcomeV2');
        if (!hasSeen) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem('hasSeenWelcomeV2', 'true');
    };

    const handleCreateProject = () => {
        handleClose();
        router.push('/projects/new'); // Or trigger a modal
    };

    const handleDemo = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            // Make API call
            const res = await fetch('http://localhost:3000/demo/project', {
                method: 'POST',
                headers
            });

            if (res.ok) {
                // Refresh to show new project data (or navigate)
                handleClose();
                window.location.reload(); // Simple reload to refresh dashboard stats
            } else {
                console.error("Failed to create demo project");
            }
        } catch (error) {
            console.error("Error creating demo project", error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-lg animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Welcome to TraceGate</h2>
                    <button onClick={handleClose} className="p-1 rounded-md hover:bg-muted duration-200">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                <div className="space-y-4 text-muted-foreground mb-8">
                    <p>Trace everything. Gate what matters.</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>AI-powered Requirement Analysis (RQS)</li>
                        <li>Automated Test Logic Generation</li>
                        <li>Release Confidence Scores (RCS)</li>
                    </ul>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium rounded-md hover:bg-muted"
                    >
                        I'll explore myself
                    </button>
                    <button
                        onClick={handleDemo}
                        className="px-4 py-2 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    >
                        Spin up a Demo Project
                    </button>
                    <button
                        onClick={handleCreateProject}
                        className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        Start New Project
                    </button>
                </div>
            </div>
        </div>
    );
}
