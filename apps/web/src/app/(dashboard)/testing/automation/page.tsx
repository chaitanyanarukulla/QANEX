'use client';

import { useEffect, useState } from 'react';
import { Play, GitPullRequest, Search, FileCode, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { testCasesApi, TestCase } from '@/lib/api';

type AutomationStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PR_OPEN' | 'MERGED' | 'REJECTED';

interface AutomationCandidate extends TestCase {
    automationStatus: AutomationStatus;
    prUrl?: string;
}

export default function AutomationPage() {
    const [candidates, setCandidates] = useState<AutomationCandidate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        loadCandidates();
    }, []);

    const loadCandidates = async () => {
        try {
            setIsLoading(true);
            // Get test cases from API and treat them as automation candidates
            const testCases = await testCasesApi.list();

            // Map test cases to automation candidates
            // In a real implementation, automation status would come from the backend
            const candidatesData: AutomationCandidate[] = testCases.map(tc => ({
                ...tc,
                automationStatus: 'NOT_STARTED' as AutomationStatus,
            }));

            setCandidates(candidatesData);
        } catch (err) {
            console.error('Failed to load candidates:', err);
            showToast('Failed to load automation candidates', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGeneratePr = async (candidate: AutomationCandidate) => {
        setGeneratingId(candidate.id);
        showToast(`Generating automated test for "${candidate.title}"...`, 'info');

        // Simulate AI generation (in real implementation, this would call the AI service)
        setTimeout(() => {
            setCandidates(prev => prev.map(c =>
                c.id === candidate.id
                    ? { ...c, automationStatus: 'PR_OPEN', prUrl: '#' }
                    : c
            ));
            showToast(`Automated test PR created for "${candidate.title}"`, 'success');
            setGeneratingId(null);
        }, 2000);
    };

    const handleFullScan = () => {
        showToast('Scanning codebase for automation opportunities...', 'info');
        // This would trigger a full scan of the codebase
        setTimeout(() => {
            showToast('Scan complete! Found automation opportunities.', 'success');
        }, 3000);
    };

    const filteredCandidates = candidates.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getStatusIcon = (status: AutomationStatus) => {
        switch (status) {
            case 'MERGED':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'PR_OPEN':
                return <GitPullRequest className="h-4 w-4 text-blue-500" />;
            case 'IN_PROGRESS':
                return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
            case 'REJECTED':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-400" />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Test Automation</h1>
                    <p className="text-muted-foreground">Manage AI-generated test automation candidates and PRs.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleFullScan}
                        className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80"
                    >
                        <FileCode className="h-4 w-4" />
                        Full Scan
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
                        <GitPullRequest className="h-4 w-4" />
                        Configure Repo
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-4 gap-4">
                <div className="rounded-lg border bg-card p-4">
                    <div className="text-2xl font-bold">{candidates.length}</div>
                    <div className="text-sm text-muted-foreground">Total Candidates</div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                    <div className="text-2xl font-bold text-yellow-600">
                        {candidates.filter(c => c.automationStatus === 'NOT_STARTED').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                    <div className="text-2xl font-bold text-blue-600">
                        {candidates.filter(c => c.automationStatus === 'PR_OPEN').length}
                    </div>
                    <div className="text-sm text-muted-foreground">PRs Open</div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                    <div className="text-2xl font-bold text-green-600">
                        {candidates.filter(c => c.automationStatus === 'MERGED').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Automated</div>
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="search"
                            placeholder="Filter candidates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-background rounded-md border border-input pl-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>
                </div>

                {candidates.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileCode className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No test cases found</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Create test cases first, then they will appear here as automation candidates.
                        </p>
                    </div>
                ) : (
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Test Case</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Priority</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {filteredCandidates.map((c) => (
                                <tr key={c.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle">
                                        <div className="font-medium">{c.title}</div>
                                        {c.description && (
                                            <div className="text-xs text-muted-foreground truncate max-w-md">
                                                {c.description}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 align-middle">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                                            ${c.priority === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                c.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                    c.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                                            {c.priority}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(c.automationStatus)}
                                            <Badge status={c.automationStatus} />
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle text-right">
                                        {generatingId === c.id ? (
                                            <div className="flex items-center justify-end gap-2 text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span className="text-sm">Generating...</span>
                                            </div>
                                        ) : c.automationStatus === 'NOT_STARTED' ? (
                                            <button
                                                onClick={() => handleGeneratePr(c)}
                                                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-8 px-3"
                                            >
                                                <Play className="mr-2 h-3 w-3" /> Generate PR
                                            </button>
                                        ) : c.automationStatus === 'PR_OPEN' ? (
                                            <a href={c.prUrl || '#'} className="text-primary hover:underline flex items-center justify-end gap-1">
                                                <GitPullRequest className="h-3 w-3" /> View PR
                                            </a>
                                        ) : c.automationStatus === 'MERGED' ? (
                                            <span className="text-green-600 text-sm flex items-center justify-end gap-1">
                                                <CheckCircle className="h-3 w-3" /> Complete
                                            </span>
                                        ) : null}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

function Badge({ status }: { status: AutomationStatus }) {
    const styles: Record<AutomationStatus, string> = {
        'NOT_STARTED': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
        'IN_PROGRESS': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        'PR_OPEN': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        'MERGED': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        'REJECTED': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    const labels: Record<AutomationStatus, string> = {
        'NOT_STARTED': 'Not Started',
        'IN_PROGRESS': 'Generating',
        'PR_OPEN': 'PR Open',
        'MERGED': 'Merged',
        'REJECTED': 'Rejected',
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
            {labels[status]}
        </span>
    );
}
