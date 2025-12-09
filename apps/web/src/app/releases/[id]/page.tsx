'use client';

import { useParams } from 'next/navigation';
import { RcsGauge } from '@/components/releases/RcsGauge';
import { PillarCard } from '@/components/releases/PillarCard';
import { FileText, Beaker, Bug, Shield } from 'lucide-react';

export default function ReleaseDetailPage() {
    const params = useParams();
    // converting params.id to string explicitly to satisfy TS if needed, though simple mock doesn't use it much.
    const id = params?.id as string;

    // Mock Data
    const release = {
        id,
        version: 'v1.2.0',
        status: 'ACTIVE',
        rcsScore: 85,
        breakdown: {
            rp: 90,
            qt: 85,
            b: 80,
            so: 100
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between border-b pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{release.version}</h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            PASSING
                        </span>
                    </div>
                    <p className="text-muted-foreground mt-1">Release Candidate for Staging</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent">
                        Generate Report
                    </button>
                    <button className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                        Approve Release
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Score Card */}
                <div className="col-span-1 rounded-xl border bg-card p-6 flex flex-col items-center justify-center text-center shadow-sm">
                    <h3 className="text-lg font-semibold mb-6">Release Confidence Score</h3>
                    <RcsGauge score={release.rcsScore} />
                    <p className="text-sm text-muted-foreground mt-6 px-4">
                        This release has a high probability of success based on current metrics.
                    </p>
                    <div className="mt-4 text-xs font-mono text-muted-foreground">
                        Threshold: 80
                    </div>
                </div>

                {/* Pillars Grid */}
                <div className="col-span-2 grid grid-cols-2 gap-4">
                    <PillarCard
                        title="Requirements & Planning"
                        score={release.breakdown.rp}
                        icon={FileText}
                    />
                    <PillarCard
                        title="Quality & Testing"
                        score={release.breakdown.qt}
                        icon={Beaker}
                    />
                    <PillarCard
                        title="Bugs & Defects"
                        score={release.breakdown.b}
                        icon={Bug}
                    />
                    <PillarCard
                        title="Security & Ops"
                        score={release.breakdown.so}
                        icon={Shield}
                    />
                </div>
            </div>

            {/* Drill Down Lists (Mock) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-lg border bg-card p-6">
                    <h3 className="font-semibold mb-4">Critical Defects</h3>
                    <div className="space-y-4">
                        <div className="text-sm text-muted-foreground italic">No critical defects found.</div>
                    </div>
                </div>
                <div className="rounded-lg border bg-card p-6">
                    <h3 className="font-semibold mb-4">Recent Test Runs</h3>
                    <div className="flex items-center justify-between text-sm py-2 border-b">
                        <span>E2E Regression Suite</span>
                        <span className="text-green-600 font-medium">PASS (98%)</span>
                    </div>
                    <div className="flex items-center justify-between text-sm py-2 border-b">
                        <span>API Smoke Test</span>
                        <span className="text-green-600 font-medium">PASS (100%)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
