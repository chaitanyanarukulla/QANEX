'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save, Trash2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { sprintsApi } from '@/services/sprints.service';
import { SprintItem, SprintItemPriority, SprintItemType, SprintItemStatus } from '@/types/sprint';

export default function BacklogItemDetailPage() {
    const params = useParams();
    const router = useRouter();
    const itemId = params?.id as string;

    const [item, setItem] = useState<SprintItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<SprintItem>>({});

    useEffect(() => {
        const loadItem = async () => {
            try {
                const data = await sprintsApi.getItem(itemId);
                setItem(data);
                setFormData({
                    title: data.title,
                    description: data.description,
                    priority: data.priority,
                    type: data.type,
                    rqsScore: data.rqsScore,
                    estimatedHours: data.estimatedHours
                });
            } catch (err) {
                console.error('Failed to load item:', err);
                setError('Failed to load item details');
            } finally {
                setIsLoading(false);
            }
        };

        if (itemId) {
            loadItem();
        }
    }, [itemId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'estimatedHours' || name === 'rqsScore' ? parseInt(value) || undefined : value
        }));
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            setError(null);
            await sprintsApi.updateItem(itemId, formData);
            router.push('/planning');
        } catch (err) {
            console.error('Failed to save item:', err);
            setError('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
            return;
        }

        try {
            setIsDeleting(true);
            setError(null);
            await sprintsApi.removeItem(itemId);
            router.push('/planning');
        } catch (err) {
            console.error('Failed to delete item:', err);
            setError('Failed to delete item');
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!item) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <h2 className="text-xl font-semibold">Item not found</h2>
                <Link href="/planning" className="text-primary hover:underline">
                    Return to Planning
                </Link>
            </div>
        );
    }

    return (
        <div className="container max-w-2xl mx-auto py-6">
            <div className="mb-6 flex items-center justify-between">
                <Link href="/planning" className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Planning
                </Link>
                <div className="flex bg-muted/50 rounded-lg p-1">
                    <span className={`px-3 py-1 text-sm font-medium rounded-md ${item.status === SprintItemStatus.BACKLOG ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
                        {item.status === SprintItemStatus.BACKLOG ? 'Backlog' : 'In Sprint'}
                    </span>
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight">Edit Item</h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting || isSaving}
                            className="inline-flex items-center justify-center rounded-md border border-destructive/50 text-destructive hover:bg-destructive/10 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            Delete
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || isDeleting}
                            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Save Changes
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                        {error}
                    </div>
                )}

                <div className="grid gap-6 p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
                    <div className="space-y-2">
                        <label htmlFor="title" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Title
                        </label>
                        <input
                            id="title"
                            name="title"
                            value={formData.title || ''}
                            onChange={handleChange}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Item title"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="type" className="text-sm font-medium leading-none">
                                Type
                            </label>
                            <select
                                id="type"
                                name="type"
                                value={formData.type || SprintItemType.TASK}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value={SprintItemType.FEATURE}>Feature</option>
                                <option value={SprintItemType.BUG}>Bug</option>
                                <option value={SprintItemType.TASK}>Task</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="priority" className="text-sm font-medium leading-none">
                                Priority
                            </label>
                            <select
                                id="priority"
                                name="priority"
                                value={formData.priority || SprintItemPriority.MEDIUM}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value={SprintItemPriority.CRITICAL}>Critical</option>
                                <option value={SprintItemPriority.HIGH}>High</option>
                                <option value={SprintItemPriority.MEDIUM}>Medium</option>
                                <option value={SprintItemPriority.LOW}>Low</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-medium leading-none">
                            Description
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description || ''}
                            onChange={handleChange}
                            rows={5}
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Detailed description..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="estimatedHours" className="text-sm font-medium leading-none">
                                Estimated Hours
                            </label>
                            <input
                                id="estimatedHours"
                                name="estimatedHours"
                                type="number"
                                min="0"
                                value={formData.estimatedHours || ''}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="rqsScore" className="text-sm font-medium leading-none">
                                RQS Score (0-100)
                            </label>
                            <input
                                id="rqsScore"
                                name="rqsScore"
                                type="number"
                                min="0"
                                max="100"
                                value={formData.rqsScore || ''}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>
                    </div>
                </div>

                <div className="text-xs text-muted-foreground text-center">
                    Item ID: {itemId} • Created: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                </div>
            </div>
        </div>
    );
}
