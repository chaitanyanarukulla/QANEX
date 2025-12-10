'use client';

import { useState } from 'react';
import { Play, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const MOCK_RUNS = [
    { id: '1', name: 'Sprint 1 Regression', status: 'IN_PROGRESS', progress: 65 },
    { id: '2', name: 'Smoke Test - Release v1.0', status: 'COMPLETED', progress: 100 },
];

export default function TestRunnerPage() {
    const [runs, setRuns] = useState(MOCK_RUNS);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Test Execution</h1>
                    <p className="text-muted-foreground">Execute test runs and track results.</p>
                </div>
                <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
                    <Play className="mr-2 h-4 w-4" />
                    Start New Run
                </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {runs.map((run) => (
                    <div key={run.id} className="rounded-lg border bg-card text-card-foreground shadow-sm">
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold leading-none tracking-tight">{run.name}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{run.status.replace('_', ' ')}</p>
                                </div>
                                {run.status === 'COMPLETED' ? (
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Progress</span>
                                    <span>{run.progress}%</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-secondary">
                                    <div
                                        className="h-full rounded-full bg-primary transition-all duration-500"
                                        style={{ width: `${run.progress}%` }}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-2">
                                <button className="flex-1 inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
                                    View Results
                                </button>
                                {run.status === 'IN_PROGRESS' && (
                                    <button className="flex-1 inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-blue-700">
                                        Continue
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
