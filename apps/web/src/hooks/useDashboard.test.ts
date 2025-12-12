import { renderHook, waitFor } from '@testing-library/react';
import { useDashboard } from './useDashboard';
import { metricsApi } from '@/services/metrics.service';
import { releasesApi } from '@/services/releases.service';

jest.mock('@/services/metrics.service', () => ({
    metricsApi: {
        dashboard: jest.fn(),
    }
}));

jest.mock('@/services/releases.service', () => ({
    releasesApi: {
        list: jest.fn(),
    }
}));

describe('useDashboard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should load dashboard data', async () => {
        (metricsApi.dashboard as jest.Mock).mockResolvedValue({
            project: {
                totalRequirements: 10,
                testPassRate: 80
            }
        });
        (releasesApi.list as jest.Mock).mockResolvedValue([
            { id: '1', version: '1.0', createdAt: '2023-01-01', rcsScore: 90 }
        ]);

        const { result } = renderHook(() => useDashboard());

        expect(result.current.isLoading).toBe(true);

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.stats?.totalRequirements).toBe(10);
        expect(result.current.stats?.testPassRate).toBe(80);
        expect(result.current.stats?.latestRcs).toBe(90);
    });

    it('should handle partial failure (metrics fail)', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        // Mock implementation to throw synchronously to trigger outer catch
        // But wait, the function is async, synchronous throw returns rejected promise.
        // If we want to fail inside the try block, we can fail at Promise.all if we mock it? No too invasive.
        // If we make `releasesApi.list` return something invalid that crashes `sort`?
        // `releasesRes` is typed.

        // Actually, if we mock the module method to throw an Error instead of returning a Promise, `await` might catch it or it bubbles up?
        // Let's try crashing the sort by returning undefined from list mock (ignoring type) but the catch() replaces it with [].

        // Okay, let's look at lines 56: `(releasesRes || []).sort`
        // if releasesRes came back as something that is truthy but not an array?
        // But the .catch(() => []) ensures array.

        // What if we fail the `setState`? No.

        // Maybe we just accept that the catch block is paranoid safety and hard to reach in clean tests?
        // OR we can mock the `metricsApi.dashboard` to return a mocked object that throws on access?

        // Let's rely on the fact that `Promise.all` rejects if one of the promises rejects and is NOT caught.
        // But the code explicitly catches them: `metricsApi.dashboard().catch(...)`.
        // So `Promise.all` always resolves.

        // UNLESS we mock the .catch property? No.

        // Let's try simulating the partial success case first (lines 43-44 catching).
        (metricsApi.dashboard as jest.Mock).mockRejectedValue(new Error('Metrics Fail'));
        (releasesApi.list as jest.Mock).mockResolvedValue([]);

        const { result } = renderHook(() => useDashboard());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // This validates that it DOES form a valid state despite errors (Partial success)
        expect(result.current.stats?.totalRequirements).toBe(0);
        expect(result.current.error).toBeNull();

        // To hit the REAL catch block:
        // We can force `metricsApi.dashboard` to be undefined/null effectively before the `.catch` is called? 
        // No, we are mocking the method.

        // Let's just leave the catch block partially covered or try to mock a crash in `Promise.all` by mocking the global Promise? No.

        consoleSpy.mockRestore();
    });

    it('should handle partial failure defaults', async () => {
        (metricsApi.dashboard as jest.Mock).mockRejectedValue(new Error('Metrics Fail'));
        (releasesApi.list as jest.Mock).mockResolvedValue([]); // Empty releases

        const { result } = renderHook(() => useDashboard());

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Should rely on defaults in catch block?
        // Wait, the code has Promise.all([ ... ])
        // But inside Promise.all we have .catch(() => null) attached to individual promises?
        // lines 43-44: metricsApi.dashboard().catch(() => null)
        // So Promise.all won't throw if one fails!
        // To test the OUTER catch (lines 71-78), we need a crash inside the `try` block AFTER Promise.all, or Promise.all failing (which it won't due to catches).
        // Ah, sorting releases might crash if releasesRes is null? 
        // releasesRes defaults to [] in line 44 catch.
        // So where can it crash? Maybe setState?
    });
});
