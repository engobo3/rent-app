import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { TenantPortal } from './TenantPortal';
import type { Tenant } from './types';
import * as firestore from 'firebase/firestore';
import toast from 'react-hot-toast';

// Mock firebase
vi.mock('./firebase', () => ({
    db: {},
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(() => 'mock-collection'),
    query: vi.fn(),
    where: vi.fn(),
    onSnapshot: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    doc: vi.fn(),
    arrayUnion: vi.fn(),
    arrayRemove: vi.fn(),
    getFirestore: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
    Toaster: () => null,
}));

// Mock child components
vi.mock('./PaymentModal', () => ({ PaymentModal: () => <div>PaymentModal Component</div> }));
vi.mock('./MobileMoneyModal', () => ({ MobileMoneyModal: () => <div>MobileMoneyModal Component</div> }));
vi.mock('./SignaturePad', () => ({
    SignaturePad: ({ onSign, onCancel }: { onSign: (data: string) => void; onCancel: () => void }) => (
        <div data-testid="signature-pad">
            <button onClick={() => onSign('data:image/png;base64,mock')}>Mock Sign</button>
            <button onClick={onCancel}>Mock Cancel</button>
        </div>
    ),
}));

describe('TenantPortal', () => {
    const mockTenant = {
        id: 't1',
        ownerId: 'owner1',
        name: 'Tenant Name',
        email: 'tenant@example.com',
        unit: '101',
        phone: '1234567890',
        monthlyRent: 1000,
        balance: 500,
        payments: [],
        leaseUrl: 'http://example.com/lease.pdf',
        propertyPhotoUrl: 'http://example.com/photo.jpg'
    } as unknown as Tenant;

    const mockOnLogout = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock: onSnapshot for repairs returns empty list
        (firestore.onSnapshot as ReturnType<typeof vi.fn>).mockImplementation((_query: unknown, callback: (snapshot: { docs: unknown[] }) => void) => {
            callback({ docs: [] });
            return vi.fn();
        });
    });

    // Helper to switch tabs
    function switchTab(tabName: string) {
        fireEvent.click(screen.getByRole('button', { name: new RegExp(tabName) }));
    }

    // ─── Profile card (always visible) ──────────────────────────────────────

    it('renders profile card with tenant name, unit, and balance', () => {
        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);

        expect(screen.getAllByText('Tenant Name').length).toBeGreaterThan(0);
        expect(screen.getByText('101')).toBeInTheDocument();
        expect(screen.getAllByText(/500 CFA/).length).toBeGreaterThan(0);
    });

    it('renders welcome message', () => {
        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);
        expect(screen.getByText(/Welcome/)).toBeInTheDocument();
    });

    it('shows paid status when balance is 0', () => {
        const paidTenant = { ...mockTenant, balance: 0 };
        render(<TenantPortal tenant={paidTenant} onLogout={mockOnLogout} />);

        expect(screen.getAllByText('Paid in Full').length).toBeGreaterThan(0);
    });

    it('shows Owes badge when balance > 0', () => {
        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);
        expect(screen.getByText('Owes')).toBeInTheDocument();
    });

    it('shows Paid badge when balance is 0', () => {
        const paidTenant = { ...mockTenant, balance: 0 };
        render(<TenantPortal tenant={paidTenant} onLogout={mockOnLogout} />);
        expect(screen.getByText('Paid')).toBeInTheDocument();
    });

    it('logs out', () => {
        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);
        fireEvent.click(screen.getByText('Logout'));
        expect(mockOnLogout).toHaveBeenCalled();
    });

    // ─── Tab navigation ─────────────────────────────────────────────────────

    it('renders all three tabs', () => {
        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);

        expect(screen.getByRole('button', { name: /Payments/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Repairs/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Documents/ })).toBeInTheDocument();
    });

    it('defaults to Payments tab', () => {
        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);

        expect(screen.getByText('Payment History')).toBeInTheDocument();
    });

    it('switches to Repairs tab', () => {
        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);

        switchTab('Repairs');
        expect(screen.getByText('Request Repair')).toBeInTheDocument();
        expect(screen.getByText('My Repair Requests')).toBeInTheDocument();
    });

    it('switches to Documents tab', () => {
        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);

        switchTab('Documents');
        expect(screen.getByText('Lease Agreement')).toBeInTheDocument();
    });

    // ─── Payments tab ───────────────────────────────────────────────────────

    it('disables payment buttons when no amount entered', () => {
        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);

        const cardBtn = screen.getByText('Pay with Card');
        const mobileBtn = screen.getByText('Mobile Money');
        expect(cardBtn).toBeDisabled();
        expect(mobileBtn).toBeDisabled();
    });

    it('enables payment buttons when valid amount entered', () => {
        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);

        const amountInput = screen.getByPlaceholderText('500');
        fireEvent.change(amountInput, { target: { value: '200' } });

        const cardBtn = screen.getByText('Pay with Card');
        const mobileBtn = screen.getByText('Mobile Money');
        expect(cardBtn).not.toBeDisabled();
        expect(mobileBtn).not.toBeDisabled();
    });

    it('fills full balance when Pay Full button clicked', () => {
        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);

        fireEvent.click(screen.getByText('Pay Full'));

        const amountInput = screen.getByPlaceholderText('500') as HTMLInputElement;
        expect(amountInput.value).toBe('500');
    });

    it('prevents payment when amount exceeds balance', () => {
        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);

        const amountInput = screen.getByPlaceholderText(mockTenant.balance.toLocaleString());
        fireEvent.change(amountInput, { target: { value: '999999' } });

        const cardBtn = screen.getByText('Pay with Card');
        expect(cardBtn).toBeDisabled();
    });

    it('displays payment history with payments', () => {
        const tenantWithPayments = {
            ...mockTenant,
            payments: [
                { id: 1707000000000, amount: 50000, date: '2/4/2024', method: 'Cash/Check' },
                { id: 1704300000000, amount: 30000, date: '1/3/2024', method: 'Mobile Money' }
            ]
        } as unknown as Tenant;

        render(<TenantPortal tenant={tenantWithPayments} onLogout={mockOnLogout} />);

        expect(screen.getByText('Payment History')).toBeInTheDocument();
        expect(screen.getByText('+50,000 CFA')).toBeInTheDocument();
        expect(screen.getByText('+30,000 CFA')).toBeInTheDocument();
        expect(screen.getByText('Cash/Check')).toBeInTheDocument();
        expect(screen.getAllByText('Mobile Money').length).toBeGreaterThan(0);
    });

    it('shows no payments message when empty', () => {
        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);

        expect(screen.getByText('Payment History')).toBeInTheDocument();
        expect(screen.getByText('No payments recorded yet.')).toBeInTheDocument();
    });

    it('displays payment history sorted newest first', () => {
        const tenantWithPayments = {
            ...mockTenant,
            payments: [
                { id: 1704300000000, amount: 30000, date: '1/3/2024', method: 'Cash/Check' },
                { id: 1707000000000, amount: 50000, date: '2/4/2024', method: 'Mobile Money' },
            ]
        } as unknown as Tenant;

        render(<TenantPortal tenant={tenantWithPayments} onLogout={mockOnLogout} />);

        const amounts = screen.getAllByText(/\+[\d,]+ CFA/);
        // Newest first: +50,000 should come before +30,000
        expect(amounts[0]).toHaveTextContent('+50,000 CFA');
        expect(amounts[1]).toHaveTextContent('+30,000 CFA');
    });

    it('cancels a payment when cancel button is clicked', async () => {
        const tenantWithPayments = {
            ...mockTenant,
            balance: 20000,
            payments: [
                { id: 1707000000000, amount: 30000, date: '2/4/2024', method: 'Cash/Check' }
            ]
        } as unknown as Tenant;

        window.confirm = vi.fn(() => true);

        render(<TenantPortal tenant={tenantWithPayments} onLogout={mockOnLogout} />);

        const cancelBtns = screen.getAllByText('Cancel');
        fireEvent.click(cancelBtns[0]);

        await waitFor(() => {
            expect(firestore.updateDoc).toHaveBeenCalled();
            const callArgs = (firestore.updateDoc as ReturnType<typeof vi.fn>).mock.calls[0];
            expect(callArgs[1]).toMatchObject({ balance: 50000 });
        });
    });

    it('shows error toast when payment cancel fails', async () => {
        (firestore.updateDoc as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Firestore write failed'));
        window.confirm = vi.fn(() => true);

        const tenantWithPayments = {
            ...mockTenant,
            balance: 20000,
            payments: [
                { id: 1707000000000, amount: 30000, date: '2/4/2024', method: 'Cash/Check' }
            ]
        } as unknown as Tenant;

        render(<TenantPortal tenant={tenantWithPayments} onLogout={mockOnLogout} />);

        const cancelBtns = screen.getAllByText('Cancel');
        fireEvent.click(cancelBtns[0]);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalled();
        });
    });

    // ─── Repairs tab ────────────────────────────────────────────────────────

    it('opens repair form and submits', async () => {
        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);

        switchTab('Repairs');
        fireEvent.click(screen.getByText('Request Repair'));
        expect(screen.getByText('New Repair Request')).toBeInTheDocument();

        const textArea = screen.getByLabelText('Describe the issue');
        fireEvent.change(textArea, { target: { value: 'Broken window' } });

        fireEvent.click(screen.getByText('Submit Request'));

        await waitFor(() => {
            expect(firestore.addDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    issue: 'Broken window',
                    tenantId: 't1',
                    status: 'Open'
                })
            );
        });
    });

    it('renders repair list', () => {
        const mockRepairs = [
            { id: 'r1', data: () => ({ issue: 'Leaky faucet', status: 'Open', dateReported: '1/1/2026', priority: 'Low' }) },
            { id: 'r2', data: () => ({ issue: 'Broken door', status: 'Resolved', dateReported: '12/12/2025', priority: 'High' }) }
        ];

        (firestore.onSnapshot as ReturnType<typeof vi.fn>).mockImplementation((_query: unknown, callback: (snapshot: { docs: unknown[] }) => void) => {
            callback({ docs: mockRepairs });
            return vi.fn();
        });

        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);

        switchTab('Repairs');
        expect(screen.getByText('Leaky faucet')).toBeInTheDocument();
        expect(screen.getByText('Broken door')).toBeInTheDocument();
    });

    it('cancels an open repair request', async () => {
        const mockRepairs = [
            { id: 'r1', data: () => ({ issue: 'Leaky faucet', status: 'Open', dateReported: '1/1/2026', priority: 'Low' }) }
        ];

        (firestore.onSnapshot as ReturnType<typeof vi.fn>).mockImplementation((_query: unknown, callback: (snapshot: { docs: unknown[] }) => void) => {
            callback({ docs: mockRepairs });
            return vi.fn();
        });

        window.confirm = vi.fn(() => true);

        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);

        switchTab('Repairs');
        expect(screen.getByText('Leaky faucet')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Cancel'));

        await waitFor(() => {
            expect(firestore.deleteDoc).toHaveBeenCalled();
        });
    });

    it('shows error toast when repair submission fails', async () => {
        (firestore.addDoc as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);

        switchTab('Repairs');
        fireEvent.click(screen.getByText('Request Repair'));
        const textArea = screen.getByLabelText('Describe the issue');
        fireEvent.change(textArea, { target: { value: 'Broken pipe' } });
        fireEvent.click(screen.getByText('Submit Request'));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalled();
        });
    });

    it('shows open repairs badge on tab', () => {
        const mockRepairs = [
            { id: 'r1', data: () => ({ issue: 'Leak', status: 'Open', dateReported: '1/1/2026', priority: 'Low' }) },
            { id: 'r2', data: () => ({ issue: 'Crack', status: 'Resolved', dateReported: '1/2/2026', priority: 'Medium' }) },
        ];

        (firestore.onSnapshot as ReturnType<typeof vi.fn>).mockImplementation((_query: unknown, callback: (snapshot: { docs: unknown[] }) => void) => {
            callback({ docs: mockRepairs });
            return vi.fn();
        });

        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);

        // Badge showing count of open repairs (1 open out of 2)
        const repairsTab = screen.getByRole('button', { name: /Repairs/ });
        expect(repairsTab).toHaveTextContent('1');
    });

    // ─── Documents tab ──────────────────────────────────────────────────────

    it('opens sign lease pad when lease is available but unsigned', () => {
        const tenantWithLease = {
            ...mockTenant,
            leaseUrl: 'http://example.com/lease.pdf',
            leaseSignature: undefined,
        } as unknown as Tenant;

        render(<TenantPortal tenant={tenantWithLease} onLogout={mockOnLogout} />);

        switchTab('Documents');
        fireEvent.click(screen.getByText('Sign Lease'));

        expect(screen.getByTestId('signature-pad')).toBeInTheDocument();
    });

    it('submits lease signature and calls updateDoc', async () => {
        (firestore.updateDoc as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

        const tenantWithLease = {
            ...mockTenant,
            leaseUrl: 'http://example.com/lease.pdf',
            leaseSignature: undefined,
        } as unknown as Tenant;

        render(<TenantPortal tenant={tenantWithLease} onLogout={mockOnLogout} />);

        switchTab('Documents');
        fireEvent.click(screen.getByText('Sign Lease'));
        fireEvent.click(screen.getByText('Mock Sign'));

        await waitFor(() => {
            expect(firestore.updateDoc).toHaveBeenCalled();
            const callArgs = (firestore.updateDoc as ReturnType<typeof vi.fn>).mock.calls[0];
            expect(callArgs[1]).toMatchObject({
                leaseSignature: 'data:image/png;base64,mock',
            });
            expect(toast.success).toHaveBeenCalled();
        });
    });

    it('shows no lease message when lease is not uploaded', () => {
        const tenantNoLease = {
            ...mockTenant,
            leaseUrl: undefined,
            leaseSignature: undefined,
        } as unknown as Tenant;

        render(<TenantPortal tenant={tenantNoLease} onLogout={mockOnLogout} />);

        switchTab('Documents');
        expect(screen.getByText('No lease uploaded yet. Contact your landlord.')).toBeInTheDocument();
        expect(screen.getByText('No Lease Available')).toBeInTheDocument();
    });
});
