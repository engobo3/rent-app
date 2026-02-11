export interface Payment {
    id: number;
    amount: number;
    date: string;
    method: string;
}

export interface Tenant {
    id: string;
    ownerId: string; // <--- Linked to Firebase Auth UID
    propertyId?: string; // <--- NEW (Multi-property support)
    name: string;
    email: string; // Used for Tenant Login
    propertyPhotoUrl?: string; // <--- NEW
    unit: string;
    phone?: string;
    leaseUrl?: string; // Link to PDF in Firebase Storage
    leaseSignature?: string; // Base64 data URL of tenant signature
    leaseSignedAt?: string; // ISO timestamp of when lease was signed
    monthlyRent: number;
    balance: number;  // Positive means they owe money, 0 means paid up, negative means credit
    payments: Payment[];  // A list of past payments

    // Short-Term Rental Fields
    type?: 'long-term' | 'short-term';
    dailyRate?: number;
    status?: 'occupied' | 'vacant' | 'cleaning';
}

export interface RentalApplication {
    id: string;
    ownerId: string;
    propertyId?: string; // <--- NEW
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
    propertyId?: string; // <--- NEW
    amount: number;
    description: string;
    category: 'Maintenance' | 'Utilities' | 'Taxes' | 'Other';
    date: string;
}

export interface RepairRequest {
    id: string;
    ownerId: string;
    propertyId?: string; // <--- NEW
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
    propertyId?: string; // <--- NEW
    title: string;
    description: string;
    unit: string;
    rent: number;
    photoUrl?: string;
    available: boolean;
    dateAdded: string;
}

// ─── Role-Based User Profiles ────────────────────────────────────────────────

export type UserRole = 'tenant' | 'landlord' | 'admin';

/** Base profile stored in the `users` Firestore collection, linked to Firebase Auth. */
export interface UserProfile {
    uid: string;          // Firebase Auth UID
    email: string;
    displayName: string;
    phone?: string;
    role: UserRole;
    createdAt: string;
    updatedAt: string;
}

/** A confirmed resident who has an active lease. */
export interface TenantProfile extends UserProfile {
    role: 'tenant';
    landlordId: string;       // UID of their landlord
    unitId: string;           // Reference to a Unit document
    monthlyRent: number;
    balance: number;
    leaseUrl?: string;
    propertyPhotoUrl?: string;
    type?: 'long-term' | 'short-term';
    dailyRate?: number;
    status?: 'occupied' | 'vacant' | 'cleaning';
}

/** A prospective applicant who has not yet been approved as a tenant. */
export interface RenterProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    income: number;
    desiredUnit: string;
    status: 'pending' | 'approved' | 'rejected';
    appliedAt: string;
    landlordId: string;       // Which landlord they applied to
}

/** Platform-level administrator with configurable permissions. */
export interface AdminProfile extends UserProfile {
    role: 'admin';
    permissions: string[];    // e.g. ['manage_users', 'view_analytics', 'manage_properties']
}

// ─── Property / Apartment Complex Schema ──────────────────────────────────────

/** An apartment complex or building containing multiple units. */
export interface Property {
    id: string;
    ownerId: string;          // Landlord UID
    name: string;             // e.g., "Sunset Apartments", "Downtown Lofts"
    address: string;
    image?: string;
    description?: string;
    amenities?: string[];     // e.g. ["Pool", "Gym", "Parking"]
}

// ─── Unit Schema ─────────────────────────────────────────────────────────────

/** A physical rental unit within a property. */
export interface Unit {
    id: string;
    propertyId: string;       // Link to Property
    ownerId: string;          // Landlord UID
    name: string;             // e.g. "Unit A", "Suite 201"
    beds: number;             // Number of bedrooms (1, 2, 3…)
    baths: number;            // Number of bathrooms (1, 2…)
    sqft?: number;            // Square footage
    monthlyRent: number;
    dailyRate?: number;       // For short-term rentals
    type: 'long-term' | 'short-term';
    status: 'occupied' | 'vacant' | 'cleaning';
    tenantId?: string;        // Currently assigned tenant
    photoUrl?: string;
    description?: string;
}