'use client';

import { useState, useEffect } from 'react';

export interface CheckistItem {
    id: string;
    label: string;
    completed: boolean;
    ctaPath?: string;
}

export interface OnboardingState {
    items: CheckistItem[];
    progress: number;
    isLoading: boolean;
    error: string | null;
}

export function useOnboarding() {
    const [state, setState] = useState<OnboardingState>({
        items: [],
        progress: 0,
        isLoading: true,
        error: null
    });

    const fetchChecklist = async () => {
        try {
            // Assuming API is proxied at /api or running on same domain
            // Adjust authentication headers based on your auth implementation
            const token = localStorage.getItem('accessToken'); // Try standard storage
            const headers: HeadersInit = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch('http://localhost:3000/onboarding/checklist', { headers }); // Direct to API temporarily if unknown
            // Note: In real app, use environment variable for API URL

            if (!res.ok) throw new Error('Failed to fetch onboarding status');

            const data = await res.json();
            setState({
                items: data.items,
                progress: data.progress,
                isLoading: false,
                error: null
            });
        } catch (err) {
            console.error(err);
            // Verify if we can return a mock for demo purposes if API fails?
            // For now, just set error
            setState(prev => ({ ...prev, isLoading: false, error: 'Could not load onboarding' }));
        }
    };

    useEffect(() => {
        fetchChecklist();
    }, []);

    return { ...state, refresh: fetchChecklist };
}
