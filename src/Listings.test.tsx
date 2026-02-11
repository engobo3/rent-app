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
});
