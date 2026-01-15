import { useState, useEffect } from 'react';
import type { Tenant, RepairRequest } from './types';
import { db } from './firebase';
import { collection, query, where, addDoc, onSnapshot } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import { PaymentModal } from './PaymentModal';
import { MobileMoneyModal } from './MobileMoneyModal';

interface TenantPortalProps {
    tenant: Tenant;
    onLogout: () => void;
}

export function TenantPortal({ tenant, onLogout }: TenantPortalProps) {
    const [repairs, setRepairs] = useState<RepairRequest[]>([]);

    // Payment State
    const [showCardModal, setShowCardModal] = useState(false);
    const [showMobileMoneyModal, setShowMobileMoneyModal] = useState(false);

    // Repair State
    const [isRepairFormOpen, setIsRepairFormOpen] = useState(false);
    const [repairIssue, setRepairIssue] = useState("");
    const [repairPriority, setRepairPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
    const [isSubmittingRepair, setIsSubmittingRepair] = useState(false);

    // Listen for real-time balance updates
    useEffect(() => {
        // In a real app, we'd listen to the specific tenant doc. 
        // For now, assuming parent passes updated tenant or we just use initial.
        // But let's actually listen to repairs for this tenant.
        if (!tenant.id) return;

        const qRepairs = query(
            collection(db, "repairs"),
            where("tenantId", "==", tenant.id)
            // orderBy("dateReported", "desc") // Requires index
        );

        const unsubscribe = onSnapshot(qRepairs, (snapshot) => {
            const repairsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as RepairRequest));
            // Sort client-side to avoid index requirement for now
            repairsList.sort((a, b) => new Date(b.dateReported).getTime() - new Date(a.dateReported).getTime());
            setRepairs(repairsList);
        });

        return () => unsubscribe();
    }, [tenant.id]);

    const handlePaymentSuccess = async (amount: number, method: string) => {
        try {
            // Direct update for now, mimicking Landlord logic
            const payment = { id: Date.now(), amount, date: new Date().toLocaleDateString(), method };
            // @ts-ignore
            await import('firebase/firestore').then(({ updateDoc, doc, arrayUnion }) => {
                updateDoc(doc(db, "tenants", tenant.id), {
                    balance: tenant.balance - amount,
                    payments: arrayUnion(payment)
                });
            });

            toast.success(`Payment of ${amount.toLocaleString()} CFA successful!`);
            setShowCardModal(false);
            setShowMobileMoneyModal(false);
        } catch (e: any) {
            console.error(e);
            toast.error("Payment update failed: " + e.message);
        }
    };

    const handleReportRepair = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingRepair(true);
        try {
            const newRepair: Omit<RepairRequest, 'id'> = {
                ownerId: tenant.ownerId,
                tenantId: tenant.id,
                tenantName: tenant.name,
                unit: tenant.unit,
                issue: repairIssue,
                priority: repairPriority,
                status: 'Open',
                dateReported: new Date().toLocaleDateString(),
            };
            await addDoc(collection(db, "repairs"), newRepair);
            toast.success("Repair request submitted!");
            setIsRepairFormOpen(false);
            setRepairIssue("");
            setRepairPriority("Medium");
        } catch (error: any) {
            toast.error("Error: " + error.message);
        } finally {
            setIsSubmittingRepair(false);
        }
    };

    return (
        <div className="container" style={{ padding: 0 }}>
            {/* HERO BANNER */}
            {tenant.propertyPhotoUrl && (
                <div className="hero-banner" style={{ backgroundImage: `url(${tenant.propertyPhotoUrl})` }}>
                    <div className="hero-overlay"></div>
                </div>
            )}

            {/* Header */}
            <div className="top-bar" style={{ position: 'relative', zIndex: 10, background: tenant.propertyPhotoUrl ? 'transparent' : 'white', color: tenant.propertyPhotoUrl ? 'white' : 'black', textShadow: tenant.propertyPhotoUrl ? '0 2px 4px rgba(0,0,0,0.5)' : 'none' }}>
                <div className="app-title">🏠 My Home</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>Welcome, <b>{tenant.name}</b></span>
                    <button onClick={onLogout} className="btn-secondary btn-danger">Logout</button>
                </div>
            </div>

            {/* BALANCE CARD */}
            <div className="form-panel" style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto 40px auto', position: 'relative', zIndex: 10, marginTop: tenant.propertyPhotoUrl ? '40px' : '0' }}>
                <h3 style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px' }}>Current Balance</h3>
                <div style={{ fontSize: '3rem', fontWeight: '800', color: tenant.balance > 0 ? 'var(--primary-color)' : 'var(--color-success)', marginBottom: '20px' }}>
                    {tenant.balance > 0 ? `$${tenant.balance.toLocaleString()} Due` : "Paid ✓"}
                </div>

                {tenant.balance > 0 && (
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button className="btn-primary" onClick={() => setShowCardModal(true)}>Pay with Card</button>
                        <button className="btn-primary" style={{ background: '#FFCC00', color: 'black' }} onClick={() => setShowMobileMoneyModal(true)}>Mobile Money</button>
                    </div>
                )}
            </div>

            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {/* ACTIONS GRID */}
                <div className="listing-grid" style={{ marginBottom: '40px' }}>
                    {/* Lease Card */}
                    <div className="listing-card">
                        <div className="card-header">
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>📄 Lease Agreement</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>View your signed lease document.</p>
                        {tenant.leaseUrl ? (
                            <a href={tenant.leaseUrl} target="_blank" rel="noopener noreferrer">
                                <button className="btn-secondary" style={{ width: '100%' }}>View Lease PDF</button>
                            </a>
                        ) : (
                            <button className="btn-secondary" disabled style={{ width: '100%', opacity: 0.5 }}>No Lease Available</button>
                        )}
                    </div>

                    {/* Report Repair Card */}
                    <div className="listing-card" onClick={() => setIsRepairFormOpen(true)}>
                        <div className="card-header">
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>🔧 Request Repair</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Something broken? Let us know.</p>
                        <button className="btn-secondary" style={{ width: '100%' }}>Log Issue</button>
                    </div>
                </div>

                {/* REPAIRS LIST */}
                <h3 style={{ marginBottom: '20px' }}>My Repair Requests</h3>
                {isRepairFormOpen && (
                    <div className="form-panel">
                        <h3>New Repair Request</h3>
                        <form onSubmit={handleReportRepair}>
                            <div className="form-group">
                                <label>Describe the issue</label>
                                <textarea
                                    value={repairIssue}
                                    onChange={e => setRepairIssue(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '80px' }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Priority</label>
                                <select value={repairPriority} onChange={e => setRepairPriority(e.target.value as any)}>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                            <div className="action-row">
                                <button type="button" className="btn-secondary" onClick={() => setIsRepairFormOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={isSubmittingRepair}>Submit Request</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="listing-grid" style={{ gridTemplateColumns: '1fr' }}>
                    {repairs.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No requests found.</p>}
                    {repairs.map(repair => (
                        <div key={repair.id} className="listing-card" style={{ borderLeft: `4px solid ${repair.status === 'Open' ? 'var(--color-warning)' : 'var(--color-success)'}` }}>
                            <div className="card-header">
                                <span style={{ fontWeight: 'bold' }}>{repair.issue}</span>
                                <span className={`balance-badge ${repair.status === 'Open' ? 'balance-owing' : 'balance-paid'}`}>{repair.status}</span>
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                {repair.dateReported} • Priority: {repair.priority}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODALS */}
            {showCardModal && (
                <PaymentModal
                    amount={tenant.balance > 0 ? tenant.balance : 0}
                    tenantId={tenant.id}
                    onSuccess={() => handlePaymentSuccess(tenant.balance, 'Credit Card')}
                    onCancel={() => setShowCardModal(false)}
                />
            )}
            {showMobileMoneyModal && (
                // @ts-ignore
                <MobileMoneyModal
                    amount={tenant.balance > 0 ? tenant.balance : 0}
                    tenantId={tenant.id}
                    onSuccess={() => handlePaymentSuccess(tenant.balance, 'Mobile Money')}
                    onCancel={() => setShowMobileMoneyModal(false)}
                />
            )}
            <Toaster position="top-right" />
        </div>
    );
}
