import { render, screen, waitFor } from '@testing-library/react'
import DocumentsPage from './page'
import { documentsApi } from '@/services/documents.service'

jest.mock('@/services/documents.service', () => ({
    documentsApi: {
        list: jest.fn(),
    }
}))

jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
    }),
}))

describe('DocumentsPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders loading state', async () => {
        (documentsApi.list as jest.Mock).mockReturnValue(new Promise(() => { }))
        render(<DocumentsPage />)
        expect(screen.getByText('Documents')).toBeInTheDocument()
    })

    it('renders documents list', async () => {
        (documentsApi.list as jest.Mock).mockResolvedValue([
            { id: '1', title: 'My Doc', status: 'DRAFT', updatedAt: '2023-01-01' }
        ])
        render(<DocumentsPage />)
        await waitFor(() => {
            expect(screen.getByText('My Doc')).toBeInTheDocument()
            expect(screen.getByText('DRAFT')).toBeInTheDocument()
        })
    })

    it('renders empty state', async () => {
        (documentsApi.list as jest.Mock).mockResolvedValue([])
        render(<DocumentsPage />)
        await waitFor(() => {
            expect(screen.getByText('No documents found')).toBeInTheDocument()
        })
    })
})
