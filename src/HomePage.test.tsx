import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HomePage } from './HomePage';
import { MemoryRouter } from 'react-router-dom';

// Mock Listings component
vi.mock('./Listings.tsx', () => ({
  Listings: ({ limit }: { limit?: number }) => <div data-testid="listings">Listings Component {limit ? `Limit: ${limit}` : ''}</div>
}));

describe('HomePage', () => {
  it('renders navbar links', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText('🏠 RentApp')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getAllByText('Listings').length).toBeGreaterThan(0); // In navbar and hero/body
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('renders hero section', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Find Your Perfect Home')).toBeInTheDocument();
    expect(screen.getByText('View Available Units')).toBeInTheDocument();
  });

  it('renders featured listings', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Featured Properties')).toBeInTheDocument();
    expect(screen.getByTestId('listings')).toHaveTextContent('Limit: 3');
    expect(screen.getByText('View All Listings')).toBeInTheDocument();
  });

  it('renders call to action', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Ready to Move In?')).toBeInTheDocument();
    expect(screen.getByText('Start Application')).toBeInTheDocument();
  });

  it('renders contact info', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Contact Us')).toBeInTheDocument();
    expect(screen.getByText('Visit Our Office')).toBeInTheDocument();
    expect(screen.getByText('Call Us')).toBeInTheDocument();
    expect(screen.getByText('Email Us')).toBeInTheDocument();
  });
});
