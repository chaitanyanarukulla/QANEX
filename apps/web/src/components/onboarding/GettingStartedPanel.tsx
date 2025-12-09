import { CheckCircle2, Circle, ArrowRight, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useTour } from '../../hooks/useTour';

export function GettingStartedPanel() {
    const { items, progress, isLoading } = useOnboarding();
    const { startTour } = useTour();

    if (isLoading) return null; // Or a skeleton
    if (items.length === 0) return null;
    if (progress === 1) return null; // Hide if completed

    const nextStep = items.find(i => !i.completed);

    return (
        <div className="mb-8 rounded-xl border bg-gradient-to-br from-card to-secondary/10 p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        🚀 Getting Started
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                            {Math.round(progress * 100)}% completed
                        </span>
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Complete these steps to set up your quality lifecycle.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => startTour('dashboard-tour')}
                        className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                        <PlayCircle className="w-4 h-4" /> Tour
                    </button>
                    {nextStep && nextStep.ctaPath && (
                        <Link
                            href={nextStep.ctaPath}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                        >
                            {nextStep.label} <ArrowRight className="w-4 h-4" />
                        </Link>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full rounded-full bg-secondary mb-6 overflow-hidden">
                <div
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${progress * 100}%` }}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${item.completed ? 'bg-muted/50 border-transparent opacity-60' : 'bg-card'}`}
                    >
                        <div className={`mt-0.5 ${item.completed ? 'text-green-500' : 'text-muted-foreground'}`}>
                            {item.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </div>
                        <div>
                            <p className={`text-sm font-medium ${item.completed ? 'line-through decoration-muted-foreground/50' : ''}`}>
                                {item.label}
                            </p>
                            {!item.completed && item.ctaPath && (
                                <Link href={item.ctaPath} className="text-xs text-primary hover:underline mt-1 block">
                                    Do this →
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
