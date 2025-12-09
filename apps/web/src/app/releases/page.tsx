'use client';

import { Rocket } from 'lucide-react';
import Link from 'next/link';

// Mock Data until API connection
const RELEASES = [
    { id: '1', version: 'v1.2.0', status: 'ACTIVE', env: 'staging', rcsScore: 85, date: '2025-10-24' },
    { id: '2', version: 'v1.1.5', status: 'RELEASED', env: 'prod', rcsScore: 92, date: '2025-10-10' },
    { id: '3', version: 'v1.3.0-beta', status: 'PLANNED', env: 'dev', rcsScore: 45, date: '2025-11-01' },
];

export default function ReleasesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Releases</h1>
                    <p className="text-muted-foreground">Manage deployment candidates and view Quality Gates.</p>
                </div>
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                    <Rocket className="mr-2 h-4 w-4" />
                    New Release
                </button>
            </div>

            <div className="grid gap-4">
                {RELEASES.map((release) => (
                    <Link href={`/releases/${release.id}`} key={release.id}>
                        <div className="flex items-center justify-between p-6 rounded-lg border bg-card text-card-foreground shadow-sm hover:border-primary/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${release.rcsScore >= 80 ? 'bg-green-100 text-green-700' :
                                        release.rcsScore >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-red-100 text-red-700'
                                    }`}>
                                    {release.rcsScore}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">{release.version}</h3>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span>{release.env.toUpperCase()}</span>
                                        <span>•</span>
                                        <span>{release.date}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                                    {release.status}
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
