import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Footer() {
    const { t } = useTranslation('public');

    return (
        <footer className="site-footer">
            <div className="site-footer__grid">

                {/* Contact */}
                <div className="site-footer__col">
                    <h4 className="site-footer__heading">{t('footer.contactUs')}</h4>
                    <p>{t('footer.companyName')}</p>
                    <p>{t('footer.address')}<br />{t('footer.country')}</p>
                    <p><a href="tel:+22990000000">{t('header.phone')}</a></p>
                </div>

                {/* Hours */}
                <div className="site-footer__col">
                    <h4 className="site-footer__heading">{t('footer.officeHours')}</h4>
                    <p>{t('footer.monFri')}</p>
                    <p>{t('footer.saturday')}</p>
                    <p>{t('footer.sunday')}</p>
                </div>

                {/* Quick Links */}
                <div className="site-footer__col">
                    <h4 className="site-footer__heading">{t('footer.quickLinks')}</h4>
                    <ul className="site-footer__list">
                        <li><Link to="/login">{t('footer.payRent')}</Link></li>
                        <li><Link to="/login">{t('footer.maintenanceRequest')}</Link></li>
                        <li><Link to="/listings">{t('common:nav.availableUnits')}</Link></li>
                        <li><Link to="/apply">{t('common:nav.applyNow')}</Link></li>
                    </ul>
                </div>

                {/* About */}
                <div className="site-footer__col">
                    <h4 className="site-footer__heading">{t('footer.about')}</h4>
                    <p>{t('footer.aboutText')}</p>
                </div>
            </div>

            <div className="site-footer__bottom">
                <p>&copy; {new Date().getFullYear()} {t('footer.copyright')} | {t('footer.betaVersion')}</p>
            </div>
        </footer>
    );
}
