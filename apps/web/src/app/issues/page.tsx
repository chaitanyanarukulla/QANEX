'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

const COLUMNS = [
    { id: 'NEW', title: 'New', color: 'bg-red-500/10 text-red-500' },
    { id: 'TRIAGED', title: 'Triaged', color: 'bg-yellow-500/10 text-yellow-500' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-500/10 text-blue-500' },
    { id: 'RESOLVED', title: 'Resolved', color: 'bg-green-500/10 text-green-500' },
];

// Mock data for initial render
const INITIAL_BUGS = [
    { id: '1', title: 'Login page crashes on Safari', status: 'NEW', priority: 'P0', assignee: null },
    { id: '2', title: 'Typo in privacy policy', status: 'TRIAGED', priority: 'P3', assignee: 'Jane Doe' },
    { id: '3', title: 'API returning 500 for heavy requests', status: 'IN_PROGRESS', priority: 'P1', assignee: 'John Smith' },
];

export default function IssuesPage() {
    const [bugs, setBugs] = useState(INITIAL_BUGS);
    const [selectedBug, setSelectedBug] = useState<any>(null);

    const handleCreate = () => {
        const title = prompt('Bug Title:');
        if (title) {
            setBugs([...bugs, {
                id: Date.now().toString(),
                title,
                status: 'NEW',
                priority: 'P2',
                assignee: null
            }]);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-6 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Issues Board</h1>
                    <p className="text-muted-foreground">Manage and track defects across your projects.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    New Issue
                </button>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <div className="flex h-full gap-4 min-w-[1000px]">
                    {COLUMNS.map((col) => (
                        <div key={col.id} className="flex-1 flex flex-col min-w-[280px] rounded-lg bg-muted/50 border p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold">{col.title}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${col.color}`}>
                                    {bugs.filter(b => b.status === col.id).length}
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3">
                                {bugs.filter(b => b.status === col.id).map((bug) => (
                                    <div
                                        key={bug.id}
                                        onClick={() => setSelectedBug(bug)}
                                        className="p-3 bg-card rounded-md border shadow-sm cursor-pointer hover:border-primary/50 transition-colors group"
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <span className="text-sm font-medium leading-tight group-hover:text-primary">
                                                {bug.title}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span className={`px-1.5 py-0.5 rounded border ${bug.priority === 'P0' ? 'bg-red-500/20 border-red-500/30 text-red-600' :
                                                    bug.priority === 'P1' ? 'bg-orange-500/20 border-orange-500/30 text-orange-600' :
                                                        'bg-secondary'
                                                }`}>
                                                {bug.priority}
                                            </span>
                                            {bug.assignee ? (
                                                <span className="flex items-center gap-1">
                                                    <div className="w-4 h-4 rounded-full bg-primary/20 text-[10px] flex items-center justify-center text-primary">
                                                        {bug.assignee.charAt(0)}
                                                    </div>
                                                    <span className="truncate max-w-[80px]">{bug.assignee}</span>
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground/50">Unassigned</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedBug && (
                <div className="fixed inset-y-0 right-0 w-[400px] bg-background border-l shadow-2xl p-6 overflow-y-auto z-50 animate-in slide-in-from-right duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-xs font-mono text-muted-foreground">BUG-{selectedBug.id}</span>
                        <button onClick={() => setSelectedBug(null)} className="text-muted-foreground hover:text-foreground">
                            Close
                        </button>
                    </div>

                    <h2 className="text-xl font-bold mb-4">{selectedBug.title}</h2>

                    <div className="space-y-6">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Status</label>
                            <select
                                className="mt-1 w-full p-2 rounded-md border bg-transparent"
                                value={selectedBug.status}
                                onChange={(e) => {
                                    setBugs(bugs.map(b => b.id === selectedBug.id ? { ...b, status: e.target.value } : b));
                                    setSelectedBug({ ...selectedBug, status: e.target.value });
                                }}
                            >
                                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Description</label>
                            <textarea
                                className="mt-1 w-full h-32 p-2 rounded-md border bg-transparent text-sm"
                                placeholder="Add a description..."
                            />
                        </div>

                        <div className="rounded-lg border bg-muted/40 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-semibold text-purple-500">AI Suggestions</span>
                            </div>
                            <div className="space-y-2 text-sm">
                                <p><span className="text-muted-foreground">Suggested Severity:</span> <strong>Medium</strong></p>
                                <p><span className="text-muted-foreground">Linked Requirement:</span> <a href="#" className="text-primary hover:underline">REQ-124: Login Flow</a></p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
