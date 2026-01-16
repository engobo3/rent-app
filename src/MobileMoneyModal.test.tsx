import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MobileMoneyModal } from './MobileMoneyModal';

// Mock fedapay-reactjs
vi.mock('fedapay-reactjs', () => ({
  FedaCheckoutButton: ({ options }: { options: any }) => (
    <button onClick={() => options.onComplete({ reason: 'TRANSACTION_APPROVED' })}>
      Mock FedaPay Button
    </button>
  ),
}));

describe('MobileMoneyModal', () => {
    const defaultProps = {
        amount: 5000,
        tenantId: 't1',
        onSuccess: vi.fn(),
        onCancel: vi.fn(),
    };

    it('renders correct amount', () => {
        render(<MobileMoneyModal {...defaultProps} />);
        expect(screen.getByText(/Amount to Pay:/)).toHaveTextContent('5,000 CFA');
    });

    it('calls onSuccess when payment completes', () => {
        render(<MobileMoneyModal {...defaultProps} />);

        fireEvent.click(screen.getByText('Mock FedaPay Button'));

        expect(defaultProps.onSuccess).toHaveBeenCalled();
    });

    it('calls onCancel when close button clicked', () => {
        render(<MobileMoneyModal {...defaultProps} />);

        fireEvent.click(screen.getByText('×'));

        expect(defaultProps.onCancel).toHaveBeenCalled();
    });
});
