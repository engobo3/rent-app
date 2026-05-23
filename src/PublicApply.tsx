import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

// Caps mirror the limits enforced by `firestore.rules` for applications.
const MAX_NAME_LEN = 200;
const MAX_EMAIL_LEN = 200;
const MAX_PHONE_LEN = 50;
const MAX_UNIT_LEN = 100;
const MAX_INCOME = 1_000_000_000; // 1 billion CFA — practical ceiling.
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function PublicApply() {
    const { t } = useTranslation(['public', 'common']);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const ownerId = searchParams.get('ownerId') || '';
    const propertyId = searchParams.get('propertyId') || '';
    const listingId = searchParams.get('listingId') || '';

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [income, setIncome] = useState('');
    const [unit, setUnit] = useState(searchParams.get('unit') || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Track the post-success redirect timer so we can cancel it on unmount.
    const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        return () => {
            if (redirectTimer.current) {
                clearTimeout(redirectTimer.current);
                redirectTimer.current = null;
            }
        };
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        // Client-side validation — must match the firestore.rules constraints
        // so we surface a friendly error instead of a generic write failure.
        const trimmedName = name.trim();
        const trimmedEmail = email.trim();
        const trimmedPhone = phone.trim();
        const trimmedUnit = unit.trim();

        if (!trimmedName || trimmedName.length > MAX_NAME_LEN) {
            toast.error(t('apply.invalidName'));
            return;
        }
        if (!EMAIL_REGEX.test(trimmedEmail) || trimmedEmail.length > MAX_EMAIL_LEN) {
            toast.error(t('apply.invalidEmail'));
            return;
        }
        if (!trimmedPhone || trimmedPhone.length > MAX_PHONE_LEN) {
            toast.error(t('apply.invalidPhone'));
            return;
        }
        if (!trimmedUnit || trimmedUnit.length > MAX_UNIT_LEN) {
            toast.error(t('apply.invalidUnit'));
            return;
        }
        const incomeNum = parseFloat(income);
        if (!Number.isFinite(incomeNum) || incomeNum < 0 || incomeNum >= MAX_INCOME) {
            toast.error(t('apply.invalidIncome'));
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'applications'), {
                ownerId,
                propertyId,
                listingId: listingId || '',
                name: trimmedName,
                email: trimmedEmail,
                phone: trimmedPhone,
                income: incomeNum,
                desiredUnit: trimmedUnit,
                status: 'pending',
                // ISO timestamp — sortable and locale-independent. We also
                // keep a `date` field for any legacy report that still reads it.
                submittedAt: new Date().toISOString(),
                date: new Date().toISOString(),
            });

            toast.success(t('apply.submitted'));
            redirectTimer.current = setTimeout(() => navigate('/'), 2000);
        } catch (error) {
            toast.error(t('apply.submitFailed', { message: (error as Error).message }));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!ownerId || !propertyId) {
        return (
            <div style={{ maxWidth: '700px', margin: '0 auto 60px', padding: 'clamp(20px, 5vw, 40px)', background: 'white', border: '1px solid #eee', textAlign: 'center' }}>
                <h1 style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: 'clamp(1.5rem, 4vw, 1.8rem)', color: 'var(--secondary-color)', marginBottom: '20px' }}>
                    {t('apply.title')}
                </h1>
                <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '30px' }}>{t('apply.noListingWarning')}</p>
                <Link to="/listings" className="btn-primary" style={{ display: 'inline-block', padding: '14px 30px', textDecoration: 'none' }}>
                    {t('apply.backToListings')}
                </Link>
            </div>
        );
    }

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
                        <input
                            id="name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            maxLength={MAX_NAME_LEN}
                            style={{ width: '100%', padding: '14px', border: '1px solid #ddd', outline: 'none', borderRadius: '8px', fontSize: '16px' }}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#666' }}>{t('apply.email')}</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            maxLength={MAX_EMAIL_LEN}
                            style={{ width: '100%', padding: '14px', border: '1px solid #ddd', outline: 'none', borderRadius: '8px', fontSize: '16px' }}
                        />
                    </div>
                </div>

                <div className="form-row-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '20px' }}>
                    <div className="form-group">
                        <label htmlFor="phone" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#666' }}>{t('apply.phone')}</label>
                        <input
                            id="phone"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            required
                            maxLength={MAX_PHONE_LEN}
                            style={{ width: '100%', padding: '14px', border: '1px solid #ddd', outline: 'none', borderRadius: '8px', fontSize: '16px' }}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="income" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#666' }}>{t('apply.income')}</label>
                        <input
                            id="income"
                            type="number"
                            min="0"
                            max={MAX_INCOME - 1}
                            step="1"
                            value={income}
                            onChange={e => setIncome(e.target.value)}
                            required
                            style={{ width: '100%', padding: '14px', border: '1px solid #ddd', outline: 'none', borderRadius: '8px', fontSize: '16px' }}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="unit" style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#666' }}>{t('apply.desiredUnit')}</label>
                    <input
                        id="unit"
                        value={unit}
                        onChange={e => setUnit(e.target.value)}
                        required
                        maxLength={MAX_UNIT_LEN}
                        placeholder={t('apply.unitPlaceholder')}
                        style={{ width: '100%', padding: '14px', border: '1px solid #ddd', outline: 'none', borderRadius: '8px', fontSize: '16px' }}
                    />
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '20px', padding: '15px', minHeight: '50px' }} disabled={isSubmitting}>
                    {isSubmitting ? t('apply.submitting') : t('apply.submitApplication')}
                </button>
            </form>
            <Toaster position="top-right" />
        </div>
    );
}
