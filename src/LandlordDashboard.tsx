import { useState, useEffect, useMemo } from 'react';
import './App.css';
import type { Property, Tenant, Payment, RentalApplication, Expense, RepairRequest, Listing } from './types';
import { db, storage, functions } from './firebase';
import { type User } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import toast, { Toaster } from 'react-hot-toast';
import { jsPDF } from "jspdf";
import { PaymentModal } from './PaymentModal';
import { MobileMoneyModal } from './MobileMoneyModal';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, writeBatch, arrayUnion } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface LandlordDashboardProps {
    user: User;
    onLogout: () => void;
}

export function LandlordDashboard({ user, onLogout }: LandlordDashboardProps) {
    const { t } = useTranslation(['landlord', 'common']);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [applications, setApplications] = useState<RentalApplication[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [repairs, setRepairs] = useState<RepairRequest[]>([]);
    const [properties, setProperties] = useState<Property[]>([]); // NEW
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all'); // NEW
    const [activeTab, setActiveTab] = useState<'tenants' | 'applications' | 'dashboard' | 'expenses' | 'repairs' | 'listings' | 'properties'>('dashboard');

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
    const [newType, setNewType] = useState<'long-term' | 'short-term'>('long-term'); // NEW
    const [newDailyRate, setNewDailyRate] = useState(""); // NEW
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isAddingTenant, setIsAddingTenant] = useState(false);
    const [isStartingMonth, setIsStartingMonth] = useState(false);

    // Booking State
    const [bookNights, setBookNights] = useState("");
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [bookingTenantId, setBookingTenantId] = useState<string | null>(null);

    // Form State (Application)
    const [appName, setAppName] = useState("");
    const [appEmail, setAppEmail] = useState("");
    const [appPhone, setAppPhone] = useState("");
    const [appIncome, setAppIncome] = useState("");
    const [appUnit, setAppUnit] = useState("");
    const [isAppFormOpen, setIsAppFormOpen] = useState(false);
    const [isAddingApp, setIsAddingApp] = useState(false);

    // Form State (Listings)
    const [listings, setListings] = useState<Listing[]>([]);
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

    // Form State (Properties)
    const [propName, setPropName] = useState("");
    const [propAddress, setPropAddress] = useState("");
    const [isAddingProp, setIsAddingProp] = useState(false);
    const [isPropFormOpen, setIsPropFormOpen] = useState(false);

    // Lease/Photo Upload State
    const [uploadingLease, setUploadingLease] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // AI & Email State
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);

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
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing));
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

        // Fetch Properties
        const qProps = query(collection(db, "properties"), where("ownerId", "==", user.uid));
        const unsubProps = onSnapshot(qProps, (snapshot) => {
            const propsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
            setProperties(propsList);
            // Auto-select first property if none selected and properties exist? 
            // Better to keep 'all' as default for overview.
        });

        return () => {
            unsubTenants();
            unsubApps();
            unsubListings();
            unsubExpenses();
            unsubRepairs();
            unsubProps();
        };
    }, [user]);

    // --- FILTERED DATA ---
    const filteredTenants = useMemo(() => selectedPropertyId === 'all' ? tenants : tenants.filter(t => t.propertyId === selectedPropertyId), [tenants, selectedPropertyId]);
    const filteredApps = useMemo(() => selectedPropertyId === 'all' ? applications : applications.filter(a => a.propertyId === selectedPropertyId), [applications, selectedPropertyId]);
    const filteredListings = useMemo(() => selectedPropertyId === 'all' ? listings : listings.filter(l => l.propertyId === selectedPropertyId), [listings, selectedPropertyId]);
    const filteredExpenses = useMemo(() => selectedPropertyId === 'all' ? expenses : expenses.filter(e => e.propertyId === selectedPropertyId), [expenses, selectedPropertyId]);
    const filteredRepairs = useMemo(() => selectedPropertyId === 'all' ? repairs : repairs.filter(r => r.propertyId === selectedPropertyId), [repairs, selectedPropertyId]);

    // Calculate Dashboard Metrics based on FILTERED data
    const totalRentRoll = filteredTenants.reduce((acc, t) => acc + t.monthlyRent, 0);
    const outstanding = filteredTenants.reduce((acc, t) => acc + (t.balance > 0 ? t.balance : 0), 0);
    const paidTenants = filteredTenants.filter(t => t.balance <= 0).length;
    const openRepairs = filteredRepairs.filter(r => r.status === 'Open').length;

    let totalRevenue = 0;
    filteredTenants.forEach(t => {
        t.payments?.forEach(p => totalRevenue += p.amount);
    });

    const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    useEffect(() => {
        // Reset active tab if switching properties might empty a list? No, keep it.
    }, [selectedPropertyId]);




    const startNewMonth = async () => {
        if (!window.confirm(t('monthStart.confirm'))) return;
        setIsStartingMonth(true);
        try {
            const batch = writeBatch(db);
            tenants.forEach((tenant) => {
                batch.update(doc(db, "tenants", tenant.id), { balance: tenant.balance + tenant.monthlyRent });
            });
            await batch.commit();
            toast.success(t('monthStart.success'));
        } catch (error) {
            toast.error(t('monthStart.failed', { message: (error as Error).message }));
        } finally {
            setIsStartingMonth(false);
        }
    };

    const handleAddTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAddingTenant(true);
        try {
            const rentVal = parseFloat(newRent) || 0;
            const dailyVal = parseFloat(newDailyRate) || 0;

            await addDoc(collection(db, "tenants"), {
                ownerId: user.uid,
                name: newName,
                email: newEmail,
                unit: newUnit,
                phone: newPhone,
                monthlyRent: rentVal,
                // New Fields
                type: newType,
                dailyRate: dailyVal,
                status: 'occupied', // Default
                balance: 0,
                payments: []
            });
            toast.success(t('tenants.added'));
            setIsFormOpen(false);
            setNewName(""); setNewEmail(""); setNewUnit(""); setNewPhone(""); setNewRent(""); setNewDailyRate("");
        } catch (error) {
            const err = error as Error;
            toast.error(t('common:errors.generic', { message: err.message }));
        } finally {
            setIsAddingTenant(false);
        }
    };

    // --- SHORT-TERM BOOKING LOGIC ---
    const handleAddBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookingTenantId || !bookNights) return;

        const tenant = tenants.find(t => t.id === bookingTenantId);
        if (!tenant || tenant.type !== 'short-term') return;

        const nights = parseInt(bookNights);
        const rate = tenant.dailyRate || 0;
        const totalCost = nights * rate;

        try {
            const batch = writeBatch(db);
            const tenantRef = doc(db, "tenants", tenant.id);

            // 1. Add Payment Entry immediately (Upfront)
            const newPayment: Payment = {
                id: Date.now(),
                amount: totalCost,
                date: new Date().toLocaleDateString(),
                method: "Cash/Mobile Money"
            };

            batch.update(tenantRef, {
                payments: arrayUnion(newPayment),
                status: 'occupied' // Ensure marked as occupied
            });

            await batch.commit();
            toast.success(t('booking.confirmed', { amount: totalCost.toLocaleString() }));
            setIsBookingModalOpen(false);
            setBookNights("");
            setBookingTenantId(null);
        } catch (e) {
            toast.error(t('booking.failed', { message: (e as Error).message }));
        }
    };

    const handlePayment = async (tenantId: string) => {
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error(t('common:errors.validAmount'));
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
            toast.success(t('payments.recorded', { amount: amount.toLocaleString() }));
        } catch (error) {
            toast.error(t('payments.failed', { message: (error as Error).message }));
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
        toast.success(t('payments.successful'));
    };

    // --- APPLICATION ACTIONS ---
    const handleAddApplication = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!appName || !appEmail || !appPhone || !appIncome || !appUnit) {
            toast.error(t('common:errors.fillAllFields'));
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
            toast.success(t('applications.added'));
        } catch (err) {
            toast.error(t('common:errors.generic', { message: (err as Error).message }));
        } finally {
            setIsAddingApp(false);
        }
    };

    const approveApplication = async (app: RentalApplication) => {
        if (!window.confirm(t('applications.approveConfirm', { name: app.name, unit: app.desiredUnit }))) return;

        try {
            const batch = writeBatch(db);

            // 1. Create Tenant
            const newTenantRef = doc(collection(db, "tenants"));
            const tenantData = {
                ownerId: user.uid,
                propertyId: app.propertyId || null, // Link to property if available
                name: app.name,
                email: app.email, // CRITICAL: Required for login linking
                unit: app.desiredUnit,
                phone: app.phone,
                monthlyRent: 0, // Landlord needs to set this later, or we could prompt for it

                // Defaults for new tenant
                type: 'long-term',
                status: 'occupied',
                balance: 0,
                payments: []
            };
            batch.set(newTenantRef, tenantData);

            // 2. Delete Application
            const appRef = doc(db, "applications", app.id);
            batch.delete(appRef);

            await batch.commit();
            toast.success(t('applications.nowTenant', { name: app.name }));
        } catch (err) {
            toast.error(t('applications.approvalFailed', { message: (err as Error).message }));
        }
    };

    const rejectApplication = async (id: string) => {
        if (!window.confirm(t('applications.rejectConfirm'))) return;
        try {
            await deleteDoc(doc(db, "applications", id));
            toast.success(t('applications.rejected'));
        } catch (err) {
            toast.error(t('common:errors.generic', { message: (err as Error).message }));
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
            toast.success(t('listings.created'));
        } catch (e) {
            toast.error(t('common:errors.generic', { message: (e as Error).message }));
        } finally {
            setIsAddingListing(false);
        }
    };

    const handleDeleteListing = async (id: string) => {
        if (!window.confirm(t('listings.deleteConfirm'))) return;
        try {
            await deleteDoc(doc(db, "listings", id));
            toast.success(t('listings.deleted'));
        } catch (e) {
            toast.error(t('common:errors.generic', { message: (e as Error).message }));
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
            toast.success(t('listings.photoAdded'));
        } catch (e) {
            toast.error(t('lease.uploadFailed', { message: (e as Error).message }));
        }
    }

    // --- EXPENSE ACTIONS ---
    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseAmount || !expenseDesc || !expenseCat) {
            toast.error(t('common:errors.fillAllFields'));
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
            toast.success(t('expenses.added'));
        } catch (err) {
            toast.error(t('common:errors.generic', { message: (err as Error).message }));
        } finally {
            setIsAddingExpense(false);
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!window.confirm(t('expenses.deleteConfirm'))) return;
        try {
            await deleteDoc(doc(db, "expenses", id));
            toast.success(t('expenses.deleted'));
        } catch (err) {
            toast.error(t('expenses.deleteFailed', { message: (err as Error).message }));
        }
    };

    // --- REPAIR ACTIONS ---
    const handleAddRepair = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!repairTenantId || !repairIssue) {
            toast.error(t('repairs.selectIssue'));
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
            toast.success(t('repairs.logged'));
        } catch (err) {
            toast.error(t('common:errors.generic', { message: (err as Error).message }));
        } finally {
            setIsAddingRepair(false);
        }
    };

    const handleResolveRepair = async (repair: RepairRequest) => {
        const newStatus = repair.status === 'Open' ? 'Resolved' : 'Open';
        try {
            await updateDoc(doc(db, "repairs", repair.id), { status: newStatus });
            toast.success(t('repairs.markedAs', { status: newStatus }));
        } catch (err) {
            toast.error(t('repairs.updateError', { message: (err as Error).message }));
        }
    };

    const handleDeleteRepair = async (id: string) => {
        if (!window.confirm(t('repairs.deleteConfirm'))) return;
        try {
            await deleteDoc(doc(db, "repairs", id));
            toast.success(t('repairs.deleted'));
        } catch (err) {
            toast.error(t('repairs.deleteError', { message: (err as Error).message }));
        }
    };

    // --- PROPERTY ACTIONS ---
    const handleAddProperty = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!propName || !propAddress) {
            toast.error(t('common:errors.nameAddressRequired'));
            return;
        }
        setIsAddingProp(true);
        try {
            await addDoc(collection(db, "properties"), {
                ownerId: user.uid,
                name: propName,
                address: propAddress,
                amenities: [],
                image: ''
            });
            setPropName(""); setPropAddress("");
            setIsPropFormOpen(false);
            toast.success(t('properties.added'));
        } catch (e) {
            toast.error(t('common:errors.generic', { message: (e as Error).message }));
        } finally {
            setIsAddingProp(false);
        }
    };

    const handleDeleteProperty = async (id: string) => {
        if (!window.confirm(t('properties.deleteConfirm'))) return;
        try {
            await deleteDoc(doc(db, "properties", id));
            toast.success(t('properties.deleted'));
            if (selectedPropertyId === id) setSelectedPropertyId('all');
        } catch (e) {
            toast.error(t('common:errors.generic', { message: (e as Error).message }));
        }
    };

    const handleDeleteTenant = async (id: string) => {
        if (!window.confirm(t('tenants.deleteConfirm'))) return;
        try {
            await deleteDoc(doc(db, "tenants", id));
            setViewingTenant(null);
            toast.success(t('tenants.deleted'));
        } catch (error) {
            toast.error(t('common:errors.generic', { message: (error as Error).message }));
        }
    };

    // --- LEASE ACTIONS ---
    const handleUploadLease = async (e: React.ChangeEvent<HTMLInputElement>, tenantId: string) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        if (file.type !== 'application/pdf') {
            toast.error(t('lease.pdfOnly'));
            return;
        }

        setUploadingLease(true);
        try {
            const storageRef = ref(storage, `leases/${user?.uid}/${tenantId}/lease.pdf`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            await updateDoc(doc(db, "tenants", tenantId), { leaseUrl: url });
            toast.success(t('lease.uploaded'));

            setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, leaseUrl: url } : t));
            if (viewingTenant && viewingTenant.id === tenantId) {
                setViewingTenant(prev => prev ? { ...prev, leaseUrl: url } : null);
            }

        } catch (err) {
            toast.error(t('lease.uploadFailed', { message: (err as Error).message }));
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
            toast.success(t('lease.photoUploaded'));

            setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, propertyPhotoUrl: url } : t));
        } catch (err) {
            toast.error(t('lease.photoFailed', { message: (err as Error).message }));
        } finally {
            setUploadingPhoto(false);
        }
    };

    // --- WHATSAPP REMINDER ---
    const sendWhatsAppReminder = (tenant: Tenant) => {
        const amount = tenant.balance > 0 ? tenant.balance : 0;
        const text = t('whatsapp.reminder', { name: tenant.name, amount: amount.toLocaleString() });
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
        doc.text(t('receipt.title'), 105, 20, { align: "center" });

        // Line
        doc.setLineWidth(0.5);
        doc.line(20, 25, 190, 25);

        // Info
        doc.setFontSize(14);
        doc.text(t('receipt.datePaid', { date: payment.date }), 20, 40);
        doc.text(t('receipt.receiptId', { id: payment.id }), 20, 50);

        doc.text(t('receipt.receivedFrom'), 20, 70);
        doc.setFont("helvetica", "bold");
        doc.text(t('receipt.tenantUnit', { name: viewingTenant.name, unit: viewingTenant.unit }), 60, 70);
        doc.setFont("helvetica", "normal");

        doc.text(t('receipt.amountPaid'), 20, 80);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 128, 0); // Green color
        doc.text(`${payment.amount.toFixed(2)} CFA`, 60, 80);
        doc.setTextColor(0, 0, 0); // Reset color

        doc.text(t('receipt.method', { method: payment.method || 'N/A' }), 20, 90);

        // Footer
        doc.setFontSize(10);
        doc.text(t('receipt.thankYou'), 105, 110, { align: "center" });
        doc.text(t('receipt.landlordSignature'), 20, 130);

        // Save File
        doc.save(`receipt_${viewingTenant.name}_${payment.date}.pdf`);
    };

    // --- EMAIL RECEIPT ---
    const handleEmailReceipt = async (payment: Payment) => {
        if (!viewingTenant) return;
        if (!confirm(t('receipt.emailConfirm'))) return;

        setIsSendingEmail(true);
        try {
            const emailReceiptFn = httpsCallable(functions, 'emailReceipt');
            await emailReceiptFn({
                email: viewingTenant.email,
                tenantName: viewingTenant.name,
                amount: payment.amount,
                date: payment.date,
                paymentId: payment.id
            });
            toast.success(t('receipt.emailed'));
        } catch (error) {
            console.error(error);
            toast.error(t('receipt.emailFailed', { message: (error as Error).message }));
        } finally {
            setIsSendingEmail(false);
        }
    };

    // --- AI LISTING GENERATOR ---
    const handleAIWrite = async () => {
        if (!listingRent || !listingUnit) {
            toast.error(t('listings.aiHelp'));
            return;
        }
        setIsGeneratingAI(true);
        try {
            const generateFn = httpsCallable(functions, 'generateListingDescription');
            const result = await generateFn({
                type: 'Apartment',
                location: 'Ekpe, Benin',
                rent: listingRent,
                features: 'Secure, Near Beach, Accessibility' // Could be dynamic
            });
            const data = result.data as { description: string };
            setListingDesc(data.description);
            toast.success(t('listings.aiGenerated'));
        } catch (error) {
            toast.error(t('listings.aiError', { message: (error as Error).message }));
        } finally {
            setIsGeneratingAI(false);
        }
    };

    return (
        <div style={{ background: '#f9f9f9', minHeight: '100vh', paddingBottom: '60px' }}>
            {/* HEADER */}
            <div className="top-bar" style={{
                background: 'var(--secondary-color)',
                color: 'white',
                padding: 'clamp(12px, 3vw, 20px) clamp(16px, 4vw, 40px)',
                minHeight: 'var(--header-height)',
                height: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'clamp(10px, 2vw, 12px)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}>
                <div className="app-title" style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 'clamp(0.9rem, 3vw, 1.5rem)', fontWeight: 600, letterSpacing: '1px' }}>🏢 {t('header.title')}</div>
                <div className="action-row" style={{ marginTop: 0, gap: 'clamp(8px, 2vw, 10px)', flexWrap: 'wrap', alignItems: 'center' }}>
                    <LanguageSwitcher variant="dark" />
                    <button
                        className="btn-primary"
                        onClick={startNewMonth}
                        disabled={isStartingMonth}
                        style={{ backgroundColor: '#ff9800', border: 'none', padding: 'clamp(8px, 2vw, 10px) clamp(14px, 3vw, 18px)', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', minHeight: '44px' }}
                    >
                        {isStartingMonth ? t('header.startingMonth') : t('header.startMonth')}
                    </button>
                    <button className="btn-secondary btn-danger" onClick={onLogout} style={{ border: '1px solid rgba(255,255,255,0.3)', color: 'white', background: 'transparent', minHeight: '44px', padding: 'clamp(8px, 2vw, 10px) clamp(14px, 3vw, 18px)', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)' }}>{t('common:nav.logout')}</button>
                </div>
            </div>

            <div className="container" style={{ maxWidth: '1200px', margin: 'clamp(20px, 5vw, 40px) auto', padding: '0 clamp(16px, 3vw, 20px)' }}>
                {/* TABS */}
                <div className="tabs-container" style={{ marginBottom: 'clamp(20px, 4vw, 30px)', borderBottom: '2px solid #eee', overflowX: 'auto' }}>
                    {['dashboard', 'properties', 'tenants', 'applications', 'listings', 'expenses', 'repairs'].map((tab) => (
                        <div
                            key={tab}
                            className={`tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab as typeof activeTab)}
                            style={{
                                padding: 'clamp(12px, 3vw, 15px) clamp(16px, 4vw, 25px)',
                                fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
                                fontWeight: activeTab === tab ? 600 : 400,
                                color: activeTab === tab ? 'var(--primary-color)' : '#666',
                                borderBottom: activeTab === tab ? '3px solid var(--primary-color)' : 'none',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {t(`tabs.${tab}`)}
                            {tab === 'applications' && filteredApps.length > 0 && <span style={{ marginLeft: '8px', background: 'var(--color-warning)', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>{filteredApps.length}</span>}
                            {tab === 'repairs' && filteredRepairs.filter(r => r.status === 'Open').length > 0 && <span style={{ marginLeft: '8px', background: 'var(--color-danger)', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: 'clamp(0.7rem, 2vw, 0.8rem)' }}>{filteredRepairs.filter(r => r.status === 'Open').length}</span>}
                        </div>
                    ))}
                </div>

                {/* PROPERTY SELECTOR (Only if properties exist) */}
                {properties.length > 0 && (
                    <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600 }}>{t('propertyFilter.label')}</span>
                        <select
                            aria-label="Filter Properties"
                            value={selectedPropertyId}
                            onChange={(e) => setSelectedPropertyId(e.target.value)}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                        >
                            <option value="all">{t('propertyFilter.all')}</option>
                            {properties.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* PROPERTIES TAB CONTENT */}
                {activeTab === 'properties' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2>{t('properties.title')}</h2>
                            <button className="btn-primary" onClick={() => setIsPropFormOpen(true)}>{t('properties.addProperty')}</button>
                        </div>

                        {isPropFormOpen && (
                            <div className="modal-overlay">
                                <div className="modal-content">
                                    <h3>{t('properties.addPropertyTitle')}</h3>
                                    <form onSubmit={handleAddProperty}>
                                        <input placeholder={t('properties.namePlaceholder')} value={propName} onChange={e => setPropName(e.target.value)} required />
                                        <input placeholder={t('properties.addressPlaceholder')} value={propAddress} onChange={e => setPropAddress(e.target.value)} required />
                                        <div className="modal-actions">
                                            <button type="button" onClick={() => setIsPropFormOpen(false)}>{t('common:buttons.cancel')}</button>
                                            <button type="submit" className="btn-primary" disabled={isAddingProp}>{isAddingProp ? t('properties.adding') : t('properties.addProperty')}</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                            {properties.map(p => (
                                <div key={p.id} style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                                    <h3 style={{ margin: '0 0 10px 0' }}>{p.name}</h3>
                                    <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '15px' }}>{p.address}</p>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => { setSelectedPropertyId(p.id); setActiveTab('dashboard'); }} style={{ flex: 1, padding: '8px', cursor: 'pointer', background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: '4px' }}>{t('common:buttons.manage')}</button>
                                        <button onClick={() => handleDeleteProperty(p.id)} style={{ padding: '8px', cursor: 'pointer', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px' }}>{t('common:buttons.delete')}</button>
                                    </div>
                                </div>
                            ))}
                            {properties.length === 0 && <p style={{ color: '#888' }}>{t('properties.noProperties')}</p>}
                        </div>
                    </div>
                )}

                {activeTab === 'dashboard' ? (
                    <div className="dashboard">
                        {/* METRIC CARDS */}
                        <div className="metrics-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 'clamp(16px, 3vw, 20px)', marginBottom: 'clamp(24px, 4vw, 30px)' }}>
                            <div className="metric-card" style={{ background: 'white', padding: 'clamp(20px, 4vw, 25px)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#888', textTransform: 'uppercase', fontSize: 'clamp(0.75rem, 2vw, 0.85rem)', letterSpacing: '1px' }}>{t('dashboard.rentRoll')}</h4>
                                <div className="metric-value" style={{ fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', fontWeight: 700, color: 'var(--secondary-color)', wordBreak: 'break-word' }}>{totalRentRoll.toLocaleString()} CFA</div>
                            </div>
                            <div className="metric-card" style={{ background: 'white', padding: 'clamp(20px, 4vw, 25px)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#888', textTransform: 'uppercase', fontSize: 'clamp(0.75rem, 2vw, 0.85rem)', letterSpacing: '1px' }}>{t('dashboard.outstanding')}</h4>
                                <div className="metric-value negative" style={{ fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', fontWeight: 700, color: 'var(--color-danger)', wordBreak: 'break-word' }}>{outstanding.toLocaleString()} CFA</div>
                            </div>
                            <div className="metric-card" style={{ background: 'white', padding: 'clamp(20px, 4vw, 25px)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#888', textTransform: 'uppercase', fontSize: 'clamp(0.75rem, 2vw, 0.85rem)', letterSpacing: '1px' }}>{t('dashboard.occupancy')}</h4>
                                <div className="metric-value positive" style={{ fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', fontWeight: 700, color: 'var(--color-success)' }}>{paidTenants}/{filteredTenants.length}</div>
                            </div>
                            <div className="metric-card" style={{ background: 'white', padding: 'clamp(20px, 4vw, 25px)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                <h4 style={{ margin: '0 0 10px 0', color: '#888', textTransform: 'uppercase', fontSize: 'clamp(0.75rem, 2vw, 0.85rem)', letterSpacing: '1px' }}>{t('dashboard.openRepairs')}</h4>
                                <div className="metric-value" style={{ fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', fontWeight: 700, color: openRepairs > 0 ? 'var(--color-warning)' : '#ccc' }}>{openRepairs}</div>
                            </div>
                        </div>

                        <div className="metrics-row">
                            <div className="metric-card">
                                <h3>{t('dashboard.totalRevenue')}</h3>
                                <div className="metric-value positive">{totalRevenue.toLocaleString()} CFA</div>
                            </div>
                            <div className="metric-card">
                                <h3>{t('dashboard.totalExpenses')}</h3>
                                <div className="metric-value negative">{totalExpenses.toLocaleString()} CFA</div>
                            </div>
                            <div className="metric-card">
                                <h3>{t('dashboard.netProfit')}</h3>
                                <div className={`metric-value ${netProfit >= 0 ? 'positive' : 'negative'}`}>
                                    {netProfit.toLocaleString()} CFA
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 'clamp(20px, 4vw, 24px)', flexWrap: 'wrap' }}>
                            <div style={{ flex: '2 1 300px', minWidth: '0', background: 'var(--card-background)', padding: 'clamp(20px, 4vw, 24px)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)' }}>
                                <h3 style={{ fontSize: 'clamp(1rem, 3vw, 1.2rem)' }}>{t('dashboard.monthlyRevenue')}</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={(() => {
                                        const months: { [key: string]: number } = {};
                                        for (let i = 5; i >= 0; i--) {
                                            const d = new Date();
                                            d.setMonth(d.getMonth() - i);
                                            const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
                                            months[key] = 0;
                                        }
                                        filteredTenants.forEach(t => {
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
                                        <Bar dataKey="amount" fill="#8884d8" name={t('dashboard.chartRevenue')} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div style={{ flex: '1 1 250px', minWidth: '0', background: 'var(--card-background)', padding: 'clamp(20px, 4vw, 24px)', borderRadius: 'var(--border-radius)', boxShadow: 'var(--shadow-sm)' }}>
                                <h3 style={{ fontSize: 'clamp(1rem, 3vw, 1.2rem)' }}>{t('dashboard.expensesBreakdown')}</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={(() => {
                                                const cats: { [key: string]: number } = { 'Maintenance': 0, 'Utilities': 0, 'Taxes': 0, 'Other': 0 };
                                                filteredExpenses.forEach(e => {
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
                    </div>
                ) : activeTab === 'tenants' ? (
                    <>
                        <div className="add-tenant-section">
                            {!isFormOpen ? (
                                <button onClick={() => setIsFormOpen(true)} className="add-btn" style={{ width: '100%' }}>{t('tenants.addUnit')}</button>
                            ) : (
                                <form onSubmit={handleAddTenant} className="form-panel">
                                    <h3 style={{ marginBottom: '20px' }}>{t('tenants.addUnitTitle')}</h3>
                                    <div className="form-group">
                                        <select value={newType} onChange={(e) => setNewType(e.target.value as ('long-term' | 'short-term'))} style={{ padding: '8px' }}>
                                            <option value="long-term">{t('common:rentalType.longTerm')}</option>
                                            <option value="short-term">{t('common:rentalType.shortTerm')}</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <input placeholder={t('tenants.namePlaceholder')} value={newName} onChange={e => setNewName(e.target.value)} required />
                                    </div>
                                    <div className="form-group">
                                        <input placeholder={t('tenants.unitPlaceholder')} value={newUnit} onChange={e => setNewUnit(e.target.value)} required />
                                    </div>
                                    <div className="form-group">
                                        {newType === 'long-term' ? (
                                            <input type="number" placeholder={t('tenants.monthlyRentPlaceholder')} value={newRent} onChange={e => setNewRent(e.target.value)} required />
                                        ) : (
                                            <input type="number" placeholder={t('tenants.dailyRatePlaceholder')} value={newDailyRate} onChange={e => setNewDailyRate(e.target.value)} required />
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <input placeholder={t('tenants.emailPlaceholder')} value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <input placeholder={t('tenants.phonePlaceholder')} value={newPhone} onChange={e => setNewPhone(e.target.value)} required />
                                    </div>
                                    <div className="action-row" style={{ justifyContent: 'flex-end' }}>
                                        <button type="button" className="btn-secondary" onClick={() => setIsFormOpen(false)}>{t('common:buttons.cancel')}</button>
                                        <button type="submit" className="btn-primary" disabled={isAddingTenant}>{t('tenants.saveUnit')}</button>
                                    </div>
                                </form>
                            )}
                        </div>

                        <hr />

                        <div className="tenant-list">
                            {filteredTenants.map((tenant) => (
                                <div key={tenant.id} className="tenant-card">
                                    {tenant.propertyPhotoUrl ? (
                                        <img src={tenant.propertyPhotoUrl} alt="Property" className="tenant-card-image" />
                                    ) : (
                                        <div className="tenant-card-image" style={{ background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>
                                            🏠 {t('tenants.noPhoto')}
                                        </div>
                                    )}

                                    <div className="content">
                                        <div onClick={() => setViewingTenant(tenant)} style={{ cursor: 'pointer' }}>
                                            <h3 className="tenant-name">
                                                {tenant.name}
                                                {tenant.type === 'short-term' && <span style={{ fontSize: '0.7rem', background: '#e83e8c', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '5px' }}>STR</span>}
                                            </h3>
                                            <p className="tenant-unit">{tenant.unit}</p>
                                            <div style={{ marginTop: '5px', fontSize: '0.9rem', color: '#666' }}>
                                                {tenant.type === 'short-term' ? (
                                                    <>{t('tenants.daily')} <b>{tenant.dailyRate?.toLocaleString()} CFA</b></>
                                                ) : (
                                                    <>{t('tenants.rent')} <b>{tenant.monthlyRent.toLocaleString()} CFA</b></>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flex: 1 }}>
                                            <div className={`balance-badge ${tenant.balance <= 0 ? 'balance-paid' : 'balance-owing'}`} style={{ marginBottom: '10px' }}>
                                                {tenant.balance > 0 ? t('tenants.owes', { amount: tenant.balance.toLocaleString() }) : t('common:status.paid')}
                                            </div>

                                            {selectedTenantId === tenant.id ? (
                                                <div className="mobile-input-group">
                                                    <input
                                                        type="number"
                                                        placeholder={t('tenants.amountPlaceholder')}
                                                        value={paymentAmount}
                                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                                        style={{ width: '100%', padding: 'clamp(10px, 2.5vw, 12px)', marginBottom: '10px', boxSizing: 'border-box', fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}
                                                    />
                                                    <div className="action-grid">
                                                        <button onClick={() => handlePayment(tenant.id)} className="btn-secondary" style={{ flex: 1, fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', padding: 'clamp(10px, 2.5vw, 12px)' }}>{t('tenants.cash')}</button>
                                                        <button onClick={() => setShowCardModal(true)} className="btn-primary" style={{ flex: 1, background: '#6772e5', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', padding: 'clamp(10px, 2.5vw, 12px)' }}>{t('tenants.card')}</button>
                                                        <button onClick={() => setShowMobileMoneyModal(true)} className="btn-primary" style={{ flex: 1, background: '#FFCC00', color: '#000', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', padding: 'clamp(10px, 2.5vw, 12px)' }}>{t('tenants.mobile')}</button>
                                                    </div>

                                                    <div className="action-row" style={{ marginTop: '5px', width: '100%', gap: 'clamp(6px, 2vw, 8px)' }}>
                                                        <label className="btn-secondary" style={{ flex: 1, textAlign: 'center', cursor: 'pointer', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', padding: 'clamp(8px, 2vw, 10px)' }}>
                                                            {uploadingLease ? "..." : `📄 ${t('tenants.lease')}`}
                                                            <input type="file" hidden accept="application/pdf" onChange={(e) => handleUploadLease(e, tenant.id)} />
                                                        </label>
                                                        <label className="btn-secondary" style={{ flex: 1, textAlign: 'center', cursor: 'pointer', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', padding: 'clamp(8px, 2vw, 10px)' }}>
                                                            {uploadingPhoto ? "..." : `📷 ${t('tenants.photo')}`}
                                                            <input type="file" hidden accept="image/*" onChange={(e) => handleUploadPhoto(e, tenant.id)} />
                                                        </label>
                                                    </div>

                                                    <button onClick={() => setSelectedTenantId(null)} style={{ background: '#dc3545', color: 'white', width: '100%', marginTop: '15px', fontSize: 'clamp(0.9rem, 2.5vw, 1rem)', padding: 'clamp(10px, 2.5vw, 12px)', borderRadius: '8px', border: 'none', minHeight: '44px' }}>{t('common:buttons.close')}</button>

                                                    {showCardModal && (
                                                        <PaymentModal
                                                            amount={parseFloat(paymentAmount)}
                                                            tenantId={tenant.id}
                                                            onSuccess={() => handlePaymentSuccess(tenant.id, parseFloat(paymentAmount), 'Credit Card')}
                                                            onCancel={() => setShowCardModal(false)}
                                                        />
                                                    )}
                                                    {showMobileMoneyModal && (
                                                        <MobileMoneyModal
                                                            amount={parseFloat(paymentAmount)}
                                                            tenantId={tenant.id}
                                                            onSuccess={() => handlePaymentSuccess(tenant.id, parseFloat(paymentAmount), 'Mobile Money')}
                                                            onCancel={() => setShowMobileMoneyModal(false)}
                                                        />
                                                    )}
                                                </div>
                                            ) : (
                                                // Collapsed Actions
                                                <>
                                                    {tenant.type === 'short-term' ? (
                                                        <button
                                                            className="btn-primary"
                                                            style={{ fontSize: '0.8rem', padding: '8px 12px', background: '#6f42c1', width: '100%' }}
                                                            onClick={() => { setBookingTenantId(tenant.id); setIsBookingModalOpen(true); }}
                                                        >
                                                            📅 {t('tenants.newBooking')}
                                                        </button>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                            <button
                                                                className="btn-primary"
                                                                style={{ fontSize: '0.8rem', padding: '8px 12px', width: '100%' }}
                                                                onClick={() => setSelectedTenantId(tenant.id)}
                                                            >
                                                                {t('tenants.actionsAndPay')}
                                                            </button>
                                                            <button
                                                                className="btn-secondary"
                                                                style={{ fontSize: '0.8rem', padding: '5px', width: '100%' }}
                                                                onClick={() => sendWhatsAppReminder(tenant)}
                                                            >
                                                                {t('tenants.whatsapp')}
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
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
                                <button onClick={() => setIsAppFormOpen(true)} className="add-btn" style={{ width: '100%', background: '#6f42c1' }}>{t('applications.newApplication')}</button>
                            ) : (
                                <form onSubmit={handleAddApplication} className="add-form">
                                    <div className="form-row">
                                        <input placeholder={t('applications.namePlaceholder')} value={appName} onChange={e => setAppName(e.target.value)} />
                                        <input placeholder={t('applications.unitPlaceholder')} value={appUnit} onChange={e => setAppUnit(e.target.value)} />
                                        <input placeholder={t('applications.phonePlaceholder')} value={appPhone} onChange={e => setAppPhone(e.target.value)} />
                                        <input placeholder={t('applications.emailPlaceholder')} value={appEmail} onChange={e => setAppEmail(e.target.value)} />
                                        <input type="number" placeholder={t('applications.incomePlaceholder')} value={appIncome} onChange={e => setAppIncome(e.target.value)} />
                                    </div>
                                    <div className="form-actions">
                                        <button type="submit" disabled={isAddingApp}>{t('applications.saveApplication')}</button>
                                        <button type="button" onClick={() => setIsAppFormOpen(false)} style={{ background: '#666' }}>{t('common:buttons.cancel')}</button>
                                    </div>
                                </form>
                            )}
                        </div>

                        <div className="tenant-list">
                            {filteredApps.length === 0 && <p style={{ textAlign: 'center', color: '#666' }}>{t('applications.noApplications')}</p>}
                            {filteredApps.map(app => (
                                <div key={app.id} className="tenant-card" style={{ borderLeft: '5px solid #6f42c1' }}>
                                    <h3>{app.name} <small>({app.desiredUnit})</small></h3>
                                    <p>📞 {app.phone} | ✉️ {app.email}</p>
                                    <p>{t('applications.income', { amount: app.income.toLocaleString() })}</p>
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                        <button onClick={() => approveApplication(app)} style={{ background: '#28a745', flex: 1 }}>{t('applications.approveAndConvert')}</button>
                                        <button onClick={() => rejectApplication(app.id)} style={{ background: '#dc3545', flex: 1 }}>{t('applications.reject')}</button>
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
                                <button onClick={() => setIsListingFormOpen(true)} className="add-btn" style={{ width: '100%', background: '#007bff' }}>{t('listings.createNew')}</button>
                            ) : (
                                <form onSubmit={handleAddListing} className="add-form">
                                    <div className="form-row">
                                        <input placeholder={t('listings.titlePlaceholder')} value={listingTitle} onChange={e => setListingTitle(e.target.value)} required />
                                        <input placeholder={t('listings.unitPlaceholder')} value={listingUnit} onChange={e => setListingUnit(e.target.value)} required />
                                        <input type="number" placeholder={t('listings.rentPlaceholder')} value={listingRent} onChange={e => setListingRent(e.target.value)} required />
                                        <textarea placeholder={t('listings.descriptionPlaceholder')} value={listingDesc} onChange={e => setListingDesc(e.target.value)} style={{ width: '100%', padding: '8px' }} required />
                                    </div>
                                    <div className="form-actions">
                                        <button type="submit" disabled={isAddingListing}>{t('listings.publish')}</button>
                                        <button type="button" onClick={handleAIWrite} disabled={isGeneratingAI} style={{ background: '#6f42c1' }}>
                                            {isGeneratingAI ? `✨ ${t('listings.aiWriting')}` : `✨ ${t('listings.aiWrite')}`}
                                        </button>
                                        <button type="button" onClick={() => setIsListingFormOpen(false)} style={{ background: '#666' }}>{t('common:buttons.cancel')}</button>
                                    </div>
                                </form>
                            )}
                        </div>

                        <div className="tenant-list">
                            {filteredListings.length === 0 && <p style={{ textAlign: 'center', color: '#666' }}>{t('listings.noListings')}</p>}
                            {filteredListings.map(listing => (
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
                                <button onClick={() => setIsExpenseFormOpen(true)} className="add-btn" style={{ width: '100%', background: '#dc3545' }}>{t('expenses.addExpense')}</button>
                            ) : (
                                <form onSubmit={handleAddExpense} className="add-form">
                                    <div className="form-row">
                                        <input type="number" placeholder={t('expenses.amountPlaceholder')} value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
                                        <input placeholder={t('expenses.descriptionPlaceholder')} value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} />
                                        <select value={expenseCat} onChange={(e) => setExpenseCat(e.target.value as ('Maintenance' | 'Utilities' | 'Taxes' | 'Other'))} style={{ padding: '8px' }}>
                                            <option value="Maintenance">{t('common:categories.maintenance')}</option>
                                            <option value="Utilities">{t('common:categories.utilities')}</option>
                                            <option value="Taxes">{t('common:categories.taxes')}</option>
                                            <option value="Other">{t('common:categories.other')}</option>
                                        </select>
                                    </div>
                                    <div className="form-actions">
                                        <button type="submit" disabled={isAddingExpense}>{t('expenses.saveExpense')}</button>
                                        <button type="button" onClick={() => setIsExpenseFormOpen(false)} style={{ background: '#666' }}>{t('common:buttons.cancel')}</button>
                                    </div>
                                </form>
                            )}
                        </div>

                        <div className="tenant-list">
                            <h3 style={{ marginTop: 0 }}>{t('expenses.history')}</h3>
                            {filteredExpenses.length === 0 && <p style={{ color: '#666' }}>{t('expenses.noExpenses')}</p>}
                            {filteredExpenses.map(exp => (
                                <div key={exp.id} className="tenant-card" style={{ borderLeft: '5px solid #dc3545', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 5px 0' }}>{exp.description}</h3>
                                        <div style={{ color: '#555', fontSize: '0.9rem' }}>{exp.date} • <span style={{ background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>{exp.category}</span></div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#dc3545' }}>-{exp.amount.toLocaleString()} CFA</div>
                                        <button onClick={() => handleDeleteExpense(exp.id)} style={{ padding: '2px 8px', fontSize: '0.7rem', background: 'transparent', color: '#999', marginTop: '5px' }}>{t('common:buttons.delete')}</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="repairs-tab">
                        <div className="add-tenant-section">
                            {!isRepairFormOpen ? (
                                <button onClick={() => setIsRepairFormOpen(true)} className="add-btn" style={{ width: '100%', background: '#fd7e14' }}>{t('repairs.logRepair')}</button>
                            ) : (
                                <form onSubmit={handleAddRepair} className="add-form">
                                    <div className="form-row">
                                        <select value={repairTenantId} onChange={e => setRepairTenantId(e.target.value)} style={{ padding: '8px' }}>
                                            <option value="">{t('repairs.selectTenant')}</option>
                                            {filteredTenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.unit})</option>)}
                                        </select>
                                        <input placeholder={t('repairs.issuePlaceholder')} value={repairIssue} onChange={e => setRepairIssue(e.target.value)} />
                                        <select value={repairPriority} onChange={(e) => setRepairPriority(e.target.value as ('Low' | 'Medium' | 'High'))} style={{ padding: '8px' }}>
                                            <option value="Low">{t('common:priority.lowPriority')}</option>
                                            <option value="Medium">{t('common:priority.mediumPriority')}</option>
                                            <option value="High">{t('common:priority.highPriority')}</option>
                                        </select>
                                    </div>
                                    <div className="form-actions">
                                        <button type="submit" disabled={isAddingRepair}>{t('repairs.logButton')}</button>
                                        <button type="button" onClick={() => setIsRepairFormOpen(false)} style={{ background: '#666' }}>{t('common:buttons.cancel')}</button>
                                    </div>
                                </form>
                            )}
                        </div>

                        <div className="tenant-list">
                            <h3 style={{ marginTop: 0 }}>{t('repairs.activeRepairs')}</h3>
                            {filteredRepairs.length === 0 && <p style={{ color: '#666' }}>{t('repairs.noRepairs')}</p>}
                            {filteredRepairs.map(repair => (
                                <div key={repair.id} className="tenant-card" style={{ borderLeft: `5px solid ${repair.status === 'Open' ? '#fd7e14' : '#28a745'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 5px 0' }}>{repair.issue} <span style={{ fontSize: '0.8rem', background: repair.priority === 'High' ? '#dc3545' : '#ffc107', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>{repair.priority}</span></h3>
                                        <div style={{ color: '#555', fontSize: '0.9rem' }}>
                                            {t('repairs.tenant')} <b>{repair.tenantName}</b> ({repair.unit}) • {t('repairs.reported')} {repair.dateReported}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
                                        {repair.status === 'Open' ? (
                                            <button onClick={() => handleResolveRepair(repair)} style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#28a745' }}>{t('repairs.markResolved')}</button>
                                        ) : (
                                            <span style={{ color: '#28a745', fontWeight: 'bold' }}>✓ {t('repairs.resolved')}</span>
                                        )}
                                        <button onClick={() => handleDeleteRepair(repair.id)} style={{ padding: '2px 8px', fontSize: '0.7rem', background: 'transparent', color: '#999' }}>{t('common:buttons.delete')}</button>
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
                                <h2>{t('tenants.details', { name: viewingTenant.name })}</h2>
                                <button onClick={() => setViewingTenant(null)} style={{ background: 'transparent', color: 'black', fontSize: '1.5rem' }}>×</button>
                            </div>

                            <h4>{t('payments.history')}</h4>
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
                                                📄 {t('payments.receipt')}
                                            </button>
                                            <button
                                                onClick={() => handleEmailReceipt(p)}
                                                disabled={isSendingEmail}
                                                style={{ padding: '5px 10px', fontSize: '0.8rem', background: '#28a745', marginLeft: '5px' }}
                                            >
                                                📧 {isSendingEmail ? t('payments.sending') : t('payments.email')}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>{t('payments.noPayments')}</p>
                            )}

                            <hr />

                            <div style={{ marginBottom: '20px' }}>
                                <h4>{t('lease.title')}</h4>
                                {viewingTenant.leaseUrl ? (
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <a href={viewingTenant.leaseUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textDecoration: 'none' }}>
                                            <button style={{ width: '100%', background: '#17a2b8' }}>📄 {t('lease.viewCurrent')}</button>
                                        </a>
                                        <label className="upload-btn" style={{ cursor: 'pointer', background: '#6c757d', color: 'white', padding: '10px', borderRadius: '4px', textAlign: 'center' }}>
                                            {t('lease.replace')}
                                            <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => handleUploadLease(e, viewingTenant.id)} />
                                        </label>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '20px', border: '2px dashed #ccc', borderRadius: '8px' }}>
                                        <p style={{ margin: '0 0 10px 0', color: '#666' }}>{t('lease.noLease')}</p>
                                        <label className="upload-btn" style={{ cursor: 'pointer', background: '#007bff', color: 'white', padding: '8px 16px', borderRadius: '4px' }}>
                                            {uploadingLease ? t('lease.uploading') : `📂 ${t('lease.uploadPdf')}`}
                                            <input type="file" accept="application/pdf" style={{ display: 'none' }} disabled={uploadingLease} onChange={(e) => handleUploadLease(e, viewingTenant.id)} />
                                        </label>
                                    </div>
                                )}

                                {/* Signature Status */}
                                <div style={{ marginTop: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{t('lease.tenantSignature')}</div>
                                    {viewingTenant.leaseSignature ? (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: '0.9rem' }}>{t('common:status.signed')}</span>
                                                <span style={{ color: '#888', fontSize: '0.8rem' }}>
                                                    {viewingTenant.leaseSignedAt ? new Date(viewingTenant.leaseSignedAt).toLocaleDateString() : ''}
                                                </span>
                                            </div>
                                            <img
                                                src={viewingTenant.leaseSignature}
                                                alt={`${viewingTenant.name}'s signature`}
                                                style={{ maxWidth: '220px', height: '60px', objectFit: 'contain', border: '1px solid #ddd', borderRadius: '4px', padding: '4px', background: 'white' }}
                                            />
                                        </div>
                                    ) : (
                                        <span style={{ color: '#999', fontSize: '0.85rem' }}>{t('lease.awaitingSignature')}</span>
                                    )}
                                </div>
                            </div>

                            <hr />
                            <button
                                onClick={() => handleDeleteTenant(viewingTenant.id)}
                                style={{ background: '#dc3545', width: '100%', marginTop: '10px' }}
                            >
                                {t('tenants.deleteTenant')}
                            </button>
                        </div>
                    </div>
                )}

                {/* BOOKING MODAL */}
                {isBookingModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>{t('booking.title')}</h3>
                            <p>{t('booking.tenant', { name: filteredTenants.find(tn => tn.id === bookingTenantId)?.name })}</p>
                            <p>{t('booking.rate')} <b>{t('common:currency.perNight', { amount: filteredTenants.find(tn => tn.id === bookingTenantId)?.dailyRate?.toLocaleString() })}</b></p>

                            <form onSubmit={handleAddBooking}>
                                <div className="form-group">
                                    <label>{t('booking.numberOfNights')}</label>
                                    <input
                                        type="number"
                                        value={bookNights}
                                        onChange={e => setBookNights(e.target.value)}
                                        min="1"
                                        required
                                        autoFocus
                                    />
                                </div>

                                {bookNights && (
                                    <div style={{ margin: '20px 0', padding: '15px', background: '#f0fff4', border: '1px solid #c3e6cb', borderRadius: '4px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                            <span>{t('booking.totalToCollect')}</span>
                                            <span>{(parseInt(bookNights) * (filteredTenants.find(tn => tn.id === bookingTenantId)?.dailyRate || 0)).toLocaleString()} CFA</span>
                                        </div>
                                    </div>
                                )}

                                <div className="action-row">
                                    <button type="button" className="btn-secondary" onClick={() => setIsBookingModalOpen(false)}>{t('common:buttons.cancel')}</button>
                                    <button type="submit" className="btn-primary">{t('booking.confirmAndPay')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <Toaster position="top-right" />
            </div>
        </div>
    );
}

