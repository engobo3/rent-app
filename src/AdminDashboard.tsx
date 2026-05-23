
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from './firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, type DocumentData } from 'firebase/firestore';
import { type User } from 'firebase/auth';
import type { Property, UserProfile, Tenant } from './types';
import toast, { Toaster } from 'react-hot-toast';
import { LanguageSwitcher } from './LanguageSwitcher';

/** Best-effort projection of a Firestore doc into Property — drops anything missing required fields. */
function asProperty(id: string, data: DocumentData): Property | null {
    if (typeof data.ownerId !== 'string' || typeof data.name !== 'string' || typeof data.address !== 'string') {
        return null;
    }
    return { id, ...data } as Property;
}

function asTenant(id: string, data: DocumentData): Tenant | null {
    if (typeof data.ownerId !== 'string' || typeof data.name !== 'string') {
        return null;
    }
    return { id, ...data } as Tenant;
}

function asUserProfile(data: DocumentData): UserProfile | null {
    if (typeof data.uid !== 'string' || typeof data.email !== 'string' || typeof data.role !== 'string') {
        return null;
    }
    return data as UserProfile;
}

/** Format a date string; returns `'—'` for missing/unparseable values rather than 'Invalid Date'. */
function formatDate(value: unknown): string {
    if (typeof value !== 'string' || !value) return '—';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}


interface AdminDashboardProps {
    user: User;
    onLogout: () => void;
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
    const { t } = useTranslation(['admin', 'common']);
    const [stats, setStats] = useState({
        totalProperties: 0,
        totalTenants: 0,
        totalRevenue: 0,
        occupancyRate: 0
    });
    const [properties, setProperties] = useState<Property[]>([]);
    const [landlords, setLandlords] = useState<UserProfile[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'properties' | 'landlords'>('overview');

    // Property form state
    const [propName, setPropName] = useState('');
    const [propAddress, setPropAddress] = useState('');
    const [propOwner, setPropOwner] = useState('');
    const [isPropFormOpen, setIsPropFormOpen] = useState(false);
    const [isAddingProp, setIsAddingProp] = useState(false);

    // Subscribe to global collections in real time. Previously we did a
    // one-shot fetch, so the page went stale until reload and any state
    // setter could fire on an unmounted component if the admin clicked away.
    useEffect(() => {
        let tenantsCache: Tenant[] = [];

        const recomputeStats = (propsCount: number) => {
            const totalRev = tenantsCache.reduce((acc, tenant) => {
                const paid = tenant.payments?.reduce((s, p) => s + (p.amount ?? 0), 0) ?? 0;
                return acc + paid;
            }, 0);
            setStats({
                totalProperties: propsCount,
                totalTenants: tenantsCache.length,
                totalRevenue: totalRev,
                occupancyRate: 0,
            });
        };

        const handleError = (err: unknown) => {
            const e = err instanceof Error ? err : new Error(String(err));
            toast.error(t('errors.fetchFailed', { message: e.message }));
        };

        const unsubProps = onSnapshot(
            collection(db, 'properties'),
            (snap) => {
                const list = snap.docs
                    .map((d) => asProperty(d.id, d.data()))
                    .filter((p): p is Property => p !== null);
                setProperties(list);
                recomputeStats(list.length);
            },
            handleError,
        );

        const unsubTenants = onSnapshot(
            collection(db, 'tenants'),
            (snap) => {
                tenantsCache = snap.docs
                    .map((d) => asTenant(d.id, d.data()))
                    .filter((t): t is Tenant => t !== null);
                // Snap properties count from current state (closures see latest).
                setProperties((cur) => {
                    recomputeStats(cur.length);
                    return cur;
                });
            },
            handleError,
        );

        const unsubUsers = onSnapshot(
            collection(db, 'users'),
            (snap) => {
                const all = snap.docs
                    .map((d) => asUserProfile(d.data()))
                    .filter((u): u is UserProfile => u !== null);
                setLandlords(all.filter((u) => u.role === 'landlord'));
            },
            handleError,
        );

        return () => {
            unsubProps();
            unsubTenants();
            unsubUsers();
        };
    // The `t` function is stable across renders for the lifetime of the
    // i18n instance, so subscribing once on mount is correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getLandlordName = (ownerId: string) => {
        const landlord = landlords.find(l => l.uid === ownerId);
        return landlord?.displayName || landlord?.email || ownerId;
    };

    const handleAddProperty = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!propName || !propAddress || !propOwner) {
            toast.error(t('common:errors.fillAllFields'));
            return;
        }
        setIsAddingProp(true);
        try {
            await addDoc(collection(db, 'properties'), {
                ownerId: propOwner,
                name: propName,
                address: propAddress,
                amenities: [],
                image: '',
            });
            // No optimistic update — the snapshot listener will refresh the
            // list within milliseconds, and avoids drift when concurrent
            // admins are editing.
            setPropName(''); setPropAddress(''); setPropOwner('');
            setIsPropFormOpen(false);
            toast.success(t('properties.added'));
        } catch (err) {
            toast.error(t('errors.fetchFailed', { message: (err as Error).message }));
        } finally {
            setIsAddingProp(false);
        }
    };

    const handleDeleteProperty = async (id: string) => {
        if (!window.confirm(t('properties.deleteConfirm'))) return;
        try {
            await deleteDoc(doc(db, 'properties', id));
            // Snapshot listener will remove from the list.
            toast.success(t('properties.deleted'));
        } catch (err) {
            toast.error(t('errors.fetchFailed', { message: (err as Error).message }));
        }
    };

    return (
        <div style={{ background: '#f5f7fa', minHeight: '100vh', paddingBottom: 'clamp(24px, 5vw, 40px)' }}>
            {/* ADMIN HEADER */}
            <div style={{
                background: '#1a1a2e',
                color: 'white',
                padding: 'clamp(12px, 3vw, 15px) clamp(16px, 4vw, 30px)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                flexWrap: 'wrap',
                gap: 'clamp(8px, 2vw, 12px)'
            }}>
                <div style={{ fontSize: 'clamp(0.9rem, 3vw, 1.2rem)', fontWeight: 700, letterSpacing: '1px' }}>🛡️ {t('header.title')}</div>
                <div style={{ display: 'flex', gap: 'clamp(10px, 2vw, 15px)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <LanguageSwitcher variant="dark" />
                    <span style={{ fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{user.email}</span>
                    <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 2.5vw, 15px)', borderRadius: '4px', cursor: 'pointer', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', minHeight: '44px' }}>{t('common:nav.logout')}</button>
                </div>
            </div>

            <div className="container" style={{ maxWidth: '1200px', margin: 'clamp(20px, 4vw, 30px) auto', padding: '0 clamp(16px, 3vw, 20px)' }}>

                {/* TABS */}
                <div style={{ display: 'flex', gap: 'clamp(12px, 3vw, 20px)', marginBottom: 'clamp(20px, 4vw, 30px)', borderBottom: '1px solid #ddd', paddingBottom: '10px', overflowX: 'auto' }}>
                    {['overview', 'properties', 'landlords'].map(tab => (
                        <div
                            key={tab}
                            onClick={() => setActiveTab(tab as typeof activeTab)}
                            style={{
                                cursor: 'pointer',
                                padding: 'clamp(8px, 2vw, 10px) clamp(14px, 3vw, 20px)',
                                fontWeight: activeTab === tab ? 600 : 400,
                                color: activeTab === tab ? '#1a1a2e' : '#666',
                                borderBottom: activeTab === tab ? '3px solid #1a1a2e' : 'none',
                                fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
                                whiteSpace: 'nowrap',
                                minHeight: '44px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            {t('tabs.' + tab)}
                        </div>
                    ))}
                </div>

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 'clamp(16px, 3vw, 20px)', marginBottom: 'clamp(24px, 5vw, 40px)' }}>
                            <Card title={t('overview.totalRevenue')} value={`${stats.totalRevenue.toLocaleString()} CFA`} color="#2ecc71" />
                            <Card title={t('overview.totalProperties')} value={stats.totalProperties} color="#3498db" />
                            <Card title={t('overview.activeTenants')} value={stats.totalTenants} color="#9b59b6" />
                            <Card title={t('overview.landlords')} value={landlords.length} color="#e67e22" />
                        </div>

                        <div style={{ background: 'white', padding: 'clamp(20px, 4vw, 30px)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ fontSize: 'clamp(1rem, 3vw, 1.2rem)' }}>{t('overview.systemHealth')}</h3>
                            <p style={{ color: '#666', fontSize: 'clamp(0.85rem, 2.5vw, 1rem)' }}>{t('overview.systemStatus')}</p>
                        </div>
                    </>
                )}

                {/* PROPERTIES TAB */}
                {activeTab === 'properties' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'clamp(16px, 3vw, 20px)', flexWrap: 'wrap', gap: '12px' }}>
                            <h3 style={{ fontSize: 'clamp(1rem, 3vw, 1.2rem)', margin: 0 }}>{t('properties.title')}</h3>
                            <button className="btn-primary" onClick={() => setIsPropFormOpen(true)} style={{ padding: '8px 16px', minHeight: '44px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>{t('properties.addProperty')}</button>
                        </div>

                        {isPropFormOpen && (
                            <div className="modal-overlay">
                                <div className="modal-content" style={{ maxWidth: '500px', margin: '0 auto', background: 'white', padding: 'clamp(20px, 4vw, 30px)', borderRadius: '8px' }}>
                                    <h3 style={{ marginTop: 0 }}>{t('properties.addPropertyTitle')}</h3>
                                    {landlords.length === 0 ? (
                                        <p style={{ color: '#888' }}>{t('properties.noLandlordsAvailable')}</p>
                                    ) : (
                                        <form onSubmit={handleAddProperty}>
                                            <div style={{ display: 'grid', gap: '15px' }}>
                                                <input placeholder={t('properties.namePlaceholder')} value={propName} onChange={e => setPropName(e.target.value)} required style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' }} />
                                                <input placeholder={t('properties.addressPlaceholder')} value={propAddress} onChange={e => setPropAddress(e.target.value)} required style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' }} />
                                                <select value={propOwner} onChange={e => setPropOwner(e.target.value)} required style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' }}>
                                                    <option value="">{t('properties.selectLandlord')}</option>
                                                    {landlords.map(l => (
                                                        <option key={l.uid} value={l.uid}>{l.displayName || l.email}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                                                <button type="button" onClick={() => setIsPropFormOpen(false)} style={{ padding: '10px 20px', background: '#666', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', minHeight: '44px' }}>{t('common:buttons.cancel')}</button>
                                                <button type="submit" className="btn-primary" disabled={isAddingProp} style={{ padding: '10px 20px', background: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', minHeight: '44px' }}>{isAddingProp ? t('properties.adding') : t('properties.addProperty')}</button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'grid', gap: 'clamp(12px, 2.5vw, 15px)' }}>
                            {properties.map(p => (
                                <div key={p.id} style={{ background: 'white', padding: 'clamp(16px, 3vw, 20px)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flexWrap: 'wrap', gap: '12px' }}>
                                    <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                                        <div style={{ fontWeight: 600, fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)' }}>{p.name}</div>
                                        <div style={{ fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', color: '#666' }}>{p.address}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                        <div style={{ fontSize: 'clamp(0.7rem, 2vw, 0.85rem)', background: '#e0e7ff', color: '#4338ca', padding: '5px 10px', borderRadius: '4px', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 'min(200px, 40vw)', whiteSpace: 'nowrap' }}>
                                            {getLandlordName(p.ownerId)}
                                        </div>
                                        <button onClick={() => handleDeleteProperty(p.id)} style={{ padding: '6px 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', minHeight: '36px', fontSize: 'clamp(0.75rem, 2vw, 0.85rem)' }}>{t('common:buttons.delete')}</button>
                                    </div>
                                </div>
                            ))}
                            {properties.length === 0 && <p style={{ color: '#888', fontSize: 'clamp(0.85rem, 2.5vw, 1rem)' }}>{t('properties.noProperties')}</p>}
                        </div>
                    </div>
                )}

                {/* LANDLORDS TAB */}
                {activeTab === 'landlords' && (
                    <div>
                        <h3 style={{ fontSize: 'clamp(1rem, 3vw, 1.2rem)', marginBottom: 'clamp(16px, 3vw, 20px)' }}>{t('landlords.title')}</h3>

                        {/* Desktop: Table */}
                        <div className="hide-mobile">
                            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                                <thead>
                                    <tr style={{ background: '#f0f2f5', textAlign: 'left' }}>
                                        <th style={{ padding: 'clamp(12px, 2.5vw, 15px)' }}>{t('landlords.name')}</th>
                                        <th style={{ padding: 'clamp(12px, 2.5vw, 15px)' }}>{t('landlords.email')}</th>
                                        <th style={{ padding: 'clamp(12px, 2.5vw, 15px)' }}>{t('landlords.uid')}</th>
                                        <th style={{ padding: 'clamp(12px, 2.5vw, 15px)' }}>{t('landlords.joined')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {landlords.map(l => (
                                        <tr key={l.uid} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: 'clamp(12px, 2.5vw, 15px)' }}>{l.displayName || t('landlords.na')}</td>
                                            <td style={{ padding: 'clamp(12px, 2.5vw, 15px)' }}>{l.email}</td>
                                            <td style={{ padding: 'clamp(12px, 2.5vw, 15px)', fontFamily: 'monospace', fontSize: '0.85rem' }}>{l.uid}</td>
                                            <td style={{ padding: 'clamp(12px, 2.5vw, 15px)' }}>{formatDate(l.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile: Card Layout */}
                        <div className="mobile-only" style={{ display: 'grid', gap: '12px' }}>
                            {landlords.map(l => (
                                <div key={l.uid} style={{ background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                    <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '8px' }}>{l.displayName || t('landlords.na')}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '4px' }}>{l.email}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>{l.uid}</span>
                                        <span style={{ fontSize: '0.8rem', color: '#888' }}>{formatDate(l.createdAt)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {landlords.length === 0 && <p style={{ padding: '20px', textAlign: 'center', fontSize: 'clamp(0.85rem, 2.5vw, 1rem)' }}>{t('landlords.noLandlords')}</p>}
                    </div>
                )}

            </div>
            <Toaster />
        </div>
    );
}

function Card({ title, value, color }: { title: string, value: string | number, color: string }) {
    return (
        <div style={{ background: 'white', padding: 'clamp(20px, 4vw, 25px)', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderLeft: `5px solid ${color}` }}>
            <div style={{ color: '#888', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', textTransform: 'uppercase', marginBottom: 'clamp(8px, 2vw, 10px)', letterSpacing: '0.5px' }}>{title}</div>
            <div style={{ fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', fontWeight: 700, color: '#333', wordBreak: 'break-word' }}>{value}</div>
        </div>
    );
}
