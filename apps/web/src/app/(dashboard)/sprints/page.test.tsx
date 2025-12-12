import { render, screen, waitFor } from '@testing-library/react'
import SprintsListPage from './page'
import { sprintsApi } from '@/services/sprints.service'

// Mock services
jest.mock('@/services/sprints.service', () => ({
    sprintsApi: {
        list: jest.fn(),
    }
}))

describe('SprintsListPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders loading state initially', () => {
        (sprintsApi.list as jest.Mock).mockReturnValue(new Promise(() => { })) // Never resolves
        render(<SprintsListPage />)
        expect(screen.queryByRole('heading', { name: /sprints/i })).not.toBeInTheDocument() // Header is behind loader? Actually loader replaces everything in the component code
        // "if (isLoading) return ...Loader"
    })

    it('renders sprints list', async () => {
        const mockSprints = [
            { id: '1', name: 'Sprint 1', status: 'ACTIVE', startDate: '2023-01-01', endDate: '2023-01-14', goal: 'Goal 1' },
            { id: '2', name: 'Sprint 2', status: 'PLANNED', startDate: null, endDate: null }
        ]
            ; (sprintsApi.list as jest.Mock).mockResolvedValue(mockSprints)

        render(<SprintsListPage />)

        await waitFor(() => {
            expect(screen.getByText('Sprint 1')).toBeInTheDocument()
            expect(screen.getByText('Sprint 2')).toBeInTheDocument()
            expect(screen.getByText('ACTIVE')).toBeInTheDocument()
            expect(screen.getByText('Goal 1')).toBeInTheDocument()
        })
    })

    it('renders empty state', async () => {
        (sprintsApi.list as jest.Mock).mockResolvedValue([])
        render(<SprintsListPage />)

        await waitFor(() => {
            expect(screen.getByText('No sprints found')).toBeInTheDocument()
        })
    })

    it('handles error', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { })
            ; (sprintsApi.list as jest.Mock).mockRejectedValue(new Error('Failed'))

        render(<SprintsListPage />)

        await waitFor(() => {
            expect(screen.getByText('Failed to load sprints')).toBeInTheDocument()
        })
        consoleSpy.mockRestore()
    })
})
