'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Bot, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { requirementsApi, Requirement } from '@/lib/api';

export default function RequirementDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [requirement, setRequirement] = useState<Requirement | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            loadRequirement();
        }
    }, [id]);

    const loadRequirement = async () => {
        try {
            setIsLoading(true);
            const data = await requirementsApi.get(id);
            setRequirement(data);
            setTitle(data.title);
            setDescription(data.description);
            setError(null);
        } catch (err) {
            console.error('Failed to load requirement:', err);
            setError('Failed to load requirement');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!requirement) return;
        try {
            setIsSaving(true);
            const updated = await requirementsApi.update(id, {
                title,
                description,
                state: requirement.state,
            });
            setRequirement(updated);
            setError(null);
        } catch (err) {
            console.error('Failed to save requirement:', err);
            setError('Failed to save requirement');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAnalyze = async () => {
        try {
            setIsAnalyzing(true);
            const updated = await requirementsApi.analyze(id);
            setRequirement(updated);
            setError(null);
        } catch (err) {
            console.error('Failed to analyze requirement:', err);
            setError('Failed to analyze requirement');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this requirement?')) return;
        try {
            await requirementsApi.delete(id);
            router.push('/requirements');
        } catch (err) {
            console.error('Failed to delete requirement:', err);
            setError('Failed to delete requirement');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!requirement) {
        return (
            <div className="space-y-4">
                <Link href="/requirements" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> Back to Requirements
                </Link>
                <div className="rounded-md border border-red-500/20 bg-red-500/10 p-6 text-center">
                    <p className="text-red-500">Requirement not found</p>
                </div>
            </div>
        );
    }

    const stateColors: Record<string, string> = {
        DRAFT: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
        PUBLISHED: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
        NEEDS_REVISION: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
        READY: 'bg-green-500/20 text-green-600 dark:text-green-400',
    };

    const rqsColor = (score?: number) => {
        if (score === undefined) return 'text-muted-foreground';
        if (score >= 80) return 'text-green-600 dark:text-green-400';
        if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {error && (
                <div className="rounded-md border border-red-500/20 bg-red-500/10 p-4">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            <div className="flex items-center gap-4 mb-8">
                <Link href="/requirements" className="p-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="flex-1">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-transparent text-3xl font-bold placeholder:text-muted-foreground/50 focus:outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                    >
                        {isSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Save
                    </button>
                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-purple-700 disabled:opacity-50"
                    >
                        {isAnalyzing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Bot className="mr-2 h-4 w-4" />
                        )}
                        Analyze
                    </button>
                    <button
                        onClick={handleDelete}
                        className="inline-flex items-center justify-center rounded-md border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-500/20"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${stateColors[requirement.state]}`}>
                    {requirement.state}
                </span>
                {requirement.rqsScore !== undefined ? (
                    <div className="flex items-center gap-2">
                        <span className={`text-xl font-bold ${rqsColor(requirement.rqsScore)}`}>
                            RQS: {requirement.rqsScore}
                        </span>
                    </div>
                ) : (
                    <span className="text-sm text-muted-foreground">Not analyzed yet</span>
                )}
            </div>

            <div className="min-h-[500px] rounded-lg border bg-card p-4">
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full h-full min-h-[500px] resize-none bg-transparent p-4 focus:outline-none"
                    placeholder="Describe the requirement in detail..."
                />
            </div>

            {requirement.rqsBreakdown && (
                <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900/50 dark:bg-purple-900/10">
                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 mb-3">
                        <Bot className="h-4 w-4" />
                        <span className="text-sm font-medium">RQS Breakdown</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {Object.entries(requirement.rqsBreakdown).map(([key, value]) => (
                            <div key={key}>
                                <span className="text-muted-foreground">{key}</span>
                                <p className="text-lg font-semibold">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="text-xs text-muted-foreground">
                <p>Created: {new Date(requirement.createdAt).toLocaleDateString()}</p>
                <p>Updated: {new Date(requirement.updatedAt).toLocaleDateString()}</p>
            </div>
        </div>
    );
}
