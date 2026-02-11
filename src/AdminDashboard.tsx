
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import { type User } from 'firebase/auth';
import type { Property, UserProfile, Tenant } from './types';
import toast, { Toaster } from 'react-hot-toast';
import { LanguageSwitcher } from './LanguageSwitcher';


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

    useEffect(() => {
        const fetchGlobalData = async () => {
            try {
                // 1. Fetch Properties
                const propsSnap = await getDocs(collection(db, 'properties'));
                const propsList = propsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Property[];
                setProperties(propsList);

                // 2. Fetch Tenants
                const tenantsSnap = await getDocs(collection(db, 'tenants'));
                const tenantsList = tenantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Tenant[];
                // setTenants(tenantsList);

                // 3. Fetch Users (Landlords)
                const usersSnap = await getDocs(collection(db, 'users'));
                const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as unknown as UserProfile[];
                const landlordsList = usersList.filter(u => u.role === 'landlord');
                setLandlords(landlordsList);

                // Calculate Stats
                const totalRev = tenantsList.reduce((acc, t) => {
                    const tenantPaid = t.payments?.reduce((pAcc, p) => pAcc + p.amount, 0) || 0;
                    return acc + tenantPaid;
                }, 0);


                // Total units would need to be fetched from Units collection ideally.
                // For now, let's just use tenant count as a proxy or fetch units.

                setStats({
                    totalProperties: propsList.length,
                    totalTenants: tenantsList.length,
                    totalRevenue: totalRev,
                    occupancyRate: 0
                });

            } catch (err: unknown) {
                const error = err instanceof Error ? err : new Error(String(err));
                toast.error(t('errors.fetchFailed', { message: error.message }));
            }
        };

        fetchGlobalData();
    }, []);

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
                        </div>
                        <div style={{ display: 'grid', gap: 'clamp(12px, 2.5vw, 15px)' }}>
                            {properties.map(p => (
                                <div key={p.id} style={{ background: 'white', padding: 'clamp(16px, 3vw, 20px)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flexWrap: 'wrap', gap: '12px' }}>
                                    <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                                        <div style={{ fontWeight: 600, fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)' }}>{p.name}</div>
                                        <div style={{ fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', color: '#666' }}>{p.address}</div>
                                    </div>
                                    <div style={{ fontSize: 'clamp(0.7rem, 2vw, 0.85rem)', background: '#eee', padding: '5px 10px', borderRadius: '4px', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 'min(200px, 40vw)', whiteSpace: 'nowrap' }}>
                                        {p.ownerId}
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
                                            <td style={{ padding: 'clamp(12px, 2.5vw, 15px)' }}>{new Date(l.createdAt).toLocaleDateString()}</td>
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
                                        <span style={{ fontSize: '0.8rem', color: '#888' }}>{new Date(l.createdAt).toLocaleDateString()}</span>
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
