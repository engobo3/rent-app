import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { TenantPortal } from './TenantPortal';
import type { Tenant } from './types';
import * as firestore from 'firebase/firestore';

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
    doc: vi.fn(),
    arrayUnion: vi.fn(),
    getFirestore: vi.fn(),
}));

// Mock child components
vi.mock('./PaymentModal', () => ({ PaymentModal: () => <div>PaymentModal Component</div> }));
vi.mock('./MobileMoneyModal', () => ({ MobileMoneyModal: () => <div>MobileMoneyModal Component</div> }));

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
        // Default mock for onSnapshot to return empty list
        (firestore.onSnapshot as ReturnType<typeof vi.fn>).mockImplementation((_query: unknown, callback: (snapshot: { docs: unknown[] }) => void) => {
            callback({ docs: [] });
            return vi.fn();
        });
    });

    it('renders welcome message and balance', () => {
        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);

        expect(screen.getByText(/Welcome/)).toBeInTheDocument();
        expect(screen.getByText(/500 CFA/)).toBeInTheDocument();
    });

    it('shows paid status when balance is 0', () => {
        const paidTenant = { ...mockTenant, balance: 0 };
        render(<TenantPortal tenant={paidTenant} onLogout={mockOnLogout} />);

        expect(screen.getByText('Paid in Full')).toBeInTheDocument();
    });

    it('opens repair form and submits', async () => {
        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);

        fireEvent.click(screen.getByText('Request Repair'));
        expect(screen.getByText('New Repair Request')).toBeInTheDocument();

        const textArea = screen.getByLabelText('Describe the issue'); // Will fail if no label match, let's check accessibility in code
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

        expect(screen.getByText('Leaky faucet')).toBeInTheDocument();
        expect(screen.getByText('Broken door')).toBeInTheDocument();
    });

    it('logs out', () => {
        render(<TenantPortal tenant={mockTenant} onLogout={mockOnLogout} />);
        fireEvent.click(screen.getByText('Logout'));
        expect(mockOnLogout).toHaveBeenCalled();
    });
});
