import { render, screen } from '@testing-library/react'
import { Card } from './card'

// Mock toast hook if mostly relying on use-toast implementation which is complex
// But to cover UI components, we can just test rendering.
// Since 'toaster.tsx' also exists in list? No, only 'card.tsx' and 'use-toast.tsx' were in list_dir output?
// Wait, I should double check what's in ui folder.

describe('Card', () => {
    it('renders', () => {
        render(<Card>Test</Card>)
        expect(screen.getByText('Test')).toBeInTheDocument()
    })
})
