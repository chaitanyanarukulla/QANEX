import { TourConfig } from './types';

export const tours: TourConfig[] = [
    {
        id: 'dashboard-tour',
        steps: [
            {
                id: 'stats-grid',
                selector: '#dashboard-stats',
                title: 'Key Metrics',
                body: 'Here you can see the pulse of your project: passing tests, RQS scores, and open bugs.',
                placement: 'bottom'
            },
            {
                id: 'release-readiness',
                selector: '#release-chart',
                title: 'Release Confidence',
                body: 'Track your RCS over time to know exactly when you are ready to ship.',
                placement: 'bottom'
            }
        ]
    }
];
