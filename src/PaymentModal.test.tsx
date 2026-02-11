import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { PaymentModal } from './PaymentModal';
import * as functions from 'firebase/functions';

// Mock firebase
vi.mock('./firebase', () => ({
  functions: {},
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
  getFunctions: vi.fn(),
}));

// Mock Stripe
const mockStripe = {
  confirmPayment: vi.fn(),
};

const mockElements = {
  getElement: vi.fn(),
};

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PaymentElement: () => <div data-testid="payment-element">Payment Element</div>,
  useStripe: () => mockStripe,
  useElements: () => mockElements,
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({})),
}));

describe('PaymentModal', () => {
  const defaultProps = {
    amount: 5000,
    tenantId: 't1',
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock creating payment intent
    (functions.httpsCallable as ReturnType<typeof vi.fn>).mockReturnValue(async () => ({
      data: { clientSecret: 'test_secret' }
    }));
  });

  it('loads client secret and renders form', async () => {
    render(<PaymentModal {...defaultProps} />);

    expect(screen.getByText('Loading secure payment...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Card Payment')).toBeInTheDocument();
    });

    expect(screen.getByTestId('payment-element')).toBeInTheDocument();
    expect(screen.getByText('Pay 5000 CFA')).toBeInTheDocument();
  });

  it('handles payment submission success', async () => {
    mockStripe.confirmPayment.mockResolvedValue({ error: undefined }); // Success

    render(<PaymentModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Pay 5000 CFA')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Pay 5000 CFA'));

    await waitFor(() => {
      expect(mockStripe.confirmPayment).toHaveBeenCalled();
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  it('handles payment submission error', async () => {
    mockStripe.confirmPayment.mockResolvedValue({ error: { message: 'Card declined' } });

    render(<PaymentModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Pay 5000 CFA')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Pay 5000 CFA'));

    await waitFor(() => {
      expect(screen.getByText('Card declined')).toBeInTheDocument();
      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });
  });
});
