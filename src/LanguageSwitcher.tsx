import { useTranslation } from 'react-i18next';

const languages = [
    { code: 'fr', label: 'FR', name: 'Français' },
    { code: 'fon', label: 'Fon', name: 'Fɔngbe' },
    { code: 'en', label: 'EN', name: 'English' },
];

export function LanguageSwitcher({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
    const { i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('xwegbe-lang', lng);
    };

    return (
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            {languages.map((lang) => (
                <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    style={{
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        fontWeight: i18n.language === lang.code ? 700 : 400,
                        background: i18n.language === lang.code ? 'var(--primary-color)' : 'transparent',
                        color: i18n.language === lang.code ? 'white' : (variant === 'dark' ? 'rgba(255,255,255,0.8)' : 'inherit'),
                        border: `1px solid ${i18n.language === lang.code ? 'var(--primary-color)' : (variant === 'dark' ? 'rgba(255,255,255,0.3)' : '#ccc')}`,
                        borderRadius: '3px',
                        cursor: 'pointer',
                        minHeight: '28px',
                        transition: 'all 0.2s',
                    }}
                    title={lang.name}
                >
                    {lang.label}
                </button>
            ))}
        </div>
    );
}
