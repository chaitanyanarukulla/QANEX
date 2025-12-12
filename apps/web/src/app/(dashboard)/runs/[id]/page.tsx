'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
    ArrowLeft, CheckCircle, XCircle, AlertTriangle, SkipForward,
    Loader2, FileText
} from 'lucide-react';
import { testRunsApi, testCasesApi } from '@/services/tests.service';
import { TestRun, TestCase, TestResult } from '@/types/tests';
import Link from 'next/link';

type ResultStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'SKIPPED';

interface TestCaseWithResult extends TestCase {
    result?: TestResult;
}

export default function TestRunDetailPage() {
    const params = useParams();
    const id = params?.id as string;

    const [run, setRun] = useState<TestRun | null>(null);
    const [testCases, setTestCases] = useState<TestCaseWithResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [recordingId, setRecordingId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [runData, casesData, resultsData] = await Promise.all([
                testRunsApi.get(id),
                testCasesApi.list(),
                testRunsApi.getResults(id),
            ]);

            setRun(runData);

            // Merge test cases with their results
            const casesWithResults = casesData.map((tc) => ({
                ...tc,
                result: resultsData.find((r) => r.caseId === tc.id),
            }));
            setTestCases(casesWithResults);
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            loadData();
        }
    }, [id, loadData]);

    const handleRecordResult = async (caseId: string, status: ResultStatus) => {
        try {
            setRecordingId(caseId);
            await testRunsApi.recordResult(id, caseId, status);
            loadData();
        } catch (err) {
            console.error('Failed to record result:', err);
        } finally {
            setRecordingId(null);
        }
    };

    const getResultIcon = (status?: ResultStatus) => {
        switch (status) {
            case 'PASS':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'FAIL':
                return <XCircle className="h-5 w-5 text-red-500" />;
            case 'BLOCKED':
                return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
            case 'SKIPPED':
                return <SkipForward className="h-5 w-5 text-gray-400" />;
            default:
                return <div className="h-5 w-5 rounded-full border-2 border-dashed border-gray-300" />;
        }
    };

    const getResultBg = (status?: ResultStatus) => {
        switch (status) {
            case 'PASS':
                return 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900';
            case 'FAIL':
                return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900';
            case 'BLOCKED':
                return 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900';
            case 'SKIPPED':
                return 'bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-800';
            default:
                return 'bg-card border-border';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!run) {
        return (
            <div className="space-y-4">
                <Link href="/runs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> Back to Test Runs
                </Link>
                <div className="rounded-md border border-red-500/20 bg-red-500/10 p-6 text-center">
                    <p className="text-red-500">Test run not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Link href="/runs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Back to Test Runs
            </Link>

            {/* Header */}
            <div className="flex items-center justify-between border-b pb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{run.name}</h1>
                    <div className="flex items-center gap-4 mt-2">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${run.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            run.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                            }`}>
                            {run.status.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            {run.stats?.total ?? 0} / {testCases.length} tests executed
                        </span>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="flex gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{run.stats?.passed ?? 0}</div>
                        <div className="text-xs text-muted-foreground">Passed</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{run.stats?.failed ?? 0}</div>
                        <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{run.stats?.blocked ?? 0}</div>
                        <div className="text-xs text-muted-foreground">Blocked</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold">{run.stats?.passRate ?? 0}%</div>
                        <div className="text-xs text-muted-foreground">Pass Rate</div>
                    </div>
                </div>
            </div>

            {/* Test Cases List */}
            <div className="space-y-3">
                <h2 className="text-lg font-semibold">Test Cases</h2>

                {testCases.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed p-8 text-center">
                        <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">
                            No test cases found. Create test cases first.
                        </p>
                        <Link
                            href="/tests"
                            className="mt-4 inline-flex items-center text-sm text-primary hover:underline"
                        >
                            Go to Test Repository
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {testCases.map((tc) => (
                            <div
                                key={tc.id}
                                className={`rounded-lg border p-4 transition-colors ${getResultBg(tc.result?.status)}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {getResultIcon(tc.result?.status)}
                                        <div>
                                            <h3 className="font-medium">{tc.title}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tc.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                                    tc.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                                        tc.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {tc.priority}
                                                </span>
                                                {tc.description && (
                                                    <span className="text-xs text-muted-foreground truncate max-w-md">
                                                        {tc.description}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    {run.status !== 'COMPLETED' && (
                                        <div className="flex gap-1">
                                            {recordingId === tc.id ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleRecordResult(tc.id, 'PASS')}
                                                        className="p-2 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
                                                        title="Pass"
                                                    >
                                                        <CheckCircle className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRecordResult(tc.id, 'FAIL')}
                                                        className="p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                                                        title="Fail"
                                                    >
                                                        <XCircle className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRecordResult(tc.id, 'BLOCKED')}
                                                        className="p-2 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-600"
                                                        title="Blocked"
                                                    >
                                                        <AlertTriangle className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRecordResult(tc.id, 'SKIPPED')}
                                                        className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                                                        title="Skip"
                                                    >
                                                        <SkipForward className="h-5 w-5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Show steps if available */}
                                {tc.steps && tc.steps.length > 0 && (
                                    <div className="mt-3 pl-8">
                                        <details className="text-sm">
                                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                                View {tc.steps.length} steps
                                            </summary>
                                            <ol className="mt-2 space-y-2 text-muted-foreground">
                                                {tc.steps.map((step, idx) => (
                                                    <li key={idx} className="border-l-2 border-border pl-3">
                                                        <div className="font-medium text-foreground">{idx + 1}. {step.step}</div>
                                                        <div className="text-xs mt-0.5">Expected: {step.expected}</div>
                                                    </li>
                                                ))}
                                            </ol>
                                        </details>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
