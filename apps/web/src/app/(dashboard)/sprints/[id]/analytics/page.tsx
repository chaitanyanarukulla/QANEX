'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { sprintsApi, type BurndownData, type VelocityTrend } from '@/lib/api';

export default function SprintAnalyticsPage() {
    const params = useParams();
    const sprintId = params?.id as string;

    const [burndown, setBurndown] = useState<BurndownData | null>(null);
    const [velocityTrend, setVelocityTrend] = useState<VelocityTrend | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const [burndownData, velocityData] = await Promise.all([
                    sprintsApi.getBurndown(sprintId),
                    sprintsApi.getVelocityTrend(),
                ]);
                setBurndown(burndownData);
                setVelocityTrend(velocityData);
            } catch (err) {
                console.error('Failed to load analytics:', err);
                setError('Failed to load analytics data');
            } finally {
                setIsLoading(false);
            }
        };

        if (sprintId) {
            loadAnalytics();
        }
    }, [sprintId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const getTrendIcon = (trend: string) => {
        if (trend === 'increasing') return <TrendingUp className="h-5 w-5 text-green-600" />;
        if (trend === 'decreasing') return <TrendingDown className="h-5 w-5 text-red-600" />;
        return <Minus className="h-5 w-5 text-gray-600" />;
    };

    const getTrendColor = (trend: string) => {
        if (trend === 'increasing') return 'text-green-600';
        if (trend === 'decreasing') return 'text-red-600';
        return 'text-gray-600';
    };

    return (
        <div className="space-y-6">
            {error && (
                <div className="rounded-md border border-red-500/20 bg-red-500/10 p-4">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href={`/sprints/${sprintId}`}
                    className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Sprint Analytics</h1>
                    <p className="text-muted-foreground">Velocity tracking and burndown charts</p>
                </div>
            </div>

            {/* Burndown Chart */}
            {burndown && (
                <div className="rounded-lg border bg-card p-6">
                    <h2 className="text-lg font-semibold mb-4">Sprint Burndown</h2>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center p-4 rounded-md bg-blue-50 dark:bg-blue-900/20">
                            <div className="text-2xl font-bold text-blue-600">
                                {burndown.totalItems}
                            </div>
                            <div className="text-xs text-muted-foreground">Total Items</div>
                        </div>
                        <div className="text-center p-4 rounded-md bg-green-50 dark:bg-green-900/20">
                            <div className="text-2xl font-bold text-green-600">
                                {burndown.completedItems}
                            </div>
                            <div className="text-xs text-muted-foreground">Completed</div>
                        </div>
                        <div className="text-center p-4 rounded-md bg-orange-50 dark:bg-orange-900/20">
                            <div className="text-2xl font-bold text-orange-600">
                                {burndown.remainingItems}
                            </div>
                            <div className="text-xs text-muted-foreground">Remaining</div>
                        </div>
                    </div>

                    {/* Projected Completion */}
                    {burndown.projectedCompletion && (
                        <div className="mb-6 p-4 rounded-md bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-900/50">
                            <div className="text-sm font-medium text-purple-900 dark:text-purple-100">
                                Projected Completion: {new Date(burndown.projectedCompletion).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                                Based on current velocity trend
                            </div>
                        </div>
                    )}

                    {/* Simple Burndown Visualization */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>
                                {Math.round((burndown.completedItems / burndown.totalItems) * 100)}%
                            </span>
                        </div>
                        <div className="h-4 w-full rounded-full bg-secondary relative overflow-hidden">
                            <div
                                className="h-full bg-green-500 transition-all duration-500"
                                style={{
                                    width: `${(burndown.completedItems / burndown.totalItems) * 100}%`,
                                }}
                            />
                        </div>
                    </div>

                    {/* Daily Data Table */}
                    {burndown.dailyBurndown.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-sm font-semibold mb-3">Daily Burndown</h3>
                            <div className="rounded-md border overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Date</th>
                                            <th className="px-4 py-2 text-right">Remaining (Actual)</th>
                                            <th className="px-4 py-2 text-right">Remaining (Ideal)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {burndown.dailyBurndown.slice(-7).map((day, idx) => (
                                            <tr
                                                key={idx}
                                                className="border-t hover:bg-muted/30 transition-colors"
                                            >
                                                <td className="px-4 py-2">
                                                    {new Date(day.date).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-2 text-right font-medium">
                                                    {day.remaining}
                                                </td>
                                                <td className="px-4 py-2 text-right text-muted-foreground">
                                                    {day.ideal}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Velocity Trend */}
            {velocityTrend && (
                <div className="rounded-lg border bg-card p-6">
                    <h2 className="text-lg font-semibold mb-4">Velocity Trend</h2>

                    {/* Overall Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 rounded-md bg-primary/10">
                            <div className="text-2xl font-bold">{velocityTrend.averageVelocity}</div>
                            <div className="text-xs text-muted-foreground">Average Velocity</div>
                        </div>
                        <div className="p-4 rounded-md bg-muted/50 flex items-center justify-between">
                            <div>
                                <div className={`text-lg font-semibold capitalize ${getTrendColor(velocityTrend.trend)}`}>
                                    {velocityTrend.trend}
                                </div>
                                <div className="text-xs text-muted-foreground">Trend</div>
                            </div>
                            {getTrendIcon(velocityTrend.trend)}
                        </div>
                    </div>

                    {/* Sprint History */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold">Recent Sprints</h3>
                        {velocityTrend.sprints.map((sprint, idx) => (
                            <div
                                key={sprint.sprintId}
                                className={`p-4 rounded-md border ${idx === 0 ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'
                                    }`}
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="font-medium">{sprint.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {sprint.endDate
                                                ? new Date(sprint.endDate).toLocaleDateString()
                                                : 'No end date'}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold">{sprint.velocity}</div>
                                        <div className="text-xs text-muted-foreground">
                                            / {sprint.capacity} capacity
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <div className="h-2 w-full rounded-full bg-secondary">
                                        <div
                                            className="h-full rounded-full bg-primary transition-all"
                                            style={{
                                                width: `${Math.min(100, (sprint.velocity / sprint.capacity) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
