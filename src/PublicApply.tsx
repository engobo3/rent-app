import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

export function PublicApply() {
    const { t } = useTranslation(['public', 'common']);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const ownerId = searchParams.get('ownerId') || '';
    const propertyId = searchParams.get('propertyId') || '';
    const listingId = searchParams.get('listingId') || '';

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [income, setIncome] = useState("");
    const [unit, setUnit] = useState(searchParams.get('unit') || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await addDoc(collection(db, "applications"), {
                ownerId: ownerId || null,
                propertyId: propertyId || null,
                listingId: listingId || null,
                name, email, phone, income: parseFloat(income), desiredUnit: unit, status: 'pending', date: new Date().toLocaleDateString()
            });

            toast.success(t('apply.submitted'));
            setTimeout(() => navigate('/'), 2000);

        } catch (error) {
            toast.error(t('apply.submitFailed', { message: (error as Error).message }));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto 60px', padding: 'clamp(20px, 5vw, 40px)', background: 'white', border: '1px solid #eee' }}>
            <h1 style={{
                textAlign: 'center',
                marginBottom: '40px',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                fontSize: 'clamp(1.5rem, 4vw, 1.8rem)',
                color: 'var(--secondary-color)'
            }}>
                {t('apply.title')}
            </h1>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '25px' }}>
                <div className="form-row-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '20px' }}>
                    <div className="form-group">
                        <label htmlFor="name" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#666' }}>{t('apply.fullName')}</label>
                        <input id="name" value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%', padding: '14px', border: '1px solid #ddd', outline: 'none', borderRadius: '8px', fontSize: '16px' }} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#666' }}>{t('apply.email')}</label>
                        <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '14px', border: '1px solid #ddd', outline: 'none', borderRadius: '8px', fontSize: '16px' }} />
                    </div>
                </div>

                <div className="form-row-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '20px' }}>
                    <div className="form-group">
                        <label htmlFor="phone" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#666' }}>{t('apply.phone')}</label>
                        <input id="phone" value={phone} onChange={e => setPhone(e.target.value)} required style={{ width: '100%', padding: '14px', border: '1px solid #ddd', outline: 'none', borderRadius: '8px', fontSize: '16px' }} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="income" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#666' }}>{t('apply.income')}</label>
                        <input id="income" type="number" value={income} onChange={e => setIncome(e.target.value)} required style={{ width: '100%', padding: '14px', border: '1px solid #ddd', outline: 'none', borderRadius: '8px', fontSize: '16px' }} />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="unit" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#666' }}>{t('apply.desiredUnit')}</label>
                    <input id="unit" value={unit} onChange={e => setUnit(e.target.value)} required placeholder={t('apply.unitPlaceholder')} style={{ width: '100%', padding: '14px', border: '1px solid #ddd', outline: 'none', borderRadius: '8px', fontSize: '16px' }} />
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '20px', padding: '15px', minHeight: '50px' }} disabled={isSubmitting}>
                    {isSubmitting ? t('apply.submitting') : t('apply.submitApplication')}
                </button>
            </form>
            <Toaster position="top-right" />
        </div>
    );
}
