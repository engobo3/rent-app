import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from './firebase';
import { collection, query, where, getDocs, limit as firestoreLimit } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import type { Listing } from './types';

interface ListingsProps {
    limit?: number;
}

export function Listings({ limit }: ListingsProps) {
    const { t } = useTranslation(['public', 'common']);
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchListings = async () => {
            try {
                let q = query(collection(db, "listings"), where("available", "==", true));
                if (limit) {
                    q = query(q, firestoreLimit(limit));
                }
                const snapshot = await getDocs(q);
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing));
                setListings(list);
            } catch (error) {
                console.error("Error fetching listings:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchListings();
    }, [limit]);

    if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>{t('listings.loading')}</div>;

    if (listings.length === 0) return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>{t('listings.noUnits')}</p>
        </div>
    );

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: 'clamp(20px, 4vw, 30px)'
        }}>
            {listings.map(listing => (
                <div key={listing.id} style={{
                    border: '1px solid #eee',
                    background: 'white',
                    transition: 'transform 0.3s ease',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        height: 'clamp(200px, 30vw, 250px)',
                        background: listing.photoUrl ? `url(${listing.photoUrl})` : '#f4f4f4',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {!listing.photoUrl && <span style={{ color: '#999', textTransform: 'uppercase', letterSpacing: '1px', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>{t('listings.noPhoto')}</span>}
                    </div>
                    <div style={{ padding: 'clamp(20px, 4vw, 25px)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                            <h3 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '1px', fontSize: 'clamp(1rem, 3vw, 1.2rem)', flex: '1 1 auto' }}>{listing.title}</h3>
                            <span style={{ fontWeight: 600, color: 'var(--primary-color)', fontSize: 'clamp(1rem, 3vw, 1.2rem)', whiteSpace: 'nowrap' }}>{listing.rent.toLocaleString()} CFA</span>
                        </div>
                        <p style={{ color: '#666', fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)', marginBottom: 'clamp(20px, 4vw, 25px)', lineHeight: '1.6' }}>{listing.description}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f4f4f4', paddingTop: 'clamp(15px, 3vw, 20px)', flexWrap: 'wrap', gap: '12px' }}>
                            <span style={{ fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)', color: '#999', fontWeight: 600 }}>{t('listings.unit', { unit: listing.unit })}</span>
                            <Link to={`/apply?unit=${listing.unit}&listingId=${listing.id}&ownerId=${listing.ownerId}&propertyId=${listing.propertyId || ''}`} className="btn-primary" style={{ textDecoration: 'none', fontSize: 'clamp(0.8rem, 2.5vw, 0.85rem)', padding: 'clamp(8px, 2vw, 10px) clamp(16px, 3vw, 20px)' }}>{t('common:nav.applyNow')}</Link>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
