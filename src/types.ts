export interface Payment {
    id: number;
    amount: number;
    date: string;
    method: string;
}

export interface Tenant {
    id: string;
    ownerId: string; // <--- Linked to Firebase Auth UID
    name: string;
    email: string; // Used for Tenant Login
    propertyPhotoUrl?: string; // <--- NEW
    unit: string;
    phone?: string;
    leaseUrl?: string; // Link to PDF in Firebase Storage
    monthlyRent: number;
    balance: number;  // Positive means they owe money, 0 means paid up, negative means credit
    payments: Payment[];  // A list of past payments
}

export interface RentalApplication {
    id: string;
    ownerId: string;
    name: string;
    email: string;
    phone: string;
    income: number;
    desiredUnit: string;
    status: 'pending' | 'approved' | 'rejected';
}

export interface Expense {
    id: string;
    ownerId: string;
    amount: number;
    description: string;
    category: 'Maintenance' | 'Utilities' | 'Taxes' | 'Other';
    date: string;
}

export interface RepairRequest {
    id: string;
    ownerId: string;
    tenantId: string;
    tenantName: string;
    unit: string;
    issue: string;
    priority: 'Low' | 'Medium' | 'High';
    status: 'Open' | 'Resolved';
    dateReported: string;
}

export interface Listing {
    id: string;
    ownerId: string; // Landlord who owns it
    title: string;
    description: string;
    unit: string;
    rent: number;
    photoUrl?: string;
    available: boolean;
    dateAdded: string;
}