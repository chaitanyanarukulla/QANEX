'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { RcsGauge } from '@/components/releases/RcsGauge';
import { PillarCard } from '@/components/releases/PillarCard';
import { FileText, Beaker, Bug, Shield, Loader2, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, Sparkles, Lock, Unlock, XCircle } from 'lucide-react';
import { releasesApi } from '@/services/releases.service';
import { Release, ReleaseGatesEvaluation } from '@/types/release';
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
  const id = params?.id as string;

  const [release, setRelease] = useState<Release | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [gatesEvaluation, setGatesEvaluation] = useState<ReleaseGatesEvaluation | null>(null);
  const [isEvaluatingGates, setIsEvaluatingGates] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const loadRelease = useCallback(async () => {
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
  }, [id]);

  useEffect(() => {
    if (id) {
      loadRelease();
    }
  }, [id, loadRelease]);

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

  const handleEvaluateGates = async () => {
    setIsEvaluatingGates(true);
    try {
      const evaluation = await releasesApi.evaluateGates(id);
      setGatesEvaluation(evaluation);
    } catch (err) {
      console.error('Gates evaluation failed:', err);
    } finally {
      setIsEvaluatingGates(false);
    }
  };

  const handleOverrideRelease = async () => {
    if (!overrideReason.trim()) return;
    setIsEvaluatingGates(true);
    try {
      const evaluation = await releasesApi.evaluateGates(id, overrideReason);
      setGatesEvaluation(evaluation);
      setShowOverrideModal(false);
      setOverrideReason('');
    } catch (err) {
      console.error('Override failed:', err);
    } finally {
      setIsEvaluatingGates(false);
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

      {/* AI Explanation */}
      {release.rcsExplanation && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">AI Analysis</h3>
            <span className="text-xs text-muted-foreground ml-auto">
              Generated {new Date(release.rcsExplanation.generatedAt).toLocaleString()}
            </span>
          </div>

          <p className="text-muted-foreground mb-6">{release.rcsExplanation.summary}</p>

          <div className="grid md:grid-cols-2 gap-6">
            {release.rcsExplanation.risks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h4 className="font-medium text-amber-500">Risks</h4>
                </div>
                <ul className="space-y-2">
                  {release.rcsExplanation.risks.map((risk, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {release.rcsExplanation.strengths.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <h4 className="font-medium text-green-500">Strengths</h4>
                </div>
                <ul className="space-y-2">
                  {release.rcsExplanation.strengths.map((strength, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Release Gates Section */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Release Gates</h3>
          </div>
          <button
            onClick={handleEvaluateGates}
            disabled={isEvaluatingGates}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {isEvaluatingGates ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            {gatesEvaluation ? 'Re-evaluate Gates' : 'Evaluate Gates'}
          </button>
        </div>

        {!gatesEvaluation && (
          <div className="text-center py-12 text-muted-foreground">
            <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click &quot;Evaluate Gates&quot; to check if this release is ready for deployment</p>
          </div>
        )}

        {gatesEvaluation && (
          <div className="space-y-6">
            {/* Release Status Banner */}
            <div className={`rounded-lg p-4 flex items-center justify-between ${gatesEvaluation.canRelease
              ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-900'
              : 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-900'
              }`}>
              <div className="flex items-center gap-3">
                {gatesEvaluation.canRelease ? (
                  <Unlock className="h-8 w-8 text-green-600" />
                ) : (
                  <Lock className="h-8 w-8 text-red-600" />
                )}
                <div>
                  <div className={`text-lg font-semibold ${gatesEvaluation.canRelease ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                    }`}>
                    {gatesEvaluation.canRelease ? 'Ready to Release' : 'Blocked'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {gatesEvaluation.summary.passed} of {gatesEvaluation.summary.total} gates passed
                  </div>
                </div>
              </div>
              {!gatesEvaluation.canRelease && (
                <button
                  onClick={() => setShowOverrideModal(true)}
                  className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700"
                >
                  Override Release
                </button>
              )}
            </div>

            {gatesEvaluation.overrideApplied && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-900 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-amber-900 dark:text-amber-400">Override Applied</div>
                    <div className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                      {gatesEvaluation.overrideReason}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Gates List */}
            <div className="space-y-3">
              {gatesEvaluation.gates.map((gate, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border p-4 ${gate.passed
                    ? 'bg-green-50/50 border-green-200 dark:bg-green-900/10 dark:border-green-900'
                    : 'bg-red-50/50 border-red-200 dark:bg-red-900/10 dark:border-red-900'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {gate.passed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{gate.name}</div>
                          {gate.required && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                              Required
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">{gate.message}</div>
                        {gate.details && gate.details.length > 0 && (
                          <div className="mt-2 text-xs space-y-1">
                            {gate.details.slice(0, 3).map((item: unknown, i: number) => {
                              const detail = item as { title: string; priority: string };
                              return (
                                <div key={i} className="text-muted-foreground">
                                  • {detail.title} ({detail.priority})
                                </div>
                              );
                            })}
                            {gate.details.length > 3 && (
                              <div className="text-muted-foreground">
                                ... and {gate.details.length - 3} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {gate.score !== undefined && (
                        <div className="text-lg font-bold">{gate.score}</div>
                      )}
                      {gate.count !== undefined && (
                        <div className="text-lg font-bold">{gate.count}</div>
                      )}
                      {gate.percent !== undefined && (
                        <div className="text-lg font-bold">{gate.percent}%</div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        threshold: {gate.threshold}{gate.percent !== undefined ? '%' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Gates Summary */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{gatesEvaluation.summary.requiredPassed}</div>
                <div className="text-xs text-muted-foreground">Required Gates Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{gatesEvaluation.summary.optionalPassed}</div>
                <div className="text-xs text-muted-foreground">Optional Gates Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{gatesEvaluation.rcsScore}</div>
                <div className="text-xs text-muted-foreground">RCS Score</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg border shadow-lg max-w-md w-full m-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Override Release Gates</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This release has failed required gates. Provide a reason for overriding these checks.
            </p>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Reason for override (required)..."
              className="w-full min-h-[100px] px-3 py-2 rounded-md border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowOverrideModal(false);
                  setOverrideReason('');
                }}
                className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleOverrideRelease}
                disabled={!overrideReason.trim() || isEvaluatingGates}
                className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
              >
                {isEvaluatingGates ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Override & Proceed'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
