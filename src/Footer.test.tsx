import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';
import { MemoryRouter } from 'react-router-dom';

describe('Footer', () => {
    it('renders all four columns', () => {
        render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        );

        expect(screen.getByText('Contact Us')).toBeInTheDocument();
        expect(screen.getByText('Office Hours')).toBeInTheDocument();
        expect(screen.getByText('Quick Links')).toBeInTheDocument();
        expect(screen.getByText('About')).toBeInTheDocument();
    });

    it('renders company info', () => {
        render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        );

        expect(screen.getByText('Xwegbe Vivi')).toBeInTheDocument();
    });

    it('renders quick links with correct hrefs', () => {
        render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        );

        const links = screen.getAllByRole('link');
        const loginLinks = links.filter(l => l.getAttribute('href') === '/login');
        const listingsLinks = links.filter(l => l.getAttribute('href') === '/listings');
        const applyLinks = links.filter(l => l.getAttribute('href') === '/apply');

        expect(loginLinks.length).toBeGreaterThanOrEqual(1);
        expect(listingsLinks.length).toBeGreaterThanOrEqual(1);
        expect(applyLinks.length).toBeGreaterThanOrEqual(1);
    });

    it('renders phone link', () => {
        render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        );

        const phoneLink = screen.getByRole('link', { name: /229/i });
        expect(phoneLink).toHaveAttribute('href', 'tel:+22990000000');
    });

    it('renders copyright with current year', () => {
        render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        );

        const year = new Date().getFullYear().toString();
        expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
    });

    it('renders office hours', () => {
        render(
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        );

        expect(screen.getByText(/Mon.*Fri/i)).toBeInTheDocument();
    });
});
