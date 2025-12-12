import { render, screen } from '@testing-library/react'
import { Sidebar } from './Sidebar'

// Mock usePathname
jest.mock('next/navigation', () => ({
    usePathname: () => '/',
}))

// Mock lucide icons to avoid potential issues (optional but safer)
// Actually they are just components, should be fine.

describe('Sidebar', () => {
    it('renders branding', () => {
        render(<Sidebar />)
        expect(screen.getByText('QANexus')).toBeInTheDocument()
    })

    it('renders navigation items', () => {
        render(<Sidebar />)
        // Check a few main items
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
        expect(screen.getByText('Documents')).toBeInTheDocument()
        expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('highlights active link', () => {
        render(<Sidebar />)
        const dashboardLink = screen.getByText('Dashboard').closest('a')
        expect(dashboardLink).toHaveClass('bg-primary/10')

        const documentsLink = screen.getByText('Documents').closest('a')
        expect(documentsLink).not.toHaveClass('bg-primary/10')
    })
})
