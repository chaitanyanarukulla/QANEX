'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { RcsGauge } from '@/components/releases/RcsGauge';
import { PillarCard } from '@/components/releases/PillarCard';
import { FileText, Beaker, Bug, Shield, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { releasesApi, Release } from '@/lib/api';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  PLANNED: 'bg-gray-500/20 text-gray-400',
  ACTIVE: 'bg-blue-500/20 text-blue-500',
  FROZEN: 'bg-purple-500/20 text-purple-500',
  RELEASED: 'bg-green-500/20 text-green-500',
  ABORTED: 'bg-red-500/20 text-red-500',
};

export default function ReleaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [release, setRelease] = useState<Release | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (id) {
      loadRelease();
    }
  }, [id]);

  const loadRelease = async () => {
    try {
      setIsLoading(true);
      const data = await releasesApi.get(id);
      setRelease(data);
      setError(null);
    } catch (err) {
      setError('Failed to load release');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculateRcs = async () => {
    setIsCalculating(true);
    try {
      const updated = await releasesApi.calculateRcs(id);
      setRelease(updated);
    } catch (err) {
      console.error('RCS calculation failed:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const updated = await releasesApi.update(id, { status: newStatus as Release['status'] });
      setRelease(updated);
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !release) {
    return (
      <div className="space-y-4">
        <Link href="/releases" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Releases
        </Link>
        <div className="rounded-md border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-500">{error || 'Release not found'}</p>
        </div>
      </div>
    );
  }

  const breakdown = release.rcsBreakdown || { rp: 0, qt: 0, b: 0, so: 100 };
  const rcsScore = release.rcsScore ?? 0;
  const isPassing = rcsScore >= 80;

  return (
    <div className="space-y-8">
      <Link href="/releases" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Releases
      </Link>

      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{release.name || release.version}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[release.status]}`}>
              {release.status}
            </span>
            {release.rcsScore !== undefined && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${isPassing ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-500' : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-500'}`}>
                {isPassing ? 'PASSING' : 'FAILING'}
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1">v{release.version} • Created {new Date(release.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCalculateRcs}
            disabled={isCalculating}
            className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent flex items-center gap-2 disabled:opacity-50"
          >
            {isCalculating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {release.rcsScore !== undefined ? 'Recalculate RCS' : 'Calculate RCS'}
          </button>
          {release.status === 'ACTIVE' && (
            <button
              onClick={() => handleStatusChange('RELEASED')}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Mark as Released
            </button>
          )}
          {release.status === 'PLANNED' && (
            <button
              onClick={() => handleStatusChange('ACTIVE')}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Start Release
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Score Card */}
        <div className="col-span-1 rounded-xl border bg-card p-6 flex flex-col items-center justify-center text-center shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Release Confidence Score</h3>
          <RcsGauge score={rcsScore} />
          <p className="text-sm text-muted-foreground mt-6 px-4">
            {rcsScore >= 80
              ? 'This release has a high probability of success based on current metrics.'
              : rcsScore >= 50
              ? 'This release needs attention before it can be approved.'
              : 'This release has significant issues that must be addressed.'}
          </p>
          <div className="mt-4 text-xs font-mono text-muted-foreground">
            Threshold: 80
          </div>
        </div>

        {/* Pillars Grid */}
        <div className="col-span-2 grid grid-cols-2 gap-4">
          <PillarCard
            title="Requirements & Planning"
            score={breakdown.rp}
            icon={FileText}
          />
          <PillarCard
            title="Quality & Testing"
            score={breakdown.qt}
            icon={Beaker}
          />
          <PillarCard
            title="Bugs & Defects"
            score={breakdown.b}
            icon={Bug}
          />
          <PillarCard
            title="Security & Ops"
            score={breakdown.so}
            icon={Shield}
          />
        </div>
      </div>

      {/* RCS Formula Explanation */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="font-semibold mb-4">RCS Calculation</h3>
        <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm">
          <p className="text-muted-foreground mb-2">Weighted Formula:</p>
          <p>
            RCS = (QT × 0.40) + (B × 0.30) + (RP × 0.20) + (SO × 0.10)
          </p>
          <p className="mt-2">
            RCS = ({breakdown.qt} × 0.40) + ({breakdown.b} × 0.30) + ({breakdown.rp} × 0.20) + ({breakdown.so} × 0.10)
          </p>
          <p className="mt-2 font-bold">
            RCS = {rcsScore}
          </p>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-4 text-xs">
          <div className="text-center">
            <p className="font-medium">QT (40%)</p>
            <p className="text-muted-foreground">Quality & Testing</p>
          </div>
          <div className="text-center">
            <p className="font-medium">B (30%)</p>
            <p className="text-muted-foreground">Bug Impact</p>
          </div>
          <div className="text-center">
            <p className="font-medium">RP (20%)</p>
            <p className="text-muted-foreground">Requirements</p>
          </div>
          <div className="text-center">
            <p className="font-medium">SO (10%)</p>
            <p className="text-muted-foreground">Security & Ops</p>
          </div>
        </div>
      </div>
    </div>
  );
}
