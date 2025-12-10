'use client';

import { useEffect, useState } from 'react';
import { Trash, Play, GitPullRequest, Search, FileCode } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface AutomationCandidate {
    id: string;
    testCaseId: string;
    status: 'NOT_STARTED' | 'PR_OPEN' | 'MERGED' | 'REJECTED';
    createdAt: string;
}

export default function AutomationPage() {
    const [candidates, setCandidates] = useState<AutomationCandidate[]>([]);
    const { showToast } = useToast();

    useEffect(() => {
        // Fetch candidates mock
        setTimeout(() => {
            setCandidates([
                { id: '1', testCaseId: 'TC-101', status: 'NOT_STARTED', createdAt: '2025-12-08' },
                { id: '2', testCaseId: 'TC-102', status: 'PR_OPEN', createdAt: '2025-12-09' },
            ]);
        }, 500);
    }, []);

    const handleGeneratePr = async (id: string, testCaseId: string) => {
        showToast(`Generating PR for ${testCaseId}...`, 'info');

        // Mock API call
        // await fetch(`/api/automation/candidates/${id}/generate-pr`, { method: 'POST' });

        // Simulate Success
        setTimeout(() => {
            showToast(`PR created successfully for ${testCaseId}`, 'success');
            setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: 'PR_OPEN' } : c));
        }, 1500);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Test Automation</h1>
                    <p className="text-muted-foreground">Manage AI-generated test automation candidates and PRs.</p>
                </div>
                <div className="flex gap-2">
                     <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80">
                         <FileCode className="h-4 w-4" />
                         Full Scan
                     </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
                        <GitPullRequest className="h-4 w-4" />
                        Configure Repo
                    </button>
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="search"
                            placeholder="Filter candidates..."
                            className="w-full bg-background rounded-md border border-input pl-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>
                </div>
                <table className="w-full caption-bottom text-sm text-left">
                    <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Test Case</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Created</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {candidates.map((c) => (
                            <tr key={c.id} className="border-b transition-colors hover:bg-muted/50">
                                <td className="p-4 align-middle font-medium">{c.testCaseId}</td>
                                <td className="p-4 align-middle">
                                    <Badge status={c.status} />
                                </td>
                                <td className="p-4 align-middle">{c.createdAt}</td>
                                <td className="p-4 align-middle text-right">
                                    {c.status === 'NOT_STARTED' && (
                                        <button 
                                            onClick={() => handleGeneratePr(c.id, c.testCaseId)}
                                            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-8 px-3"
                                        >
                                            <Play className="mr-2 h-3 w-3" /> Generate PR
                                        </button>
                                    )}
                                    {c.status === 'PR_OPEN' && (
                                        <a href="#" className="text-primary hover:underline flex items-center justify-end gap-1">
                                            <GitPullRequest className="h-3 w-3" /> View PR
                                        </a>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Badge({ status }: { status: string }) {
    const styles = {
        'NOT_STARTED': 'bg-gray-100 text-gray-800',
        'PR_OPEN': 'bg-blue-100 text-blue-800',
        'MERGED': 'bg-green-100 text-green-800',
        'REJECTED': 'bg-red-100 text-red-800',
    };
    const labels = {
        'NOT_STARTED': 'Not Started',
        'PR_OPEN': 'PR Open',
        'MERGED': 'Merged',
        'REJECTED': 'Rejected',
    };
    // @ts-ignore
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {/* @ts-ignore */}
        {labels[status]}
    </span>;
}
