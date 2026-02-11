import { useTranslation } from 'react-i18next';
import { FedaCheckoutButton } from 'fedapay-reactjs';

interface MobileMoneyModalProps {
    amount: number;
    tenantId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

export function MobileMoneyModal({ amount, tenantId, onSuccess, onCancel }: MobileMoneyModalProps) {
    const { t } = useTranslation(['tenant', 'common']);
    const PUBLIC_KEY = 'pk_sandbox_vE_32y3wM8336-72M7_315-L'; // Sandbox key



    const checkoutEmbedOptions = {
        public_key: PUBLIC_KEY,
        transaction: {
            amount: amount,
            description: t('mobileMoneyModal.rentPayment', { tenantId })
        },
        currency: {
            iso: 'XOF'
        },
        customer: {
            email: 'tenant@example.com', // Placeholder or add input
            lastname: 'Tenant', // Placeholder
            firstname: tenantId
        },
        button: {
            text: t('mobileMoneyModal.payButton', { amount: amount.toLocaleString() }),
            class: 'fedapay-button'
        },
        onComplete: (resp: { reason: string }) => {
            console.log('FedaPay Payment Response:', resp);
            const reason = resp.reason;
            if (reason === "CHECKOUT_COMPLETED" || reason === "TRANSACTION_APPROVED") {
                onSuccess();
            } else {
                console.log("Payment not completed:", reason);
            }
        }
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
                    <button onClick={onCancel} style={{ background: 'transparent', color: 'black', fontSize: '1.5rem', border: 'none', cursor: 'pointer' }}>×</button>
                </div>

                <p style={{ marginBottom: '20px' }}>{t('mobileMoneyModal.amountToPay')} <strong>{amount.toLocaleString()} CFA</strong></p>

                <FedaCheckoutButton
                    options={checkoutEmbedOptions}
                />

                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '15px' }}>
                    {t('mobileMoneyModal.securePayment')}
                </p>
            </div>
        </div>
    );
}
