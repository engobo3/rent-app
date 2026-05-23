import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { LandlordDashboard } from './LandlordDashboard';
import * as firestore from 'firebase/firestore';
import type { User } from 'firebase/auth';

// Mock firebase
vi.mock('./firebase', () => ({
    db: {},
    storage: {},
    functions: {},
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
    arrayUnion: vi.fn((x) => x),
    arrayRemove: vi.fn((x) => x),
    writeBatch: vi.fn(),
    getDocs: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
    // Sentinel so assertions can check the delta without depending on
    // Firestore's FieldValue internals.
    increment: vi.fn((n: number) => ({ __increment: n })),
    getFirestore: vi.fn(),
}));

vi.mock('firebase/storage', () => ({
    ref: vi.fn(),
    uploadBytes: vi.fn(),
    getDownloadURL: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
    httpsCallable: vi.fn(),
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

// Mock Recharts (it's complex to render in jsdom usually, often needs mocking)
vi.mock('recharts', () => {
    return {
        ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: '100%', height: '300px' }}>{children}</div>,
        BarChart: ({ children }: { children: React.ReactNode }) => <div>BarChart {children}</div>,
        PieChart: ({ children }: { children: React.ReactNode }) => <div>PieChart {children}</div>,
        Bar: () => <div>Bar</div>,
        Pie: () => <div>Pie</div>,
        Cell: () => <div>Cell</div>,
        XAxis: () => <div>XAxis</div>,
        YAxis: () => <div>YAxis</div>,
        CartesianGrid: () => <div>CartesianGrid</div>,
        Tooltip: () => <div>Tooltip</div>,
        Legend: () => <div>Legend</div>,
    };
});

// Mock jspdf
vi.mock('jspdf', () => {
    return {
        jsPDF: vi.fn().mockImplementation(() => ({
            text: vi.fn(),
            line: vi.fn(),
            setFontSize: vi.fn(),
            setFont: vi.fn(),
            setTextColor: vi.fn(),
            setLineWidth: vi.fn(),
            save: vi.fn(),
        })),
    };
});

const mockBatch = {
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
};
(firestore.writeBatch as ReturnType<typeof vi.fn>).mockReturnValue(mockBatch);

describe('LandlordDashboard', () => {
    const mockUser = { uid: 'landlord123', email: 'landlord@example.com' } as unknown as User;
    const mockOnLogout = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (firestore.writeBatch as ReturnType<typeof vi.fn>).mockReturnValue(mockBatch);
        // Default mock for onSnapshot to return empty list and a dummy unsubscribe function
        (firestore.onSnapshot as ReturnType<typeof vi.fn>).mockImplementation((_query: unknown, callback: (snapshot: { docs: unknown[] }) => void) => {
            callback({ docs: [] });
            return vi.fn();
        });
    });

    it('renders dashboard tabs', () => {
        render(<LandlordDashboard user={mockUser} onLogout={mockOnLogout} />);

        expect(screen.getAllByText(/Dashboard/i)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/Tenants/i)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/Applications/i)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/Listings/i)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/Expenses/i)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/Repairs/i)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/Reports/i)[0]).toBeInTheDocument();
    });

    it('renders Reports tab with financial reports', () => {
        render(<LandlordDashboard user={mockUser} onLogout={mockOnLogout} />);

        fireEvent.click(screen.getByText(/^Reports/i));

        expect(screen.getByText('Financial Reports')).toBeInTheDocument();
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
        expect(screen.getByText('Billing History')).toBeInTheDocument();
    });

    it('navigates to Tenants tab and opens add tenant form', async () => {
        render(<LandlordDashboard user={mockUser} onLogout={mockOnLogout} />);

        fireEvent.click(screen.getByText(/^Tenants/i));

        expect(screen.getByText('+ Add Unit / Tenant')).toBeInTheDocument();
        fireEvent.click(screen.getByText('+ Add Unit / Tenant'));

        expect(screen.getByPlaceholderText('Unit Name / Tenant Name')).toBeInTheDocument();
    });

    it('renders metrics on dashboard', () => {
        // Mock tenants data for metrics
        const mockTenants = [
            { id: 't1', data: () => ({ monthlyRent: 1000, balance: 500, payments: [] }) },
            { id: 't2', data: () => ({ monthlyRent: 1200, balance: 0, payments: [] }) }
        ];

        (firestore.onSnapshot as ReturnType<typeof vi.fn>).mockImplementation((_query: unknown, callback: (snapshot: { docs: unknown[] }) => void) => {
            // We can check query to determine which snapshot to return, but for now we can rely on order or generic valid data structure
            // The component subscribes to 5 queries. We need to be careful.
            // Let's assume the first call is for tenants if we can't differentiate easily in mock.
            // Or we can just inspect the created query object if we mocked it properly.
            // Since we mocked `query`, it returns undefined.

            // Let's try to return data based on component logic. The component sets state for tenants, apps, etc.
            // We can trigger the callback for all of them.
            callback({ docs: mockTenants }); // This will set tenants, and also erroneously set apps/expenses etc if they expect different data structure, but might be fine if fields are optional or ignored.
            return vi.fn();
        });

        render(<LandlordDashboard user={mockUser} onLogout={mockOnLogout} />);

        // Total Rent Roll: 1000 + 1200 = 2200
        expect(screen.getByText('2,200 CFA')).toBeInTheDocument();
        // Outstanding: 500
        expect(screen.getByText('500 CFA')).toBeInTheDocument();
    });

    it('adds a new tenant', async () => {
        render(<LandlordDashboard user={mockUser} onLogout={mockOnLogout} />);
        fireEvent.click(screen.getByText(/^Tenants/i));
        fireEvent.click(screen.getByText('+ Add Unit / Tenant'));

        fireEvent.change(screen.getByPlaceholderText('Unit Name / Tenant Name'), { target: { value: 'New Tenant' } });
        fireEvent.change(screen.getByPlaceholderText('Email (Optional)'), { target: { value: 'tenant@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('Unit Number'), { target: { value: '303' } });
        fireEvent.change(screen.getByPlaceholderText('Phone Number'), { target: { value: '123456' } });
        fireEvent.change(screen.getByPlaceholderText('Monthly Rent (CFA)'), { target: { value: '50000' } });

        fireEvent.click(screen.getByText('Save Unit'));

        await waitFor(() => {
            expect(firestore.addDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    name: 'New Tenant',
                    email: 'tenant@test.com',
                    unit: '303',
                    monthlyRent: 50000,
                    ownerId: mockUser.uid
                })
            );
        });
    });

    it('logs out', () => {
        render(<LandlordDashboard user={mockUser} onLogout={mockOnLogout} />);
        fireEvent.click(screen.getByText('Logout'));
        expect(mockOnLogout).toHaveBeenCalled();
    });

    it('approves an application via modal with rent input', async () => {
        const mockApps = [
            {
                id: 'app1',
                data: () => ({
                    ownerId: 'landlord123',
                    name: 'Applicant One',
                    email: 'applicant@test.com',
                    phone: '555-0199',
                    income: 50000,
                    desiredUnit: 'Unit 101',
                    status: 'pending',
                    propertyId: 'prop123'
                })
            }
        ];

        (firestore.onSnapshot as ReturnType<typeof vi.fn>).mockImplementation((_query: unknown, callback: (snapshot: { docs: unknown[] }) => void) => {
            callback({ docs: mockApps });
            return vi.fn();
        });

        render(<LandlordDashboard user={mockUser} onLogout={mockOnLogout} />);
        // Navigate to Applications tab
        const appsTab = screen.getByText(/^Applications/i);
        fireEvent.click(appsTab);

        // Verify card appears
        const cardHeading = await screen.findByRole('heading', { name: /Applicant One/i });
        expect(cardHeading).toBeInTheDocument();

        // Click Approve button to open modal
        const approveBtns = await screen.findAllByText((content, element) => {
            return element?.tagName.toLowerCase() === 'button' && content.includes('Approve');
        });
        expect(approveBtns.length).toBeGreaterThan(0);
        fireEvent.click(approveBtns[0]);

        // Modal should appear with rent input
        const rentInput = await screen.findByPlaceholderText('Monthly Rent (CFA)');
        expect(rentInput).toBeInTheDocument();

        // Enter rent amount and confirm
        fireEvent.change(rentInput, { target: { value: '75000' } });

        // Click the confirm button in the modal
        const confirmBtns = await screen.findAllByText((content, element) => {
            return element?.tagName.toLowerCase() === 'button' && content.includes('Approve');
        });
        // The last Approve button should be the confirm in the modal
        fireEvent.click(confirmBtns[confirmBtns.length - 1]);

        await waitFor(() => {
            expect(mockBatch.set).toHaveBeenCalled();
            const setArgs = (mockBatch.set as ReturnType<typeof vi.fn>).mock.calls[0];
            expect(setArgs[1]).toMatchObject({
                name: 'Applicant One',
                email: 'applicant@test.com',
                propertyId: 'prop123',
                unit: 'Unit 101',
                monthlyRent: 75000,
                type: 'long-term',
                status: 'occupied'
            });

            expect(mockBatch.delete).toHaveBeenCalled();
            expect(mockBatch.commit).toHaveBeenCalled();
        });
    });

    it('deletes a payment from tenant detail modal', async () => {
        const mockTenants = [
            {
                id: 't1',
                data: () => ({
                    name: 'Test Tenant',
                    email: 'test@test.com',
                    unit: '101',
                    monthlyRent: 50000,
                    balance: 20000,
                    payments: [
                        { id: 1700000000000, amount: 30000, date: '11/14/2023', method: 'Cash/Check' }
                    ],
                    ownerId: 'landlord123'
                })
            }
        ];

        (firestore.onSnapshot as ReturnType<typeof vi.fn>).mockImplementation((_query: unknown, callback: (snapshot: { docs: unknown[] }) => void) => {
            callback({ docs: mockTenants });
            return vi.fn();
        });

        window.confirm = vi.fn(() => true);

        render(<LandlordDashboard user={mockUser} onLogout={mockOnLogout} />);
        fireEvent.click(screen.getByText(/^Tenants/i));

        // Click on tenant name (h3) to open detail modal
        const tenantNames = screen.getAllByText('Test Tenant');
        const h3Element = tenantNames.find(el => el.tagName === 'H3');
        fireEvent.click(h3Element!);

        // Verify payment is visible in modal
        await waitFor(() => {
            expect(screen.getByText('11/14/2023')).toBeInTheDocument();
        });

        // Click the Delete button for the payment
        const deleteBtns = screen.getAllByText('Delete');
        fireEvent.click(deleteBtns[0]);

        await waitFor(() => {
            expect(firestore.updateDoc).toHaveBeenCalled();
            const callArgs = (firestore.updateDoc as ReturnType<typeof vi.fn>).mock.calls[0];
            // Balance is now updated via `increment(payment.amount)` — assert
            // on the sentinel object our mocked `increment` returns.
            expect(callArgs[1]).toMatchObject({ balance: { __increment: 30000 } });
        });
    });

    // ─── Phase 3: Money/payment edge cases ──────────────────────────────────

    it('disables save button while adding a tenant', async () => {
        // Make addDoc hang to keep isAddingTenant=true
        (firestore.addDoc as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));

        render(<LandlordDashboard user={mockUser} onLogout={mockOnLogout} />);
        fireEvent.click(screen.getByText(/^Tenants/i));
        fireEvent.click(screen.getByText('+ Add Unit / Tenant'));

        fireEvent.change(screen.getByPlaceholderText('Unit Name / Tenant Name'), { target: { value: 'New Tenant' } });
        fireEvent.change(screen.getByPlaceholderText('Unit Number'), { target: { value: '303' } });
        fireEvent.change(screen.getByPlaceholderText('Phone Number'), { target: { value: '123456' } });
        fireEvent.change(screen.getByPlaceholderText('Monthly Rent (CFA)'), { target: { value: '50000' } });

        fireEvent.click(screen.getByText('Save Unit'));

        await waitFor(() => {
            expect(screen.getByText('Save Unit')).toBeDisabled();
        });
    });

    it('navigates to Expenses tab and shows add expense form', () => {
        render(<LandlordDashboard user={mockUser} onLogout={mockOnLogout} />);

        const expensesTabs = screen.getAllByText(/^Expenses/i);
        fireEvent.click(expensesTabs[0]);

        expect(screen.getByText('+ Add Expense')).toBeInTheDocument();
    });

    // ─── Phase 5: Feature coverage tests ────────────────────────────────────

    it('shows property filter dropdown on dashboard', () => {
        const mockProperties = [
            { id: 'p1', data: () => ({ name: 'Property One', address: '123 Main St', ownerId: 'landlord123' }) },
        ];

        (firestore.onSnapshot as ReturnType<typeof vi.fn>).mockImplementation((_query: unknown, callback: (snapshot: { docs: unknown[] }) => void) => {
            callback({ docs: mockProperties });
            return vi.fn();
        });

        render(<LandlordDashboard user={mockUser} onLogout={mockOnLogout} />);

        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThanOrEqual(1);
    });

    it('navigates to Properties tab and shows content', () => {
        render(<LandlordDashboard user={mockUser} onLogout={mockOnLogout} />);

        const propertiesTabs = screen.getAllByText(/^Properties/i);
        fireEvent.click(propertiesTabs[0]);

        // Landlord view is read-only — shows "My Properties" title
        expect(screen.getByText('My Properties')).toBeInTheDocument();
    });
});
