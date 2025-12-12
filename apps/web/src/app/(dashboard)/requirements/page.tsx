'use client';

import { FileText, Plus, Search, Sparkles, Loader2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { requirementsApi, Requirement } from '@/lib/api';

const stateColors: Record<string, string> = {
  DRAFT: 'bg-gray-500/20 text-gray-400',
  PUBLISHED: 'bg-blue-500/20 text-blue-500',
  NEEDS_REVISION: 'bg-yellow-500/20 text-yellow-500',
  READY: 'bg-green-500/20 text-green-500',
};

const rqsColor = (score: number) => {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
};

export default function RequirementsPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  useEffect(() => {
    loadRequirements();
  }, []);

  const loadRequirements = async () => {
    try {
      setIsLoading(true);
      const data = await requirementsApi.list();
      setRequirements(data);
      setError(null);
    } catch (err) {
      setError('Failed to load requirements');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async (id: string) => {
    setAnalyzingId(id);
    try {
      const updated = await requirementsApi.analyze(id);
      setRequirements(prev =>
        prev.map(r => (r.id === id ? updated : r))
      );
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzingId(null);
    }
  };

  const filteredRequirements = requirements.filter(req =>
    req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Requirements</h1>
          <p className="text-muted-foreground">Manage and track product requirements.</p>
        </div>
        <Link
          href="/requirements/new"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Requirement
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search requirements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {filteredRequirements.length} requirement{filteredRequirements.length !== 1 ? 's' : ''}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-500">{error}</p>
        </div>
      ) : filteredRequirements.length === 0 ? (
        <div className="rounded-md border bg-card">
          <div className="p-6 text-center text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <p>
              {searchQuery
                ? 'No requirements match your search.'
                : 'No requirements found. Create one to get started.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-md border bg-card divide-y">
          {filteredRequirements.map((req) => (
            <div
              key={req.id}
              className="p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/requirements/${req.id}`}
                      className="font-medium hover:text-primary truncate"
                    >
                      {req.title}
                    </Link>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${stateColors[req.state]}`}>
                      {req.state}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {req.content || 'No content'}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {req.rqsScore !== undefined ? (
                    <div className="text-center">
                      <p className={`text-xl font-bold ${rqsColor(req.rqsScore)}`}>
                        {req.rqsScore}
                      </p>
                      <p className="text-xs text-muted-foreground">RQS</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAnalyze(req.id)}
                      disabled={analyzingId === req.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
                    >
                      {analyzingId === req.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      Analyze
                    </button>
                  )}

                  <Link
                    href={`/requirements/${req.id}`}
                    className="p-2 rounded-md hover:bg-muted"
                  >
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
