'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save, Trash2, Calendar, User, Tag, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { sprintsApi } from '@/services/sprints.service';
import { SprintItem, SprintItemPriority, SprintItemStatus, SprintItemType } from '@/types/sprint';
import { useToast } from '@/components/ui/use-toast';

type SprintItemStatusType = typeof SprintItemStatus[keyof typeof SprintItemStatus];
type SprintItemTypeType = typeof SprintItemType[keyof typeof SprintItemType];
type SprintItemPriorityType = typeof SprintItemPriority[keyof typeof SprintItemPriority];

export default function TaskDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const { showToast } = useToast();

    const [task, setTask] = useState<SprintItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<string>('todo');
    const [type, setType] = useState<string>('task');
    const [priority, setPriority] = useState<string>('MEDIUM');
    const [estimatedHours, setEstimatedHours] = useState<number>(0);
    const [assigneeName, setAssigneeName] = useState('');

    const loadTask = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await sprintsApi.getItem(id);
            setTask(data);

            // Initialize form
            setTitle(data.title);
            setDescription(data.description || '');
            setStatus(data.status);
            setType(data.type);
            setPriority(data.priority);
            setEstimatedHours(data.estimatedHours || 0);
            setAssigneeName(data.assigneeName || '');
        } catch (err) {
            console.error('Failed to load task:', err);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            loadTask();
        }
    }, [id, loadTask]);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            // Safely cast to known enum values with validation
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isValidStatus = (val: any): val is SprintItemStatusType =>
                Object.values(SprintItemStatus).includes(val);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isValidType = (val: any): val is SprintItemTypeType =>
                Object.values(SprintItemType).includes(val);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isValidPriority = (val: any): val is SprintItemPriorityType =>
                Object.values(SprintItemPriority).includes(val);
            
            const updated = await sprintsApi.updateItem(id, {
                title,
                description,
                status: isValidStatus(status) ? status : SprintItemStatus.TODO,
                type: isValidType(type) ? type : SprintItemType.TASK,
                priority: isValidPriority(priority) ? priority : SprintItemPriority.MEDIUM,
                estimatedHours: Number(estimatedHours),
                assigneeName,
            });
            setTask(updated);
            showToast('Task updated successfully', 'success');
        } catch (err) {
            console.error('Failed to update task:', err);
            showToast('Failed to update task', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;

        try {
            await sprintsApi.removeItem(id);
            showToast('Task deleted', 'success');
            // Navigate back to requirement or dashboard
            if (task?.requirementId) {
                router.push(`/requirements/${task.requirementId}`);
            } else {
                router.push('/dashboard');
            }
        } catch (err) {
            console.error('Failed to delete task:', err);
            showToast('Failed to delete task', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!task) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard" className="p-2 hover:bg-muted rounded-full transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <span className="text-muted-foreground">Task not found</span>
                </div>
                <div className="rounded-md border border-red-500/20 bg-red-500/10 p-6 text-center">
                    <p className="text-red-500">Task {id} could not be found.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header / Navigation */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {task.requirementId ? (
                        <Link href={`/requirements/${task.requirementId}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
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
                        onClick={handleDelete}
                        className="inline-flex items-center justify-center rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-500/20"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Task
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-card border rounded-lg shadow-sm p-6 space-y-6">

                {/* Title */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Task Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-background border rounded-md px-3 py-2 text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Task Title"
                    />
                </div>

                {/* Meta Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" /> Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {Object.values(SprintItemStatus).map((s) => (
                                    <option key={s} value={s}>
                                        {s.replace(/_/g, ' ').toUpperCase()}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Tag className="h-4 w-4" /> Type
                            </label>
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
                    </div>

                    <div className="space-y-4">
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

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <User className="h-4 w-4" /> Assignee
                            </label>
                            <input
                                type="text"
                                value={assigneeName}
                                onChange={(e) => setAssigneeName(e.target.value)}
                                className="w-full bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Unassigned"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Estimated Hours
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={estimatedHours}
                            onChange={(e) => setEstimatedHours(Number(e.target.value))}
                            className="w-full bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
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

                {/* Read-Only Info */}
                <div className="pt-4 border-t text-xs text-muted-foreground flex justify-between">
                    <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                    <span>Last Updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    );
}
