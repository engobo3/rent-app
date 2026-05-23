import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Tenant, RepairRequest, Payment } from './types';
import { db } from './firebase';
import { collection, query, where, addDoc, onSnapshot, updateDoc, deleteDoc, doc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';

/**
 * Build a Payment object with a unique `uid` so two near-simultaneous writes
 * with otherwise-identical data aren't deduplicated by `arrayUnion`'s
 * deep-equality semantics.
 */
function buildPayment(amount: number, method: string): Payment {
    return {
        id: Date.now(),
        uid: typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        amount,
        date: new Date().toLocaleDateString(),
        method,
    };
}
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
    const [activeTab, setActiveTab] = useState<'payments' | 'repairs' | 'documents'>('payments');

    // Payment State
    const [showCardModal, setShowCardModal] = useState(false);
    const [showMobileMoneyModal, setShowMobileMoneyModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');

    // Lease Signing State
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [isSigning, setIsSigning] = useState(false);

    // Repair State
    const [isRepairFormOpen, setIsRepairFormOpen] = useState(false);
    const [repairIssue, setRepairIssue] = useState("");
    const [repairPriority, setRepairPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
    const [isSubmittingRepair, setIsSubmittingRepair] = useState(false);

    // Real-time listener for repairs (tenant data is already real-time from App.tsx)
    useEffect(() => {
        if (!tenant.id) return;

        const qRepairs = query(
            collection(db, "repairs"),
            where("tenantId", "==", tenant.id)
        );

        const unsubRepairs = onSnapshot(qRepairs, (snapshot) => {
            const repairsList = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as RepairRequest));
            repairsList.sort((a, b) => new Date(b.dateReported).getTime() - new Date(a.dateReported).getTime());
            setRepairs(repairsList);
        });

        return () => unsubRepairs();
    }, [tenant.id]);

    const openRepairsCount = repairs.filter(r => r.status === 'Open').length;

    const getPaymentAmount = () => {
        const amt = parseFloat(paymentAmount);
        return isNaN(amt) || amt <= 0 ? 0 : Math.min(amt, tenant.balance);
    };

    const handlePaymentSuccess = async (amount: number, method: string) => {
        try {
            const payment = buildPayment(amount, method);
            // Use Firestore `increment` so two quick clicks both decrement
            // the balance correctly instead of computing against the same
            // stale `tenant.balance` snapshot from props.
            await updateDoc(doc(db, "tenants", tenant.id), {
                balance: increment(-amount),
                payments: arrayUnion(payment)
            });

            toast.success(t('payment.success', { amount: amount.toLocaleString() }));
            setShowCardModal(false);
            setShowMobileMoneyModal(false);
            setPaymentAmount('');
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

    const handleCancelPayment = async (payment: Payment) => {
        if (!window.confirm(t('statement.cancelConfirm'))) return;
        try {
            // `arrayRemove` matches on deep equality, so we need to pass the
            // full payment object — including `uid` when present — to be
            // sure we remove exactly the right entry.
            const removeShape: Payment = {
                id: payment.id,
                amount: payment.amount,
                date: payment.date,
                method: payment.method,
                ...(payment.uid !== undefined ? { uid: payment.uid } : {}),
            };
            await updateDoc(doc(db, "tenants", tenant.id), {
                balance: increment(payment.amount),
                payments: arrayRemove(removeShape)
            });
            toast.success(t('statement.cancelSuccess'));
        } catch (error) {
            toast.error(t('statement.cancelFailed', { message: (error as Error).message }));
        }
    };

    const handleCancelRepair = async (repairId: string) => {
        if (!window.confirm(t('maintenance.cancelConfirm'))) return;
        try {
            await deleteDoc(doc(db, "repairs", repairId));
            toast.success(t('maintenance.cancelSuccess'));
        } catch (error) {
            toast.error(t('maintenance.cancelFailed', { message: (error as Error).message }));
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

    const tabs: { key: typeof activeTab; label: string; badge?: number }[] = [
        { key: 'payments', label: t('tabs.payments') },
        { key: 'repairs', label: t('tabs.repairs'), badge: openRepairsCount || undefined },
        { key: 'documents', label: t('tabs.documents') },
    ];

    return (
        <div style={{ background: '#f9f9f9', minHeight: '100vh' }}>
            {/* Header */}
            <div className="top-bar" style={{
                padding: 'clamp(16px, 3vw, 20px) clamp(20px, 4vw, 40px)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                background: 'var(--secondary-color)',
                color: 'white',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div className="app-title" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, letterSpacing: '1px', fontSize: 'clamp(0.9rem, 2.5vw, 1.2rem)' }}>
                    {t('header.resident')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 3vw, 20px)', flexWrap: 'wrap' }}>
                    <LanguageSwitcher variant="dark" />
                    <span style={{ fontSize: 'clamp(0.85rem, 2vw, 0.9rem)', opacity: 0.9 }}>{t('header.welcome')} <b>{tenant.name}</b></span>
                    <button onClick={onLogout} className="btn-secondary" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', padding: '8px 15px', fontSize: 'clamp(0.75rem, 2vw, 0.8rem)' }}>{t('common:nav.logout')}</button>
                </div>
            </div>

            <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: 'clamp(20px, 4vw, 30px) 20px' }}>
                {/* PROFILE CARD */}
                <div style={{
                    background: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    padding: 'clamp(20px, 4vw, 30px)',
                    marginBottom: 'clamp(20px, 4vw, 30px)',
                    borderTop: '4px solid var(--primary-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'clamp(16px, 4vw, 24px)',
                    flexWrap: 'wrap'
                }}>
                    {/* Photo thumbnail or default icon */}
                    {tenant.propertyPhotoUrl ? (
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            backgroundImage: `url(${tenant.propertyPhotoUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            flexShrink: 0,
                            border: '2px solid #eee'
                        }} />
                    ) : (
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'var(--primary-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            color: 'white',
                            flexShrink: 0
                        }}>
                            {tenant.name.charAt(0).toUpperCase()}
                        </div>
                    )}

                    {/* Tenant info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 'clamp(1.1rem, 3vw, 1.3rem)', marginBottom: '4px' }}>
                            {tenant.name}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', color: '#666' }}>
                            <span>{t('profile.unit')}: <b>{tenant.unit}</b></span>
                            <span>{t('profile.monthlyRent')}: <b>{tenant.monthlyRent.toLocaleString()} CFA</b></span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: 'clamp(0.75rem, 2vw, 0.85rem)', color: '#888', marginTop: '4px' }}>
                            {tenant.email && <span>{tenant.email}</span>}
                            {tenant.phone && <span>{tenant.phone}</span>}
                        </div>
                    </div>

                    {/* Balance badge */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 'clamp(1.2rem, 4vw, 1.6rem)', fontWeight: 800, fontFamily: 'Montserrat, sans-serif', color: tenant.balance > 0 ? 'var(--secondary-color)' : 'var(--color-success)' }}>
                            {tenant.balance > 0 ? `${tenant.balance.toLocaleString()} CFA` : t('balance.paidInFull')}
                        </div>
                        <span className={`balance-badge ${tenant.balance > 0 ? 'balance-owing' : 'balance-paid'}`} style={{ fontSize: '0.75rem' }}>
                            {tenant.balance > 0 ? t('profile.owes') : t('profile.paid')}
                        </span>
                    </div>
                </div>

                {/* TAB BAR */}
                <div className="tabs-container" style={{ marginBottom: 'clamp(20px, 4vw, 30px)', borderBottom: '2px solid #eee', overflowX: 'auto' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                fontWeight: activeTab === tab.key ? 600 : 400,
                                color: activeTab === tab.key ? 'var(--primary-color)' : '#666',
                                borderBottom: activeTab === tab.key ? '3px solid var(--primary-color)' : 'none',
                                position: 'relative',
                            }}
                        >
                            {tab.label}
                            {tab.badge ? (
                                <span style={{
                                    background: 'var(--color-warning, #ffc107)',
                                    color: '#333',
                                    borderRadius: '10px',
                                    padding: '1px 7px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    marginLeft: '6px'
                                }}>{tab.badge}</span>
                            ) : null}
                        </button>
                    ))}
                </div>

                {/* TAB CONTENT */}
                {activeTab === 'payments' && (
                    <div>
                        {/* Payment input + buttons */}
                        {tenant.balance > 0 ? (
                            <div style={{
                                background: 'white',
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                padding: 'clamp(20px, 4vw, 30px)',
                                marginBottom: 'clamp(20px, 4vw, 30px)',
                                textAlign: 'center'
                            }}>
                                <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                                    <div style={{ marginBottom: 'clamp(12px, 3vw, 16px)' }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', marginBottom: '6px' }}>{t('balance.amountLabel')}</label>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <input
                                                type="number"
                                                value={paymentAmount}
                                                onChange={e => setPaymentAmount(e.target.value)}
                                                placeholder={tenant.balance.toLocaleString()}
                                                min="1"
                                                max={tenant.balance}
                                                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', textAlign: 'center' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setPaymentAmount(String(tenant.balance))}
                                                className="btn-outline"
                                                style={{ padding: '12px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                            >{t('balance.payFull')}</button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 'clamp(10px, 2.5vw, 12px)', justifyContent: 'center', flexWrap: 'wrap' }}>
                                        <button className="btn-primary" onClick={() => setShowCardModal(true)} disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > tenant.balance} style={{ padding: 'clamp(12px, 3vw, 15px) clamp(20px, 4vw, 30px)', fontSize: 'clamp(0.85rem, 2.5vw, 1rem)', flex: '1 1 auto', minWidth: 'clamp(120px, 25vw, 140px)' }}>{t('balance.payWithCard')}</button>
                                        <button className="btn-primary" style={{ background: '#FFCC00', color: 'black', padding: 'clamp(12px, 3vw, 15px) clamp(20px, 4vw, 30px)', fontSize: 'clamp(0.85rem, 2.5vw, 1rem)', flex: '1 1 auto', minWidth: 'clamp(120px, 25vw, 140px)' }} disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > tenant.balance} onClick={() => setShowMobileMoneyModal(true)}>{t('balance.mobileMoney')}</button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                background: 'white',
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                padding: 'clamp(20px, 4vw, 30px)',
                                marginBottom: 'clamp(20px, 4vw, 30px)',
                                textAlign: 'center',
                                color: 'var(--color-success)',
                                fontWeight: 600,
                                fontSize: 'clamp(0.95rem, 3vw, 1.2rem)'
                            }}>
                                {t('balance.thankYou')}
                            </div>
                        )}

                        {/* Payment history */}
                        <div style={{
                            background: 'white',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                            padding: 'clamp(20px, 4vw, 30px)',
                        }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: 'clamp(1rem, 3vw, 1.2rem)' }}>
                                {t('statement.title')}
                            </h3>

                            <div style={{
                                padding: '15px',
                                background: '#f8f9fa',
                                borderRadius: '8px',
                                marginBottom: '20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '12px'
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: '#888', textTransform: 'uppercase' }}>
                                        {t('statement.monthlyRent')}
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>
                                        {tenant.monthlyRent.toLocaleString()} CFA
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.85rem', color: '#888', textTransform: 'uppercase' }}>
                                        {t('statement.currentBalance')}
                                    </div>
                                    <div style={{
                                        fontWeight: 700,
                                        fontSize: '1.2rem',
                                        color: tenant.balance > 0 ? 'var(--color-danger, #dc3545)' : 'var(--color-success, #28a745)'
                                    }}>
                                        {tenant.balance > 0 ? `${tenant.balance.toLocaleString()} CFA` : t('balance.paidInFull')}
                                    </div>
                                </div>
                            </div>

                            {tenant.payments && tenant.payments.length > 0 ? (
                                <div>
                                    {[...tenant.payments]
                                        .sort((a, b) => b.id - a.id)
                                        .map(payment => (
                                            <div key={payment.id} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                flexWrap: 'wrap',
                                                gap: '8px',
                                                padding: '12px 0',
                                                borderBottom: '1px solid #eee'
                                            }}>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600 }}>{payment.date}</div>
                                                    <div style={{ fontSize: '0.85rem', color: '#888' }}>{payment.method}</div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                                    <div style={{ fontWeight: 700, color: 'var(--color-success, #28a745)', whiteSpace: 'nowrap' }}>
                                                        +{payment.amount.toLocaleString()} CFA
                                                    </div>
                                                    <button
                                                        onClick={() => handleCancelPayment(payment)}
                                                        style={{
                                                            background: '#dc3545',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '4px 10px',
                                                            borderRadius: '4px',
                                                            fontSize: '0.75rem',
                                                            cursor: 'pointer',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {t('statement.cancel')}
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            ) : (
                                <p style={{ color: '#888', textAlign: 'center' }}>{t('statement.noPayments')}</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'repairs' && (
                    <div>
                        {/* Request Repair button */}
                        <div style={{ marginBottom: 'clamp(16px, 3vw, 20px)' }}>
                            <button className="btn-primary" onClick={() => setIsRepairFormOpen(!isRepairFormOpen)} style={{ padding: '12px 24px' }}>
                                {t('maintenance.requestRepair')}
                            </button>
                        </div>

                        {/* Repair form */}
                        {isRepairFormOpen && (
                            <div className="form-panel" style={{ marginBottom: 'clamp(16px, 3vw, 20px)' }}>
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

                        {/* Repairs list */}
                        <h3 style={{ marginBottom: 'clamp(12px, 3vw, 16px)', fontSize: 'clamp(1rem, 3vw, 1.2rem)' }}>{t('maintenance.myRequests')}</h3>
                        <div className="listing-grid" style={{ gridTemplateColumns: '1fr' }}>
                            {repairs.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>{t('maintenance.noRequests')}</p>}
                            {repairs.map(repair => (
                                <div key={repair.id} className="listing-card" style={{ borderLeft: `4px solid ${repair.status === 'Open' ? 'var(--color-warning)' : 'var(--color-success)'}` }}>
                                    <div className="card-header">
                                        <span style={{ fontWeight: 'bold' }}>{repair.issue}</span>
                                        <span className={`balance-badge ${repair.status === 'Open' ? 'balance-owing' : 'balance-paid'}`}>{repair.status}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', minWidth: 0 }}>
                                            {repair.dateReported} • {t('maintenance.priority')}: {repair.priority}
                                        </div>
                                        {repair.status === 'Open' && (
                                            <button
                                                onClick={() => handleCancelRepair(repair.id)}
                                                style={{
                                                    background: '#dc3545',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '4px 12px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {t('maintenance.cancelRequest')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div>
                        {/* Lease section */}
                        <div style={{
                            background: 'white',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                            padding: 'clamp(20px, 4vw, 30px)',
                        }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: 'clamp(1rem, 3vw, 1.2rem)' }}>
                                {t('lease.title')}
                            </h3>

                            {tenant.leaseSignature ? (
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: 'clamp(0.85rem, 2vw, 0.95rem)' }}>{t('common:status.signed')}</span>
                                        <span style={{ color: '#888', fontSize: 'clamp(0.75rem, 2vw, 0.8rem)' }}>
                                            {tenant.leaseSignedAt ? new Date(tenant.leaseSignedAt).toLocaleDateString() : ''}
                                        </span>
                                    </div>
                                    <img
                                        src={tenant.leaseSignature}
                                        alt="Your signature"
                                        style={{ maxWidth: '200px', height: '60px', objectFit: 'contain', border: '1px solid #eee', borderRadius: '4px', padding: '4px', background: '#fafafa' }}
                                    />
                                </div>
                            ) : tenant.leaseUrl ? (
                                <p style={{ color: '#666', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', marginBottom: '16px', lineHeight: '1.5' }}>
                                    {t('lease.readyForSigning')}
                                </p>
                            ) : (
                                <p style={{ color: '#666', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', marginBottom: '16px', lineHeight: '1.5' }}>
                                    {t('lease.noLeaseUploaded')}
                                </p>
                            )}

                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {tenant.leaseUrl && (
                                    <a href={tenant.leaseUrl} target="_blank" rel="noopener noreferrer">
                                        <button className="btn-outline" style={{ padding: 'clamp(10px, 2.5vw, 12px) 20px', minHeight: '44px', fontSize: 'clamp(0.85rem, 2vw, 0.9rem)' }}>{t('lease.viewPdf')}</button>
                                    </a>
                                )}
                                {tenant.leaseUrl && !tenant.leaseSignature && (
                                    <button
                                        className="btn-primary"
                                        onClick={() => setShowSignaturePad(true)}
                                        disabled={isSigning}
                                        style={{ padding: 'clamp(10px, 2.5vw, 12px) 20px', minHeight: '44px', fontSize: 'clamp(0.85rem, 2vw, 0.9rem)' }}
                                    >
                                        {isSigning ? t('lease.signing') : t('lease.signLease')}
                                    </button>
                                )}
                                {!tenant.leaseUrl && (
                                    <button className="btn-outline" disabled style={{ opacity: 0.5, cursor: 'not-allowed', padding: 'clamp(10px, 2.5vw, 12px) 20px', minHeight: '44px', fontSize: 'clamp(0.85rem, 2vw, 0.9rem)' }}>{t('lease.noLeaseAvailable')}</button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
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
                    amount={getPaymentAmount()}
                    tenantId={tenant.id}
                    onSuccess={() => handlePaymentSuccess(getPaymentAmount(), 'Credit Card')}
                    onCancel={() => setShowCardModal(false)}
                />
            )}
            {showMobileMoneyModal && (
                <MobileMoneyModal
                    amount={getPaymentAmount()}
                    tenantId={tenant.id}
                    tenantEmail={tenant.email}
                    tenantName={tenant.name}
                    onSuccess={() => handlePaymentSuccess(getPaymentAmount(), 'Mobile Money')}
                    onCancel={() => setShowMobileMoneyModal(false)}
                />
            )}
            <Toaster position="top-right" />
        </div>
    );
}
