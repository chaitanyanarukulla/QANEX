'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function CurrentSprintPage() {
    const router = useRouter();

    useEffect(() => {
        // In a real app, this would fetch the current active sprint from the API
        // For now, redirect to a mock sprint ID
        const mockCurrentSprintId = 'sprint-current';
        router.replace(`/sprints/${mockCurrentSprintId}`);
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
