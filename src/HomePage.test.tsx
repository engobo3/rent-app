import { render, screen } from '@testing-library/react';
import { HomePage } from './HomePage';
import { MemoryRouter } from 'react-router-dom';

describe('HomePage', () => {
  it('renders hero section with new branding', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Xwegbe Vivi/i)).toBeInTheDocument();
    expect(screen.getByText(/Enjoy A Place With More Space/i)).toBeInTheDocument();
  });

  it('renders intro section', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Comfortable Living in Ekpe')).toBeInTheDocument();
  });

  it('renders amenities placeholders', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Secure')).toBeInTheDocument();
    expect(screen.getByText('Near the Beach')).toBeInTheDocument();
    expect(screen.getByText('Reliable Power')).toBeInTheDocument();
  });

  it('renders call to action section', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Find Your New Home')).toBeInTheDocument();
  });

  it('renders location section', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Ekpe, Benin')).toBeInTheDocument();
  });

  it('renders Apply Now CTA link', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    const applyLinks = screen.getAllByText(/Apply Now/i);
    expect(applyLinks.length).toBeGreaterThan(0);
  });

  it('renders View Listings link', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    const viewLinks = screen.getAllByText(/View.*Listings|Browse/i);
    expect(viewLinks.length).toBeGreaterThan(0);
  });

  it('renders scroll indicator arrow', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText('↓')).toBeInTheDocument();
  });
});
