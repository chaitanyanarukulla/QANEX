'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Calendar, Users, CheckCircle, AlertCircle,
    GripVertical, ChevronRight, MoreHorizontal, Plus
} from 'lucide-react';

// SDLC Swimlane definitions
const SWIMLANES = [
    { id: 'todo', name: 'To Do', color: 'bg-gray-100 dark:bg-gray-800', borderColor: 'border-gray-300 dark:border-gray-700' },
    { id: 'in_progress', name: 'In Progress', color: 'bg-blue-50 dark:bg-blue-900/20', borderColor: 'border-blue-300 dark:border-blue-800' },
    { id: 'code_review', name: 'Code Review', color: 'bg-purple-50 dark:bg-purple-900/20', borderColor: 'border-purple-300 dark:border-purple-800' },
    { id: 'ready_for_qa', name: 'Ready for QA', color: 'bg-yellow-50 dark:bg-yellow-900/20', borderColor: 'border-yellow-300 dark:border-yellow-800' },
    { id: 'in_testing', name: 'In Testing', color: 'bg-orange-50 dark:bg-orange-900/20', borderColor: 'border-orange-300 dark:border-orange-800' },
    { id: 'done', name: 'Done', color: 'bg-green-50 dark:bg-green-900/20', borderColor: 'border-green-300 dark:border-green-800' },
];

interface SprintItem {
    id: string;
    title: string;
    description?: string;
    rqs: number;
    status: string;
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    assignee?: string;
    type: 'feature' | 'bug' | 'task';
}

// Mock data for initial sprint items
const MOCK_SPRINT_ITEMS: SprintItem[] = [
    { id: '1', title: 'User Login with SSO', rqs: 95, status: 'todo', priority: 'HIGH', type: 'feature' },
    { id: '2', title: 'Export Reports to PDF', rqs: 88, status: 'todo', priority: 'MEDIUM', type: 'feature' },
    { id: '3', title: 'Dark Mode Toggle', rqs: 92, status: 'in_progress', priority: 'LOW', type: 'feature', assignee: 'John' },
    { id: '4', title: 'Fix login redirect bug', rqs: 85, status: 'code_review', priority: 'HIGH', type: 'bug', assignee: 'Sarah' },
    { id: '5', title: 'Setup Database', rqs: 98, status: 'ready_for_qa', priority: 'CRITICAL', type: 'task', assignee: 'Mike' },
    { id: '6', title: 'API endpoint optimization', rqs: 90, status: 'in_testing', priority: 'MEDIUM', type: 'task', assignee: 'Lisa' },
    { id: '7', title: 'User profile page', rqs: 87, status: 'done', priority: 'MEDIUM', type: 'feature', assignee: 'John' },
];

export default function SprintBoardPage() {
    const params = useParams();
    const router = useRouter();
    const sprintId = params?.id as string;

    const [items, setItems] = useState<SprintItem[]>(MOCK_SPRINT_ITEMS);
    const [draggedItem, setDraggedItem] = useState<SprintItem | null>(null);
    const [sprintInfo] = useState({
        name: 'Sprint 1',
        startDate: 'Dec 9, 2024',
        endDate: 'Dec 23, 2024',
        status: 'ACTIVE',
    });

    const getItemsByStatus = (status: string) => {
        return items.filter(item => item.status === status);
    };

    const handleDragStart = (e: React.DragEvent, item: SprintItem) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        if (draggedItem) {
            setItems(items.map(item =>
                item.id === draggedItem.id
                    ? { ...item, status: newStatus }
                    : item
            ));
            setDraggedItem(null);
        }
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
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

    const stats = {
        total: items.length,
        done: items.filter(i => i.status === 'done').length,
        inProgress: items.filter(i => !['todo', 'done'].includes(i.status)).length,
    };

    const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-4">
                    <Link href="/planning" className="p-2 hover:bg-muted rounded-full transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            {sprintInfo.name}
                            <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                                {sprintInfo.status}
                            </span>
                        </h1>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {sprintInfo.startDate} - {sprintInfo.endDate}
                            </span>
                            <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                4 team members
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Progress Stats */}
                    <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
                            <div className="text-xs text-muted-foreground">In Progress</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{stats.done}</div>
                            <div className="text-xs text-muted-foreground">Done</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-32">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Progress</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-secondary">
                            <div
                                className="h-full rounded-full bg-green-500 transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    <button className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent">
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
                                        onDragStart={(e) => handleDragStart(e, item)}
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
                                                    RQS: {item.rqs}
                                                </span>
                                            </div>
                                            {item.assignee && (
                                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium">
                                                    {item.assignee.charAt(0)}
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
