'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { projectsApi } from '@/services/projects.service';

export default function NewProjectPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        key: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            await projectsApi.create(formData);
            router.push('/projects');
        } catch (err) {
            console.error('Failed to create project:', err);
            setError('Failed to create project. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const generateKey = (name: string) => {
        return name
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 6);
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setFormData(prev => ({
            ...prev,
            name,
            key: prev.key || generateKey(name),
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/projects"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Projects
                </Link>
            </div>

            <div className="max-w-2xl">
                <h1 className="text-2xl font-bold tracking-tight">Create New Project</h1>
                <p className="mt-2 text-muted-foreground">
                    Set up a new project to start tracking requirements, tests, and releases.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    {error && (
                        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">
                            Project Name <span className="text-destructive">*</span>
                        </label>
                        <input
                            id="name"
                            type="text"
                            required
                            value={formData.name}
                            onChange={handleNameChange}
                            placeholder="e.g., Mobile App Redesign"
                            className="w-full rounded-md border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="key" className="text-sm font-medium">
                            Project Key <span className="text-destructive">*</span>
                        </label>
                        <input
                            id="key"
                            type="text"
                            required
                            value={formData.key}
                            onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value.toUpperCase() }))}
                            placeholder="e.g., MAR"
                            maxLength={6}
                            className="w-full rounded-md border bg-background px-4 py-2 text-sm uppercase outline-none focus:ring-2 focus:ring-primary"
                        />
                        <p className="text-xs text-muted-foreground">
                            A short identifier used for requirements and issues (e.g., MAR-123)
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-medium">
                            Description
                        </label>
                        <textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Brief description of the project..."
                            rows={4}
                            className="w-full rounded-md border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div className="flex items-center gap-4 pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.name || !formData.key}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {isSubmitting ? 'Creating...' : 'Create Project'}
                        </button>
                        <Link
                            href="/projects"
                            className="text-sm text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
