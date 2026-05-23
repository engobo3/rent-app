import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Feature {
    icon: string;
    titleKey: string;
    descKey: string;
}

const FEATURES: Feature[] = [
    { icon: '🔒', titleKey: 'home.secure',        descKey: 'home.secureDesc' },
    { icon: '🏖️', titleKey: 'home.nearBeach',     descKey: 'home.nearBeachDesc' },
    { icon: '⚡', titleKey: 'home.reliablePower', descKey: 'home.reliablePowerDesc' },
];

export function HomePage() {
    const { t } = useTranslation(['public', 'common']);

    return (
        <div className="homepage">
            {/* Hero */}
            <section className="hero">
                <div className="hero__inner">
                    <h1 className="hero__title">Xwegbe Vivi</h1>
                    <p className="hero__subtitle">{t('home.heroSubtitle')}</p>
                    <div className="hero__actions">
                        <Link to="/listings" className="btn btn-primary btn-lg">
                            {t('home.viewUnits')}
                        </Link>
                        <Link to="/apply" className="btn btn-outline btn-lg">
                            {t('common:nav.applyNow')}
                        </Link>
                    </div>
                </div>
                <span className="hero__scroll" aria-hidden="true">↓</span>
            </section>

            {/* Intro */}
            <section className="section">
                <div className="container-prose text-center">
                    <h2 className="section__title">{t('home.comfortableLiving')}</h2>
                    <p className="section__lead">{t('home.comfortableDescription')}</p>
                </div>
            </section>

            {/* Features */}
            <section className="section section--muted">
                <div className="container">
                    <div className="feature-grid">
                        {FEATURES.map((f) => (
                            <div key={f.titleKey} className="feature-card">
                                <div className="feature-card__icon" aria-hidden="true">{f.icon}</div>
                                <h3 className="feature-card__title">{t(f.titleKey)}</h3>
                                <p className="feature-card__desc">{t(f.descKey)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="section">
                <div className="container-prose text-center">
                    <h2 className="section__title">{t('home.findHome')}</h2>
                    <p className="section__lead">{t('home.findHomeDesc')}</p>
                    <div className="cta-actions">
                        <Link to="/listings" className="btn btn-primary btn-lg">
                            {t('home.browseUnits')}
                        </Link>
                        <Link to="/apply" className="btn btn-secondary btn-lg">
                            {t('common:nav.applyNow')}
                        </Link>
                    </div>
                </div>
            </section>

            {/* Location */}
            <section className="location-panel section--inverse">
                <div className="location-panel__inner">
                    <h2 className="section__title">{t('home.location')}</h2>
                    <p className="section__lead">{t('home.locationDesc')}</p>
                    <a href="tel:+22990000000" className="btn btn-outline btn-lg">
                        {t('home.contactUs')}
                    </a>
                </div>
            </section>
        </div>
    );
}
