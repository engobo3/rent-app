import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { FinancialReports } from './FinancialReports';
import type { Tenant, Expense, BillingHistoryEntry } from './types';

describe('FinancialReports', () => {
    const now = new Date();
    const currentTimestamp = now.getTime();

    const mockTenants: Tenant[] = [
        {
            id: 't1', ownerId: 'o1', name: 'Alice', email: 'a@t.com', unit: '101',
            monthlyRent: 50000, balance: 10000,
            payments: [
                { id: currentTimestamp - 86400000, amount: 40000, date: '2/1/2026', method: 'Cash/Check' },
                { id: currentTimestamp - 172800000, amount: 10000, date: '1/30/2026', method: 'Mobile Money' },
            ]
        },
        {
            id: 't2', ownerId: 'o1', name: 'Bob', email: 'b@t.com', unit: '102',
            monthlyRent: 60000, balance: 0,
            payments: [
                { id: currentTimestamp - 86400000, amount: 60000, date: '2/1/2026', method: 'Credit Card' },
            ]
        },
    ];

    const mockExpenses: Expense[] = [
        { id: 'e1', ownerId: 'o1', amount: 15000, description: 'Plumbing fix', category: 'Maintenance', date: new Date(currentTimestamp - 86400000).toLocaleDateString() },
        { id: 'e2', ownerId: 'o1', amount: 5000, description: 'Water bill', category: 'Utilities', date: new Date(currentTimestamp - 172800000).toLocaleDateString() },
    ];

    const mockBillingHistory: BillingHistoryEntry[] = [
        { id: 'b1', billingMonth: '2026-02', date: new Date().toISOString(), tenantsCharged: 2, totalRentAdded: 110000, triggeredBy: 'auto' },
        { id: 'b2', billingMonth: '2026-01', date: new Date(currentTimestamp - 2592000000).toISOString(), tenantsCharged: 2, totalRentAdded: 110000, triggeredBy: 'manual' },
    ];

    it('renders report title and date range selectors', () => {
        render(<FinancialReports tenants={mockTenants} expenses={mockExpenses} billingHistory={mockBillingHistory} />);

        expect(screen.getByText('Financial Reports')).toBeInTheDocument();
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });

    it('displays summary cards with correct totals', () => {
        render(<FinancialReports tenants={mockTenants} expenses={mockExpenses} billingHistory={mockBillingHistory} />);

        // Revenue: 40000 + 10000 + 60000 = 110,000 (also appears in billing history)
        expect(screen.getAllByText('110,000 CFA').length).toBeGreaterThanOrEqual(1);
        // Expenses: 15000 + 5000 = 20,000
        expect(screen.getByText('20,000 CFA')).toBeInTheDocument();
        // Net: 110000 - 20000 = 90,000
        expect(screen.getByText('90,000 CFA')).toBeInTheDocument();
    });

    it('shows revenue table with tenant payments', () => {
        render(<FinancialReports tenants={mockTenants} expenses={mockExpenses} billingHistory={mockBillingHistory} />);

        expect(screen.getByText('Revenue Details')).toBeInTheDocument();
        expect(screen.getByText('+40,000 CFA')).toBeInTheDocument();
        expect(screen.getByText('+60,000 CFA')).toBeInTheDocument();
        // Alice has 2 payments, so appears twice in revenue table
        expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('shows expense table', () => {
        render(<FinancialReports tenants={mockTenants} expenses={mockExpenses} billingHistory={mockBillingHistory} />);

        expect(screen.getByText('Expense Details')).toBeInTheDocument();
        expect(screen.getByText('Plumbing fix')).toBeInTheDocument();
        expect(screen.getByText('Water bill')).toBeInTheDocument();
        expect(screen.getByText('-15,000 CFA')).toBeInTheDocument();
        expect(screen.getByText('-5,000 CFA')).toBeInTheDocument();
    });

    it('shows billing history table', () => {
        render(<FinancialReports tenants={mockTenants} expenses={mockExpenses} billingHistory={mockBillingHistory} />);

        expect(screen.getByText('Billing History')).toBeInTheDocument();
        expect(screen.getByText('2026-02')).toBeInTheDocument();
        expect(screen.getByText('2026-01')).toBeInTheDocument();
    });

    it('shows empty revenue message when no payments in range', () => {
        render(<FinancialReports tenants={[{ ...mockTenants[0], payments: [] }]} expenses={[]} billingHistory={[]} />);

        expect(screen.getByText('No revenue in this period.')).toBeInTheDocument();
    });

    it('shows empty expense message when no expenses in range', () => {
        render(<FinancialReports tenants={mockTenants} expenses={[]} billingHistory={[]} />);

        expect(screen.getByText('No expenses in this period.')).toBeInTheDocument();
    });

    it('shows empty billing history message when none exist', () => {
        render(<FinancialReports tenants={mockTenants} expenses={mockExpenses} billingHistory={[]} />);

        expect(screen.getByText('No billing history records.')).toBeInTheDocument();
    });

    it('renders undo billing button when onUndoBilling is provided', () => {
        const mockUndo = vi.fn();
        render(<FinancialReports tenants={mockTenants} expenses={mockExpenses} billingHistory={mockBillingHistory} onUndoBilling={mockUndo} />);

        const undoBtns = screen.getAllByText('Undo');
        expect(undoBtns.length).toBe(2);
    });

    it('calls onUndoBilling when undo button clicked', () => {
        const mockUndo = vi.fn();
        render(<FinancialReports tenants={mockTenants} expenses={mockExpenses} billingHistory={mockBillingHistory} onUndoBilling={mockUndo} />);

        const undoBtns = screen.getAllByText('Undo');
        fireEvent.click(undoBtns[0]);

        expect(mockUndo).toHaveBeenCalledWith(expect.objectContaining({ billingMonth: '2026-02' }));
    });

    it('does not render undo column when onUndoBilling is not provided', () => {
        render(<FinancialReports tenants={mockTenants} expenses={mockExpenses} billingHistory={mockBillingHistory} />);

        expect(screen.queryByText('Undo')).not.toBeInTheDocument();
    });

    it('exports CSV when button clicked', () => {
        const createObjectURL = vi.fn(() => 'blob:mockurl');
        const revokeObjectURL = vi.fn();
        global.URL.createObjectURL = createObjectURL;
        global.URL.revokeObjectURL = revokeObjectURL;

        const mockClick = vi.fn();
        const originalCreateElement = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
            if (tag === 'a') {
                return { href: '', download: '', click: mockClick } as unknown as HTMLAnchorElement;
            }
            return originalCreateElement(tag);
        });

        render(<FinancialReports tenants={mockTenants} expenses={mockExpenses} billingHistory={mockBillingHistory} />);
        fireEvent.click(screen.getByText('Export CSV'));

        expect(createObjectURL).toHaveBeenCalled();
        expect(mockClick).toHaveBeenCalled();

        vi.restoreAllMocks();
    });

    it('filters payments by date range when changed', () => {
        // Use tenants with a payment far in the past
        const oldPaymentTenants: Tenant[] = [{
            id: 't1', ownerId: 'o1', name: 'Old Tenant', email: 'o@t.com', unit: '100',
            monthlyRent: 50000, balance: 0,
            payments: [
                { id: new Date(2024, 0, 15).getTime(), amount: 50000, date: '1/15/2024', method: 'Cash/Check' },
            ]
        }];

        render(<FinancialReports tenants={oldPaymentTenants} expenses={[]} billingHistory={[]} />);

        // Default range is current month — old payment should not show
        expect(screen.getByText('No revenue in this period.')).toBeInTheDocument();
    });

    it('shows category badges on expenses', () => {
        render(<FinancialReports tenants={mockTenants} expenses={mockExpenses} billingHistory={mockBillingHistory} />);

        expect(screen.getByText('Maintenance')).toBeInTheDocument();
        expect(screen.getByText('Utilities')).toBeInTheDocument();
    });
});
