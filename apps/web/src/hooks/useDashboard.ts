'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, releasesApi } from '@/lib/api';

interface DashboardStats {
  totalRequirements: number;
  avgRqs: number;
  totalBugs: number;
  openBugs: number;
  bugDensity: string | number;
  testPassRate: number;
  latestRcs: number | null;
  recentReleases: Array<{
    id: string;
    version: string;
    name: string;
    status: string;
    rcsScore?: number;
  }>;
}

interface DashboardState {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
}

export function useDashboard() {
  const [state, setState] = useState<DashboardState>({
    stats: null,
    isLoading: true,
    error: null,
  });

  const fetchDashboard = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch data from multiple endpoints in parallel
      const [metricsRes, releasesRes] = await Promise.all([
        api<{
          project: {
            totalRequirements: number;
            avgRqs: number;
            totalBugs: number;
            openBugs: number;
            bugDensity: string | number;
            testPassRate?: number;
          };
          ai: {
            totalInteractions: number;
            avgLatency: number;
          };
        }>('/metrics/dashboard').catch(() => null),
        releasesApi.list().catch(() => []),
      ]);

      const projectStats = metricsRes?.project || {
        totalRequirements: 0,
        avgRqs: 0,
        totalBugs: 0,
        openBugs: 0,
        bugDensity: 0,
      };

      // Get the latest release's RCS score
      const sortedReleases = (releasesRes || []).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const latestRcs = sortedReleases[0]?.rcsScore ?? null;

      setState({
        stats: {
          ...projectStats,
          testPassRate: projectStats.testPassRate || 0, // Real data
          latestRcs,
          recentReleases: sortedReleases.slice(0, 3),
        },
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load dashboard data',
      }));
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, refresh: fetchDashboard };
}
