import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, where, getDocs, limit as firestoreLimit } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import type { Listing } from './types';

interface ListingsProps {
    limit?: number;
}

export function Listings({ limit }: ListingsProps) {
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

    if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;

    if (listings.length === 0) return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p>No units currently available. Please check back later!</p>
        </div>
    );

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {listings.map(listing => (
                <div key={listing.id} className="tenant-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{
                        height: '200px',
                        background: listing.photoUrl ? `url(${listing.photoUrl})` : '#eee',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {!listing.photoUrl && <span style={{ color: '#999' }}>🏠 No Photo</span>}
                    </div>
                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 style={{ margin: 0 }}>{listing.title}</h3>
                            <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{listing.rent.toLocaleString()} CFA</span>
                        </div>
                        <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '15px' }}>{listing.description}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', background: '#eee', padding: '4px 8px', borderRadius: '4px' }}>Unit {listing.unit}</span>
                            <Link to={`/apply?unit=${listing.unit}&listingId=${listing.id}`} className="btn-primary" style={{ textDecoration: 'none', fontSize: '0.9rem' }}>Apply Now</Link>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
