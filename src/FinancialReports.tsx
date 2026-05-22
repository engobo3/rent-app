import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Tenant, Payment, Expense, BillingHistoryEntry } from './types';

interface FinancialReportsProps {
    tenants: Tenant[];
    expenses: Expense[];
    billingHistory: BillingHistoryEntry[];
    onUndoBilling?: (entry: BillingHistoryEntry) => void;
}

type EnrichedPayment = Payment & { tenantName: string; unit: string };

export function FinancialReports({ tenants, expenses, billingHistory, onUndoBilling }: FinancialReportsProps) {
    const { t } = useTranslation(['landlord', 'common']);

    const now = new Date();
    const [fromMonth, setFromMonth] = useState(now.getMonth());
    const [fromYear, setFromYear] = useState(now.getFullYear());
    const [toMonth, setToMonth] = useState(now.getMonth());
    const [toYear, setToYear] = useState(now.getFullYear());

    const fromDate = useMemo(() => new Date(fromYear, fromMonth, 1), [fromYear, fromMonth]);
    const toDate = useMemo(() => new Date(toYear, toMonth + 1, 0, 23, 59, 59, 999), [toYear, toMonth]);

    const filteredPayments = useMemo(() => {
        const results: EnrichedPayment[] = [];
        tenants.forEach(tenant => {
            tenant.payments?.forEach(payment => {
                const paymentDate = new Date(payment.id);
                if (paymentDate >= fromDate && paymentDate <= toDate) {
                    results.push({ ...payment, tenantName: tenant.name, unit: tenant.unit });
                }
            });
        });
        return results.sort((a, b) => b.id - a.id);
    }, [tenants, fromDate, toDate]);

    const filteredExpenses = useMemo(() => {
        return expenses.filter(exp => {
            const expDate = new Date(exp.date);
            if (isNaN(expDate.getTime())) return true; // include if unparseable
            return expDate >= fromDate && expDate <= toDate;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, fromDate, toDate]);

    const periodRevenue = useMemo(() => filteredPayments.reduce((sum, p) => sum + p.amount, 0), [filteredPayments]);
    const periodExpenses = useMemo(() => filteredExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredExpenses]);
    const periodNetProfit = periodRevenue - periodExpenses;

    const sortedBillingHistory = useMemo(() => {
        return [...billingHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [billingHistory]);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

    const exportCSV = () => {
        const headers = ['Type', 'Date', 'Description', 'Category', 'Amount (CFA)', 'Method'];
        const rows: string[][] = [];

        filteredPayments.forEach(p => {
            rows.push([
                'Revenue',
                new Date(p.id).toLocaleDateString(),
                `${p.tenantName} (${p.unit})`,
                'Rent Payment',
                p.amount.toString(),
                p.method
            ]);
        });

        filteredExpenses.forEach(e => {
            rows.push([
                'Expense',
                e.date,
                e.description,
                e.category,
                (-e.amount).toString(),
                ''
            ]);
        });

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `financial-report-${fromYear}-${fromMonth + 1}-to-${toYear}-${toMonth + 1}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const selectStyle = { padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.9rem' };

    return (
        <div>
            <h2 style={{ marginBottom: '20px' }}>{t('reports.title')}</h2>

            {/* DATE RANGE SELECTORS */}
            <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap'
            }}>
                <span style={{ fontWeight: 600 }}>{t('reports.dateRange')}:</span>
                <span>{t('reports.from')}</span>
                <select value={fromMonth} onChange={e => setFromMonth(Number(e.target.value))} style={selectStyle}>
                    {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={fromYear} onChange={e => setFromYear(Number(e.target.value))} style={selectStyle}>
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <span>{t('reports.to')}</span>
                <select value={toMonth} onChange={e => setToMonth(Number(e.target.value))} style={selectStyle}>
                    {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={toYear} onChange={e => setToYear(Number(e.target.value))} style={selectStyle}>
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button className="btn-primary" onClick={exportCSV} style={{ marginLeft: 'auto', padding: '8px 20px' }}>
                    {t('reports.exportCsv')}
                </button>
            </div>

            {/* SUMMARY CARDS */}
            <div className="metrics-row" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
                gap: '15px',
                marginBottom: '25px'
            }}>
                <div className="metric-card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>{t('reports.periodRevenue')}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0d6efd' }}>{periodRevenue.toLocaleString()} CFA</div>
                </div>
                <div className="metric-card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>{t('reports.periodExpenses')}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc3545' }}>{periodExpenses.toLocaleString()} CFA</div>
                </div>
                <div className="metric-card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>{t('reports.periodNetProfit')}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: periodNetProfit >= 0 ? '#28a745' : '#dc3545' }}>{periodNetProfit.toLocaleString()} CFA</div>
                </div>
            </div>

            {/* REVENUE TABLE */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '15px' }}>{t('reports.revenueTable')}</h3>
                {filteredPayments.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
                                    <th style={{ padding: '10px 8px' }}>{t('reports.date')}</th>
                                    <th style={{ padding: '10px 8px' }}>{t('reports.tenant')}</th>
                                    <th style={{ padding: '10px 8px' }}>{t('reports.unit')}</th>
                                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>{t('reports.amount')}</th>
                                    <th style={{ padding: '10px 8px' }}>{t('reports.method')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPayments.map(p => (
                                    <tr key={`${p.id}-${p.tenantName}`} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '10px 8px' }}>{new Date(p.id).toLocaleDateString()}</td>
                                        <td style={{ padding: '10px 8px' }}>{p.tenantName}</td>
                                        <td style={{ padding: '10px 8px' }}>{p.unit}</td>
                                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#28a745' }}>+{p.amount.toLocaleString()} CFA</td>
                                        <td style={{ padding: '10px 8px' }}>{p.method}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p style={{ color: '#888', textAlign: 'center' }}>{t('reports.noRevenue')}</p>
                )}
            </div>

            {/* EXPENSES TABLE */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '15px' }}>{t('reports.expenseTable')}</h3>
                {filteredExpenses.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
                                    <th style={{ padding: '10px 8px' }}>{t('reports.date')}</th>
                                    <th style={{ padding: '10px 8px' }}>{t('reports.description')}</th>
                                    <th style={{ padding: '10px 8px' }}>{t('reports.category')}</th>
                                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>{t('reports.amount')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredExpenses.map(e => (
                                    <tr key={e.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '10px 8px' }}>{e.date}</td>
                                        <td style={{ padding: '10px 8px' }}>{e.description}</td>
                                        <td style={{ padding: '10px 8px' }}>
                                            <span style={{
                                                background: '#f0f0f0',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '0.8rem'
                                            }}>{e.category}</span>
                                        </td>
                                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#dc3545' }}>-{e.amount.toLocaleString()} CFA</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p style={{ color: '#888', textAlign: 'center' }}>{t('reports.noExpenses')}</p>
                )}
            </div>

            {/* BILLING HISTORY */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginBottom: '15px' }}>{t('reports.billingHistory')}</h3>
                {sortedBillingHistory.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #dee2e6', textAlign: 'left' }}>
                                    <th style={{ padding: '10px 8px' }}>{t('reports.billingMonth')}</th>
                                    <th style={{ padding: '10px 8px' }}>{t('reports.dateTriggered')}</th>
                                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>{t('reports.tenantsCharged')}</th>
                                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>{t('reports.totalRentAdded')}</th>
                                    <th style={{ padding: '10px 8px' }}>{t('reports.trigger')}</th>
                                    {onUndoBilling && <th style={{ padding: '10px 8px' }}></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedBillingHistory.map(entry => (
                                    <tr key={entry.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '10px 8px', fontWeight: 600 }}>{entry.billingMonth}</td>
                                        <td style={{ padding: '10px 8px' }}>{new Date(entry.date).toLocaleDateString()}</td>
                                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>{entry.tenantsCharged}</td>
                                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>{entry.totalRentAdded.toLocaleString()} CFA</td>
                                        <td style={{ padding: '10px 8px' }}>
                                            <span style={{
                                                background: entry.triggeredBy === 'auto' ? '#d4edda' : '#cce5ff',
                                                color: entry.triggeredBy === 'auto' ? '#155724' : '#004085',
                                                padding: '2px 10px',
                                                borderRadius: '12px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600
                                            }}>
                                                {t(`reports.${entry.triggeredBy}`)}
                                            </span>
                                        </td>
                                        {onUndoBilling && (
                                            <td style={{ padding: '10px 8px' }}>
                                                <button
                                                    onClick={() => onUndoBilling(entry)}
                                                    style={{
                                                        background: '#dc3545',
                                                        color: 'white',
                                                        border: 'none',
                                                        padding: '4px 12px',
                                                        borderRadius: '4px',
                                                        fontSize: '0.8rem',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {t('reports.undoBilling')}
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p style={{ color: '#888', textAlign: 'center' }}>{t('reports.noBillingHistory')}</p>
                )}
            </div>
        </div>
    );
}
