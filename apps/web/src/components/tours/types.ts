export type TourStep = {
    id: string;
    selector: string;
    title: string;
    body: string;
    placement?: 'top' | 'bottom' | 'left' | 'right';
};

export type TourConfig = {
    id: string;
    steps: TourStep[];
};

export interface TourContextType {
    startTour: (tourId: string) => void;
    endTour: () => void;
    nextStep: () => void;
    prevStep: () => void;
    activeTourId: string | null;
    currentStepIndex: number;
    isOpen: boolean;
}
