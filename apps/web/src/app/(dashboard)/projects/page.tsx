'use client';

import { Plus, Box } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProjectsPage() {
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateDemo = async () => {
        setIsCreating(true);
        try {
            const token = localStorage.getItem('accessToken');
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/demo/project', {
                method: 'POST',
                headers
            });

            if (res.ok) {
                router.push('/'); // Go back to dashboard to see results
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
                <Link href="/projects/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-4 w-4" /> New Project
                </Link>
            </div>

            {/* Empty State / Demo CTA */}
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 p-8 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                    <Box className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">No projects yet</h3>
                <p className="mb-8 mt-2 max-w-sm text-sm text-muted-foreground">
                    Get started by creating your first project manually, or spin up a demo sandbox to explore the features.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                        onClick={handleCreateDemo}
                        disabled={isCreating}
                        className="inline-flex items-center gap-2 rounded-lg bg-secondary px-6 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
                    >
                        {isCreating ? 'Creating...' : 'Try Demo Experience'}
                    </button>
                    <Link
                        href="/projects/new"
                        className="inline-flex items-center gap-2 rounded-lg border bg-background px-6 py-2 text-sm font-medium hover:bg-muted"
                    >
                        Create Empty Project
                    </Link>
                </div>
            </div>
        </div>
    );
}
