import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Footer() {
    const { t } = useTranslation('public');

    return (
        <footer style={{ background: '#1a1a1a', color: '#999', padding: '60px 20px', fontSize: '0.9rem' }}>
            <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px' }}>

                {/* Contact Column */}
                <div>
                    <h4 style={{ color: 'white', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('footer.contactUs')}</h4>
                    <p style={{ marginBottom: '10px' }}>{t('footer.companyName')}</p>
                    <p style={{ marginBottom: '10px' }}>{t('footer.address')}<br />{t('footer.country')}</p>
                    <p style={{ marginBottom: '10px' }}><a href="tel:+22990000000" style={{ color: 'white' }}>{t('header.phone')}</a></p>
                </div>

                {/* Hours Column */}
                <div>
                    <h4 style={{ color: 'white', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('footer.officeHours')}</h4>
                    <p>{t('footer.monFri')}</p>
                    <p>{t('footer.saturday')}</p>
                    <p>{t('footer.sunday')}</p>
                </div>

                {/* Quick Links */}
                <div>
                    <h4 style={{ color: 'white', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('footer.quickLinks')}</h4>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        <li style={{ marginBottom: '10px' }}><Link to="/login" style={{ color: '#ccc', transition: 'color 0.2s' }}>{t('footer.payRent')}</Link></li>
                        <li style={{ marginBottom: '10px' }}><Link to="/login" style={{ color: '#ccc', transition: 'color 0.2s' }}>{t('footer.maintenanceRequest')}</Link></li>
                        <li style={{ marginBottom: '10px' }}><Link to="/listings" style={{ color: '#ccc', transition: 'color 0.2s' }}>{t('common:nav.availableUnits')}</Link></li>
                        <li style={{ marginBottom: '10px' }}><Link to="/apply" style={{ color: '#ccc', transition: 'color 0.2s' }}>{t('common:nav.applyNow')}</Link></li>
                    </ul>
                </div>

                {/* About */}
                <div>
                    <h4 style={{ color: 'white', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('footer.about')}</h4>
                    <p style={{ lineHeight: '1.7' }}>
                        {t('footer.aboutText')}
                    </p>
                </div>
            </div>

            <div style={{ borderTop: '1px solid #333', marginTop: '40px', paddingTop: '20px', textAlign: 'center' }}>
                <p>&copy; {new Date().getFullYear()} {t('footer.copyright')} | {t('footer.betaVersion')}</p>
            </div>
        </footer>
    );
}
