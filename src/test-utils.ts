/**
 * Shared test utilities — mock factories and helpers.
 * Import these instead of duplicating mock data across test files.
 */
import type { Tenant, Expense, Payment, RepairRequest, Property, BillingHistoryEntry, Listing, RentalApplication } from './types';
import type { User } from 'firebase/auth';

// ─── Mock Factories ──────────────────────────────────────────────────────────

export function mockUser(overrides: Partial<User> = {}): User {
    return {
        uid: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        ...overrides,
    } as unknown as User;
}

export function mockPayment(overrides: Partial<Payment> = {}): Payment {
    return {
        id: Date.now(),
        amount: 50000,
        date: new Date().toLocaleDateString(),
        method: 'Cash/Check',
        ...overrides,
    };
}

export function mockTenant(overrides: Partial<Tenant> = {}): Tenant {
    return {
        id: 'tenant-1',
        ownerId: 'owner-1',
        name: 'Test Tenant',
        email: 'tenant@test.com',
        unit: '101',
        monthlyRent: 50000,
        balance: 10000,
        payments: [],
        ...overrides,
    } as Tenant;
}

export function mockProperty(overrides: Partial<Property> = {}): Property {
    return {
        id: 'prop-1',
        ownerId: 'owner-1',
        name: 'Test Property',
        address: '123 Test St',
        ...overrides,
    };
}

export function mockExpense(overrides: Partial<Expense> = {}): Expense {
    return {
        id: 'exp-1',
        ownerId: 'owner-1',
        amount: 15000,
        description: 'Test expense',
        category: 'Maintenance',
        date: new Date().toLocaleDateString(),
        ...overrides,
    };
}

export function mockRepairRequest(overrides: Partial<RepairRequest> = {}): RepairRequest {
    return {
        id: 'repair-1',
        ownerId: 'owner-1',
        tenantId: 'tenant-1',
        tenantName: 'Test Tenant',
        unit: '101',
        issue: 'Broken window',
        priority: 'Medium',
        status: 'Open',
        dateReported: new Date().toLocaleDateString(),
        ...overrides,
    };
}

export function mockBillingHistoryEntry(overrides: Partial<BillingHistoryEntry> = {}): BillingHistoryEntry {
    return {
        id: 'billing-1',
        billingMonth: '2026-02',
        date: new Date().toISOString(),
        tenantsCharged: 2,
        totalRentAdded: 110000,
        triggeredBy: 'auto',
        ...overrides,
    };
}

export function mockListing(overrides: Partial<Listing> = {}): Listing {
    return {
        id: 'listing-1',
        ownerId: 'owner-1',
        title: 'Test Listing',
        description: 'A nice place',
        unit: '101',
        rent: 50000,
        available: true,
        dateAdded: new Date().toISOString(),
        ...overrides,
    };
}

export function mockApplication(overrides: Partial<RentalApplication> = {}): RentalApplication {
    return {
        id: 'app-1',
        ownerId: 'owner-1',
        name: 'Test Applicant',
        email: 'applicant@test.com',
        phone: '555-0100',
        income: 80000,
        desiredUnit: 'Unit 101',
        status: 'pending',
        ...overrides,
    };
}

// ─── Firestore Mock Helpers ──────────────────────────────────────────────────

/** Wraps data in the Firestore doc snapshot format used by onSnapshot/getDocs */
export function asFirestoreDoc<T extends Record<string, unknown>>(id: string, data: T) {
    return { id, data: () => data, ref: { id } };
}
