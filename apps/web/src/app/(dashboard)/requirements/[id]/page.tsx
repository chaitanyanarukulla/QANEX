'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Bot, Save, Trash2, Check, ListTodo, PlusCircle, MinusCircle } from 'lucide-react';
import Link from 'next/link';
import { requirementsApi } from '@/services/requirements.service';
import { Requirement } from '@/types/requirement';
import { useToast } from '@/components/ui/use-toast';

export default function RequirementDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const { showToast } = useToast();

    const [requirement, setRequirement] = useState<Requirement | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([]);

    const [error, setError] = useState<string | null>(null);

    const loadRequirement = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await requirementsApi.get(id);
            setRequirement(data);
            setTitle(data.title);
            setContent(data.content);
            setAcceptanceCriteria(data.acceptanceCriteria || []);
            setError(null);
        } catch (err) {
            console.error('Failed to load requirement:', err);
            setError('Failed to load requirement');
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            loadRequirement();
            // loadSprints(); // Not needed anymore
        }
    }, [id, loadRequirement]);

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        if (requirement) {
            setTitle(requirement.title);
            setContent(requirement.content);
            setAcceptanceCriteria(requirement.acceptanceCriteria || []);
        }
    };

    const handleSave = async () => {
        if (!requirement) return;
        try {
            setIsSaving(true);
            const updated = await requirementsApi.update(id, {
                title,
                content,
                state: requirement.state,
                acceptanceCriteria,
            });
            setRequirement(updated);
            setIsEditing(false);
            showToast('Requirement updated', 'success');
            setError(null);
        } catch (err) {
            console.error('Failed to save requirement:', err);
            showToast('Failed to save requirement', 'error');
            setError('Failed to save requirement');
        } finally {
            setIsSaving(false);
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

    const handleGenerateTasks = async () => {
        try {
            setIsAnalyzing(true);
            const result = await requirementsApi.generateTasks(id);
            if (result.count > 0) {
                showToast(`Successfully generated ${result.count} tasks`, 'success');
            } else {
                showToast('No tasks were generated. AI might have deemed them unnecessary.', 'info');
            }

            // Reload to get tasks
            await loadRequirement();
            setError(null);
        } catch (err) {
            console.error('Failed to generate tasks:', err);
            showToast('Failed to generate tasks. Please try again.', 'error');
            setError('Failed to generate tasks');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleApprove = async () => {
        try {
            setIsSaving(true);
            const updated = await requirementsApi.approve(id);
            setRequirement(updated);
            showToast('Requirement approved', 'success');
            setError(null);
        } catch (err) {
            console.error('Failed to approve requirement:', err);
            showToast('Failed to approve requirement', 'error');
            setError('Failed to approve requirement');
        } finally {
            setIsSaving(false);
        }
    };

    const handleMoveToBacklog = async () => {
        try {
            setIsSaving(true);
            const result = await requirementsApi.moveTasksToBacklog(id);
            showToast(`Moved ${result.count} tasks to backlog`, 'success');
            // Reload
            loadRequirement();
        } catch (err) {
            console.error('Failed to move tasks to backlog:', err);
            showToast('Failed to move tasks to backlog', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddTask = () => {
        // Navigate to new task creation page, passing this requirement ID
        // Simplified: use query param or just navigate to generic create with predefined value if possible
        // For now, let's assume we have a way to create linked tasks. 
        // Or we can just create a placeholder via API and then edit it.
        // Actually, let's create a *new* task page: /tasks/new?requirementId=...
        router.push(`/tasks/new?requirementId=${id}`);
    };

    const addAcceptanceCriteria = () => {
        setAcceptanceCriteria([...acceptanceCriteria, '']);
    };

    const updateAcceptanceCriteria = (index: number, value: string) => {
        const newCriteria = [...acceptanceCriteria];
        newCriteria[index] = value;
        setAcceptanceCriteria(newCriteria);
    };

    const removeAcceptanceCriteria = (index: number) => {
        const newCriteria = acceptanceCriteria.filter((_, i) => i !== index);
        setAcceptanceCriteria(newCriteria);
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
        APPROVED: 'bg-green-600/20 text-green-700 dark:text-green-300',
        BACKLOGGED: 'bg-purple-600/20 text-purple-700 dark:text-purple-300',
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
                    {isEditing ? (
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-background border rounded-md px-3 py-2 text-3xl font-bold placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    ) : (
                        <h1 className="text-3xl font-bold">{title}</h1>
                    )}
                </div>
                <div className="flex gap-2">
                    {/* View Mode Actions */}
                    {!isEditing && (
                        <>
                            {/* Approve / Generate Tasks - ONLY visible when not editing */}
                            {requirement && (requirement.state === 'DRAFT' || requirement.state === 'NEEDS_REVISION') && (
                                <button
                                    onClick={handleApprove}
                                    disabled={isSaving}
                                    className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-green-700 disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                    Approve
                                </button>
                            )}
                            {requirement && requirement.state === 'APPROVED' && (
                                <>
                                    {(!requirement.sprintItems || requirement.sprintItems.length === 0) ? (
                                        <button
                                            onClick={handleGenerateTasks}
                                            disabled={isAnalyzing}
                                            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListTodo className="mr-2 h-4 w-4" />}
                                            Generate Tasks
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleMoveToBacklog}
                                            disabled={isSaving}
                                            className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-purple-700 disabled:opacity-50"
                                        >
                                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListTodo className="mr-2 h-4 w-4" />}
                                            Approve & Move to Backlog
                                        </button>
                                    )}
                                </>
                            )}
                            {requirement && requirement.state === 'BACKLOGGED' && (
                                <button
                                    disabled
                                    className="inline-flex items-center justify-center rounded-full bg-purple-600/10 px-4 py-2 text-sm font-medium text-purple-600 shadow-none border border-purple-200 dark:border-purple-800 cursor-not-allowed opacity-80"
                                >
                                    <span className="mr-2">📋</span>
                                    Backlogged
                                </button>
                            )}

                            {/* Edit Button */}
                            <button
                                onClick={handleEdit}
                                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil mr-2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                Edit
                            </button>

                            {/* Delete Button */}
                            <button
                                onClick={handleDelete}
                                className="inline-flex items-center justify-center rounded-md border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-500/20"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </>
                    )}

                    {/* Edit Mode Actions */}
                    {isEditing && (
                        <>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${stateColors[requirement.state]}`}>
                    {requirement.state}
                </span>

                {requirement.priority && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${requirement.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-600' :
                        requirement.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-600' :
                            requirement.priority === 'MEDIUM' ? 'bg-blue-500/20 text-blue-600' :
                                'bg-gray-500/20 text-gray-600'
                        }`}>
                        {requirement.priority}
                    </span>
                )}

                {requirement.type && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-600">
                        {requirement.type}
                    </span>
                )}

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    {/* Header Info: Source Doc & Parent Epic */}
                    <div className="flex gap-4 text-sm">
                        {requirement.sourceDocumentId && (
                            <Link href={`/documents/${requirement.sourceDocumentId}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                                <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-800">
                                    📄 Source Document
                                </span>
                            </Link>
                        )}
                        {requirement.parent && (
                            <Link href={`/requirements/${requirement.parent.id}`} className="flex items-center gap-1 text-purple-600 hover:underline">
                                <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900 border border-purple-200 dark:border-purple-800">
                                    🏔️ Parent Epic: {requirement.parent.title}
                                </span>
                            </Link>
                        )}
                    </div>

                    <div className="min-h-[200px] rounded-lg border bg-card p-4">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Content</h3>
                        {isEditing ? (
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full h-full min-h-[200px] bg-background border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Describe the requirement in detail..."
                            />
                        ) : (
                            <div className="whitespace-pre-wrap">{content}</div>
                        )}
                    </div>

                    <div className="rounded-lg border bg-card p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-muted-foreground">Acceptance Criteria</h3>
                            {isEditing && (
                                <button onClick={addAcceptanceCriteria} type="button" className="text-sm text-primary hover:underline flex items-center gap-1">
                                    <PlusCircle className="h-3 w-3" /> Add
                                </button>
                            )}
                        </div>

                        {isEditing ? (
                            <div className="space-y-2">
                                {acceptanceCriteria.map((ac, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={ac}
                                            onChange={(e) => updateAcceptanceCriteria(idx, e.target.value)}
                                            className="flex-1 bg-background border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="Enter acceptance criteria..."
                                        />
                                        <button onClick={() => removeAcceptanceCriteria(idx)} className="text-red-500 hover:text-red-600">
                                            <MinusCircle className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                {acceptanceCriteria.length === 0 && (
                                    <p className="text-sm text-muted-foreground italic">No criteria added. Click Add to create one.</p>
                                )}
                            </div>
                        ) : (
                            <ul className="list-disc pl-5 space-y-2">
                                {requirement.acceptanceCriteria && requirement.acceptanceCriteria.length > 0 ? (
                                    requirement.acceptanceCriteria.map((ac, idx) => (
                                        <li key={idx} className="text-sm">{ac}</li>
                                    ))
                                ) : (
                                    <li className="text-sm text-muted-foreground italic list-none">No acceptance criteria defined.</li>
                                )}
                            </ul>
                        )}
                    </div>

                    {/* Children Requirements (for Epics) */}
                    {requirement.children && requirement.children.length > 0 && (
                        <div className="rounded-lg border bg-card p-4">
                            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Child Requirements</h3>
                            <div className="space-y-2">
                                {requirement.children.map(child => (
                                    <Link key={child.id} href={`/requirements/${child.id}`} className="block p-3 rounded-md border bg-background/50 hover:bg-accent transition-colors">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">{child.title}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${stateColors[child.state] || 'bg-gray-100'}`}>
                                                {child.state}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    {/* Tasks Section */}
                    <div className="rounded-lg border bg-card p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-muted-foreground">Implementation Tasks ({requirement.sprintItems?.length || 0})</h3>
                            <button
                                onClick={handleAddTask}
                                className="inline-flex items-center justify-center rounded-md border border-input bg-background p-1 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                                title="Add Task"
                            >
                                <PlusCircle className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {requirement.sprintItems?.map((task) => (
                                <Link href={`/tasks/${task.id}`} key={task.id} className="block p-3 rounded-md border bg-background/50 hover:bg-accent transition-colors">
                                    <div className="flex items-start justify-between mb-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${task.type === 'bug' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                                            }`}>
                                            {task.type}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{task.estimatedHours}h</span>
                                    </div>
                                    <p className="font-medium text-sm mb-2">{task.title}</p>

                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <span className={`w-2 h-2 rounded-full ${task.status === 'done' ? 'bg-green-500' :
                                            task.status === 'in_progress' ? 'bg-blue-500' :
                                                'bg-gray-300'
                                            }`} />
                                        {task.status.replace('_', ' ')}
                                    </span>
                                </Link>
                            ))}
                            {(!requirement.sprintItems || requirement.sprintItems.length === 0) && (
                                <p className="text-sm text-muted-foreground italic">No tasks generated yet. Approve and generate tasks to see them here.</p>
                            )}
                        </div>
                    </div>

                    {requirement.rqsBreakdown && (
                        <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900/50 dark:bg-purple-900/10">
                            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 mb-3">
                                <Bot className="h-4 w-4" />
                                <span className="text-sm font-medium">RQS Breakdown</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                {Object.entries(requirement.rqsBreakdown).map(([key, value]) => (
                                    <div key={key}>
                                        <span className="text-muted-foreground capitalize">{key}</span>
                                        <p className="text-lg font-semibold">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="text-xs text-muted-foreground">
                <p>Created: {new Date(requirement.createdAt).toLocaleDateString()}</p>
                <p>Updated: {new Date(requirement.updatedAt).toLocaleDateString()}</p>
            </div>
        </div>
    );
}
