import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { Header } from './Header';
import { BrowserRouter } from 'react-router-dom';
import * as auth from 'firebase/auth';
import type { User } from 'firebase/auth';

// Mock firebase
vi.mock('./firebase', () => ({
    auth: {},
}));

// Mock signOut to return a Promise so we can await it or wait for side effects
vi.mock('firebase/auth', () => ({
    signOut: vi.fn(() => Promise.resolve()),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('Header', () => {
    const mockUser = { uid: '123', email: 'test@example.com' } as unknown as User;

    it('renders logo and basic links', () => {
        render(
            <BrowserRouter>
                <Header user={null} />
            </BrowserRouter>
        );
        expect(screen.getByText(/XWEGBE/i)).toBeInTheDocument();
        expect(screen.getByText('BETA')).toBeInTheDocument();
        expect(screen.getAllByText(/Apply Now/i)[0]).toBeInTheDocument();
    });

    it('renders login link when logged out', () => {
        render(
            <BrowserRouter>
                <Header user={null} />
            </BrowserRouter>
        );
        const links = screen.getAllByRole('link');
        const loginLink = links.find(l => l.getAttribute('href') === '/login');
        expect(loginLink).toBeInTheDocument();
    });

    it('renders dashboard and logout when logged in', () => {
        render(
            <BrowserRouter>
                <Header user={mockUser} />
            </BrowserRouter>
        );
        expect(screen.getAllByText(/Dashboard/i)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/Logout/i)[0]).toBeInTheDocument();
    });

    it('toggles mobile menu', () => {
        render(
            <BrowserRouter>
                <Header user={mockUser} />
            </BrowserRouter>
        );
        const burger = screen.getByText('☰');
        fireEvent.click(burger);
        expect(screen.getByText('✕')).toBeInTheDocument();
        expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('calls logout when logout button clicked', async () => {
        render(
            <BrowserRouter>
                <Header user={mockUser} />
            </BrowserRouter>
        );
        const logoutBtns = screen.getAllByText('Logout');
        fireEvent.click(logoutBtns[0]);

        expect(auth.signOut).toHaveBeenCalled();

        // Wait for the navigation to happen after the async signOut
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });
});
