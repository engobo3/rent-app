import { useTranslation } from 'react-i18next';

const LANGUAGES = [
    { code: 'fr',  label: 'FR',  name: 'Français' },
    { code: 'fon', label: 'Fon', name: 'Fɔngbe' },
    { code: 'en',  label: 'EN',  name: 'English' },
] as const;

interface LanguageSwitcherProps {
    variant?: 'light' | 'dark';
}

export function LanguageSwitcher({ variant = 'light' }: LanguageSwitcherProps) {
    const { i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        try {
            localStorage.setItem('xwegbe-lang', lng);
        } catch {
            // Ignore — private mode / storage unavailable.
        }
    };

    return (
        <div className={`lang-switcher lang-switcher--${variant}`} role="group" aria-label="Language">
            {LANGUAGES.map((lang) => {
                const isActive = i18n.language === lang.code;
                return (
                    <button
                        key={lang.code}
                        type="button"
                        onClick={() => changeLanguage(lang.code)}
                        className={`lang-switcher__btn ${isActive ? 'lang-switcher__btn--active' : ''}`}
                        title={lang.name}
                        aria-pressed={isActive}
                    >
                        {lang.label}
                    </button>
                );
            })}
        </div>
    );
}
