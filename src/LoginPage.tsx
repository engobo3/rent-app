import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export function LoginPage() {
    const { t } = useTranslation(['public', 'common']);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            toast.success(t('login.loggedIn'));
            navigate('/dashboard');
        } catch (err) {
            const msg = (err as Error).message;
            if (msg.includes('user-not-found') || msg.includes('invalid-credential')) {
                toast.error(t('login.noAccount'));
            } else {
                toast.error(t('login.loginFailed', { message: msg }));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error(t('login.passwordsMismatch'));
            return;
        }
        if (password.length < 6) {
            toast.error(t('login.passwordTooShort'));
            return;
        }
        setIsLoading(true);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            toast.success(t('login.accountCreated'));
            navigate('/dashboard');
        } catch (err) {
            const msg = (err as Error).message;
            if (msg.includes('email-already-in-use')) {
                toast.error(t('login.emailExists'));
            } else {
                toast.error(t('login.signupFailed', { message: msg }));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: 'clamp(10px, 2.5vw, 12px)',
        border: '1px solid #ddd',
        fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
        outline: 'none',
        boxSizing: 'border-box' as const,
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '8px',
        fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
        fontWeight: 600,
        color: '#666',
    };

    return (
        <div style={{ maxWidth: '400px', width: '100%', padding: 'clamp(28px, 6vw, 40px)', background: 'white', border: '1px solid #eee' }}>
            <h1 style={{
                textAlign: 'center',
                marginBottom: 'clamp(20px, 4vw, 30px)',
                textTransform: 'uppercase',
                letterSpacing: 'clamp(1px, 0.3vw, 2px)',
                fontSize: 'clamp(1.2rem, 4vw, 1.5rem)',
                color: 'var(--secondary-color)'
            }}>
                {mode === 'signin' ? t('login.residentLogin') : t('login.createAccount')}
            </h1>

            {/* Toggle Tabs */}
            <div style={{
                display: 'flex',
                marginBottom: 'clamp(20px, 4vw, 24px)',
                border: '1px solid #ddd',
                borderRadius: '4px',
                overflow: 'hidden'
            }}>
                <button
                    type="button"
                    onClick={() => setMode('signin')}
                    style={{
                        flex: 1,
                        padding: 'clamp(10px, 2.5vw, 12px)',
                        border: 'none',
                        background: mode === 'signin' ? 'var(--primary-color)' : 'white',
                        color: mode === 'signin' ? 'white' : '#666',
                        fontWeight: 600,
                        fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                >
                    {t('login.signIn')}
                </button>
                <button
                    type="button"
                    onClick={() => setMode('signup')}
                    style={{
                        flex: 1,
                        padding: 'clamp(10px, 2.5vw, 12px)',
                        border: 'none',
                        borderLeft: '1px solid #ddd',
                        background: mode === 'signup' ? 'var(--primary-color)' : 'white',
                        color: mode === 'signup' ? 'white' : '#666',
                        fontWeight: 600,
                        fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                >
                    {t('login.signUp')}
                </button>
            </div>

            <form onSubmit={mode === 'signin' ? handleLogin : handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(16px, 3vw, 20px)' }}>
                <div>
                    <label htmlFor="email" style={labelStyle}>{t('login.email')}</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        style={inputStyle}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="password" style={labelStyle}>{t('login.password')}</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder={mode === 'signup' ? t('login.passwordSignupPlaceholder') : t('login.passwordPlaceholder')}
                        style={inputStyle}
                        required
                    />
                </div>

                {mode === 'signup' && (
                    <div>
                        <label htmlFor="confirmPassword" style={labelStyle}>{t('login.confirmPassword')}</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder={t('login.confirmPlaceholder')}
                            style={inputStyle}
                            required
                        />
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary"
                    style={{
                        marginTop: '10px',
                        opacity: isLoading ? 0.7 : 1,
                        width: '100%',
                        minHeight: '44px',
                    }}
                >
                    {isLoading
                        ? (mode === 'signin' ? t('login.signingIn') : t('login.creatingAccount'))
                        : (mode === 'signin' ? t('login.signIn') : t('login.createAccount'))
                    }
                </button>
            </form>

            {mode === 'signup' && (
                <p style={{
                    marginTop: 'clamp(16px, 3vw, 20px)',
                    fontSize: 'clamp(0.8rem, 2vw, 0.85rem)',
                    color: '#888',
                    textAlign: 'center',
                    lineHeight: '1.5'
                }}>
                    {t('login.tenantHint')}
                </p>
            )}
        </div>
    );
}
