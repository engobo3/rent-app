import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function HomePage() {
    const { t } = useTranslation(['public', 'common']);

    return (
        <div className="homepage">
            {/* HERO SECTION */}
            <div style={{
                minHeight: '100vh',
                height: 'auto',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.5)), url(https://images.unsplash.com/photo-1523805009345-7448845a9e53?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: 'white',
                textAlign: 'center',
                padding: 'clamp(100px, 15vh, 120px) clamp(16px, 4vw, 20px) clamp(60px, 10vh, 80px)'
            }}>
                <div style={{ zIndex: 1, width: '100%', maxWidth: '800px', padding: '0 clamp(12px, 3vw, 16px)' }}>
                    <h1 className="hero-title">
                        Xwegbe Vivi
                    </h1>
                    <p className="hero-subtitle">
                        {t('home.heroSubtitle')}
                    </p>
                    <div style={{ display: 'flex', gap: 'clamp(12px, 3vw, 15px)', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/listings" className="btn-primary" style={{ padding: 'clamp(12px, 3vw, 15px) clamp(30px, 6vw, 40px)', textDecoration: 'none', display: 'inline-block', fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>
                            {t('home.viewUnits')}
                        </Link>
                        <Link to="/apply" className="btn-outline" style={{ padding: 'clamp(12px, 3vw, 15px) clamp(30px, 6vw, 40px)', textDecoration: 'none', display: 'inline-block', fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>
                            {t('common:nav.applyNow')}
                        </Link>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div style={{ position: 'absolute', bottom: 'clamp(20px, 4vw, 30px)', animation: 'bounce 2s infinite' }}>
                    <span style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>↓</span>
                </div>
            </div>

            {/* INTRO SECTION */}
            <div style={{ padding: 'clamp(60px, 10vw, 80px) clamp(16px, 4vw, 20px)', textAlign: 'center', background: 'white' }}>
                <div className="container" style={{ maxWidth: '800px' }}>
                    <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: 'clamp(16px, 3vw, 20px)', textTransform: 'uppercase', letterSpacing: 'clamp(1px, 0.4vw, 2px)' }}>
                        {t('home.comfortableLiving')}
                    </h2>
                    <p style={{ color: '#666', fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)', lineHeight: '1.8' }}>
                        {t('home.comfortableDescription')}
                    </p>
                </div>
            </div>

            {/* FEATURES GRID */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                gap: '1px',
                background: '#eee'
            }}>
                <div style={{ background: 'white', padding: 'clamp(30px, 6vw, 50px)', textAlign: 'center' }}>
                    <div style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)', marginBottom: '16px' }}>🔒</div>
                    <h3 style={{ fontSize: 'clamp(1rem, 3vw, 1.2rem)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>{t('home.secure')}</h3>
                    <p style={{ color: '#666', fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)', lineHeight: '1.6' }}>{t('home.secureDesc')}</p>
                </div>
                <div style={{ background: 'white', padding: 'clamp(30px, 6vw, 50px)', textAlign: 'center' }}>
                    <div style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)', marginBottom: '16px' }}>🏖️</div>
                    <h3 style={{ fontSize: 'clamp(1rem, 3vw, 1.2rem)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>{t('home.nearBeach')}</h3>
                    <p style={{ color: '#666', fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)', lineHeight: '1.6' }}>{t('home.nearBeachDesc')}</p>
                </div>
                <div style={{ background: 'white', padding: 'clamp(30px, 6vw, 50px)', textAlign: 'center' }}>
                    <div style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)', marginBottom: '16px' }}>⚡</div>
                    <h3 style={{ fontSize: 'clamp(1rem, 3vw, 1.2rem)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>{t('home.reliablePower')}</h3>
                    <p style={{ color: '#666', fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)', lineHeight: '1.6' }}>{t('home.reliablePowerDesc')}</p>
                </div>
            </div>

            {/* CALL TO ACTION */}
            <div style={{
                padding: 'clamp(60px, 10vw, 100px) clamp(16px, 4vw, 20px)',
                background: '#f4f4f4',
                textAlign: 'center'
            }}>
                <h2 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', marginBottom: 'clamp(16px, 3vw, 20px)', textTransform: 'uppercase', letterSpacing: 'clamp(1px, 0.3vw, 2px)' }}>{t('home.findHome')}</h2>
                <p style={{ color: '#666', fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)', maxWidth: '600px', margin: '0 auto clamp(24px, 5vw, 30px)', lineHeight: '1.7' }}>
                    {t('home.findHomeDesc')}
                </p>
                <div style={{ display: 'flex', gap: 'clamp(12px, 3vw, 15px)', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '400px', margin: '0 auto' }}>
                    <Link to="/listings" className="btn-primary" style={{ textDecoration: 'none', flex: '1 1 auto', padding: 'clamp(12px, 3vw, 15px) clamp(20px, 4vw, 30px)', fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>{t('home.browseUnits')}</Link>
                    <Link to="/apply" className="btn-outline" style={{ textDecoration: 'none', flex: '1 1 auto', padding: 'clamp(12px, 3vw, 15px) clamp(20px, 4vw, 30px)', fontSize: 'clamp(0.9rem, 2.5vw, 1rem)', border: '2px solid var(--secondary-color)', color: 'var(--secondary-color)' }}>{t('common:nav.applyNow')}</Link>
                </div>
            </div>

            {/* LOCATION SECTION */}
            <div style={{
                minHeight: 'clamp(350px, 50vh, 400px)',
                height: 'auto',
                padding: 'clamp(60px, 10vw, 80px) clamp(16px, 4vw, 20px)',
                background: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(https://images.unsplash.com/photo-1572883454114-efb8df45e244?ixlib=rb-4.0.3&auto=format&fit=crop&w=1950&q=80)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: 'white'
            }}>
                <div style={{ maxWidth: '800px', width: '100%', padding: '0 clamp(12px, 3vw, 16px)' }}>
                    <h2 style={{ fontSize: 'clamp(1.75rem, 6vw, 3rem)', marginBottom: 'clamp(16px, 3vw, 20px)', color: 'white', letterSpacing: 'clamp(1px, 0.3vw, 2px)' }}>{t('home.location')}</h2>
                    <p style={{ fontSize: 'clamp(0.95rem, 3vw, 1.2rem)', maxWidth: '600px', margin: '0 auto clamp(24px, 5vw, 30px)', lineHeight: '1.7' }}>
                        {t('home.locationDesc')}
                    </p>
                    <a href="tel:+22990000000" className="btn-outline" style={{ display: 'inline-block', textDecoration: 'none', minWidth: 'clamp(140px, 30vw, 160px)', padding: 'clamp(10px, 2.5vw, 12px) clamp(20px, 4vw, 24px)', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>{t('home.contactUs')}</a>
                </div>
            </div>
        </div>
    );
}
