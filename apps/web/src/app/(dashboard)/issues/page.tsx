'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Bot, Loader2 } from 'lucide-react';
import { bugsApi, Bug } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

const COLUMNS = [
    { id: 'NEW', title: 'New', color: 'bg-red-500/10 text-red-500' },
    { id: 'TRIAGED', title: 'Triaged', color: 'bg-yellow-500/10 text-yellow-500' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-500/10 text-blue-500' },
    { id: 'RESOLVED', title: 'Resolved', color: 'bg-green-500/10 text-green-500' },
];

export default function IssuesPage() {
    const [bugs, setBugs] = useState<Bug[]>([]);
    const [selectedBug, setSelectedBug] = useState<Bug | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTriaging, setIsTriaging] = useState(false);
    const { showToast } = useToast();

    const loadBugs = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await bugsApi.list();
            setBugs(data);
        } catch (_err) {
            console.error('Failed to load bugs:', _err);
            showToast('Failed to load issues', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadBugs();
    }, [loadBugs]);

    const handleCreate = async () => {
        const title = prompt('Bug Title:');
        if (title) {
            try {
                const newBug = await bugsApi.create({
                    title,
                    description: '',
                    status: 'NEW',
                    severity: 'MEDIUM',
                    priority: 'P2'
                });
                setBugs([newBug, ...bugs]);
                showToast('Issue created', 'success');
            } catch (_err) {
                showToast('Failed to create issue', 'error');
            }
        }
    };

    const handleTriage = async () => {
        if (!selectedBug) return;
        try {
            setIsTriaging(true);
            const result = await bugsApi.triage(selectedBug.id);
            // Result likely contains suggestions. 
            // In a real app we might show these suggestions. 
            // For now, let's assume the backend blocked update or returned the updated bug?
            // Checking backend: bugsController.triage returns service.analyzeBug(bug).
            // BugTriageService.analyzeBug returns `provider.triageBug(...)`.
            // The provider returns { suggestedSeverity, suggestedPriority ... }.

            // Let's assume we want to apply them automatically for this demo or show a toast.
            if (result && (result.suggestedSeverity || result.suggestedPriority)) {
                const updated = await bugsApi.update(selectedBug.id, {
                    severity: result.suggestedSeverity || selectedBug.severity,
                    priority: result.suggestedPriority || selectedBug.priority,
                    status: 'TRIAGED'
                });
                setBugs(bugs.map(b => b.id === updated.id ? updated : b));
                setSelectedBug(updated);
                showToast('AI Triage applied successfully', 'success');
            } else {
                showToast('AI could not determine triage details', 'info');
            }

        } catch (err) {
            console.error('Triage failed', err);
            showToast('Failed to auto-triage', 'error');
        } finally {
            setIsTriaging(false);
        }
    };

    const handleUpdateStatus = async (bugId: string, newStatus: Bug['status']) => {
        try {
            // Optimistic update
            setBugs(bugs.map(b => b.id === bugId ? { ...b, status: newStatus } : b));
            if (selectedBug && selectedBug.id === bugId) {
                setSelectedBug({ ...selectedBug, status: newStatus });
            }
            await bugsApi.update(bugId, { status: newStatus });
        } catch (_err) {
            showToast('Failed to update status', 'error');
            loadBugs(); // Revert
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

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
                                            {/* Assignee display simplified */}
                                            <span className="text-muted-foreground/50">#{bug.id.slice(0, 4)}</span>
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
                        <span className="text-xs font-mono text-muted-foreground">BUG-{selectedBug.id.slice(0, 8)}</span>
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
                                onChange={(e) => handleUpdateStatus(selectedBug.id, e.target.value as Bug['status'])}
                            >
                                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Description</label>
                            <textarea
                                className="mt-1 w-full h-32 p-2 rounded-md border bg-transparent text-sm"
                                placeholder="Add a description..."
                                defaultValue={selectedBug.description}
                                onBlur={async (e) => {
                                    // Auto save description
                                    if (e.target.value !== selectedBug.description) {
                                        await bugsApi.update(selectedBug.id, { description: e.target.value });
                                    }
                                }}
                            />
                        </div>

                        <div className="rounded-lg border bg-muted/40 p-4">
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                    <Bot className="h-4 w-4 text-purple-600" />
                                    <span className="text-sm font-semibold text-purple-600">AI Triage</span>
                                </div>
                                <button
                                    onClick={handleTriage}
                                    disabled={isTriaging}
                                    className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-md hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {isTriaging ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Run Analysis'}
                                </button>
                            </div>
                            <div className="space-y-2 text-sm">
                                <p className="text-muted-foreground text-xs leading-relaxed">
                                    Click &quot;Run Analysis&quot; to let AI analyze the bug description and suggest Severity and Priority levels automatically.
                                </p>
                                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-purple-200/50">
                                    <div>
                                        <span className="block text-xs text-muted-foreground">Severity</span>
                                        <span className="font-medium">{selectedBug.severity}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-muted-foreground">Priority</span>
                                        <span className="font-medium">{selectedBug.priority}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
