'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { sprintsApi } from '@/services/sprints.service';
import { SprintItemPriority, SprintItemStatus, SprintItemType, SprintItem } from '@/types/sprint';
import { useToast } from '@/components/ui/use-toast';

function NewTaskForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const requirementId = searchParams.get('requirementId');
    const { showToast } = useToast();

    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<string>('task');
    const [priority, setPriority] = useState<string>('MEDIUM');
    const [estimatedHours, setEstimatedHours] = useState<number>(0);
    const [assigneeName, setAssigneeName] = useState('');

    const handleSave = async () => {
        if (!title.trim()) {
            showToast('Title is required', 'error');
            return;
        }

        try {
            setIsSaving(true);
            await sprintsApi.addItem({
                title,
                description,
                status: SprintItemStatus.TODO, // Default to TODO or BACKLOG depending on logic, user asked for creation.
                // Usually new tasks might go to backlog, but if created from requirement, maybe backlog?
                // Let's stick to TODO or BACKLOG constants.
                // Re-reading requirements: "Create the task... Ensure the new task appears in: The requirement’s task list. Backlog (if appropriate...)"
                // I'll default to TODO if standard creation, or use the API default which handles it.
                // API default is TODO if sprintId provided, else BACKLOG. Here sprintId is null.
                // So it will be BACKLOG.
                type: type as SprintItem['type'],
                priority: priority as SprintItem['priority'],
                estimatedHours: Number(estimatedHours),
                assigneeName,
                requirementId: requirementId || undefined,
            });
            showToast('Task created successfully', 'success');

            // Navigate back
            if (requirementId) {
                router.push(`/requirements/${requirementId}`);
            } else {
                router.push('/dashboard');
            }
        } catch (err) {
            console.error('Failed to create task:', err);
            showToast('Failed to create task', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header / Navigation */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {requirementId ? (
                        <Link href={`/requirements/${requirementId}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" /> Back to Requirement
                        </Link>
                    ) : (
                        <Link href="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                        </Link>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Create Task
                    </button>
                </div>
            </div>

            <div className="bg-card border rounded-lg shadow-sm p-6 space-y-6">
                <h1 className="text-2xl font-bold">New Implementation Task</h1>

                {/* Title */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Task Title *</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-background border rounded-md px-3 py-2 text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Task Title"
                        autoFocus
                    />
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {Object.values(SprintItemType).map((t) => (
                                    <option key={t} value={t}>
                                        {t.toUpperCase()}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {Object.values(SprintItemPriority).map((p) => (
                                    <option key={p} value={p}>
                                        {p}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Assignee</label>
                            <input
                                type="text"
                                value={assigneeName}
                                onChange={(e) => setAssigneeName(e.target.value)}
                                className="w-full bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Unassigned"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Estimated Hours</label>
                            <input
                                type="number"
                                min="0"
                                value={estimatedHours}
                                onChange={(e) => setEstimatedHours(Number(e.target.value))}
                                className="w-full bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full min-h-[200px] bg-background border rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Detailed task description..."
                    />
                </div>
            </div>
        </div>
    );
}

export default function NewTaskPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8" /></div>}>
            <NewTaskForm />
        </Suspense>
    );
}
