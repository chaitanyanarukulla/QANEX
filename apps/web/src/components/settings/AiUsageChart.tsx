'use client';

import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { metricsApi } from '@/services/metrics.service';
import { AiUsageByDate } from '@/types/ai';

interface UsageData {
    date: string;
    tokens: number;
    cost: number;
    requests: number;
}

export function AiUsageChart() {
    const [data, setData] = useState<UsageData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const history = await metricsApi.aiUsage();
            // Format dates
            const formatted = history.map((h: AiUsageByDate) => ({
                ...h,
                date: new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            }));
            setData(formatted);
        } catch (err) {
            console.error('Failed to load usage data', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading usage data...</div>;
    if (!data.length) return <div className="h-[300px] flex items-center justify-center text-muted-foreground">No usage data found. Start using AI features!</div>;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Token Usage (Last 30 Days)</h3>
                <div className="text-sm text-muted-foreground">
                    Activity Trend
                </div>
            </div>
            <div className="h-[300px] w-full border rounded-lg p-4 bg-card">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '6px' }}
                            itemStyle={{ color: 'var(--foreground)' }}
                        />
                        <Area type="monotone" dataKey="tokens" stroke="#8884d8" fillOpacity={1} fill="url(#colorTokens)" name="Tokens" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="rounded-md border p-3 flex flex-col items-center justify-center bg-card/50">
                    <span className="text-xs text-muted-foreground uppercase">Total Cost (Est)</span>
                    <span className="text-xl font-bold text-primary">${data.reduce((acc, curr) => acc + curr.cost, 0).toFixed(4)}</span>
                </div>
                <div className="rounded-md border p-3 flex flex-col items-center justify-center bg-card/50">
                    <span className="text-xs text-muted-foreground uppercase">Total Tokens</span>
                    <span className="text-xl font-bold">{data.reduce((acc, curr) => acc + curr.tokens, 0).toLocaleString()}</span>
                </div>
                <div className="rounded-md border p-3 flex flex-col items-center justify-center bg-card/50">
                    <span className="text-xs text-muted-foreground uppercase">Requests</span>
                    <span className="text-xl font-bold">{data.reduce((acc, curr) => acc + curr.requests, 0).toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}
