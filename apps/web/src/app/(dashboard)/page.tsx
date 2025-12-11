'use client';

import { ArrowUpRight, CheckCircle2, Clock, FileText, Bug, Loader2 } from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import Link from 'next/link';

export default function Home() {
  const { stats, isLoading, error } = useDashboard();

  const dashboardStats = [
    {
      name: 'Requirements',
      value: stats?.totalRequirements ?? '-',
      subtext: `Avg RQS: ${stats?.avgRqs ?? '-'}`,
      icon: FileText,
      href: '/requirements',
    },
    {
      name: 'Test Pass Rate',
      value: stats?.testPassRate ? `${stats.testPassRate}%` : '-',
      subtext: 'Last run',
      icon: CheckCircle2,
      href: '/tests',
    },
    {
      name: 'Open Issues',
      value: stats?.openBugs ?? '-',
      subtext: `Total: ${stats?.totalBugs ?? '-'}`,
      icon: Bug,
      href: '/issues',
    },
    {
      name: 'Release Confidence',
      value: stats?.latestRcs ?? '-',
      subtext: 'Latest release',
      icon: ArrowUpRight,
      href: '/releases',
      highlight: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      </div>


      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-500">{error}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Make sure the API is running and you&apos;re logged in.
          </p>
        </div>
      ) : (
        <>
          <div id="dashboard-stats" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {dashboardStats.map((stat) => (
              <Link
                key={stat.name}
                href={stat.href}
                className={`overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-colors hover:bg-card/80 ${stat.highlight ? 'ring-2 ring-primary/20' : ''
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg p-2 ${stat.highlight ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-bold">{stat.value}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{stat.subtext}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div id="release-chart" className="col-span-2 rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-medium mb-4">Recent Releases</h3>
              {stats?.recentReleases && stats.recentReleases.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentReleases.map((release) => (
                    <Link
                      key={release.id}
                      href={`/releases/${release.id}`}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium">{release.name || release.version}</p>
                        <p className="text-sm text-muted-foreground">v{release.version}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${release.status === 'RELEASED' ? 'bg-green-500/20 text-green-500' :
                          release.status === 'ACTIVE' ? 'bg-blue-500/20 text-blue-500' :
                            'bg-yellow-500/20 text-yellow-500'
                          }`}>
                          {release.status}
                        </span>
                        {release.rcsScore !== undefined && (
                          <div className="text-right">
                            <p className="text-2xl font-bold">{release.rcsScore}</p>
                            <p className="text-xs text-muted-foreground">RCS</p>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center border-2 border-dashed rounded-lg border-muted">
                  <div className="text-center">
                    <p className="text-muted-foreground">No releases yet</p>
                    <Link href="/releases" className="text-sm text-primary hover:underline">
                      Create your first release
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href="/requirements/new"
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Add Requirement</span>
                </Link>
                <Link
                  href="/issues"
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <Bug className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Log Bug</span>
                </Link>
                <Link
                  href="/planning"
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Plan Sprint</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
