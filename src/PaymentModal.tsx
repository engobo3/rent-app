// src/PaymentModal.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadStripe } from '@stripe/stripe-js';
import {
    PaymentElement,
    Elements,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import { functions } from './firebase'; // We need to update firebase.ts next
import { httpsCallable } from 'firebase/functions';

// REPLACE with your Stripe PUBLISHABLE Key (pk_test_...)
const stripePromise = loadStripe("pk_test_51SkENDFEEsvDFM1hebzLsw2LJa72RH1pcwnHOj2nr3CU7TIrbrKLUMa6ZofxFTR85gbApGEXeWQOY4wAgrWr5r7Y00p0SA3uAP");

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
    const [errorMessage, setErrorMessage] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) return; // Stripe hasn't loaded yet

        setIsProcessing(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Just a placeholder, we handle the success logic manually
                return_url: window.location.href,
            },
            redirect: "if_required",
        });

        if (error) {
            setErrorMessage(error.message || t('paymentModal.unexpectedError'));
            setIsProcessing(false);
        } else {
            // Payment Succeeded!
            onSuccess();
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement />
            {errorMessage && <div style={{ color: 'red', marginTop: '10px' }}>{errorMessage}</div>}

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button disabled={isProcessing} type="submit" style={{ width: '100%' }}>
                    {isProcessing ? t('paymentModal.processing') : t('paymentModal.pay', { amount })}
                </button>
                <button disabled={isProcessing} type="button" onClick={onCancel} style={{ background: '#666' }}>
                    {t('common:buttons.cancel')}
                </button>
            </div>
        </form>
    );
};

interface PaymentModalProps {
    amount: number;
    tenantId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

// This wrapper handles the setup logic
export const PaymentModal = ({ amount, tenantId, onSuccess, onCancel }: PaymentModalProps) => {
    const { t } = useTranslation(['tenant', 'common']);
    const [clientSecret, setClientSecret] = useState("");

    // When modal opens, ask backend for a Client Secret
    React.useEffect(() => {
        const fetchSecret = async () => {
            // Call our Cloud Function
            const createIntent = httpsCallable(functions, 'createPaymentIntent');
            const result = await createIntent({ amount, tenantId }) as { data: { clientSecret: string } };
            setClientSecret(result.data.clientSecret);
        };
        fetchSecret();
    }, [amount, tenantId]);

    if (!clientSecret) return <div style={{ padding: '20px' }}>{t('paymentModal.loadingPayment')}</div>;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>{t('paymentModal.cardPayment')}</h2>
                <p>{t('paymentModal.charging', { amount })}</p>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm amount={amount} onSuccess={onSuccess} onCancel={onCancel} />
                </Elements>
            </div>
        </div>
    );
};
