import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LandlordDashboard } from './LandlordDashboard';
import * as firestore from 'firebase/firestore';

// Mock firebase
vi.mock('./firebase', () => ({
  db: {},
  storage: {},
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
  writeBatch: vi.fn(),
  getFirestore: vi.fn(),
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

// Mock child components
vi.mock('./PaymentModal', () => ({ PaymentModal: () => <div>PaymentModal Component</div> }));
vi.mock('./MobileMoneyModal', () => ({ MobileMoneyModal: () => <div>MobileMoneyModal Component</div> }));

// Mock Recharts (it's complex to render in jsdom usually, often needs mocking)
vi.mock('recharts', () => {
    return {
        ResponsiveContainer: ({ children }: any) => <div style={{ width: '100%', height: '300px' }}>{children}</div>,
        BarChart: ({ children }: any) => <div>BarChart {children}</div>,
        PieChart: ({ children }: any) => <div>PieChart {children}</div>,
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

describe('LandlordDashboard', () => {
    const mockUser = { uid: 'landlord123', email: 'landlord@example.com' } as any;
    const mockOnLogout = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock for onSnapshot to return empty list and a dummy unsubscribe function
        (firestore.onSnapshot as any).mockImplementation((query: any, callback: any) => {
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
    });

    it('navigates to Tenants tab and opens add tenant form', async () => {
        render(<LandlordDashboard user={mockUser} onLogout={mockOnLogout} />);

        fireEvent.click(screen.getByText(/^Tenants/i));

        expect(screen.getByText('+ Add Tenant')).toBeInTheDocument();
        fireEvent.click(screen.getByText('+ Add Tenant'));

        expect(screen.getByPlaceholderText('Tenant Name')).toBeInTheDocument();
    });

    it('renders metrics on dashboard', () => {
        // Mock tenants data for metrics
        const mockTenants = [
            { id: 't1', data: () => ({ monthlyRent: 1000, balance: 500, payments: [] }) },
            { id: 't2', data: () => ({ monthlyRent: 1200, balance: 0, payments: [] }) }
        ];

        (firestore.onSnapshot as any).mockImplementation((query: any, callback: any) => {
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
        fireEvent.click(screen.getByText('+ Add Tenant'));

        fireEvent.change(screen.getByPlaceholderText('Tenant Name'), { target: { value: 'New Tenant' } });
        fireEvent.change(screen.getByPlaceholderText('Email for Login'), { target: { value: 'tenant@test.com' } });
        fireEvent.change(screen.getByPlaceholderText('Unit Number'), { target: { value: '303' } });
        fireEvent.change(screen.getByPlaceholderText('Phone Number'), { target: { value: '123456' } });
        fireEvent.change(screen.getByPlaceholderText('Monthly Rent (CFA)'), { target: { value: '50000' } });

        fireEvent.click(screen.getByText('Save Tenant'));

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
});
