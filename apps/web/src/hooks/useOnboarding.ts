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
            const { onboardingApi } = await import('@/services/onboarding.service');
            const data = await onboardingApi.checklist();

            setState({
                items: data.items,
                progress: data.progress,
                isLoading: false,
                error: null
            });
        } catch (err) {
            console.error(err);
            setState(prev => ({ ...prev, isLoading: false, error: 'Could not load onboarding' }));
        }
    };

    useEffect(() => {
        fetchChecklist();
    }, []);

    return { ...state, refresh: fetchChecklist };
}
