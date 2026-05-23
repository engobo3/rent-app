import { useTranslation } from 'react-i18next';
import { FedaCheckoutButton } from 'fedapay-reactjs';
import toast from 'react-hot-toast';

interface MobileMoneyModalProps {
    amount: number;
    tenantId: string;
    /** Email used by FedaPay to deliver receipts. */
    tenantEmail: string;
    /** Display name passed to FedaPay (used on receipts / dashboard). */
    tenantName: string;
    onSuccess: () => void;
    onCancel: () => void;
}

// Names FedaPay accepts as successful completion reasons.
const SUCCESS_REASONS = new Set(['CHECKOUT_COMPLETED', 'TRANSACTION_APPROVED']);

export function MobileMoneyModal({
    amount,
    tenantId,
    tenantEmail,
    tenantName,
    onSuccess,
    onCancel,
}: MobileMoneyModalProps) {
    const { t } = useTranslation(['tenant', 'common']);
    // Sandbox public key — fine to ship in the client bundle. Swap to a
    // live key via env var when going to production.
    const PUBLIC_KEY = 'pk_sandbox_vE_32y3wM8336-72M7_315-L';

    // Split the display name into first/last so the FedaPay dashboard shows
    // something readable rather than a Firestore doc id.
    const [firstName, ...rest] = (tenantName || 'Tenant').trim().split(/\s+/);
    const lastName = rest.length > 0 ? rest.join(' ') : firstName;

    const checkoutEmbedOptions = {
        public_key: PUBLIC_KEY,
        transaction: {
            amount,
            description: t('mobileMoneyModal.rentPayment', { tenantId }),
        },
        currency: { iso: 'XOF' },
        customer: {
            email: tenantEmail,
            firstname: firstName || 'Tenant',
            lastname: lastName || 'Tenant',
        },
        button: {
            text: t('mobileMoneyModal.payButton', { amount: amount.toLocaleString() }),
            class: 'fedapay-button',
        },
        onComplete: (resp: { reason: string }) => {
            console.log('FedaPay Payment Response:', resp);
            if (SUCCESS_REASONS.has(resp.reason)) {
                onSuccess();
                return;
            }
            // Surface failure to the user instead of leaving the modal
            // stuck open with no indication of what happened.
            toast.error(t('mobileMoneyModal.paymentNotCompleted'));
            onCancel();
        },
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <style>{`
                    .fedapay-button {
                        background-color: #FFCC00;
                        color: #000;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 1rem;
                        width: 100%;
                        font-weight: bold;
                    }
                `}</style>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h2>{t('mobileMoneyModal.title')}</h2>
                    <button onClick={onCancel} type="button" style={{ background: 'transparent', color: 'black', fontSize: '1.5rem', border: 'none', cursor: 'pointer' }}>×</button>
                </div>

                <p style={{ marginBottom: '20px' }}>
                    {t('mobileMoneyModal.amountToPay')} <strong>{amount.toLocaleString()} CFA</strong>
                </p>

                <FedaCheckoutButton options={checkoutEmbedOptions} />

                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '15px' }}>
                    {t('mobileMoneyModal.securePayment')}
                </p>
            </div>
        </div>
    );
}
