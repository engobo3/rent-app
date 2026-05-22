import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { Listings } from './Listings';
import { MemoryRouter } from 'react-router-dom';
import * as firestore from 'firebase/firestore';

// Mock firebase
vi.mock('./firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
  getFirestore: vi.fn(),
}));

describe('Listings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading initially', () => {
    (firestore.getDocs as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => { })); // Never resolves
    render(<Listings />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders no listings message when empty', async () => {
    (firestore.getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ docs: [] });
    render(<Listings />);
    await waitFor(() => {
      expect(screen.getByText(/No units currently available/i)).toBeInTheDocument();
    });
  });

  it('renders listings correctly', async () => {
    const mockListings = [
      {
        id: '1',
        data: () => ({
          title: 'Cozy Apartment',
          rent: 100000,
          description: 'A nice place',
          unit: '101',
          photoUrl: 'http://example.com/photo.jpg',
          available: true
        })
      },
      {
        id: '2',
        data: () => ({
          title: 'Big House',
          rent: 200000,
          description: 'A bigger place',
          unit: '102',
          available: true
        })
      }
    ];

    (firestore.getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ docs: mockListings });

    render(
      <MemoryRouter>
        <Listings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Cozy Apartment')).toBeInTheDocument();
      expect(screen.getByText('100,000 CFA')).toBeInTheDocument();
      expect(screen.getByText('Big House')).toBeInTheDocument();
      expect(screen.getByText('200,000 CFA')).toBeInTheDocument();
    });
  });

  it('applies limit if provided', async () => {
    (firestore.getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ docs: [] });
    render(<Listings limit={3} />);

    await waitFor(() => {
      expect(firestore.limit).toHaveBeenCalledWith(3);
    });
  });

  it('renders Apply Now links with correct query params', async () => {
    const mockListings = [
      {
        id: 'listing1',
        data: () => ({
          title: 'Test Unit',
          rent: 50000,
          description: 'Test',
          unit: '201',
          ownerId: 'owner1',
          propertyId: 'prop1',
          available: true
        })
      }
    ];

    (firestore.getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ docs: mockListings });

    render(
      <MemoryRouter>
        <Listings />
      </MemoryRouter>
    );

    await waitFor(() => {
      const applyLink = screen.getByText('Apply Now');
      expect(applyLink).toHaveAttribute('href', expect.stringContaining('unit=201'));
      expect(applyLink).toHaveAttribute('href', expect.stringContaining('ownerId=owner1'));
    });
  });

  it('shows No Photo text when listing has no photoUrl', async () => {
    const mockListings = [
      {
        id: '1',
        data: () => ({
          title: 'No Photo Unit',
          rent: 30000,
          description: 'No photo',
          unit: '301',
          available: true
        })
      }
    ];

    (firestore.getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ docs: mockListings });

    render(
      <MemoryRouter>
        <Listings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No Photo')).toBeInTheDocument();
    });
  });

  it('renders listing descriptions', async () => {
    const mockListings = [
      {
        id: '1',
        data: () => ({
          title: 'Nice Place',
          rent: 40000,
          description: 'Spacious 2-bedroom apartment',
          unit: '401',
          available: true
        })
      }
    ];

    (firestore.getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ docs: mockListings });

    render(
      <MemoryRouter>
        <Listings />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Spacious 2-bedroom apartment')).toBeInTheDocument();
    });
  });

  it('handles fetch error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (firestore.getDocs as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    render(<Listings />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('renders listing with photo background when photoUrl is present', async () => {
    const mockListings = [
      {
        id: '1',
        data: () => ({
          title: 'Photo Unit',
          rent: 80000,
          description: 'Has a photo',
          unit: '501',
          photoUrl: 'http://example.com/photo.jpg',
          available: true
        })
      }
    ];

    (firestore.getDocs as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ docs: mockListings });

    render(
      <MemoryRouter>
        <Listings />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Photo exists so "No Photo" text should NOT be shown
      expect(screen.queryByText('No Photo')).not.toBeInTheDocument();
      expect(screen.getByText('Photo Unit')).toBeInTheDocument();
    });
  });
});
