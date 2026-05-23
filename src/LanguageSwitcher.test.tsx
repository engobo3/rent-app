import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { LanguageSwitcher } from './LanguageSwitcher';

// Mock i18next
const mockChangeLanguage = vi.fn();
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        i18n: {
            language: 'fr',
            changeLanguage: mockChangeLanguage,
        },
    }),
}));

describe('LanguageSwitcher', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('renders all three language buttons', () => {
        render(<LanguageSwitcher />);

        expect(screen.getByText('FR')).toBeInTheDocument();
        expect(screen.getByText('Fon')).toBeInTheDocument();
        expect(screen.getByText('EN')).toBeInTheDocument();
    });

    it('renders language name as title attribute', () => {
        render(<LanguageSwitcher />);

        expect(screen.getByTitle('Français')).toBeInTheDocument();
        expect(screen.getByTitle('Fɔngbe')).toBeInTheDocument();
        expect(screen.getByTitle('English')).toBeInTheDocument();
    });

    it('calls changeLanguage when a language button is clicked', () => {
        render(<LanguageSwitcher />);

        fireEvent.click(screen.getByText('EN'));
        expect(mockChangeLanguage).toHaveBeenCalledWith('en');
    });

    it('saves language to localStorage on change', () => {
        render(<LanguageSwitcher />);

        fireEvent.click(screen.getByText('Fon'));
        expect(localStorage.getItem('xwegbe-lang')).toBe('fon');
    });

    it('highlights the active language button', () => {
        render(<LanguageSwitcher />);

        // FR is the current language (mocked as 'fr')
        const frBtn = screen.getByText('FR');
        expect(frBtn).toHaveAttribute('aria-pressed', 'true');
        expect(frBtn.className).toMatch(/lang-switcher__btn--active/);

        // EN should not be highlighted
        const enBtn = screen.getByText('EN');
        expect(enBtn).toHaveAttribute('aria-pressed', 'false');
        expect(enBtn.className).not.toMatch(/lang-switcher__btn--active/);
    });

    it('calls changeLanguage for each language', () => {
        render(<LanguageSwitcher />);

        fireEvent.click(screen.getByText('FR'));
        expect(mockChangeLanguage).toHaveBeenCalledWith('fr');

        fireEvent.click(screen.getByText('Fon'));
        expect(mockChangeLanguage).toHaveBeenCalledWith('fon');

        fireEvent.click(screen.getByText('EN'));
        expect(mockChangeLanguage).toHaveBeenCalledWith('en');
    });
});
