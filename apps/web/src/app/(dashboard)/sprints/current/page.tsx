'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CurrentSprintPage() {
    const router = useRouter();

    useEffect(() => {
        const fetchActiveSprint = async () => {
            try {
                // Fetch the current active sprint from the API
                const { sprintsApi } = await import('@/lib/api');
                const activeSprint = await sprintsApi.getActive();
                if (activeSprint && activeSprint.id) {
                    router.replace(`/sprints/${activeSprint.id}`);
                } else {
                    router.replace('/sprints');
                }
            } catch (error) {
                console.error('Failed to fetch active sprint:', error);
                router.replace('/sprints');
            }
        };

        fetchActiveSprint();
    }, [router]);

    return (
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
            <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading current sprint...</p>
            </div>
        </div>
    );
}
