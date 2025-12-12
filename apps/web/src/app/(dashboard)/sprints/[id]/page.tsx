'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Calendar, Users, GripVertical, MoreHorizontal, Plus, ChevronDown, Loader2, BarChart3
} from 'lucide-react';
import { sprintsApi } from '@/services/sprints.service';
import { Sprint, SprintMetrics, SprintItem } from '@/types/sprint';

// SDLC Swimlane definitions
const SWIMLANES = [
    { id: 'todo', name: 'To Do', color: 'bg-gray-100 dark:bg-gray-800', borderColor: 'border-gray-300 dark:border-gray-700' },
    { id: 'in_progress', name: 'In Progress', color: 'bg-blue-50 dark:bg-blue-900/20', borderColor: 'border-blue-300 dark:border-blue-800' },
    { id: 'code_review', name: 'Code Review', color: 'bg-purple-50 dark:bg-purple-900/20', borderColor: 'border-purple-300 dark:border-purple-800' },
    { id: 'ready_for_qa', name: 'Ready for QA', color: 'bg-yellow-50 dark:bg-yellow-900/20', borderColor: 'border-yellow-300 dark:border-yellow-800' },
    { id: 'in_testing', name: 'In Testing', color: 'bg-orange-50 dark:bg-orange-900/20', borderColor: 'border-orange-300 dark:border-orange-800' },
    { id: 'done', name: 'Done', color: 'bg-green-50 dark:bg-green-900/20', borderColor: 'border-green-300 dark:border-green-800' },
];

// Local SprintItem interface removed in favor of API type

export default function SprintBoardPage() {
    const params = useParams();
    const sprintId = params?.id as string;

    const [items, setItems] = useState<SprintItem[]>([]);
    const [backlogItems, setBacklogItems] = useState<SprintItem[]>([]);
    const [draggedItem, setDraggedItem] = useState<SprintItem | null>(null);
    const [showBacklog, setShowBacklog] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sprintInfo, setSprintInfo] = useState<Sprint | null>(null);
    const [metrics, setMetrics] = useState<SprintMetrics | null>(null);

    const loadSprintData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const [sprint, sprintItems, backlog, sprintMetrics] = await Promise.all([
                sprintsApi.get(sprintId),
                sprintsApi.getItems(sprintId),
                sprintsApi.getBacklogItems(),
                sprintsApi.getMetrics(sprintId)
            ]);
            setSprintInfo(sprint);
            setItems(sprintItems);
            setBacklogItems(backlog);
            setMetrics(sprintMetrics);
        } catch (err) {
            console.error('Failed to load sprint data:', err);
            setError('Failed to load sprint data');
        } finally {
            setIsLoading(false);
        }
    }, [sprintId]);

    const getItemsByStatus = (status: string) => {
        return items.filter(item => item.status === status);
    };

    useEffect(() => {
        if (sprintId) {
            loadSprintData();
        }
    }, [sprintId, loadSprintData]);
    const handleDragStart = (e: React.DragEvent, item: SprintItem, source: 'sprint' | 'backlog') => {
        setDraggedItem({ ...item, type: item.type });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('source', source);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        if (!draggedItem) return;

        const source = e.dataTransfer.getData('source');

        try {
            setIsSaving(true);
            setError(null);

            if (source === 'backlog') {
                // Moving from backlog to sprint
                await sprintsApi.moveItem(draggedItem.id, sprintId, newStatus as SprintItem['status']);
            } else {
                // Moving within sprint or to backlog
                if (newStatus === 'backlog') {
                    // Moving from sprint to backlog
                    await sprintsApi.moveItem(draggedItem.id, undefined, 'backlog');
                } else {
                    // Moving between swimlanes within sprint
                    await sprintsApi.moveItem(draggedItem.id, sprintId, newStatus as SprintItem['status']);
                }
            }

            // Refresh data to reflect changes
            await loadSprintData();
        } catch (err) {
            console.error('Failed to move item:', err);
            setError('Failed to move item');
        } finally {
            setIsSaving(false);
            setDraggedItem(null);
        }
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    // handleRemoveFromSprint removed as unused

    const handleAddToSprint = async (itemId: string) => {
        try {
            setIsSaving(true);
            setError(null);
            await sprintsApi.moveItem(itemId, sprintId, 'todo');
            await loadSprintData();
        } catch (err) {
            console.error('Failed to add item:', err);
            setError('Failed to add item to sprint');
        } finally {
            setIsSaving(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'CRITICAL': return 'bg-red-500';
            case 'HIGH': return 'bg-orange-500';
            case 'MEDIUM': return 'bg-yellow-500';
            case 'LOW': return 'bg-green-500';
            default: return 'bg-gray-500';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'bug': return '🐛';
            case 'feature': return '✨';
            case 'task': return '📋';
            default: return '📌';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            {error && (
                <div className="rounded-md border border-red-500/20 bg-red-500/10 p-4 mx-4 mt-4">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-4">
                    <Link href="/planning" className="p-2 hover:bg-muted rounded-full transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            {sprintInfo?.name || 'Sprint'}
                            <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                                {sprintInfo?.status || 'ACTIVE'}
                            </span>
                        </h1>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {sprintInfo?.startDate ? new Date(sprintInfo.startDate).toLocaleDateString() : 'N/A'} - {sprintInfo?.endDate ? new Date(sprintInfo.endDate).toLocaleDateString() : 'N/A'}
                            </span>
                            <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {items.length} items
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Progress Stats */}
                    <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                            <div className="text-2xl font-bold">{metrics?.total ?? 0}</div>
                            <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{metrics?.inProgress ?? 0}</div>
                            <div className="text-xs text-muted-foreground">In Progress</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{metrics?.done ?? 0}</div>
                            <div className="text-xs text-muted-foreground">Done</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-32">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span>{metrics?.progress ?? 0}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-secondary">
                            <div
                                className="h-full rounded-full bg-green-500 transition-all duration-500"
                                style={{ width: `${metrics?.progress ?? 0}%` }}
                            />
                        </div>
                    </div>

                    <Link
                        href={`/sprints/${sprintId}/analytics`}
                        className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent gap-2"
                    >
                        <BarChart3 className="h-4 w-4" />
                        Analytics
                    </Link>
                    <button className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent" disabled={isSaving}>
                        <MoreHorizontal className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto py-4">
                <div className="flex gap-4 h-full min-w-max">
                    {SWIMLANES.map(lane => (
                        <div
                            key={lane.id}
                            className={`w-72 flex-shrink-0 rounded-lg border ${lane.borderColor} ${lane.color} flex flex-col`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, lane.id)}
                        >
                            {/* Lane Header */}
                            <div className="p-3 border-b flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-sm">{lane.name}</h3>
                                    <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium">
                                        {getItemsByStatus(lane.id).length}
                                    </span>
                                </div>
                                <button className="p-1 hover:bg-background rounded">
                                    <Plus className="h-4 w-4 text-muted-foreground" />
                                </button>
                            </div>

                            {/* Lane Items */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {getItemsByStatus(lane.id).map(item => (
                                    <div
                                        key={item.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, item, 'sprint')}
                                        onDragEnd={handleDragEnd}
                                        className={`bg-background rounded-lg border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow ${draggedItem?.id === item.id ? 'opacity-50' : ''
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                <span className="text-sm">{getTypeIcon(item.type)}</span>
                                            </div>
                                            <div className={`w-2 h-2 rounded-full ${getPriorityColor(item.priority)}`} title={item.priority} />
                                        </div>

                                        <h4 className="font-medium text-sm mt-2 line-clamp-2">
                                            {item.title}
                                        </h4>

                                        <div className="flex items-center justify-between mt-3">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="bg-secondary px-1.5 py-0.5 rounded">
                                                    RQS: {item.rqsScore ?? 'N/A'}
                                                </span>
                                            </div>
                                            {item.assigneeName && (
                                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">
                                                    {item.assigneeName.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {getItemsByStatus(lane.id).length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground text-xs">
                                        Drop items here
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Backlog Panel */}
            <div className="border-t bg-card">
                <button
                    onClick={() => setShowBacklog(!showBacklog)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${showBacklog ? 'rotate-180' : ''}`} />
                        <span className="font-semibold text-sm">
                            Product Backlog ({backlogItems.length} items)
                        </span>
                    </div>
                </button>

                {showBacklog && (
                    <div
                        className="border-t p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-64 overflow-y-auto"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, 'backlog')}
                    >
                        {backlogItems.map(item => (
                            <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item, 'backlog')}
                                onDragEnd={handleDragEnd}
                                className={`bg-background rounded-lg border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow group relative ${draggedItem?.id === item.id ? 'opacity-50' : ''
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <span className="text-sm">{getTypeIcon(item.type)}</span>
                                    </div>
                                    <button
                                        onClick={() => handleAddToSprint(item.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-primary/10 rounded transition-all"
                                        title="Add to Sprint"
                                    >
                                        <Plus className="h-3 w-3 text-primary" />
                                    </button>
                                </div>

                                <h4 className="font-medium text-xs mt-2 line-clamp-2">
                                    {item.title}
                                </h4>

                                <div className="flex items-center justify-between mt-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${getPriorityColor(item.priority)}`} title={item.priority} />
                                    <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                                        RQS: {item.rqsScore ?? 'N/A'}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {backlogItems.length === 0 && (
                            <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                                No backlog items available
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="border-t py-3 flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                    <span>Drag and drop items between columns to update their status</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500" /> Critical
                    </span>
                    <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-orange-500" /> High
                    </span>
                    <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" /> Medium
                    </span>
                    <span className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" /> Low
                    </span>
                </div>
            </div>
        </div>
    );
}
