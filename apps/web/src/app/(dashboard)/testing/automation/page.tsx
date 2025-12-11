'use client';

import { useEffect, useState, useCallback } from 'react';
import { Play, GitPullRequest, Search, Loader2, CheckCircle, Clock, AlertCircle, Sparkles, TrendingUp, Target } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { automationApi, AutomationCandidate, AutomationCoverage } from '@/lib/api';

export default function AutomationPage() {
    const [candidates, setCandidates] = useState<AutomationCandidate[]>([]);
    const [aiSuggestions, setAiSuggestions] = useState<AutomationCandidate[]>([]);
    const [coverage, setCoverage] = useState<AutomationCoverage | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'candidates' | 'suggestions'>('suggestions');
    const { showToast } = useToast();

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [candidatesData, suggestionsData, coverageData] = await Promise.all([
                automationApi.getCandidates(),
                automationApi.getAISuggestions(20),
                automationApi.getCoverage(),
            ]);
            setCandidates(candidatesData);
            setAiSuggestions(suggestionsData);
            setCoverage(coverageData);
        } catch (err) {
            console.error('Failed to load automation data:', err);
            showToast('Failed to load automation data', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleGeneratePr = async (candidate: AutomationCandidate) => {
        setGeneratingId(candidate.id);
        showToast(`Generating automated test for "${candidate.testCaseTitle}"...`, 'info');

        try {
            const result = await automationApi.generatePR(candidate.id);
            showToast(`Automated test PR created: ${result.prUrl}`, 'success');
            await loadData(); // Refresh data
        } catch (err) {
            console.error('Failed to generate PR:', err);
            showToast('Failed to generate PR', 'error');
        } finally {
            setGeneratingId(null);
        }
    };

    const handleAddCandidate = async (testCaseId: string) => {
        try {
            await automationApi.createCandidate(testCaseId);
            showToast('Added to automation candidates', 'success');
            await loadData(); // Refresh data
        } catch (err) {
            console.error('Failed to add candidate:', err);
            showToast('Failed to add candidate', 'error');
        }
    };

    const displayData = activeTab === 'suggestions' ? aiSuggestions : candidates;
    const filteredData = displayData.filter(c =>
        c.testCaseTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'MERGED':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'PR_OPEN':
                return <GitPullRequest className="h-4 w-4 text-blue-500" />;
            case 'REJECTED':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-400" />;
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-50 dark:bg-green-900/20';
        if (score >= 60) return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
        if (score >= 40) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
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
                    <h1 className="text-2xl font-bold tracking-tight">Test Automation Intelligence</h1>
                    <p className="text-muted-foreground">AI-powered test automation candidate identification and generation</p>
                </div>
            </div>

            {/* Coverage Stats */}
            {coverage && (
                <div className="grid grid-cols-4 gap-4">
                    <div className="rounded-lg border bg-card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold">{coverage.totalTests}</div>
                                <div className="text-sm text-muted-foreground">Total Tests</div>
                            </div>
                            <Target className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </div>
                    <div className="rounded-lg border bg-card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold text-green-600">{coverage.automationRate}%</div>
                                <div className="text-sm text-muted-foreground">Automation Rate</div>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-600" />
                        </div>
                    </div>
                    <div className="rounded-lg border bg-card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold text-blue-600">{coverage.prOpen}</div>
                                <div className="text-sm text-muted-foreground">PRs Open</div>
                            </div>
                            <GitPullRequest className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>
                    <div className="rounded-lg border bg-card p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold text-purple-600">{coverage.merged}</div>
                                <div className="text-sm text-muted-foreground">Automated</div>
                            </div>
                            <CheckCircle className="h-8 w-8 text-purple-600" />
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b">
                <button
                    onClick={() => setActiveTab('suggestions')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'suggestions'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        AI Suggestions ({aiSuggestions.length})
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('candidates')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'candidates'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <GitPullRequest className="h-4 w-4" />
                        Active Candidates ({candidates.length})
                    </div>
                </button>
            </div>

            <div className="rounded-md border bg-card">
                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="search"
                            placeholder="Search test cases..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-background rounded-md border border-input pl-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>
                </div>

                {filteredData.length === 0 ? (
                    <div className="p-12 text-center">
                        <Sparkles className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">
                            {activeTab === 'suggestions' ? 'No AI suggestions' : 'No candidates yet'}
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {activeTab === 'suggestions'
                                ? 'The AI will analyze your test cases and suggest automation candidates based on execution frequency, pass rate, and complexity.'
                                : 'Add test cases from AI suggestions to start generating automated tests.'}
                        </p>
                    </div>
                ) : (
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50">
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Test Case</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Score</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Metrics</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground">AI Assessment</th>
                                {activeTab === 'candidates' && (
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                                )}
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {filteredData.map((item) => (
                                <tr key={item.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle">
                                        <div className="font-medium">{item.testCaseTitle}</div>
                                        <div className="text-xs text-muted-foreground">
                                            Est. Effort: {item.estimatedEffort}
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className={`inline-flex items-center justify-center rounded-full w-12 h-12 text-lg font-bold ${getScoreColor(item.automationScore)}`}>
                                            {item.automationScore}
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className="text-xs space-y-1">
                                            <div>Executions: <span className="font-medium">{item.executionCount}</span></div>
                                            <div>Pass Rate: <span className="font-medium">{item.passRate}%</span></div>
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className="text-xs text-muted-foreground max-w-xs">
                                            {item.aiRecommendation}
                                        </div>
                                    </td>
                                    {activeTab === 'candidates' && (
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(item.status)}
                                                <Badge status={item.status} />
                                            </div>
                                        </td>
                                    )}
                                    <td className="p-4 align-middle text-right">
                                        {activeTab === 'suggestions' ? (
                                            <button
                                                onClick={() => handleAddCandidate(item.testCaseId)}
                                                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none bg-secondary text-secondary-foreground hover:bg-secondary/80 h-8 px-3"
                                            >
                                                Add to Candidates
                                            </button>
                                        ) : generatingId === item.id ? (
                                            <div className="flex items-center justify-end gap-2 text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span className="text-sm">Generating...</span>
                                            </div>
                                        ) : item.status === 'NOT_STARTED' ? (
                                            <button
                                                onClick={() => handleGeneratePr(item)}
                                                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none bg-primary text-primary-foreground shadow hover:bg-primary/90 h-8 px-3"
                                            >
                                                <Play className="mr-2 h-3 w-3" /> Generate PR
                                            </button>
                                        ) : item.status === 'PR_OPEN' ? (
                                            <a href="#" className="text-primary hover:underline flex items-center justify-end gap-1">
                                                <GitPullRequest className="h-3 w-3" /> View PR
                                            </a>
                                        ) : item.status === 'MERGED' ? (
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

function Badge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        'NOT_STARTED': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
        'PR_OPEN': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        'MERGED': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        'REJECTED': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    const labels: Record<string, string> = {
        'NOT_STARTED': 'Not Started',
        'PR_OPEN': 'PR Open',
        'MERGED': 'Merged',
        'REJECTED': 'Rejected',
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles['NOT_STARTED']}`}>
            {labels[status] || status}
        </span>
    );
}
