import { render, screen } from '@testing-library/react';
import { MainLayout } from './MainLayout';
import { MemoryRouter } from 'react-router-dom';

describe('MainLayout', () => {
    it('renders header and footer', () => {
        render(
            <MemoryRouter>
                <MainLayout user={null}>
                    <div data-testid="child-content">Child Content</div>
                </MainLayout>
            </MemoryRouter>
        );

        // Check Header content (Logo)
        expect(screen.getByRole('link', { name: /XWEGBE VIVI/i })).toBeInTheDocument();

        // Check Child content
        expect(screen.getByTestId('child-content')).toBeInTheDocument();

        // Check Footer content
        expect(screen.getByText(/Office Hours/i)).toBeInTheDocument();
        expect(screen.getByText(/All Rights Reserved/i)).toBeInTheDocument();
    });
});
