import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AdminDashboard } from './AdminDashboard';
import * as firestore from 'firebase/firestore';
import type { User } from 'firebase/auth';

vi.mock('./firebase', () => ({
    db: {},
}));

vi.mock('firebase/firestore', () => ({
    collection: vi.fn(() => 'mock-collection'),
    getDocs: vi.fn(),
    addDoc: vi.fn(),
    deleteDoc: vi.fn(),
    doc: vi.fn(),
    getFirestore: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
    Toaster: () => null,
}));

describe('AdminDashboard', () => {
    const mockUser = { uid: 'admin1', email: 'admin@example.com' } as unknown as User;
    const mockOnLogout = vi.fn();

    const mockProperties = {
        docs: [
            { id: 'p1', data: () => ({ name: 'Sunset Apartments', address: '123 Main St', ownerId: 'l1' }) },
            { id: 'p2', data: () => ({ name: 'Ocean View', address: '456 Beach Rd', ownerId: 'l2' }) },
        ]
    };

    const mockTenants = {
        docs: [
            { id: 't1', data: () => ({ name: 'Tenant A', monthlyRent: 50000, balance: 10000, payments: [{ amount: 40000 }] }) },
            { id: 't2', data: () => ({ name: 'Tenant B', monthlyRent: 60000, balance: 0, payments: [{ amount: 60000 }, { amount: 60000 }] }) },
        ]
    };

    const mockUsers = {
        docs: [
            { id: 'l1', data: () => ({ uid: 'l1', role: 'landlord', displayName: 'Landlord One', email: 'l1@test.com', createdAt: '2025-01-01T00:00:00Z' }) },
            { id: 'l2', data: () => ({ uid: 'l2', role: 'landlord', displayName: 'Landlord Two', email: 'l2@test.com', createdAt: '2025-06-01T00:00:00Z' }) },
            { id: 't1', data: () => ({ uid: 't1', role: 'tenant', displayName: 'Tenant User', email: 'tenant@test.com', createdAt: '2025-03-01T00:00:00Z' }) },
        ]
    };

    // Helper to click a tab by exact text, handling duplicates
    const clickTab = (name: string) => {
        const matches = screen.getAllByText(name);
        fireEvent.click(matches[0]); // tabs render first in the DOM
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // getDocs is called 3 times: properties, tenants, users
        (firestore.getDocs as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce(mockProperties)
            .mockResolvedValueOnce(mockTenants)
            .mockResolvedValueOnce(mockUsers);
    });

    it('renders admin header with user email', async () => {
        render(<AdminDashboard user={mockUser} onLogout={mockOnLogout} />);
        await waitFor(() => {
            expect(screen.getByText('admin@example.com')).toBeInTheDocument();
        });
    });

    it('renders all three tabs', async () => {
        render(<AdminDashboard user={mockUser} onLogout={mockOnLogout} />);
        await waitFor(() => {
            expect(screen.getByText('Overview')).toBeInTheDocument();
            // "Properties" exact match — only matches the tab, not "Total Properties"
            expect(screen.getByText('Properties')).toBeInTheDocument();
            // "Landlords" matches both the tab and the overview card, use getAllByText
            expect(screen.getAllByText('Landlords').length).toBeGreaterThanOrEqual(1);
        });
    });

    it('displays overview statistics', async () => {
        render(<AdminDashboard user={mockUser} onLogout={mockOnLogout} />);
        await waitFor(() => {
            // totalRevenue = 40000 + 60000 + 60000 = 160,000
            expect(screen.getByText('160,000 CFA')).toBeInTheDocument();
            // totalProperties and totalTenants both = 2, so multiple "2" elements
            const twos = screen.getAllByText('2');
            expect(twos.length).toBeGreaterThanOrEqual(2);
        });
    });

    it('calls onLogout when logout clicked', async () => {
        render(<AdminDashboard user={mockUser} onLogout={mockOnLogout} />);
        fireEvent.click(screen.getByText('Logout'));
        expect(mockOnLogout).toHaveBeenCalled();
    });

    it('navigates to properties tab and shows property list', async () => {
        render(<AdminDashboard user={mockUser} onLogout={mockOnLogout} />);
        await waitFor(() => {
            expect(screen.getByText('160,000 CFA')).toBeInTheDocument();
        });

        clickTab('Properties');

        await waitFor(() => {
            expect(screen.getByText('Sunset Apartments')).toBeInTheDocument();
            expect(screen.getByText('123 Main St')).toBeInTheDocument();
            expect(screen.getByText('Ocean View')).toBeInTheDocument();
            expect(screen.getByText('456 Beach Rd')).toBeInTheDocument();
        });
    });

    it('shows landlord name badge on property cards', async () => {
        render(<AdminDashboard user={mockUser} onLogout={mockOnLogout} />);
        await waitFor(() => {
            expect(screen.getByText('160,000 CFA')).toBeInTheDocument();
        });

        clickTab('Properties');

        await waitFor(() => {
            expect(screen.getByText('Landlord One')).toBeInTheDocument();
            expect(screen.getByText('Landlord Two')).toBeInTheDocument();
        });
    });

    it('opens add property form and submits', async () => {
        (firestore.addDoc as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-prop' });
        const toast = await import('react-hot-toast');

        render(<AdminDashboard user={mockUser} onLogout={mockOnLogout} />);
        await waitFor(() => {
            expect(screen.getByText('160,000 CFA')).toBeInTheDocument();
        });

        clickTab('Properties');

        await waitFor(() => {
            expect(screen.getByText('+ Add Property')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('+ Add Property'));

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Property Name/i)).toBeInTheDocument();
        });

        fireEvent.change(screen.getByPlaceholderText(/Property Name/i), { target: { value: 'New Complex' } });
        fireEvent.change(screen.getByPlaceholderText('Address'), { target: { value: '789 New Ave' } });

        // Select a landlord
        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'l1' } });

        const submitBtn = screen.getAllByRole('button', { name: /add property/i }).find(btn => btn.getAttribute('type') === 'submit')!;
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(firestore.addDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    name: 'New Complex',
                    address: '789 New Ave',
                    ownerId: 'l1',
                })
            );
            expect(toast.default.success).toHaveBeenCalled();
        });
    });

    it('deletes a property with confirmation', async () => {
        window.confirm = vi.fn(() => true);
        const toast = await import('react-hot-toast');

        render(<AdminDashboard user={mockUser} onLogout={mockOnLogout} />);
        await waitFor(() => {
            expect(screen.getByText('160,000 CFA')).toBeInTheDocument();
        });

        clickTab('Properties');

        await waitFor(() => {
            expect(screen.getByText('Sunset Apartments')).toBeInTheDocument();
        });

        const deleteBtns = screen.getAllByText('Delete');
        fireEvent.click(deleteBtns[0]);

        await waitFor(() => {
            expect(window.confirm).toHaveBeenCalled();
            expect(firestore.deleteDoc).toHaveBeenCalled();
            expect(toast.default.success).toHaveBeenCalled();
        });
    });

    it('does not delete property when confirm is cancelled', async () => {
        window.confirm = vi.fn(() => false);

        render(<AdminDashboard user={mockUser} onLogout={mockOnLogout} />);
        await waitFor(() => {
            expect(screen.getByText('160,000 CFA')).toBeInTheDocument();
        });

        clickTab('Properties');

        await waitFor(() => {
            expect(screen.getByText('Sunset Apartments')).toBeInTheDocument();
        });

        const deleteBtns = screen.getAllByText('Delete');
        fireEvent.click(deleteBtns[0]);

        expect(firestore.deleteDoc).not.toHaveBeenCalled();
    });

    it('navigates to landlords tab and shows landlord table', async () => {
        render(<AdminDashboard user={mockUser} onLogout={mockOnLogout} />);
        await waitFor(() => {
            expect(screen.getByText('160,000 CFA')).toBeInTheDocument();
        });

        clickTab('Landlords');

        await waitFor(() => {
            // Landlord names appear in both desktop table and mobile card layout
            expect(screen.getAllByText('Landlord One').length).toBeGreaterThanOrEqual(1);
            expect(screen.getAllByText('l1@test.com').length).toBeGreaterThanOrEqual(1);
            expect(screen.getAllByText('Landlord Two').length).toBeGreaterThanOrEqual(1);
            expect(screen.getAllByText('l2@test.com').length).toBeGreaterThanOrEqual(1);
        });
    });

    it('shows empty properties message when none exist', async () => {
        (firestore.getDocs as ReturnType<typeof vi.fn>)
            .mockReset()
            .mockResolvedValueOnce({ docs: [] })    // properties
            .mockResolvedValueOnce({ docs: [] })     // tenants
            .mockResolvedValueOnce({ docs: [] });    // users

        render(<AdminDashboard user={mockUser} onLogout={mockOnLogout} />);
        clickTab('Properties');

        await waitFor(() => {
            expect(screen.getByText(/No properties found/i)).toBeInTheDocument();
        });
    });

    it('shows empty landlords message when none exist', async () => {
        (firestore.getDocs as ReturnType<typeof vi.fn>)
            .mockReset()
            .mockResolvedValueOnce({ docs: [] })
            .mockResolvedValueOnce({ docs: [] })
            .mockResolvedValueOnce({ docs: [] });

        render(<AdminDashboard user={mockUser} onLogout={mockOnLogout} />);
        clickTab('Landlords');

        await waitFor(() => {
            expect(screen.getByText(/No landlords found/i)).toBeInTheDocument();
        });
    });

    it('handles fetch error gracefully', async () => {
        const toast = await import('react-hot-toast');
        (firestore.getDocs as ReturnType<typeof vi.fn>)
            .mockReset()
            .mockRejectedValueOnce(new Error('Network error'));

        render(<AdminDashboard user={mockUser} onLogout={mockOnLogout} />);

        await waitFor(() => {
            expect(toast.default.error).toHaveBeenCalled();
        });
    });
});
