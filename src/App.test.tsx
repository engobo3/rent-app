import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import * as auth from 'firebase/auth';
import * as firestore from 'firebase/firestore';

// Mock firebase
vi.mock('./firebase', () => ({
  auth: {},
  db: {},
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
  getAuth: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(),
  getFirestore: vi.fn(),
}));

// Mock child components to simplify App testing
vi.mock('./HomePage', () => ({ HomePage: () => <div>HomePage Component</div> }));
vi.mock('./LoginPage', () => ({ LoginPage: () => <div>LoginPage Component</div> }));
vi.mock('./LandlordDashboard', () => ({ LandlordDashboard: () => <div>LandlordDashboard Component</div> }));
vi.mock('./TenantPortal', () => ({ TenantPortal: () => <div>TenantPortal Component</div> }));
vi.mock('./Listings.tsx', () => ({ Listings: () => <div>Listings Component</div> }));
vi.mock('./PublicApply', () => ({ PublicApply: () => <div>PublicApply Component</div> }));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading initially', () => {
    (auth.onAuthStateChanged as any).mockImplementation(() => vi.fn());
    render(<App />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders HomePage on default route', async () => {
    (auth.onAuthStateChanged as any).mockImplementation((_auth: any, callback: any) => {
        callback(null); // No user
        return vi.fn();
    });

    render(<App />);

    await waitFor(() => {
        expect(screen.getByText('HomePage Component')).toBeInTheDocument();
    });
  });

  it('redirects to login for protected routes when not authenticated', async () => {
      // We need to simulate the router being at /dashboard, but App handles router internally.
      // Since App contains the Router, we can't easily set initial route without modifying App or using MemoryRouter inside App (which creates nested routers).
      // However, App uses <Router> (BrowserRouter). To test routes, we might need to rely on clicking links or modifying the URL.
      // For unit testing App, it's often better if App accepts a Router or we just test the logic.
      // Given the code, let's verify that if we start at root, we see HomePage.

      (auth.onAuthStateChanged as any).mockImplementation((_auth: any, callback: any) => {
        callback(null);
        return vi.fn();
      });

      window.history.pushState({}, 'Test Page', '/dashboard');
      render(<App />);

      await waitFor(() => {
         // Should redirect to login
         expect(screen.getByText('LoginPage Component')).toBeInTheDocument();
      });
  });

  it('renders LandlordDashboard when authenticated as landlord (no tenant record)', async () => {
    (auth.onAuthStateChanged as any).mockImplementation((_auth: any, callback: any) => {
        callback({ email: 'landlord@example.com' });
        return vi.fn();
    });

    (firestore.onSnapshot as any).mockImplementation((_query: any, callback: any) => {
        callback({ empty: true, docs: [] }); // No tenant record found
        return vi.fn(); // unsubscribe
    });

    window.history.pushState({}, 'Test Page', '/dashboard');
    render(<App />);

    await waitFor(() => {
        expect(screen.getByText('LandlordDashboard Component')).toBeInTheDocument();
    });
  });

  it('renders TenantPortal when authenticated as tenant', async () => {
    (auth.onAuthStateChanged as any).mockImplementation((_auth: any, callback: any) => {
        callback({ email: 'tenant@example.com' });
        return vi.fn();
    });

    (firestore.onSnapshot as any).mockImplementation((_query: any, callback: any) => {
        callback({
            empty: false,
            docs: [{ id: 'tenant1', data: () => ({ name: 'Tenant Name' }) }]
        });
        return vi.fn();
    });

    window.history.pushState({}, 'Test Page', '/tenant');
    render(<App />);

    await waitFor(() => {
        expect(screen.getByText('TenantPortal Component')).toBeInTheDocument();
    });
  });
});
