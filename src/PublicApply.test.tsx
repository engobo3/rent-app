import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { PublicApply } from './PublicApply';
import { MemoryRouter } from 'react-router-dom';
import * as firestore from 'firebase/firestore';

// Mock firebase
vi.mock('./firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'mock-collection'),
  addDoc: vi.fn(),
  getFirestore: vi.fn(),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => null,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as object,
    useNavigate: () => mockNavigate,
  };
});

describe('PublicApply', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders application form', () => {
    render(
      <MemoryRouter>
        <PublicApply />
      </MemoryRouter>
    );

    expect(screen.getByText('Rental Application')).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Annual Income (CFA)')).toBeInTheDocument();
    expect(screen.getByLabelText('Desired Unit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit application/i })).toBeInTheDocument();
  });

  it('pre-fills unit from URL params', () => {
    render(
      <MemoryRouter initialEntries={['/apply?unit=123']}>
        <PublicApply />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('Desired Unit')).toHaveValue('123');
  });

  it('submits form successfully', async () => {
    (firestore.addDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: 'new-app-id' });
    const toast = await import('react-hot-toast');

    render(
      <MemoryRouter>
        <PublicApply />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '555-1234' } });
    fireEvent.change(screen.getByLabelText('Annual Income (CFA)'), { target: { value: '50000' } });
    fireEvent.change(screen.getByLabelText('Desired Unit'), { target: { value: 'Unit 101' } });

    fireEvent.click(screen.getByRole('button', { name: /submit application/i }));

    await waitFor(() => {
      expect(firestore.addDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        income: 50000,
        desiredUnit: 'Unit 101',
        status: 'pending',
        date: expect.any(String)
      }));
      expect(toast.default.success).toHaveBeenCalledWith('Application submitted successfully!');
      // Navigate is called after timeout
    });
  });

  it('handles submission error', async () => {
    (firestore.addDoc as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Database error'));
    const toast = await import('react-hot-toast');

    render(
      <MemoryRouter>
        <PublicApply />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '555-1234' } });
    fireEvent.change(screen.getByLabelText('Annual Income (CFA)'), { target: { value: '50000' } });
    fireEvent.change(screen.getByLabelText('Desired Unit'), { target: { value: 'Unit 101' } });

    fireEvent.click(screen.getByRole('button', { name: /submit application/i }));

    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith(expect.stringContaining('Submission failed'));
    });
  });
});
