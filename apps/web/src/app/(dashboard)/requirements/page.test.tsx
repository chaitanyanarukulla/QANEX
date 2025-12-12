import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import RequirementsPage from './page'
import { requirementsApi } from '@/services/requirements.service'
import { documentsApi } from '@/services/documents.service'

// Mock services
jest.mock('@/services/requirements.service', () => ({
    requirementsApi: {
        list: jest.fn(),
    }
}))

jest.mock('@/services/documents.service', () => ({
    documentsApi: {
        list: jest.fn(),
    }
}))

describe('RequirementsPage', () => {
    beforeEach(() => {
        jest.clearAllMocks()
            // Default mocks
            ; (documentsApi.list as jest.Mock).mockResolvedValue([
                { id: 'doc1', title: 'Doc 1', status: 'READY_FOR_IMPLEMENTATION' }
            ]);
        ; (requirementsApi.list as jest.Mock).mockResolvedValue([
            { id: 'req1', title: 'Req 1', state: 'DRAFT', sourceDocumentId: 'doc1' }
        ]);
    })

    it('renders page title', async () => {
        render(<RequirementsPage />)
        expect(screen.getByText('Requirements')).toBeInTheDocument()
    })

    it('shows loading state initially', () => {
        (documentsApi.list as jest.Mock).mockReturnValue(new Promise(() => { }))
        render(<RequirementsPage />)
        // Check for loader, searching for search input as landmark that stays or disappears?
        // Check for loader
        expect(screen.getByText('Requirements', { selector: 'h1' })).toBeInTheDocument()
        // We can check for a specific loading text or the structure, but since we use Lucide Loader2, let's just check the header remains.
    })

    it('loads and displays documents', async () => {
        render(<RequirementsPage />)

        await waitFor(() => {
            expect(screen.getByText('Doc 1')).toBeInTheDocument()
            expect(screen.getByText('READY FOR IMPLEMENTATION')).toBeInTheDocument()
        })
    })

    it('handles document selection and shows requirements', async () => {
        render(<RequirementsPage />)

        // Wait for doc
        await waitFor(() => {
            expect(screen.getByText('Doc 1')).toBeInTheDocument()
        })

        // Click doc
        fireEvent.click(screen.getByText('Doc 1'))

        await waitFor(() => {
            expect(screen.getByText('Requirements: Doc 1')).toBeInTheDocument()
            expect(screen.getByText('Req 1')).toBeInTheDocument()
        })
    })

    it('handles interactions: back to documents', async () => {
        render(<RequirementsPage />)
        await waitFor(() => expect(screen.getByText('Doc 1')).toBeInTheDocument())

        fireEvent.click(screen.getByText('Doc 1'))
        await waitFor(() => expect(screen.getByText('Requirements: Doc 1')).toBeInTheDocument())

        fireEvent.click(screen.getByText('Back to Documents'))
        await waitFor(() => expect(screen.getByText('Requirements', { selector: 'h1' })).toBeInTheDocument())
    })
})
