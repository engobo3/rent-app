import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import frCommon from './locales/fr/common.json';
import frLandlord from './locales/fr/landlord.json';
import frTenant from './locales/fr/tenant.json';
import frPublic from './locales/fr/public.json';
import frAdmin from './locales/fr/admin.json';

import fonCommon from './locales/fon/common.json';
import fonLandlord from './locales/fon/landlord.json';
import fonTenant from './locales/fon/tenant.json';
import fonPublic from './locales/fon/public.json';
import fonAdmin from './locales/fon/admin.json';

import enCommon from './locales/en/common.json';
import enLandlord from './locales/en/landlord.json';
import enTenant from './locales/en/tenant.json';
import enPublic from './locales/en/public.json';
import enAdmin from './locales/en/admin.json';

const savedLanguage = localStorage.getItem('xwegbe-lang') || 'fr';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: {
        common: frCommon,
        landlord: frLandlord,
        tenant: frTenant,
        public: frPublic,
        admin: frAdmin,
      },
      fon: {
        common: fonCommon,
        landlord: fonLandlord,
        tenant: fonTenant,
        public: fonPublic,
        admin: fonAdmin,
      },
      en: {
        common: enCommon,
        landlord: enLandlord,
        tenant: enTenant,
        public: enPublic,
        admin: enAdmin,
      },
    },
    lng: savedLanguage,
    fallbackLng: {
      fon: ['fr', 'en'],
      default: ['en'],
    },
    defaultNS: 'common',
    ns: ['common', 'landlord', 'tenant', 'public', 'admin'],
    interpolation: {
      escapeValue: false,
    },
  });

i18n.on('languageChanged', (lng: string) => {
  document.documentElement.setAttribute('lang', lng);
});

// Set initial lang attribute
document.documentElement.setAttribute('lang', savedLanguage);

export default i18n;
