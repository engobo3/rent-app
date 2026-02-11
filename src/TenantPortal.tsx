import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Tenant, RepairRequest } from './types';
import { db } from './firebase';
import { collection, query, where, addDoc, onSnapshot, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import toast, { Toaster } from 'react-hot-toast';
import { PaymentModal } from './PaymentModal';
import { MobileMoneyModal } from './MobileMoneyModal';
import { SignaturePad } from './SignaturePad';
import { LanguageSwitcher } from './LanguageSwitcher';

interface TenantPortalProps {
    tenant: Tenant;
    onLogout: () => void;
}

export function TenantPortal({ tenant, onLogout }: TenantPortalProps) {
    const { t } = useTranslation(['tenant', 'common']);
    const [repairs, setRepairs] = useState<RepairRequest[]>([]);

    // Payment State
    const [showCardModal, setShowCardModal] = useState(false);
    const [showMobileMoneyModal, setShowMobileMoneyModal] = useState(false);

    // Lease Signing State
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [isSigning, setIsSigning] = useState(false);

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
            await updateDoc(doc(db, "tenants", tenant.id), {
                balance: tenant.balance - amount,
                payments: arrayUnion(payment)
            });

            toast.success(t('payment.success', { amount: amount.toLocaleString() }));
            setShowCardModal(false);
            setShowMobileMoneyModal(false);
        } catch (e) {
            console.error(e);
            toast.error(t('payment.failed', { message: (e as Error).message }));
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
            toast.success(t('maintenance.submitted'));
            setIsRepairFormOpen(false);
            setRepairIssue("");
            setRepairPriority("Medium");
        } catch (error) {
            toast.error(t('maintenance.submitError', { message: (error as Error).message }));
        } finally {
            setIsSubmittingRepair(false);
        }
    };

    const handleSignLease = async (signatureDataUrl: string) => {
        setIsSigning(true);
        try {
            await updateDoc(doc(db, "tenants", tenant.id), {
                leaseSignature: signatureDataUrl,
                leaseSignedAt: new Date().toISOString()
            });
            toast.success(t('lease.signed'));
            setShowSignaturePad(false);
        } catch (error) {
            toast.error(t('lease.signFailed', { message: (error as Error).message }));
        } finally {
            setIsSigning(false);
        }
    };

    return (
        <div style={{ background: '#f9f9f9', minHeight: '100vh' }}>
            {/* HERO BANNER */}
            {tenant.propertyPhotoUrl && (
                <div className="hero-banner" style={{
                    backgroundImage: `url(${tenant.propertyPhotoUrl})`,
                    minHeight: '250px',
                    height: 'clamp(250px, 40vh, 300px)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative'
                }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))' }}></div>
                </div>
            )}

            {/* Header */}
            <div className="top-bar" style={{
                position: tenant.propertyPhotoUrl ? 'absolute' : 'relative',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 10,
                padding: 'clamp(16px, 3vw, 20px) clamp(20px, 4vw, 40px)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                background: tenant.propertyPhotoUrl ? 'transparent' : 'var(--secondary-color)',
                color: 'white',
                borderBottom: tenant.propertyPhotoUrl ? 'none' : '1px solid rgba(255,255,255,0.1)'
            }}>
                <div className="app-title" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, letterSpacing: '1px', fontSize: 'clamp(0.9rem, 2.5vw, 1.2rem)' }}>
                    {tenant.propertyPhotoUrl ? t('header.myHome') : t('header.resident')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 3vw, 20px)', flexWrap: 'wrap' }}>
                    <LanguageSwitcher variant="dark" />
                    <span style={{ fontSize: 'clamp(0.85rem, 2vw, 0.9rem)', opacity: 0.9 }}>{t('header.welcome')} <b>{tenant.name}</b></span>
                    <button onClick={onLogout} className="btn-secondary" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px 15px', fontSize: 'clamp(0.75rem, 2vw, 0.8rem)' }}>{t('common:nav.logout')}</button>
                </div>
            </div>

            <div className="container" style={{ maxWidth: '1000px', margin: tenant.propertyPhotoUrl ? 'clamp(-40px, -8vw, -60px) auto 0' : '0 auto', padding: '0 20px', position: 'relative', zIndex: 20 }}>
                {/* BALANCE CARD */}
                <div style={{
                    background: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    padding: 'clamp(20px, 5vw, 40px)',
                    textAlign: 'center',
                    marginBottom: 'clamp(24px, 5vw, 40px)',
                    borderTop: '4px solid var(--primary-color)'
                }}>
                    <h3 style={{ margin: 0, color: '#888', textTransform: 'uppercase', letterSpacing: 'clamp(1px, 0.5vw, 2px)', fontSize: 'clamp(0.7rem, 2vw, 0.9rem)', marginBottom: 'clamp(10px, 3vw, 15px)' }}>{t('balance.title')}</h3>
                    <div style={{ fontSize: 'clamp(1.8rem, 7vw, 3.5rem)', fontWeight: '800', color: tenant.balance > 0 ? 'var(--secondary-color)' : 'var(--color-success)', marginBottom: 'clamp(20px, 4vw, 30px)', fontFamily: 'Montserrat, sans-serif', wordBreak: 'break-word' }}>
                        {tenant.balance > 0 ? `${tenant.balance.toLocaleString()} CFA` : t('balance.paidInFull')}
                    </div>

                    {tenant.balance > 0 ? (
                        <div style={{ display: 'flex', gap: 'clamp(10px, 2.5vw, 12px)', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '500px', margin: '0 auto' }}>
                            <button className="btn-primary" onClick={() => setShowCardModal(true)} style={{ padding: 'clamp(12px, 3vw, 15px) clamp(20px, 4vw, 30px)', fontSize: 'clamp(0.85rem, 2.5vw, 1rem)', flex: '1 1 auto', minWidth: 'clamp(120px, 25vw, 140px)' }}>{t('balance.payWithCard')}</button>
                            <button className="btn-primary" style={{ background: '#FFCC00', color: 'black', padding: 'clamp(12px, 3vw, 15px) clamp(20px, 4vw, 30px)', fontSize: 'clamp(0.85rem, 2.5vw, 1rem)', flex: '1 1 auto', minWidth: 'clamp(120px, 25vw, 140px)' }} onClick={() => setShowMobileMoneyModal(true)}>{t('balance.mobileMoney')}</button>
                        </div>
                    ) : (
                        <div style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: 'clamp(0.95rem, 3vw, 1.2rem)' }}>
                            {t('balance.thankYou')}
                        </div>
                    )}
                </div>

                {/* ACTIONS GRID */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: 'clamp(16px, 4vw, 30px)', marginBottom: 'clamp(24px, 5vw, 40px)' }}>
                    {/* Lease Card */}
                    <div style={{ background: 'white', padding: 'clamp(20px, 4vw, 30px)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: 'clamp(12px, 3vw, 15px)' }}>📄</div>
                        <h4 style={{ margin: '0 0 clamp(8px, 2vw, 10px) 0', textTransform: 'uppercase', letterSpacing: '1px', fontSize: 'clamp(0.85rem, 2.5vw, 1rem)' }}>{t('lease.title')}</h4>

                        {tenant.leaseSignature ? (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                    <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>{t('common:status.signed')}</span>
                                    <span style={{ color: '#888', fontSize: 'clamp(0.75rem, 2vw, 0.8rem)' }}>
                                        {tenant.leaseSignedAt ? new Date(tenant.leaseSignedAt).toLocaleDateString() : ''}
                                    </span>
                                </div>
                                <img
                                    src={tenant.leaseSignature}
                                    alt="Your signature"
                                    style={{ maxWidth: '200px', height: '60px', objectFit: 'contain', marginBottom: '12px', border: '1px solid #eee', borderRadius: '4px', padding: '4px', background: '#fafafa' }}
                                />
                            </>
                        ) : tenant.leaseUrl ? (
                            <p style={{ color: '#666', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', marginBottom: 'clamp(12px, 2vw, 16px)', lineHeight: '1.5' }}>
                                {t('lease.readyForSigning')}
                            </p>
                        ) : (
                            <p style={{ color: '#666', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', marginBottom: 'clamp(12px, 2vw, 16px)', lineHeight: '1.5' }}>
                                {t('lease.noLeaseUploaded')}
                            </p>
                        )}

                        <div style={{ display: 'flex', gap: '8px', width: '100%', flexDirection: 'column' }}>
                            {tenant.leaseUrl && (
                                <a href={tenant.leaseUrl} target="_blank" rel="noopener noreferrer" style={{ width: '100%' }}>
                                    <button className="btn-outline" style={{ width: '100%', padding: 'clamp(10px, 2.5vw, 12px)', minHeight: '44px', fontSize: 'clamp(0.85rem, 2vw, 0.9rem)' }}>{t('lease.viewPdf')}</button>
                                </a>
                            )}
                            {tenant.leaseUrl && !tenant.leaseSignature && (
                                <button
                                    className="btn-primary"
                                    onClick={() => setShowSignaturePad(true)}
                                    disabled={isSigning}
                                    style={{ width: '100%', padding: 'clamp(10px, 2.5vw, 12px)', minHeight: '44px', fontSize: 'clamp(0.85rem, 2vw, 0.9rem)' }}
                                >
                                    {isSigning ? t('lease.signing') : t('lease.signLease')}
                                </button>
                            )}
                            {!tenant.leaseUrl && (
                                <button className="btn-outline" disabled style={{ width: '100%', opacity: 0.5, cursor: 'not-allowed', padding: 'clamp(10px, 2.5vw, 12px)', minHeight: '44px', fontSize: 'clamp(0.85rem, 2vw, 0.9rem)' }}>{t('lease.noLeaseAvailable')}</button>
                            )}
                        </div>
                    </div>

                    {/* Report Repair Card */}
                    <div style={{ background: 'white', padding: 'clamp(20px, 4vw, 30px)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: 'clamp(12px, 3vw, 15px)' }}>🔧</div>
                        <h4 style={{ margin: '0 0 clamp(8px, 2vw, 10px) 0', textTransform: 'uppercase', letterSpacing: '1px', fontSize: 'clamp(0.85rem, 2.5vw, 1rem)' }}>{t('maintenance.title')}</h4>
                        <p style={{ color: '#666', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', marginBottom: 'clamp(16px, 3vw, 20px)', lineHeight: '1.5' }}>{t('maintenance.description')}</p>
                        <button className="btn-outline" style={{ width: '100%', padding: 'clamp(10px, 2.5vw, 12px)', minHeight: '44px', fontSize: 'clamp(0.85rem, 2vw, 0.9rem)' }} onClick={() => setIsRepairFormOpen(true)}>{t('maintenance.requestRepair')}</button>
                    </div>
                </div>

                {/* REPAIRS LIST */}
                <h3 style={{ marginBottom: 'clamp(16px, 3vw, 20px)', fontSize: 'clamp(1.1rem, 3vw, 1.3rem)' }}>{t('maintenance.myRequests')}</h3>
                {isRepairFormOpen && (
                    <div className="form-panel">
                        <h3>{t('maintenance.newRequest')}</h3>
                        <form onSubmit={handleReportRepair}>
                            <div className="form-group">
                                <label htmlFor="repairIssue">{t('maintenance.describeIssue')}</label>
                                <textarea
                                    id="repairIssue"
                                    value={repairIssue}
                                    onChange={e => setRepairIssue(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '80px' }}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="repairPriority">{t('maintenance.priority')}</label>
                                <select id="repairPriority" value={repairPriority} onChange={e => setRepairPriority(e.target.value as 'Low' | 'Medium' | 'High')}>
                                    <option value="Low">{t('common:priority.low')}</option>
                                    <option value="Medium">{t('common:priority.medium')}</option>
                                    <option value="High">{t('common:priority.high')}</option>
                                </select>
                            </div>
                            <div className="action-row">
                                <button type="button" className="btn-secondary" onClick={() => setIsRepairFormOpen(false)}>{t('common:buttons.cancel')}</button>
                                <button type="submit" className="btn-primary" disabled={isSubmittingRepair}>{t('maintenance.submitRequest')}</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="listing-grid" style={{ gridTemplateColumns: '1fr' }}>
                    {repairs.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>{t('maintenance.noRequests')}</p>}
                    {repairs.map(repair => (
                        <div key={repair.id} className="listing-card" style={{ borderLeft: `4px solid ${repair.status === 'Open' ? 'var(--color-warning)' : 'var(--color-success)'}` }}>
                            <div className="card-header">
                                <span style={{ fontWeight: 'bold' }}>{repair.issue}</span>
                                <span className={`balance-badge ${repair.status === 'Open' ? 'balance-owing' : 'balance-paid'}`}>{repair.status}</span>
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                {repair.dateReported} • {t('maintenance.priority')}: {repair.priority}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODALS */}
            {showSignaturePad && (
                <SignaturePad
                    onSign={handleSignLease}
                    onCancel={() => setShowSignaturePad(false)}
                />
            )}
            {showCardModal && (
                <PaymentModal
                    amount={tenant.balance > 0 ? tenant.balance : 0}
                    tenantId={tenant.id}
                    onSuccess={() => handlePaymentSuccess(tenant.balance, 'Credit Card')}
                    onCancel={() => setShowCardModal(false)}
                />
            )}
            {showMobileMoneyModal && (
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
