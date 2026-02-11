import '@testing-library/jest-dom';
import { vi } from 'vitest';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from './i18n/locales/en/common.json';
import enLandlord from './i18n/locales/en/landlord.json';
import enTenant from './i18n/locales/en/tenant.json';
import enPublic from './i18n/locales/en/public.json';
import enAdmin from './i18n/locales/en/admin.json';

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      landlord: enLandlord,
      tenant: enTenant,
      public: enPublic,
      admin: enAdmin,
    },
  },
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'landlord', 'tenant', 'public', 'admin'],
  interpolation: { escapeValue: false },
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
