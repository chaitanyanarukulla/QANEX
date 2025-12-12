'use client';

import { Rocket, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { releasesApi } from '@/services/releases.service';
import { Release } from '@/types/release';

const statusColors: Record<string, string> = {
  PLANNED: 'bg-gray-500/20 text-gray-400',
  ACTIVE: 'bg-blue-500/20 text-blue-500',
  FROZEN: 'bg-purple-500/20 text-purple-500',
  RELEASED: 'bg-green-500/20 text-green-500',
  ABORTED: 'bg-red-500/20 text-red-500',
};

const rcsColor = (score: number) => {
  if (score >= 80) return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-500';
  if (score >= 50) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-500';
  return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-500';
};

export default function ReleasesPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newRelease, setNewRelease] = useState({ version: '', name: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadReleases();
  }, []);

  const loadReleases = async () => {
    try {
      setIsLoading(true);
      const data = await releasesApi.list();
      setReleases(data);
      setError(null);
    } catch (err) {
      setError('Failed to load releases');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRelease.version) return;

    setIsCreating(true);
    try {
      const created = await releasesApi.create({
        version: newRelease.version,
        name: newRelease.name || newRelease.version,
        status: 'PLANNED',
      });
      setReleases(prev => [created, ...prev]);
      setShowCreateModal(false);
      setNewRelease({ version: '', name: '' });
    } catch (err) {
      console.error('Failed to create release:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Releases</h1>
          <p className="text-muted-foreground">Manage deployment candidates and view Quality Gates.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Release
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-500">{error}</p>
        </div>
      ) : releases.length === 0 ? (
        <div className="rounded-md border bg-card p-12 text-center">
          <Rocket className="mx-auto h-12 w-12 opacity-20 mb-4" />
          <p className="text-muted-foreground mb-4">No releases yet. Create your first release to track quality.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Release
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {releases.map((release) => (
            <Link href={`/releases/${release.id}`} key={release.id}>
              <div className="flex items-center justify-between p-6 rounded-lg border bg-card text-card-foreground shadow-sm hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${release.rcsScore !== undefined ? rcsColor(release.rcsScore) : 'bg-muted text-muted-foreground'
                    }`}>
                    {release.rcsScore ?? '–'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{release.name || release.version}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>v{release.version}</span>
                      <span>•</span>
                      <span>{new Date(release.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[release.status]}`}>
                    {release.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Release Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Create New Release</h2>
            <form onSubmit={handleCreateRelease} className="space-y-4">
              <div>
                <label htmlFor="version" className="block text-sm font-medium mb-2">
                  Version <span className="text-red-500">*</span>
                </label>
                <input
                  id="version"
                  type="text"
                  required
                  value={newRelease.version}
                  onChange={(e) => setNewRelease(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="e.g., 1.0.0"
                  className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Release Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={newRelease.name}
                  onChange={(e) => setNewRelease(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Sprint 1 Release"
                  className="w-full px-3 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium rounded-md hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newRelease.version}
                  className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
