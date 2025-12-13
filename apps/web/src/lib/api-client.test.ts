import { api } from './api-client';
import { ApiError } from '../types/api';

// Mock global fetch
global.fetch = jest.fn();

describe('api-client', () => {
    beforeEach(() => {
        (global.fetch as jest.Mock).mockClear();
        localStorage.clear();
    });

    it('adds auth header if token exists', async () => {
        localStorage.setItem('accessToken', 'test-token');
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            text: jest.fn().mockResolvedValue('{}'),
        });

        await api('/test', { noCache: true });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/test'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer test-token'
                })
            })
        );
    });

    it('handles JSON response', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            text: jest.fn().mockResolvedValue(JSON.stringify({ data: 'ok' })),
        });

        const res = await api('/test', { noCache: true });
        expect(res).toEqual({ data: 'ok' });
    });

    it('handles JSON parse error gracefully', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            text: jest.fn().mockResolvedValue('{}'),
        });

        const res = await api('/test', { noCache: true });
        expect(res).toEqual({});
    });

    it('throws ApiError on failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ message: 'Bad Request' }),
        });

        await expect(api('/error', { noCache: true })).rejects.toThrow(ApiError);
        await expect(api('/error', { noCache: true })).rejects.toThrow('Bad Request');
    });

    it('handles empty response keys', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            text: () => Promise.resolve(''),
        });
        const res = await api('/test');
        expect(res).toEqual({});
    });
});
