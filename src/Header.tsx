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

    // Handle scroll effect for transparent header
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <header style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            background: scrolled || menuOpen ? 'white' : 'transparent',
            boxShadow: scrolled ? '0 2px 10px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.3s ease',
            color: scrolled || menuOpen ? 'var(--secondary-color)' : 'white',
            padding: '0 var(--spacing-md)',
            height: 'var(--header-height, 80px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
        }}>
            {/* Logo area */}
            <div className="logo" style={{ zIndex: 1002 }}>
                <Link to="/" style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'clamp(0.9rem, 3vw, 1.2rem)',
                    fontWeight: 700,
                    letterSpacing: 'clamp(1px, 0.3vw, 2px)',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'clamp(6px, 2vw, 10px)',
                    flexWrap: 'wrap'
                }}>
                    XWEGBE <span style={{ fontWeight: 300, fontSize: 'clamp(0.7rem, 2.5vw, 0.9rem)' }}>VIVI</span>
                    <span className="beta-badge">{t('common:app.beta')}</span>
                </Link>
            </div>

            {/* Desktop Navigation Icons */}
            <div className="nav-icons" style={{ display: 'flex', alignItems: 'center', gap: '20px', zIndex: 1002 }}>
                <div className="hide-mobile">
                    <LanguageSwitcher variant={scrolled ? 'light' : 'dark'} />
                </div>

                <a href="tel:+22990000000" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 600 }} className="hide-mobile">
                    <span>{t('public:header.phone')}</span>
                </a>

                <Link to="/apply" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--primary-color)',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: 'var(--border-radius)',
                    textTransform: 'uppercase',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    letterSpacing: '1px'
                }} className="hide-mobile">
                    {t('common:nav.applyNow')}
                </Link>

                {user ? (
                    <div className="hide-mobile" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <Link to="/dashboard" style={{ fontWeight: 600 }}>{t('common:nav.dashboard')}</Link>
                        <button onClick={handleLogout} style={{ fontWeight: 600, color: 'inherit' }}>{t('common:nav.logout')}</button>
                    </div>
                ) : (
                    <Link to="/login" className="hide-mobile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.5rem' }}>👤</span>
                    </Link>
                )}

                {/* Hamburger Menu Toggle */}
                <button
                    className="burger-btn"
                    onClick={() => setMenuOpen(!menuOpen)}
                    style={{
                        color: 'inherit',
                        background: 'none',
                        marginLeft: '10px'
                    }}
                >
                    {menuOpen ? '✕' : '☰'}
                </button>
            </div>

            {/* Mobile/Expanded Menu */}
            <div style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: '100%',
                maxWidth: 'min(400px, 85vw)',
                height: '100vh',
                background: 'white',
                color: 'var(--secondary-color)',
                transition: 'transform 0.3s ease, visibility 0.3s ease',
                transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
                visibility: menuOpen ? 'visible' : 'hidden',
                boxShadow: '-5px 0 15px rgba(0,0,0,0.1)',
                padding: 'clamp(80px, 12vh, 100px) clamp(24px, 6vw, 40px) clamp(20px, 4vh, 30px)',
                zIndex: 1001,
                display: 'flex',
                flexDirection: 'column',
                gap: 'clamp(16px, 3vh, 20px)',
                overflowY: 'auto'
            }}>
                <div style={{ marginBottom: '8px' }}>
                    <LanguageSwitcher variant="light" />
                </div>
                <Link to="/" onClick={() => setMenuOpen(false)} style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', fontWeight: 600 }}>{t('common:nav.home')}</Link>
                <Link to="/listings" onClick={() => setMenuOpen(false)} style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', fontWeight: 600 }}>{t('common:nav.availableUnits')}</Link>

                {/* Mobile Auth Links */}
                {user ? (
                    <>
                        <Link to="/dashboard" onClick={() => setMenuOpen(false)} style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', fontWeight: 600, color: 'var(--primary-color)' }}>{t('common:nav.myDashboard')}</Link>
                        <button
                            onClick={() => { setMenuOpen(false); handleLogout(); }}
                            style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', fontWeight: 600, textAlign: 'left', background: 'none', padding: 0, color: 'var(--secondary-color)' }}
                        >
                            {t('common:nav.logout')}
                        </button>
                    </>
                ) : (
                    <Link to="/login" onClick={() => setMenuOpen(false)} style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', fontWeight: 600, color: 'var(--primary-color)' }}>{t('common:nav.residentLogin')}</Link>
                )}

                <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #eee', margin: 'clamp(12px, 3vh, 20px) 0' }} />
                <Link to="/apply" onClick={() => setMenuOpen(false)} className="btn-primary" style={{ textAlign: 'center', padding: 'clamp(12px, 3vw, 14px) clamp(20px, 4vw, 24px)', fontSize: 'clamp(0.9rem, 2.5vw, 1rem)' }}>{t('common:nav.applyNow')}</Link>
            </div>

            {/* Overlay for menu */}
            {menuOpen && (
                <div
                    onClick={() => setMenuOpen(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100vh',
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 1000
                    }}
                />
            )}
        </header>
    );
}
