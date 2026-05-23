import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { loadStripe } from '@stripe/stripe-js';
import {
    PaymentElement,
    Elements,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import { functions } from './firebase';
import { httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';

// Stripe publishable key (safe to ship in the client bundle).
const stripePromise = loadStripe('pk_test_51SkENDFEEsvDFM1hebzLsw2LJa72RH1pcwnHOj2nr3CU7TIrbrKLUMa6ZofxFTR85gbApGEXeWQOY4wAgrWr5r7Y00p0SA3uAP');

interface PaymentModalProps {
    amount: number;
    tenantId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

interface CheckoutFormProps {
    amount: number;
    onSuccess: () => void;
    onCancel: () => void;
}

const CheckoutForm = ({ amount, onSuccess, onCancel }: CheckoutFormProps) => {
    const { t } = useTranslation(['tenant', 'common']);
    const stripe = useStripe();
    const elements = useElements();
    const [errorMessage, setErrorMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!stripe || !elements) return;

        setIsProcessing(true);
        setErrorMessage('');

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Required by Stripe but only used for redirect-based methods.
                // `redirect: 'if_required'` keeps card payments in-page.
                return_url: window.location.href,
            },
            redirect: 'if_required',
        });

        if (error) {
            setErrorMessage(error.message || t('paymentModal.unexpectedError'));
            setIsProcessing(false);
            return;
        }
        onSuccess();
    };

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement />
            {errorMessage && <div style={{ color: 'red', marginTop: '10px' }}>{errorMessage}</div>}
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button disabled={isProcessing} type="submit" style={{ width: '100%' }}>
                    {isProcessing
                        ? t('paymentModal.processing')
                        : t('paymentModal.pay', { amount: amount.toLocaleString() })}
                </button>
                <button disabled={isProcessing} type="button" onClick={onCancel} style={{ background: '#666' }}>
                    {t('common:buttons.cancel')}
                </button>
            </div>
        </form>
    );
};

export const PaymentModal = ({ amount, tenantId, onSuccess, onCancel }: PaymentModalProps) => {
    const { t } = useTranslation(['tenant', 'common']);
    const [clientSecret, setClientSecret] = useState('');
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Pull a fresh PaymentIntent secret. Guard against:
    //   - the modal being closed before the request resolves
    //   - the backend rejecting (auth, balance check, network)
    useEffect(() => {
        let cancelled = false;

        const fetchSecret = async () => {
            try {
                const createIntent = httpsCallable<
                    { amount: number; tenantId: string },
                    { clientSecret: string }
                >(functions, 'createPaymentIntent');
                const result = await createIntent({ amount, tenantId });
                if (cancelled) return;
                setClientSecret(result.data.clientSecret);
            } catch (e) {
                if (cancelled) return;
                const message = e instanceof Error ? e.message : String(e);
                setFetchError(message);
                toast.error(t('paymentModal.unexpectedError'));
            }
        };

        fetchSecret();
        return () => {
            cancelled = true;
        };
    }, [amount, tenantId, t]);

    if (fetchError) {
        return (
            <div className="modal-overlay" onClick={onCancel}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <h2>{t('paymentModal.cardPayment')}</h2>
                    <p style={{ color: 'var(--color-danger)', margin: '16px 0' }}>{fetchError}</p>
                    <button type="button" onClick={onCancel} className="btn btn-secondary">
                        {t('common:buttons.cancel')}
                    </button>
                </div>
            </div>
        );
    }

    if (!clientSecret) {
        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    <p style={{ padding: '20px', textAlign: 'center' }}>{t('paymentModal.loadingPayment')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>{t('paymentModal.cardPayment')}</h2>
                <p>{t('paymentModal.charging', { amount: amount.toLocaleString() })}</p>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm amount={amount} onSuccess={onSuccess} onCancel={onCancel} />
                </Elements>
            </div>
        </div>
    );
};
