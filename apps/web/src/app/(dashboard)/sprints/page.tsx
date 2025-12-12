'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Calendar, ChevronRight, Loader2 } from 'lucide-react';
import { sprintsApi, Sprint } from '@/lib/api';

export default function SprintsListPage() {
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSprints = async () => {
            try {
                const data = await sprintsApi.list();
                setSprints(data);
            } catch (err) {
                console.error('Failed to load sprints:', err);
                setError('Failed to load sprints');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSprints();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 max-w-5xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Sprints</h1>
                    <p className="text-muted-foreground">Manage and track your sprint cycles.</p>
                </div>
                {/* Placeholder for create action */}
                <button disabled className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 opacity-50 cursor-not-allowed" title="Not implemented yet">
                    <Plus className="mr-2 h-4 w-4" />
                    New Sprint
                </button>
            </div>

            {error && (
                <div className="rounded-md border border-red-500/20 bg-red-500/10 p-4 mb-6">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            <div className="grid gap-4">
                {sprints.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg bg-muted/10">
                        <h3 className="text-lg font-semibold">No sprints found</h3>
                        <p className="text-muted-foreground">Get started by creating your first sprint.</p>
                    </div>
                ) : (
                    sprints.map((sprint) => (
                        <Link
                            key={sprint.id}
                            href={`/sprints/${sprint.id}`}
                            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">{sprint.name}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sprint.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            sprint.status === 'COMPLETED' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' :
                                                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        }`}>
                                        {sprint.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    {sprint.startDate && sprint.endDate && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                                        </span>
                                    )}
                                    {sprint.goal && (
                                        <span className="line-clamp-1 italic">
                                            {sprint.goal}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
