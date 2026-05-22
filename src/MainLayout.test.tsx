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

        expect(screen.getByRole('link', { name: /XWEGBE VIVI/i })).toBeInTheDocument();
        expect(screen.getByTestId('child-content')).toBeInTheDocument();
        expect(screen.getByText(/Office Hours/i)).toBeInTheDocument();
        expect(screen.getByText(/All Rights Reserved/i)).toBeInTheDocument();
    });

    it('renders children content', () => {
        render(
            <MemoryRouter>
                <MainLayout user={null}>
                    <h1>Test Page Content</h1>
                    <p>Some paragraph</p>
                </MainLayout>
            </MemoryRouter>
        );

        expect(screen.getByText('Test Page Content')).toBeInTheDocument();
        expect(screen.getByText('Some paragraph')).toBeInTheDocument();
    });

    it('shows login link when user is null', () => {
        render(
            <MemoryRouter>
                <MainLayout user={null}>
                    <div>Content</div>
                </MainLayout>
            </MemoryRouter>
        );

        const links = screen.getAllByRole('link');
        const loginLink = links.find(l => l.getAttribute('href') === '/login');
        expect(loginLink).toBeInTheDocument();
    });

    it('shows dashboard link when user is authenticated', () => {
        const mockUser = { uid: '123', email: 'test@example.com' } as unknown as import('firebase/auth').User;

        render(
            <MemoryRouter>
                <MainLayout user={mockUser}>
                    <div>Content</div>
                </MainLayout>
            </MemoryRouter>
        );

        expect(screen.getAllByText(/Dashboard/i)[0]).toBeInTheDocument();
    });
});
