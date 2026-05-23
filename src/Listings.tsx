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
                let q = query(collection(db, 'listings'), where('available', '==', true));
                if (limit) {
                    q = query(q, firestoreLimit(limit));
                }
                const snapshot = await getDocs(q);
                const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Listing));
                setListings(list);
            } catch (error) {
                console.error('Error fetching listings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchListings();
    }, [limit]);

    if (loading) {
        return (
            <div className="text-center" style={{ padding: 'var(--space-10)' }}>
                {t('listings.loading')}
            </div>
        );
    }

    if (listings.length === 0) {
        return (
            <div className="text-center text-secondary" style={{ padding: 'var(--space-10)' }}>
                <p>{t('listings.noUnits')}</p>
            </div>
        );
    }

    return (
        <div className="listings-grid">
            {listings.map((listing) => (
                <article key={listing.id} className="listing-public-card">
                    <div
                        className="listing-public-card__media"
                        style={listing.photoUrl ? { backgroundImage: `url(${listing.photoUrl})` } : undefined}
                    >
                        {!listing.photoUrl && <span>{t('listings.noPhoto')}</span>}
                    </div>

                    <div className="listing-public-card__body">
                        <header className="listing-public-card__header">
                            <h3 className="listing-public-card__title">{listing.title}</h3>
                            <span className="listing-public-card__price">
                                {listing.rent.toLocaleString()} CFA
                            </span>
                        </header>

                        <p className="listing-public-card__desc">{listing.description}</p>

                        <footer className="listing-public-card__footer">
                            <span className="listing-public-card__unit">
                                {t('listings.unit', { unit: listing.unit })}
                            </span>
                            <Link
                                to={`/apply?unit=${listing.unit}&listingId=${listing.id}&ownerId=${listing.ownerId}&propertyId=${listing.propertyId || ''}`}
                                className="btn btn-primary btn-sm"
                            >
                                {t('common:nav.applyNow')}
                            </Link>
                        </footer>
                    </div>
                </article>
            ))}
        </div>
    );
}
