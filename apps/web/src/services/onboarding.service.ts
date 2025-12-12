import { api } from '../lib/api-client';

export const onboardingApi = {
    checklist: () => api<{
        items: { id: string; label: string; completed: boolean; ctaPath?: string }[];
        progress: number;
    }>('/onboarding/checklist'),
};
