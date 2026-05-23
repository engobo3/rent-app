import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

type Mode = 'signin' | 'signup';

export function LoginPage() {
    const { t } = useTranslation(['public', 'common']);
    const [mode, setMode] = useState<Mode>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: FormEvent) => {
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

    const handleSignup = async (e: FormEvent) => {
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

    const isSignin = mode === 'signin';
    const heading = isSignin ? t('login.residentLogin') : t('login.createAccount');

    return (
        <div className="auth-card">
            <h1 className="auth-card__title">{heading}</h1>
            <p className="auth-card__subtitle">
                {isSignin ? t('login.signIn') : t('login.signUp')}
            </p>

            {/* Mode toggle */}
            <div className="segmented">
                <button
                    type="button"
                    aria-pressed={isSignin}
                    onClick={() => setMode('signin')}
                    className={`segmented__btn ${isSignin ? 'segmented__btn--active' : ''}`}
                >
                    {t('login.signIn')}
                </button>
                <button
                    type="button"
                    aria-pressed={!isSignin}
                    onClick={() => setMode('signup')}
                    className={`segmented__btn ${!isSignin ? 'segmented__btn--active' : ''}`}
                >
                    {t('login.signUp')}
                </button>
            </div>

            <form onSubmit={isSignin ? handleLogin : handleSignup} className="auth-form">
                <div className="form-group">
                    <label htmlFor="email" className="form-label">{t('login.email')}</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="password" className="form-label">{t('login.password')}</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isSignin ? t('login.passwordPlaceholder') : t('login.passwordSignupPlaceholder')}
                        autoComplete={isSignin ? 'current-password' : 'new-password'}
                        required
                    />
                </div>

                {!isSignin && (
                    <div className="form-group">
                        <label htmlFor="confirmPassword" className="form-label">{t('login.confirmPassword')}</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t('login.confirmPlaceholder')}
                            autoComplete="new-password"
                            required
                        />
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary btn-lg btn-block"
                >
                    {isLoading
                        ? (isSignin ? t('login.signingIn') : t('login.creatingAccount'))
                        : (isSignin ? t('login.signIn') : t('login.createAccount'))}
                </button>
            </form>

            {!isSignin && (
                <p className="auth-form__hint">{t('login.tenantHint')}</p>
            )}
        </div>
    );
}
