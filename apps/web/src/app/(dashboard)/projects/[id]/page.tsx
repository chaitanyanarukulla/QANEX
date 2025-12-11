'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { projectsApi, Project } from '@/lib/api';
import { Loader2, ArrowLeft, MoreVertical, FileText, Beaker, Bug, Rocket, Folder } from 'lucide-react';

export default function ProjectDetailsPage() {
    const params = useParams();
    const id = params.id as string;
    const [isLoading, setIsLoading] = useState(true);
    const [project, setProject] = useState<Project | null>(null);

    useEffect(() => {
        if (id) {
            loadProject(id);
        }
    }, [id]);

    const loadProject = async (projectId: string) => {
        try {
            const data = await projectsApi.get(projectId);
            setProject(data);
        } catch (error) {
            console.error('Failed to load project:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground">Project not found</p>
                <Link href="/projects" className="text-primary hover:underline">
                    Back to Projects
                </Link>
            </div>
        );
    }

    const cards = [
        {
            title: 'Requirements',
            icon: FileText,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            href: `/requirements?projectId=${project.id}`,
            description: 'Manage functional and non-functional requirements'
        },
        {
            title: 'Test Cases',
            icon: Beaker,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
            href: `/tests?projectId=${project.id}`,
            description: 'Create and manage test cases and suites'
        },
        {
            title: 'Issues',
            icon: Bug,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            href: `/issues?projectId=${project.id}`,
            description: 'Track defects, bugs, and improvements'
        },
        {
            title: 'Releases',
            icon: Rocket,
            color: 'text-green-500',
            bg: 'bg-green-500/10',
            href: `/releases?projectId=${project.id}`,
            description: 'Manage release cycles and deployments'
        }
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <div className="flex items-center gap-4 mb-6">
                    <Link
                        href="/projects"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Projects
                    </Link>
                </div>

                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Folder className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{project.key}</span>
                                <span>•</span>
                                <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                    <button className="p-2 text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-5 w-5" />
                    </button>
                </div>

                {project.description && (
                    <p className="mt-4 max-w-2xl text-muted-foreground">
                        {project.description}
                    </p>
                )}
            </div>

            {/* Quick Links Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((card) => (
                    <Link
                        key={card.title}
                        href={card.href}
                        className="group flex flex-col rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/20"
                    >
                        <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${card.bg} ${card.color}`}>
                            <card.icon className="h-5 w-5" />
                        </div>
                        <h3 className="font-semibold">{card.title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {card.description}
                        </p>
                    </Link>
                ))}
            </div>

            {/* Recent Activity Placeholder */}
            <div className="rounded-xl border bg-card">
                <div className="p-6 border-b">
                    <h3 className="font-semibold">Recent Activity</h3>
                </div>
                <div className="p-6 text-center text-sm text-muted-foreground">
                    No recent activity in this project.
                </div>
            </div>
        </div>
    );
}
