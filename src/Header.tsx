import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { type User, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';

interface HeaderProps {
    user: User | null;
}

export function Header({ user }: HeaderProps) {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();
    const { t } = useTranslation(['public', 'common']);

    // Add a small shadow / opaque background once the user scrolls past the hero.
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Lock body scroll while the drawer is open.
    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [menuOpen]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const headerClass = [
        'site-header',
        scrolled || menuOpen ? 'site-header--scrolled' : '',
        menuOpen ? 'site-header--menu-open' : '',
    ].filter(Boolean).join(' ');

    const switcherVariant = scrolled || menuOpen ? 'light' : 'dark';

    return (
        <header className={headerClass}>
            <div className="logo">
                <Link to="/" className="site-logo">
                    XWEGBE <span className="site-logo__accent">VIVI</span>
                    <span className="beta-badge">{t('common:app.beta')}</span>
                </Link>
            </div>

            <nav className="site-nav">
                <div className="hide-mobile">
                    <LanguageSwitcher variant={switcherVariant} />
                </div>

                <a href="tel:+22990000000" className="site-nav__phone hide-mobile">
                    <span>{t('public:header.phone')}</span>
                </a>

                <Link to="/apply" className="site-nav__cta hide-mobile">
                    {t('common:nav.applyNow')}
                </Link>

                {user ? (
                    <div className="hide-mobile row" style={{ gap: 'var(--space-4)' }}>
                        <Link to="/dashboard" className="site-nav__link">{t('common:nav.dashboard')}</Link>
                        <button onClick={handleLogout} className="site-nav__link" type="button">
                            {t('common:nav.logout')}
                        </button>
                    </div>
                ) : (
                    <Link to="/login" className="site-nav__avatar hide-mobile" aria-label={t('common:nav.residentLogin')}>
                        <span>👤</span>
                    </Link>
                )}

                <button
                    type="button"
                    className="burger-btn"
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-expanded={menuOpen}
                    aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                >
                    {menuOpen ? '✕' : '☰'}
                </button>
            </nav>

            {/* Mobile drawer */}
            <aside className={`drawer ${menuOpen ? 'drawer--open' : ''}`} aria-hidden={!menuOpen}>
                <div style={{ marginBottom: 'var(--space-2)' }}>
                    <LanguageSwitcher variant="light" />
                </div>
                <Link to="/" onClick={() => setMenuOpen(false)} className="drawer__link">
                    {t('common:nav.home')}
                </Link>
                <Link to="/listings" onClick={() => setMenuOpen(false)} className="drawer__link">
                    {t('common:nav.availableUnits')}
                </Link>

                {user ? (
                    <>
                        <Link
                            to="/dashboard"
                            onClick={() => setMenuOpen(false)}
                            className="drawer__link drawer__link--brand"
                        >
                            {t('common:nav.myDashboard')}
                        </Link>
                        <button
                            type="button"
                            onClick={() => { setMenuOpen(false); handleLogout(); }}
                            className="drawer__link"
                            style={{ textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            {t('common:nav.logout')}
                        </button>
                    </>
                ) : (
                    <Link
                        to="/login"
                        onClick={() => setMenuOpen(false)}
                        className="drawer__link drawer__link--brand"
                    >
                        {t('common:nav.residentLogin')}
                    </Link>
                )}

                <hr className="drawer__divider" />

                <Link
                    to="/apply"
                    onClick={() => setMenuOpen(false)}
                    className="btn btn-primary btn-lg btn-block"
                >
                    {t('common:nav.applyNow')}
                </Link>
            </aside>

            {menuOpen && (
                <div className="drawer-overlay" onClick={() => setMenuOpen(false)} aria-hidden="true" />
            )}
        </header>
    );
}
