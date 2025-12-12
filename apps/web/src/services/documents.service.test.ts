import { documentsApi } from './documents.service';
import { api } from '../lib/api-client';

// Mock api client
jest.mock('../lib/api-client', () => ({
    api: jest.fn(),
}));

// Mock global fetch for upload
global.fetch = jest.fn();

describe('documentsApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Standard CRUD', () => {
        it('list calls api GET /documents', async () => {
            await documentsApi.list();
            expect(api).toHaveBeenCalledWith('/documents');
        });

        it('create calls api POST /documents', async () => {
            const data = { title: 'T', content: 'C' };
            await documentsApi.create(data);
            expect(api).toHaveBeenCalledWith('/documents', { method: 'POST', body: data });
        });
    });

    describe('upload', () => {
        it('uses fetch with FormData', async () => {
            const file = new File(['content'], 'test.txt', { type: 'text/plain' });

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ id: 'doc1' }),
            });

            const res = await documentsApi.upload(file);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/documents/upload'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.any(FormData)
                })
            );
            expect(res).toEqual({ id: 'doc1' });
        });

        it('handles upload failure', async () => {
            const file = new File([''], 'test.txt');
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                json: () => Promise.resolve({ message: 'Error' }),
            });

            await expect(documentsApi.upload(file)).rejects.toThrow('Error');
        });
    });
});
