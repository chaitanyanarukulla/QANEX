'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TourConfig, TourStep, TourContextType } from './types';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

const TourContext = createContext<TourContextType | undefined>(undefined);

// Registry of tours - In a real app, this could be imported from a separate config file
import { tours } from './tour-registry';

export function TourProvider({ children }: { children: React.ReactNode }) {
    const [activeTourId, setActiveTourId] = useState<string | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [position, setPosition] = useState<{ top: number, left: number } | null>(null);

    const activeTour = activeTourId ? tours.find(t => t.id === activeTourId) : null;
    const currentStep = activeTour ? activeTour.steps[currentStepIndex] : null;

    const updatePosition = useCallback(() => {
        if (!currentStep) return;
        const element = document.querySelector(currentStep.selector);
        if (element) {
            const rect = element.getBoundingClientRect();
            // const scrollX = window.scrollX; 
            // const scrollY = window.scrollY;

            // Simple positioning logic
            let top = rect.bottom + window.scrollY + 10;
            let left = rect.left + window.scrollX;

            // Basic flip if too low
            if (currentStep.placement === 'top' || (top + 150 > document.documentElement.scrollHeight)) {
                top = rect.top + window.scrollY - 150; // approx height
            }

            // Ensure within bounds
            left = Math.max(10, Math.min(left, window.innerWidth - 320));

            setPosition({ top, left });

            // Scroll into view
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            // Retry or just wait? Element might not be rendered yet.
            // For now, center screen if not found?
            // setPosition({ top: window.innerHeight / 2, left: window.innerWidth / 2 });
        }
    }, [currentStep]);

    useEffect(() => {
        if (activeTourId) {
            // Give time for UI to update/render
            const timer = setTimeout(updatePosition, 300);
            window.addEventListener('resize', updatePosition);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [activeTourId, currentStepIndex, updatePosition]);

    const startTour = (tourId: string) => {
        setActiveTourId(tourId);
        setCurrentStepIndex(0);
    };

    const endTour = () => {
        setActiveTourId(null);
        setCurrentStepIndex(0);
        setPosition(null);
    };

    const nextStep = () => {
        if (!activeTour) return;
        if (currentStepIndex < activeTour.steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        } else {
            endTour();
        }
    };

    const prevStep = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    return (
        <TourContext.Provider value={{ startTour, endTour, nextStep, prevStep, activeTourId, currentStepIndex, isOpen: !!activeTourId }}>
            {children}
            {activeTour && currentStep && position && (
                <>
                    {/* Backdrop / Spotlight effect - simplified as just dark overlay */}
                    {/* <div className="fixed inset-0 bg-black/20 z-40 pointer-events-none" /> */}

                    <div
                        className="absolute z-50 w-80 rounded-xl border bg-card p-4 shadow-xl animate-in fade-in zoom-in-95"
                        style={{ top: position.top, left: position.left }}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold">{currentStep.title}</h3>
                            <button onClick={endTour} className="text-muted-foreground hover:text-foreground">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">{currentStep.body}</p>

                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                                Step {currentStepIndex + 1} of {activeTour.steps.length}
                            </span>
                            <div className="flex gap-2">
                                {currentStepIndex > 0 && (
                                    <button onClick={prevStep} className="p-1 rounded hover:bg-muted">
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={nextStep}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90"
                                >
                                    {currentStepIndex === activeTour.steps.length - 1 ? 'Finish' : 'Next'}
                                    {currentStepIndex < activeTour.steps.length - 1 && <ChevronRight className="w-3 h-3" />}
                                </button>
                            </div>
                        </div>

                        {/* Arrow (Visual only, approximate) */}
                        <div className="absolute -top-1.5 left-4 w-3 h-3 bg-card border-t border-l rotate-45" />
                    </div>
                </>
            )}
        </TourContext.Provider>
    );
}

export const useTour = () => {
    const context = useContext(TourContext);
    if (!context) throw new Error('useTour must be used within TourProvider');
    return context;
};
