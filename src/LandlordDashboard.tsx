import { useState, useEffect } from 'react';
import './App.css';
import type { Tenant, Payment, RentalApplication, Expense, RepairRequest } from './types';
import { db, storage } from './firebase';
import { type User } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast, { Toaster } from 'react-hot-toast';
import { jsPDF } from "jspdf";
import { PaymentModal } from './PaymentModal';
import { MobileMoneyModal } from './MobileMoneyModal';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, arrayUnion, writeBatch, query, where } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface LandlordDashboardProps {
    user: User;
    onLogout: () => void;
}

export function LandlordDashboard({ user, onLogout }: LandlordDashboardProps) {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [applications, setApplications] = useState<RentalApplication[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [repairs, setRepairs] = useState<RepairRequest[]>([]);
    const [activeTab, setActiveTab] = useState<'tenants' | 'applications' | 'dashboard' | 'expenses' | 'repairs' | 'listings'>('dashboard');

    const [paymentAmount, setPaymentAmount] = useState<string>("");
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
    const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
    const [showCardModal, setShowCardModal] = useState(false);
    const [showMobileMoneyModal, setShowMobileMoneyModal] = useState(false);

    // Form State (Tenant)
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newUnit, setNewUnit] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [newRent, setNewRent] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isAddingTenant, setIsAddingTenant] = useState(false);
    const [isStartingMonth, setIsStartingMonth] = useState(false);

    // Form State (Application)
    const [appName, setAppName] = useState("");
    const [appEmail, setAppEmail] = useState("");
    const [appPhone, setAppPhone] = useState("");
    const [appIncome, setAppIncome] = useState("");
    const [appUnit, setAppUnit] = useState("");
    const [isAppFormOpen, setIsAppFormOpen] = useState(false);
    const [isAddingApp, setIsAddingApp] = useState(false);

    // Form State (Listings)
    const [listings, setListings] = useState<any[]>([]); // Should use Listing type
    const [listingTitle, setListingTitle] = useState("");
    const [listingDesc, setListingDesc] = useState("");
    const [listingRent, setListingRent] = useState("");
    const [listingUnit, setListingUnit] = useState("");
    const [isListingFormOpen, setIsListingFormOpen] = useState(false);
    const [isAddingListing, setIsAddingListing] = useState(false);

    // Form State (Expense)
    const [expenseAmount, setExpenseAmount] = useState("");
    const [expenseDesc, setExpenseDesc] = useState("");
    const [expenseCat, setExpenseCat] = useState<'Maintenance' | 'Utilities' | 'Taxes' | 'Other'>('Maintenance');
    const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
    const [isAddingExpense, setIsAddingExpense] = useState(false);

    // Form State (Repairs)
    const [repairTenantId, setRepairTenantId] = useState("");
    const [repairIssue, setRepairIssue] = useState("");
    const [repairPriority, setRepairPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
    const [isRepairFormOpen, setIsRepairFormOpen] = useState(false);
    const [isAddingRepair, setIsAddingRepair] = useState(false);

    // Lease/Photo Upload State
    const [uploadingLease, setUploadingLease] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // LISTEN TO DATABASE
    useEffect(() => {
        if (!user) return;

        // Fetch Tenants
        const qTenants = query(collection(db, "tenants"), where("ownerId", "==", user.uid));
        const unsubTenants = onSnapshot(qTenants, (snapshot) => {
            const tenantList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));
            setTenants(tenantList);
        });

        // Fetch Applications
        const qApps = query(collection(db, "applications"), where("ownerId", "==", user.uid));
        const unsubApps = onSnapshot(qApps, (snapshot) => {
            const appList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RentalApplication));
            setApplications(appList);
        });

        // Fetch Listings
        const qListings = query(collection(db, "listings"), where("ownerId", "==", user.uid));
        const unsubListings = onSnapshot(qListings, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setListings(list);
        });

        // Fetch Expenses
        const qExpenses = query(collection(db, "expenses"), where("ownerId", "==", user.uid));
        const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
            const expList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
            setExpenses(expList);
        });

        // Fetch Repairs
        const qRepairs = query(collection(db, "repairs"), where("ownerId", "==", user.uid));
        const unsubRepairs = onSnapshot(qRepairs, (snapshot) => {
            const repairList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RepairRequest));
            setRepairs(repairList);
        });

        return () => {
            unsubTenants();
            unsubApps();
            unsubListings();
            unsubExpenses();
            unsubRepairs();
        };
    }, [user]);

    // --- DATA ACTIONS ---
    const startNewMonth = async () => {
        if (!window.confirm("Start new month? This adds rent to ALL balances.")) return;
        setIsStartingMonth(true);
        try {
            const batch = writeBatch(db);
            tenants.forEach((tenant) => {
                batch.update(doc(db, "tenants", tenant.id), { balance: tenant.balance + tenant.monthlyRent });
            });
            await batch.commit();
            toast.success("New month started! Rent added.");
        } catch (error: any) {
            toast.error("Failed to start month: " + error.message);
        } finally {
            setIsStartingMonth(false);
        }
    };

    const handleAddTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newUnit || !newRent) {
            toast.error("Please fill in all required fields.");
            return;
        }
        const rentVal = parseFloat(newRent);
        if (isNaN(rentVal) || rentVal <= 0) {
            toast.error("Rent must be a positive number.");
            return;
        }

        setIsAddingTenant(true);
        try {
            await addDoc(collection(db, "tenants"), {
                ownerId: user.uid,
                name: newName,
                email: newEmail,
                unit: newUnit,
                phone: newPhone,
                monthlyRent: rentVal,
                balance: rentVal,
                payments: []
            });
            setNewName(""); setNewEmail(""); setNewUnit(""); setNewPhone(""); setNewRent(""); setIsFormOpen(false);
            toast.success("Tenant added successfully!");
        } catch (error: any) {
            toast.error("Error adding tenant: " + error.message);
        } finally {
            setIsAddingTenant(false);
        }
    }

    const handlePayment = async (tenantId: string) => {
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error("Please enter a valid amount.");
            return;
        }
        const tenant = tenants.find(t => t.id === tenantId);
        if (!tenant) return;

        try {
            await updateDoc(doc(db, "tenants", tenantId), {
                balance: tenant.balance - amount,
                payments: arrayUnion({ id: Date.now(), amount, date: new Date().toLocaleDateString(), method: 'Cash/Check' })
            });
            setPaymentAmount(""); setSelectedTenantId(null);
            toast.success(`Payment of ${amount.toLocaleString()} CFA recorded!`);
        } catch (error: any) {
            toast.error("Payment failed: " + error.message);
        }
    };

    const handlePaymentSuccess = async (tenantId: string, amount: number, method: string = 'Credit Card') => {
        const tenant = tenants.find(t => t.id === tenantId);
        if (!tenant) return;

        await updateDoc(doc(db, "tenants", tenantId), {
            balance: tenant.balance - amount,
            payments: arrayUnion({ id: Date.now(), amount, date: new Date().toLocaleDateString(), method })
        });

        setShowCardModal(false);
        setShowMobileMoneyModal(false);
        setPaymentAmount("");
        setSelectedTenantId(null);
        toast.success("Payment Successful!");
    };

    // --- APPLICATION ACTIONS ---
    const handleAddApplication = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!appName || !appEmail || !appPhone || !appIncome || !appUnit) {
            toast.error("Please fill all fields");
            return;
        }

        setIsAddingApp(true);
        try {
            await addDoc(collection(db, "applications"), {
                ownerId: user.uid,
                name: appName,
                email: appEmail,
                phone: appPhone,
                income: parseFloat(appIncome),
                desiredUnit: appUnit,
                status: 'pending'
            });
            setAppName(""); setAppEmail(""); setAppPhone(""); setAppIncome(""); setAppUnit("");
            setIsAppFormOpen(false);
            toast.success("Application added!");
        } catch (err: any) {
            toast.error("Error: " + err.message);
        } finally {
            setIsAddingApp(false);
        }
    };

    const approveApplication = async (app: RentalApplication) => {
        if (!window.confirm(`Approve ${app.name} for unit ${app.desiredUnit}?`)) return;

        try {
            const batch = writeBatch(db);

            // 1. Create Tenant
            const newTenantRef = doc(collection(db, "tenants"));
            batch.set(newTenantRef, {
                ownerId: user.uid,
                name: app.name,
                unit: app.desiredUnit,
                phone: app.phone,
                monthlyRent: 0,
                balance: 0,
                payments: []
            });

            // 2. Delete Application
            const appRef = doc(db, "applications", app.id);
            batch.delete(appRef);

            await batch.commit();
            toast.success(`${app.name} is now a tenant!`);
        } catch (err: any) {
            toast.error("Approval failed: " + err.message);
        }
    };

    const rejectApplication = async (id: string) => {
        if (!window.confirm("Reject and delete this application?")) return;
        try {
            await deleteDoc(doc(db, "applications", id));
            toast.success("Application rejected.");
        } catch (err: any) {
            toast.error("Error: " + err.message);
        }
    };

    // --- LISTING ACTIONS ---
    const handleAddListing = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAddingListing(true);
        try {
            await addDoc(collection(db, "listings"), {
                ownerId: user.uid,
                title: listingTitle,
                description: listingDesc,
                rent: parseFloat(listingRent),
                unit: listingUnit,
                available: true,
                dateAdded: new Date().toLocaleDateString()
            });
            setListingTitle(""); setListingDesc(""); setListingRent(""); setListingUnit("");
            setIsListingFormOpen(false);
            toast.success("Listing created!");
        } catch (e: any) {
            toast.error("Error: " + e.message);
        } finally {
            setIsAddingListing(false);
        }
    };

    const handleDeleteListing = async (id: string) => {
        if (!window.confirm("Delete this listing?")) return;
        try {
            await deleteDoc(doc(db, "listings", id));
            toast.success("Listing deleted.");
        } catch (e: any) {
            toast.error("Error: " + e.message);
        }
    };

    const handleUploadListingPhoto = async (e: React.ChangeEvent<HTMLInputElement>, listingId: string) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        try {
            const storageRef = ref(storage, `listing-photos/${listingId}/photo.jpg`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            await updateDoc(doc(db, "listings", listingId), { photoUrl: url });
            toast.success("Photo added to listing!");
        } catch (e: any) {
            toast.error("Upload failed: " + e.message);
        }
    }

    // --- EXPENSE ACTIONS ---
    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseAmount || !expenseDesc || !expenseCat) {
            toast.error("Please fill all fields");
            return;
        }

        setIsAddingExpense(true);
        try {
            await addDoc(collection(db, "expenses"), {
                ownerId: user.uid,
                amount: parseFloat(expenseAmount),
                description: expenseDesc,
                category: expenseCat,
                date: new Date().toLocaleDateString()
            });
            setExpenseAmount(""); setExpenseDesc(""); setExpenseCat('Maintenance');
            setIsExpenseFormOpen(false);
            toast.success("Expense added!");
        } catch (err: any) {
            toast.error("Error: " + err.message);
        } finally {
            setIsAddingExpense(false);
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!window.confirm("Delete this expense?")) return;
        try {
            await deleteDoc(doc(db, "expenses", id));
            toast.success("Expense deleted.");
        } catch (err: any) {
            toast.error("Failed to delete expense: " + err.message);
        }
    };

    // --- REPAIR ACTIONS ---
    const handleAddRepair = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!repairTenantId || !repairIssue) {
            toast.error("Please select a tenant and describe the issue.");
            return;
        }

        const tenant = tenants.find(t => t.id === repairTenantId);
        if (!tenant) return;

        setIsAddingRepair(true);
        try {
            await addDoc(collection(db, "repairs"), {
                ownerId: user.uid,
                tenantId: tenant.id,
                tenantName: tenant.name,
                unit: tenant.unit,
                issue: repairIssue,
                priority: repairPriority,
                status: 'Open',
                dateReported: new Date().toLocaleDateString()
            });
            setRepairIssue(""); setRepairPriority('Medium'); setRepairTenantId("");
            setIsRepairFormOpen(false);
            toast.success("Repair logged!");
        } catch (err: any) {
            toast.error("Error: " + err.message);
        } finally {
            setIsAddingRepair(false);
        }
    };

    const handleResolveRepair = async (repair: RepairRequest) => {
        const newStatus = repair.status === 'Open' ? 'Resolved' : 'Open';
        try {
            await updateDoc(doc(db, "repairs", repair.id), { status: newStatus });
            toast.success(`Repair marked as ${newStatus}`);
        } catch (err: any) {
            toast.error("Error updating repair: " + err.message);
        }
    };

    const handleDeleteRepair = async (id: string) => {
        if (!window.confirm("Delete this repair record?")) return;
        try {
            await deleteDoc(doc(db, "repairs", id));
            toast.success("Repair record deleted.");
        } catch (err: any) {
            toast.error("Error deleting repair: " + err.message);
        }
    };

    const handleDeleteTenant = async (id: string) => {
        if (!window.confirm("Are you sure? This deletes the tenant and all payment history permanently.")) return;
        try {
            await deleteDoc(doc(db, "tenants", id));
            setViewingTenant(null);
            toast.success("Tenant deleted.");
        } catch (error: any) {
            toast.error("Failed to delete tenant: " + error.message);
        }
    };

    // --- LEASE ACTIONS ---
    const handleUploadLease = async (e: React.ChangeEvent<HTMLInputElement>, tenantId: string) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        if (file.type !== 'application/pdf') {
            toast.error("Please upload a PDF file.");
            return;
        }

        setUploadingLease(true);
        try {
            const storageRef = ref(storage, `leases/${user?.uid}/${tenantId}/lease.pdf`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            await updateDoc(doc(db, "tenants", tenantId), { leaseUrl: url });
            toast.success("Lease uploaded successfully!");

            setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, leaseUrl: url } : t));
            if (viewingTenant && viewingTenant.id === tenantId) {
                setViewingTenant(prev => prev ? { ...prev, leaseUrl: url } : null);
            }

        } catch (err: any) {
            toast.error("Upload failed: " + err.message);
        } finally {
            setUploadingLease(false);
        }
    };

    const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>, tenantId: string) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        setUploadingPhoto(true);
        try {
            const storageRef = ref(storage, `property-photos/${user?.uid}/${tenantId}/photo.jpg`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            await updateDoc(doc(db, "tenants", tenantId), { propertyPhotoUrl: url });
            toast.success("Photo uploaded successfully!");

            setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, propertyPhotoUrl: url } : t));
        } catch (err: any) {
            toast.error("Photo upload failed: " + err.message);
        } finally {
            setUploadingPhoto(false);
        }
    };

    // --- WHATSAPP REMINDER ---
    const sendWhatsAppReminder = (tenant: Tenant) => {
        const amount = tenant.balance > 0 ? tenant.balance : 0;
        const text = `Hello ${tenant.name}, this is a friendly reminder that your rent of ${amount.toLocaleString()} CFA is due. Please pay at your earliest convenience.`;
        const url = `https://wa.me/${tenant.phone}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    // --- GENERATE PDF RECEIPT ---
    const generateReceipt = (payment: Payment) => {
        if (!viewingTenant) return;

        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text("RENT RECEIPT", 105, 20, { align: "center" });

        // Line
        doc.setLineWidth(0.5);
        doc.line(20, 25, 190, 25);

        // Info
        doc.setFontSize(14);
        doc.text(`Date Paid: ${payment.date}`, 20, 40);
        doc.text(`Receipt ID: #${payment.id}`, 20, 50);

        doc.text(`Received From:`, 20, 70);
        doc.setFont("helvetica", "bold");
        doc.text(`${viewingTenant.name} (Unit ${viewingTenant.unit})`, 60, 70);
        doc.setFont("helvetica", "normal");

        doc.text(`Amount Paid:`, 20, 80);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 128, 0); // Green color
        doc.text(`${payment.amount.toFixed(2)} CFA`, 60, 80);
        doc.setTextColor(0, 0, 0); // Reset color

        doc.text(`Method: ${payment.method || 'N/A'}`, 20, 90);

        // Footer
        doc.setFontSize(10);
        doc.text("Thank you for your payment!", 105, 110, { align: "center" });
        doc.text("Landlord Signature: __________________________", 20, 130);

        // Save File
        doc.save(`receipt_${viewingTenant.name}_${payment.date}.pdf`);
    };

    return (
        <div className="container">
            {/* HEADER */}
            <div className="top-bar">
                <div className="app-title">🏢 Rent App</div>
                <div className="action-row" style={{ marginTop: 0 }}>
                    <button
                        className="btn-primary"
                        onClick={startNewMonth}
                        disabled={isStartingMonth}
                        style={{ backgroundColor: 'var(--color-warning)' }}
                    >
                        {isStartingMonth ? "Starting..." : "Start Month"}
                    </button>
                    <button className="btn-secondary btn-danger" onClick={onLogout} style={{ border: 'none' }}>Logout</button>
                </div>
            </div>

            {/* TABS */}
            <div className="tabs-container">
                {['dashboard', 'tenants', 'applications', 'listings', 'expenses', 'repairs'].map((tab) => (
                    <div
                        key={tab}
                        className={`tab ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab as any)}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {tab === 'applications' && applications.length > 0 && ` (${applications.length})`}
                        {tab === 'repairs' && repairs.filter(r => r.status === 'Open').length > 0 && ` (${repairs.filter(r => r.status === 'Open').length})`}
                    </div>
                ))}
            </div>

            {activeTab === 'dashboard' ? (
                <div className="dashboard">
                    {/* METRIC CARDS */}
                    {(() => {
                        const totalRentRoll = tenants.reduce((acc, t) => acc + t.monthlyRent, 0);
                        const outstanding = tenants.reduce((acc, t) => acc + (t.balance > 0 ? t.balance : 0), 0);
                        const paidTenants = tenants.filter(t => t.balance <= 0).length;
                        const openRepairs = repairs.filter(r => r.status === 'Open').length;

                        let totalRevenue = 0;
                        tenants.forEach(t => {
                            t.payments?.forEach(p => totalRevenue += p.amount);
                        });

                        const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
                        const netProfit = totalRevenue - totalExpenses;

                        return (
                            <>
                                <div className="metrics-row">
                                    <div className="metric-card">
                                        <h4>Rent Roll</h4>
                                        <div className="metric-value">{totalRentRoll.toLocaleString()} CFA</div>
                                    </div>
                                    <div className="metric-card">
                                        <h4>Outstanding</h4>
                                        <div className="metric-value negative">{outstanding.toLocaleString()} CFA</div>
                                    </div>
                                    <div className="metric-card">
                                        <h4>Occupancy</h4>
                                        <div className="metric-value positive">{paidTenants}/{tenants.length}</div>
                                    </div>
                                    <div className="metric-card">
                                        <h4>Open Repairs</h4>
                                        <div className="metric-value" style={{ color: 'var(--color-warning)' }}>{openRepairs}</div>
                                    </div>
                                </div>

                                <div className="metrics-row">
                                    <div className="metric-card">
                                        <h3>Total Revenue</h3>
                                        <div className="metric-value positive">{totalRevenue.toLocaleString()} CFA</div>
                                    </div>
                                    <div className="metric-card">
                                        <h3>Total Expenses</h3>
                                        <div className="metric-value negative">{totalExpenses.toLocaleString()} CFA</div>
                                    </div>
                                    <div className="metric-card">
                                        <h3>Net Profit</h3>
                                        <div className={`metric-value ${netProfit >= 0 ? 'positive' : 'negative'}`}>
                                            {netProfit.toLocaleString()} CFA
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 2, background: 'var(--card-background)', padding: '24px', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)' }}>
                                        <h3>Monthly Revenue</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={(() => {
                                                const months: { [key: string]: number } = {};
                                                for (let i = 5; i >= 0; i--) {
                                                    const d = new Date();
                                                    d.setMonth(d.getMonth() - i);
                                                    const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
                                                    months[key] = 0;
                                                }
                                                tenants.forEach(t => {
                                                    t.payments?.forEach(p => {
                                                        const d = new Date(p.id);
                                                        const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
                                                        if (months[key] !== undefined) months[key] += p.amount;
                                                    });
                                                });
                                                return Object.entries(months).map(([name, amount]) => ({ name, amount }));
                                            })()}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" />
                                                <YAxis />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="amount" fill="#8884d8" name="Revenue" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div style={{ flex: 1, background: 'var(--card-background)', padding: '24px', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)' }}>
                                        <h3>Expenses Breakdown</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={(() => {
                                                        const cats: { [key: string]: number } = { 'Maintenance': 0, 'Utilities': 0, 'Taxes': 0, 'Other': 0 };
                                                        expenses.forEach(e => {
                                                            if (cats[e.category] !== undefined) cats[e.category] += e.amount;
                                                        });
                                                        return Object.entries(cats).map(([name, value]) => ({ name, value }));
                                                    })()}
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={80}
                                                    fill="#82ca9d"
                                                    dataKey="value"
                                                    label
                                                >
                                                    <Cell key="cell-0" fill="#0088FE" />
                                                    <Cell key="cell-1" fill="#00C49F" />
                                                    <Cell key="cell-2" fill="#FFBB28" />
                                                    <Cell key="cell-3" fill="#FF8042" />
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>
            ) : activeTab === 'tenants' ? (
                <>
                    <div className="add-tenant-section">
                        {!isFormOpen ? (
                            <button onClick={() => setIsFormOpen(true)} className="add-btn" style={{ width: '100%' }}>+ Add Tenant</button>
                        ) : (
                            <form onSubmit={handleAddTenant} className="form-panel">
                                <h3 style={{ marginBottom: '20px' }}>Add New Tenant</h3>
                                <div className="form-group">
                                    <input placeholder="Tenant Name" value={newName} onChange={e => setNewName(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <input placeholder="Email for Login" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <input placeholder="Unit Number" value={newUnit} onChange={e => setNewUnit(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <input placeholder="Phone Number" value={newPhone} onChange={e => setNewPhone(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <input type="number" placeholder="Monthly Rent (CFA)" value={newRent} onChange={e => setNewRent(e.target.value)} required />
                                </div>
                                <div className="action-row" style={{ justifyContent: 'flex-end' }}>
                                    <button type="button" className="btn-secondary" onClick={() => setIsFormOpen(false)}>Cancel</button>
                                    <button type="submit" className="btn-primary" disabled={isAddingTenant}>Save Tenant</button>
                                </div>
                            </form>
                        )}
                    </div>

                    <hr />

                    <div className="tenant-list">
                        {tenants.map((tenant) => (
                            <div key={tenant.id} className="tenant-card">
                                {tenant.propertyPhotoUrl ? (
                                    <img src={tenant.propertyPhotoUrl} alt="Property" className="tenant-card-image" />
                                ) : (
                                    <div className="tenant-card-image" style={{ background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>
                                        🏠 No Photo
                                    </div>
                                )}

                                <div className="content">
                                    <div onClick={() => setViewingTenant(tenant)} style={{ cursor: 'pointer' }}>
                                        <h3 style={{ textDecoration: 'underline', color: '#007bff', marginTop: 0 }}>{tenant.name} <small>({tenant.unit})</small></h3>
                                        {tenant.phone && <div style={{ fontSize: '0.8rem', color: '#555' }}>📞 {tenant.phone}</div>}
                                        <p>Rent: {tenant.monthlyRent} CFA</p>
                                        <div className={`status ${tenant.balance > 0 ? "owing" : "paid"}`}>
                                            {tenant.balance > 0 ? `Owes ${tenant.balance} CFA` : "Paid"}
                                        </div>
                                    </div>

                                    <div>
                                        {selectedTenantId === tenant.id ? (
                                            <div className="input-group" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                                <input
                                                    type="number"
                                                    placeholder="CFA"
                                                    value={paymentAmount}
                                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                                    style={{ width: '100%', boxSizing: 'border-box' }}
                                                />
                                                <div style={{ display: 'flex', gap: '5px', width: '100%', flexWrap: 'wrap' }}>
                                                    <button onClick={() => handlePayment(tenant.id)} style={{ flex: 1, fontSize: '0.8rem' }}>
                                                        Cash/Check
                                                    </button>
                                                    <button
                                                        onClick={() => setShowCardModal(true)}
                                                        style={{ flex: 1, background: '#6772e5', fontSize: '0.8rem' }}
                                                    >
                                                        Credit Card
                                                    </button>
                                                    <button
                                                        onClick={() => setShowMobileMoneyModal(true)}
                                                        style={{ flex: 1, background: '#FFCC00', color: '#000', fontSize: '0.8rem' }}
                                                    >
                                                        Mobile Money
                                                    </button>
                                                    {tenant.phone && (
                                                        <button
                                                            onClick={() => sendWhatsAppReminder(tenant)}
                                                            style={{ flex: 1, background: '#25D366', color: '#fff', fontSize: '0.8rem' }}
                                                        >
                                                            WhatsApp Reminder
                                                        </button>
                                                    )}
                                                </div>
                                                <button onClick={() => setSelectedTenantId(null)} style={{ background: '#666', width: '100%', marginTop: '5px' }}>Cancel</button>

                                                {showCardModal && (
                                                    <PaymentModal
                                                        amount={parseFloat(paymentAmount)}
                                                        tenantId={tenant.id}
                                                        onSuccess={() => handlePaymentSuccess(tenant.id, parseFloat(paymentAmount), 'Credit Card')}
                                                        onCancel={() => setShowCardModal(false)}
                                                    />
                                                )}
                                                {showMobileMoneyModal && (
                                                    // @ts-ignore
                                                    <MobileMoneyModal
                                                        amount={parseFloat(paymentAmount)}
                                                        tenantId={tenant.id}
                                                        onSuccess={() => handlePaymentSuccess(tenant.id, parseFloat(paymentAmount), 'Mobile Money')}
                                                        onCancel={() => setShowMobileMoneyModal(false)}
                                                    />
                                                )}
                                                <div className="action-row" style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                                                    <label className="btn-secondary" style={{ flex: 1, textAlign: 'center', cursor: 'pointer', fontSize: '0.8rem' }}>
                                                        {uploadingLease ? "Uploading..." : "📄 Upload Lease"}
                                                        <input type="file" hidden accept="application/pdf" onChange={(e) => handleUploadLease(e, tenant.id)} />
                                                    </label>
                                                    <label className="btn-secondary" style={{ flex: 1, textAlign: 'center', cursor: 'pointer', fontSize: '0.8rem' }}>
                                                        {uploadingPhoto ? "..." : "📷 Photo"}
                                                        <input type="file" hidden accept="image/*" onChange={(e) => handleUploadPhoto(e, tenant.id)} />
                                                    </label>
                                                </div>
                                            </div>
                                        ) : (
                                            <button className="btn-primary" style={{ width: '100%', marginTop: '10px' }} onClick={() => setSelectedTenantId(tenant.id)}>
                                                Actions / Pay
                                            </button>
                                        )}

                                        {tenant.leaseUrl && (
                                            <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'green' }}>
                                                <a href={tenant.leaseUrl} target="_blank" rel="noopener noreferrer">View Signed Lease</a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : activeTab === 'applications' ? (
                <div className="applications-tab">
                    <div className="add-tenant-section">
                        {!isAppFormOpen ? (
                            <button onClick={() => setIsAppFormOpen(true)} className="add-btn" style={{ width: '100%', background: '#6f42c1' }}>+ New Application</button>
                        ) : (
                            <form onSubmit={handleAddApplication} className="add-form">
                                <div className="form-row">
                                    <input placeholder="Name" value={appName} onChange={e => setAppName(e.target.value)} />
                                    <input placeholder="Desired Unit" value={appUnit} onChange={e => setAppUnit(e.target.value)} />
                                    <input placeholder="Phone" value={appPhone} onChange={e => setAppPhone(e.target.value)} />
                                    <input placeholder="Email" value={appEmail} onChange={e => setAppEmail(e.target.value)} />
                                    <input type="number" placeholder="Annual Income" value={appIncome} onChange={e => setAppIncome(e.target.value)} />
                                </div>
                                <div className="form-actions">
                                    <button type="submit" disabled={isAddingApp}>Save Application</button>
                                    <button type="button" onClick={() => setIsAppFormOpen(false)} style={{ background: '#666' }}>Cancel</button>
                                </div>
                            </form>
                        )}
                    </div>

                    <div className="tenant-list">
                        {applications.length === 0 && <p style={{ textAlign: 'center', color: '#666' }}>No active applications.</p>}
                        {applications.map(app => (
                            <div key={app.id} className="tenant-card" style={{ borderLeft: '5px solid #6f42c1' }}>
                                <h3>{app.name} <small>({app.desiredUnit})</small></h3>
                                <p>📞 {app.phone} | ✉️ {app.email}</p>
                                <p>Income: {app.income.toLocaleString()} CFA</p>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button onClick={() => approveApplication(app)} style={{ background: '#28a745', flex: 1 }}>Approve & Convert</button>
                                    <button onClick={() => rejectApplication(app.id)} style={{ background: '#dc3545', flex: 1 }}>Reject</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : activeTab === 'listings' ? (
                // --- LISTINGS TAB ---
                <div className="listings-tab">
                    <div className="add-tenant-section">
                        {!isListingFormOpen ? (
                            <button onClick={() => setIsListingFormOpen(true)} className="add-btn" style={{ width: '100%', background: '#007bff' }}>+ Create New Listing</button>
                        ) : (
                            <form onSubmit={handleAddListing} className="add-form">
                                <div className="form-row">
                                    <input placeholder="Title (e.g. Sunny Studio)" value={listingTitle} onChange={e => setListingTitle(e.target.value)} required />
                                    <input placeholder="Unit Number" value={listingUnit} onChange={e => setListingUnit(e.target.value)} required />
                                    <input type="number" placeholder="Rent (CFA)" value={listingRent} onChange={e => setListingRent(e.target.value)} required />
                                    <textarea placeholder="Description" value={listingDesc} onChange={e => setListingDesc(e.target.value)} style={{ width: '100%', padding: '8px' }} required />
                                </div>
                                <div className="form-actions">
                                    <button type="submit" disabled={isAddingListing}>Publish Listing</button>
                                    <button type="button" onClick={() => setIsListingFormOpen(false)} style={{ background: '#666' }}>Cancel</button>
                                </div>
                            </form>
                        )}
                    </div>

                    <div className="tenant-list">
                        {listings.length === 0 && <p style={{ textAlign: 'center', color: '#666' }}>No active listings.</p>}
                        {listings.map(listing => (
                            <div key={listing.id} className="tenant-card">
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    {/* PHOTO AREA */}
                                    <div style={{ width: '100px', height: '100px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                                        {listing.photoUrl ? (
                                            <img src={listing.photoUrl} alt="Listing" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: '2rem' }}>🏠</span>
                                        )}
                                        <input type="file" style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} onChange={(e) => handleUploadListingPhoto(e, listing.id)} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: 0 }}>{listing.title} <small>({listing.unit})</small></h3>
                                        <p style={{ fontWeight: 'bold', color: 'green' }}>{listing.rent} CFA</p>
                                        <p style={{ fontSize: '0.9rem', color: '#666' }}>{listing.description}</p>
                                    </div>
                                    <button onClick={() => handleDeleteListing(listing.id)} style={{ alignSelf: 'flex-start', background: 'transparent', color: 'red' }}>🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : activeTab === 'expenses' ? (
                <div className="expenses-tab">
                    <div className="add-tenant-section">
                        {!isExpenseFormOpen ? (
                            <button onClick={() => setIsExpenseFormOpen(true)} className="add-btn" style={{ width: '100%', background: '#dc3545' }}>+ Add Expense</button>
                        ) : (
                            <form onSubmit={handleAddExpense} className="add-form">
                                <div className="form-row">
                                    <input type="number" placeholder="Amount (CFA)" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
                                    <input placeholder="Description (e.g. Repairs)" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} />
                                    <select value={expenseCat} onChange={(e: any) => setExpenseCat(e.target.value)} style={{ padding: '8px' }}>
                                        <option value="Maintenance">Maintenance</option>
                                        <option value="Utilities">Utilities</option>
                                        <option value="Taxes">Taxes</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="form-actions">
                                    <button type="submit" disabled={isAddingExpense}>Save Expense</button>
                                    <button type="button" onClick={() => setIsExpenseFormOpen(false)} style={{ background: '#666' }}>Cancel</button>
                                </div>
                            </form>
                        )}
                    </div>

                    <div className="tenant-list">
                        <h3 style={{ marginTop: 0 }}>Expense History</h3>
                        {expenses.length === 0 && <p style={{ color: '#666' }}>No expenses recorded.</p>}
                        {expenses.map(exp => (
                            <div key={exp.id} className="tenant-card" style={{ borderLeft: '5px solid #dc3545', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 5px 0' }}>{exp.description}</h3>
                                    <div style={{ color: '#555', fontSize: '0.9rem' }}>{exp.date} • <span style={{ background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>{exp.category}</span></div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#dc3545' }}>-{exp.amount.toLocaleString()} CFA</div>
                                    <button onClick={() => handleDeleteExpense(exp.id)} style={{ padding: '2px 8px', fontSize: '0.7rem', background: 'transparent', color: '#999', marginTop: '5px' }}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="repairs-tab">
                    <div className="add-tenant-section">
                        {!isRepairFormOpen ? (
                            <button onClick={() => setIsRepairFormOpen(true)} className="add-btn" style={{ width: '100%', background: '#fd7e14' }}>+ Log Repair Request</button>
                        ) : (
                            <form onSubmit={handleAddRepair} className="add-form">
                                <div className="form-row">
                                    <select value={repairTenantId} onChange={e => setRepairTenantId(e.target.value)} style={{ padding: '8px' }}>
                                        <option value="">Select Tenant...</option>
                                        {tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.unit})</option>)}
                                    </select>
                                    <input placeholder="Issue Description (e.g. Leaky Faucet)" value={repairIssue} onChange={e => setRepairIssue(e.target.value)} />
                                    <select value={repairPriority} onChange={(e: any) => setRepairPriority(e.target.value)} style={{ padding: '8px' }}>
                                        <option value="Low">Low Priority</option>
                                        <option value="Medium">Medium Priority</option>
                                        <option value="High">High Priority</option>
                                    </select>
                                </div>
                                <div className="form-actions">
                                    <button type="submit" disabled={isAddingRepair}>Log Repair</button>
                                    <button type="button" onClick={() => setIsRepairFormOpen(false)} style={{ background: '#666' }}>Cancel</button>
                                </div>
                            </form>
                        )}
                    </div>

                    <div className="tenant-list">
                        <h3 style={{ marginTop: 0 }}>Active Repairs</h3>
                        {repairs.length === 0 && <p style={{ color: '#666' }}>No active repair requests.</p>}
                        {repairs.map(repair => (
                            <div key={repair.id} className="tenant-card" style={{ borderLeft: `5px solid ${repair.status === 'Open' ? '#fd7e14' : '#28a745'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 5px 0' }}>{repair.issue} <span style={{ fontSize: '0.8rem', background: repair.priority === 'High' ? '#dc3545' : '#ffc107', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>{repair.priority}</span></h3>
                                    <div style={{ color: '#555', fontSize: '0.9rem' }}>
                                        Tenant: <b>{repair.tenantName}</b> ({repair.unit}) • Reported: {repair.dateReported}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
                                    {repair.status === 'Open' ? (
                                        <button onClick={() => handleResolveRepair(repair)} style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#28a745' }}>Mark Resolved</button>
                                    ) : (
                                        <span style={{ color: '#28a745', fontWeight: 'bold' }}>✓ Resolved</span>
                                    )}
                                    <button onClick={() => handleDeleteRepair(repair.id)} style={{ padding: '2px 8px', fontSize: '0.7rem', background: 'transparent', color: '#999' }}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {viewingTenant && (
                <div className="modal-overlay" onClick={() => setViewingTenant(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <h2>{viewingTenant.name} Details</h2>
                            <button onClick={() => setViewingTenant(null)} style={{ background: 'transparent', color: 'black', fontSize: '1.5rem' }}>×</button>
                        </div>

                        <h4>Payment History</h4>
                        {viewingTenant.payments && viewingTenant.payments.length > 0 ? (
                            <ul className="payment-history">
                                {[...viewingTenant.payments].reverse().map((p) => (
                                    <li key={p.id} style={{ alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{p.date}</div>
                                            <div style={{ color: 'green' }}>+{p.amount} CFA</div>
                                            <div style={{ fontSize: '0.8rem', color: '#666' }}>{p.method}</div>
                                        </div>
                                        <button
                                            onClick={() => generateReceipt(p)}
                                            style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#17a2b8' }}
                                        >
                                            📄 Receipt
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No payments recorded yet.</p>
                        )}

                        <hr />

                        <div style={{ marginBottom: '20px' }}>
                            <h4>Lease Agreement</h4>
                            {viewingTenant.leaseUrl ? (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <a href={viewingTenant.leaseUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textDecoration: 'none' }}>
                                        <button style={{ width: '100%', background: '#17a2b8' }}>📄 View Current Lease</button>
                                    </a>
                                    <label className="upload-btn" style={{ cursor: 'pointer', background: '#6c757d', color: 'white', padding: '10px', borderRadius: '4px', textAlign: 'center' }}>
                                        Replace
                                        <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => handleUploadLease(e, viewingTenant.id)} />
                                    </label>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '20px', border: '2px dashed #ccc', borderRadius: '8px' }}>
                                    <p style={{ margin: '0 0 10px 0', color: '#666' }}>No lease uploaded.</p>
                                    <label className="upload-btn" style={{ cursor: 'pointer', background: '#007bff', color: 'white', padding: '8px 16px', borderRadius: '4px' }}>
                                        {uploadingLease ? "Uploading..." : "📂 Upload PDF Lease"}
                                        <input type="file" accept="application/pdf" style={{ display: 'none' }} disabled={uploadingLease} onChange={(e) => handleUploadLease(e, viewingTenant.id)} />
                                    </label>
                                </div>
                            )}
                        </div>

                        <hr />
                        <button
                            onClick={() => handleDeleteTenant(viewingTenant.id)}
                            style={{ background: '#dc3545', width: '100%', marginTop: '10px' }}
                        >
                            Delete Tenant
                        </button>
                    </div>
                </div>
            )}

            <Toaster position="top-right" />
        </div>
    );
}
