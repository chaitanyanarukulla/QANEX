'use client';

import { useState } from 'react';
import { Calendar, Plus, ArrowRight, Bot, MoreHorizontal } from 'lucide-react';

// Mock Data
const MOCK_BACKLOG = [
    { id: '1', title: 'User Login with SSO', rqs: 95 },
    { id: '2', title: 'Export Reports to PDF', rqs: 88 },
    { id: '3', title: 'Dark Mode Toggle', rqs: 92 },
    { id: '4', title: 'Payment Gateway Integration', rqs: 80 },
    { id: '5', title: 'Email Notifications', rqs: 85 },
];

const MOCK_SPRINT_ITEMS = [
    { id: '6', title: 'Setup Database', rqs: 98 },
];

export default function PlanningPage() {
    const [backlog, setBacklog] = useState(MOCK_BACKLOG);
    const [sprintItems, setSprintItems] = useState(MOCK_SPRINT_ITEMS);

    const moveRight = (item: any) => {
        setBacklog(backlog.filter(i => i.id !== item.id));
        setSprintItems([...sprintItems, item]);
    };

    const moveLeft = (item: any) => {
        setSprintItems(sprintItems.filter(i => i.id !== item.id));
        setBacklog([...backlog, item]);
    };

    const handleAutoPlan = () => {
        // Simulate AI Selection
        const newItems = backlog.slice(0, 3);
        const remainingReference = backlog.slice(3);

        setSprintItems([...sprintItems, ...newItems]);
        setBacklog(remainingReference);
    };

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Sprint Planning</h1>
                    <p className="text-muted-foreground">Plan your next sprint cycle.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleAutoPlan}
                        className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-purple-700">
                        <Bot className="mr-2 h-4 w-4" />
                        AI Auto-Plan
                    </button>
                    <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
                        Start Sprint
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6 h-full pb-6">
                {/* Backlog Column */}
                <div className="rounded-lg border bg-card flex flex-col h-full overflow-hidden">
                    <div className="p-4 border-b bg-muted/40 flex justify-between items-center">
                        <h3 className="font-semibold flex items-center gap-2">
                            Product Backlog
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{backlog.length}</span>
                        </h3>
                        <button className="text-muted-foreground hover:text-foreground">
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {backlog.map(item => (
                            <div key={item.id} className="group flex items-center justify-between p-3 rounded-md border bg-background hover:border-primary/50 transition-colors">
                                <div>
                                    <div className="font-medium text-sm">{item.title}</div>
                                    <div className="text-xs text-muted-foreground">RQS: {item.rqs}</div>
                                </div>
                                <button
                                    onClick={() => moveRight(item)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-all">
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                        {backlog.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-sm">Backlog empty.</div>
                        )}
                    </div>
                </div>

                {/* Sprint Column */}
                <div className="rounded-lg border bg-card flex flex-col h-full overflow-hidden border-purple-200 dark:border-purple-900/50">
                    <div className="p-4 border-b bg-purple-50/50 dark:bg-purple-900/10 flex justify-between items-center">
                        <div className="space-y-1">
                            <h3 className="font-semibold flex items-center gap-2 text-purple-900 dark:text-purple-100">
                                Sprint 1
                                <span className="rounded-full bg-purple-200 dark:bg-purple-800 px-2 py-0.5 text-xs text-purple-800 dark:text-purple-100">{sprintItems.length}</span>
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300">
                                <Calendar className="h-3 w-3" />
                                <span>Dec 9 - Dec 23</span>
                            </div>
                        </div>
                        <button className="text-purple-700 dark:text-purple-300 hover:text-purple-900">
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-purple-50/20 dark:bg-purple-900/5">
                        {sprintItems.map(item => (
                            <div key={item.id} className="group flex items-center justify-between p-3 rounded-md border bg-background hover:border-primary/50 transition-colors">
                                <div>
                                    <div className="font-medium text-sm">{item.title}</div>
                                    <div className="text-xs text-muted-foreground">RQS: {item.rqs}</div>
                                </div>
                                <button
                                    onClick={() => moveLeft(item)}
                                    className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-red-500 underline transition-all">
                                    Remove
                                </button>
                            </div>
                        ))}
                        {sprintItems.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-sm">Sprint empty. Add items from backlog.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
