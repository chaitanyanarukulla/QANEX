'use client';

import { useState, useEffect } from 'react';
import { Play, CheckCircle, XCircle, AlertCircle, Clock, Plus, Loader2, BarChart3 } from 'lucide-react';
import { testRunsApi, testCasesApi, TestRun, TestCase } from '@/lib/api';
import Link from 'next/link';

export default function TestRunnerPage() {
    const [runs, setRuns] = useState<TestRun[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newRunName, setNewRunName] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        loadRuns();
    }, []);

    const loadRuns = async () => {
        try {
            setIsLoading(true);
            const data = await testRunsApi.list();
            setRuns(data);
        } catch (err) {
            console.error('Failed to load runs:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateRun = async () => {
        if (!newRunName.trim()) return;

        try {
            setIsCreating(true);
            await testRunsApi.create(newRunName);
            setNewRunName('');
            setShowCreateModal(false);
            loadRuns();
        } catch (err) {
            console.error('Failed to create run:', err);
        } finally {
            setIsCreating(false);
        }
    };

    const handleStartRun = async (id: string) => {
        try {
            await testRunsApi.start(id);
            loadRuns();
        } catch (err) {
            console.error('Failed to start run:', err);
        }
    };

    const handleCompleteRun = async (id: string) => {
        try {
            await testRunsApi.complete(id);
            loadRuns();
        } catch (err) {
            console.error('Failed to complete run:', err);
        }
    };

    const getStatusIcon = (status: TestRun['status']) => {
        switch (status) {
            case 'COMPLETED':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'IN_PROGRESS':
                return <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />;
            case 'PENDING':
            default:
                return <Clock className="h-5 w-5 text-gray-400" />;
        }
    };

    const getStatusColor = (status: TestRun['status']) => {
        switch (status) {
            case 'COMPLETED':
                return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'IN_PROGRESS':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    const calculateProgress = (stats: TestRun['stats'], totalCases: number) => {
        if (totalCases === 0) return 0;
        return Math.round((stats.total / totalCases) * 100);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Test Execution</h1>
                    <p className="text-muted-foreground">Execute test runs and track results.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    New Test Run
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : runs.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed p-12 text-center">
                    <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No test runs yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Create your first test run to start executing test cases.
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Test Run
                    </button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {runs.map((run) => (
                        <div key={run.id} className="rounded-lg border bg-card text-card-foreground shadow-sm">
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold leading-none tracking-tight">{run.name}</h3>
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-2 ${getStatusColor(run.status)}`}>
                                            {run.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    {getStatusIcon(run.status)}
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-2">
                                        <div className="text-lg font-bold text-green-600">{run.stats?.passed ?? 0}</div>
                                        <div className="text-xs text-muted-foreground">Passed</div>
                                    </div>
                                    <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-2">
                                        <div className="text-lg font-bold text-red-600">{run.stats?.failed ?? 0}</div>
                                        <div className="text-xs text-muted-foreground">Failed</div>
                                    </div>
                                    <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-2">
                                        <div className="text-lg font-bold text-yellow-600">{run.stats?.blocked ?? 0}</div>
                                        <div className="text-xs text-muted-foreground">Blocked</div>
                                    </div>
                                    <div className="rounded-md bg-gray-50 dark:bg-gray-900/20 p-2">
                                        <div className="text-lg font-bold text-gray-600">{run.stats?.skipped ?? 0}</div>
                                        <div className="text-xs text-muted-foreground">Skipped</div>
                                    </div>
                                </div>

                                {/* Pass Rate */}
                                {run.stats && run.stats.total > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Pass Rate</span>
                                            <span>{run.stats.passRate}%</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-secondary">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${run.stats.passRate >= 80 ? 'bg-green-500' :
                                                    run.stats.passRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                                    }`}
                                                style={{ width: `${run.stats.passRate}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="text-xs text-muted-foreground">
                                    Created: {new Date(run.createdAt).toLocaleDateString()}
                                </div>

                                <div className="pt-2 flex gap-2">
                                    <Link
                                        href={`/runs/${run.id}`}
                                        className="flex-1 inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
                                    >
                                        View Details
                                    </Link>
                                    {run.status === 'PENDING' && (
                                        <button
                                            onClick={() => handleStartRun(run.id)}
                                            className="flex-1 inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-blue-700"
                                        >
                                            <Play className="mr-1 h-3 w-3" />
                                            Start
                                        </button>
                                    )}
                                    {run.status === 'IN_PROGRESS' && (
                                        <button
                                            onClick={() => handleCompleteRun(run.id)}
                                            className="flex-1 inline-flex items-center justify-center rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-green-700"
                                        >
                                            <CheckCircle className="mr-1 h-3 w-3" />
                                            Complete
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
                        <h2 className="text-lg font-semibold mb-4">Create New Test Run</h2>
                        <input
                            type="text"
                            value={newRunName}
                            onChange={(e) => setNewRunName(e.target.value)}
                            placeholder="Enter run name (e.g., Sprint 5 Regression)"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            autoFocus
                        />
                        <div className="mt-4 flex gap-2 justify-end">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateRun}
                                disabled={isCreating || !newRunName.trim()}
                                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                                {isCreating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    'Create'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
