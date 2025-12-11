'use client';

import { Plus, Box, Folder, ArrowRight, Clock, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { projectsApi, demoApi, Project } from '@/lib/api';

export default function ProjectsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isCreatingDemo, setIsCreatingDemo] = useState(false);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const data = await projectsApi.list();
            setProjects(data);
        } catch (error) {
            console.error('Failed to load projects:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateDemo = async () => {
        setIsCreatingDemo(true);
        try {
            await demoApi.createProject();
            // Refresh list
            await loadProjects();
        } catch (error) {
            console.error(error);
        } finally {
            setIsCreatingDemo(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
                <Link href="/projects/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-4 w-4" /> New Project
                </Link>
            </div>

            {projects.length === 0 ? (
                /* Empty State / Demo CTA */
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
                            disabled={isCreatingDemo}
                            className="inline-flex items-center gap-2 rounded-lg bg-secondary px-6 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
                        >
                            {isCreatingDemo && <Loader2 className="h-4 w-4 animate-spin" />}
                            {isCreatingDemo ? 'Creating...' : 'Try Demo Experience'}
                        </button>
                        <Link
                            href="/projects/new"
                            className="inline-flex items-center gap-2 rounded-lg border bg-background px-6 py-2 text-sm font-medium hover:bg-muted"
                        >
                            Create Empty Project
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => (
                        <Link
                            key={project.id}
                            href={`/projects/${project.id}`}
                            className="group relative flex flex-col justify-between rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md"
                        >
                            <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <Folder className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold leading-none tracking-tight">{project.name}</h3>
                                            <p className="mt-1 text-sm text-muted-foreground">{project.key}</p>
                                        </div>
                                    </div>
                                </div>
                                <p className="line-clamp-2 text-sm text-muted-foreground min-h-[2.5em]">
                                    {project.description || 'No description provided.'}
                                </p>
                            </div>
                            <div className="mt-6 flex items-center justify-between border-t pt-4">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
