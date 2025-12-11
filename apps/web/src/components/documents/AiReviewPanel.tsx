import { DocumentAIReview } from '@/lib/api';
import { AlertTriangle, CheckCircle, Info, Brain } from 'lucide-react';

interface AiReviewPanelProps {
    review?: DocumentAIReview;
    isLoading?: boolean;
    onAnalyze: () => void;
}

export function AiReviewPanel({ review, isLoading, onAnalyze }: AiReviewPanelProps) {
    if (!review && !isLoading) {
        return (
            <div className="rounded-lg border bg-card p-6 text-center shadow-sm">
                <Brain className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No AI Analysis Yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Analyze this document to get quality scores, identify risks, and find missed requirements.
                </p>
                <button
                    onClick={onAnalyze}
                    className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                >
                    <Brain className="mr-2 h-4 w-4" />
                    Analyze Document
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="rounded-lg border bg-card p-12 text-center shadow-sm">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="mt-4 text-sm font-medium text-muted-foreground">Analysing document...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">AI Analysis</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Last analyzed: {new Date(review!.analyzedAt).toLocaleDateString()}</span>
                        <button onClick={onAnalyze} className="text-xs text-primary hover:underline">Re-analyze</button>
                    </div>
                </div>

                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    {/* Score Card */}
                    <div className="rounded-lg border bg-background p-4">
                        <p className="text-sm font-medium text-muted-foreground">Quality Score</p>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-3xl font-bold">{review!.score ?? '-'}</span>
                            <span className="text-sm text-muted-foreground">/ 100</span>
                        </div>
                        {/* Simple progress bar */}
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                                className={`h-full ${(review!.score || 0) > 80 ? 'bg-green-500' : (review!.score || 0) > 50 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                style={{ width: `${review!.score}%` }}
                            />
                        </div>
                    </div>

                    <div className="rounded-lg border bg-background p-4">
                        <p className="text-sm font-medium text-muted-foreground">Summary</p>
                        <p className="mt-2 text-sm">{review!.summary}</p>
                    </div>
                </div>

                {/* Risks Section */}
                {review!.risks && review!.risks.length > 0 && (
                    <div className="mt-8">
                        <h4 className="flex items-center gap-2 font-medium text-red-600 dark:text-red-400">
                            <AlertTriangle className="h-4 w-4" />
                            Identified Risks
                        </h4>
                        <div className="mt-3 space-y-3">
                            {review!.risks.map((risk, index) => (
                                <div key={index} className="rounded-md border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900/30 dark:bg-red-900/10">
                                    <div className="flex items-start justify-between">
                                        <span className="font-medium text-red-900 dark:text-red-300">{risk.risk}</span>
                                        <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider ${risk.severity === 'HIGH' ? 'bg-red-200 text-red-800' : risk.severity === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' : 'bg-blue-200 text-blue-800'
                                            }`}>
                                            {risk.severity}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-red-800/80 dark:text-red-300/80">Mitigation: {risk.mitigation}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Gaps Section */}
                {review!.gaps && review!.gaps.length > 0 && (
                    <div className="mt-8">
                        <h4 className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400">
                            <Info className="h-4 w-4" />
                            Potential Gaps
                        </h4>
                        <div className="mt-3 space-y-3">
                            {review!.gaps.map((gap, index) => (
                                <div key={index} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900/30 dark:bg-amber-900/10">
                                    <p className="font-medium text-amber-900 dark:text-amber-300">{gap.gap}</p>
                                    <p className="mt-1 text-amber-800/80 dark:text-amber-300/80">Suggestion: {gap.suggestion}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
