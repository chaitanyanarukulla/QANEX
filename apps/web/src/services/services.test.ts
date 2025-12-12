import { authApi } from './auth.service';
import { projectsApi } from './projects.service';
import { sprintsApi } from './sprints.service';
import { api } from '../lib/api-client';

jest.mock('../lib/api-client', () => ({
    api: jest.fn(),
}));

describe('Service APIs', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('authApi', () => {
        it('login calls api', async () => {
            await authApi.login('e', 'sub');
            expect(api).toHaveBeenCalledWith('/auth/login', expect.anything());
        });

        it('me calls api', async () => {
            await authApi.me();
            expect(api).toHaveBeenCalledWith('/auth/me');
        });
    });

    describe('projectsApi', () => {
        it('list calls api', async () => {
            await projectsApi.list();
            expect(api).toHaveBeenCalledWith('/projects');
        });
        it('create calls api', async () => {
            const data = { name: 'P' };
            await projectsApi.create(data);
            expect(api).toHaveBeenCalledWith('/projects', expect.objectContaining({ method: 'POST' }));
        });
    });

    describe('sprintsApi', () => {
        it('list calls api', async () => {
            await sprintsApi.list();
            expect(api).toHaveBeenCalledWith('/sprints');
        });
        it('get calls api', async () => {
            await sprintsApi.get('s1');
            expect(api).toHaveBeenCalledWith('/sprints/s1');
        });
        it('create calls api', async () => {
            await sprintsApi.create({});
            expect(api).toHaveBeenCalledWith('/sprints', expect.objectContaining({ method: 'POST' }));
        });
        it('planSprint calls api', async () => {
            await sprintsApi.planSprint(10);
            expect(api).toHaveBeenCalledWith('/sprints/ai/plan', expect.objectContaining({ body: { capacity: 10 } }));
        });
    });
});
