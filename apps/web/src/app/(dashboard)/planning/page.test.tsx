import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import PlanningPage from './page'
import { sprintsApi } from '@/services/sprints.service'
import { requirementsApi } from '@/services/requirements.service'

// Mock services
jest.mock('@/services/sprints.service', () => ({
    sprintsApi: {
        getStructuredBacklog: jest.fn(),
        planSprint: jest.fn(),
        create: jest.fn(),
        updateStatus: jest.fn(),
        moveItem: jest.fn(),
    }
}))
jest.mock('@/services/requirements.service', () => ({
    requirementsApi: {
        list: jest.fn(),
    }
}))
jest.mock('next/navigation', () => ({
    useRouter: jest.fn().mockReturnValue({ push: jest.fn() }),
}))

describe('PlanningPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
            ; (sprintsApi.getStructuredBacklog as jest.Mock).mockResolvedValue({
                requirements: [
                    { id: 'r1', title: 'Req 1', tasks: [{ id: 't1', title: 'Task 1', priority: 'HIGH', type: 'task' }] }
                ],
                standaloneTasks: [
                    { id: 't2', title: 'Task 2', priority: 'LOW', type: 'bug' }
                ]
            })
    })

    it('renders page and loads backlog', async () => {
        render(<PlanningPage />)

        await waitFor(() => {
            expect(screen.getByText('Sprint Planning')).toBeInTheDocument()
            expect(screen.getByText('Req 1')).toBeInTheDocument()
            expect(screen.getByText('Task 2')).toBeInTheDocument()
        })
    })

    it('AI auto-plan functionality', async () => {
        (sprintsApi.planSprint as jest.Mock).mockResolvedValue({
            recommendedItems: [
                { item: { id: 't1', title: 'Task 1' }, score: 80, reason: 'Test reason' }
            ],
            reasoning: 'AI reasoning text'
        })

        render(<PlanningPage />)
        await waitFor(() => expect(screen.getByText('Req 1')).toBeInTheDocument())

        // Find Task 1 to ensure it is in backlog initially
        // It is inside an expanded accordion usually.
        // Wait, the test mock data says Req 1 has Task 1.

        const autoPlanBtn = screen.getByText('AI Auto-Plan').closest('button')
        // It might be disabled if backlog empty logic fails?
        // "disabled={(standaloneBacklog.length + backlogRequirements... === 0}"
        // We have items, so it should be enabled.

        expect(autoPlanBtn).not.toBeDisabled()

        fireEvent.click(autoPlanBtn!)

        await waitFor(() => {
            expect(sprintsApi.planSprint).toHaveBeenCalled()
            expect(screen.getByText('AI Planning Recommendation')).toBeInTheDocument()
            expect(screen.getByText('AI reasoning text')).toBeInTheDocument()
        })
    })
})
