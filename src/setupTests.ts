import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { cleanup } from '@testing-library/react';
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

// ─── Production-grade test guardrails ────────────────────────────────────────

// Known warnings to suppress (regex patterns)
const SUPPRESSED_WARNINGS = [
  /act\(\.\.\.\)/,                    // React act() warnings in async tests
  /ReactDOM\.render is no longer/,    // React 18+ deprecation noise
  /Warning: An update to .* inside a test was not wrapped in act/,
];

function isSuppressed(args: unknown[]): boolean {
  const msg = args.map(String).join(' ');
  return SUPPRESSED_WARNINGS.some(re => re.test(msg));
}

// Spy on console.error/warn — fail tests on unexpected output
const originalError = console.error;
const originalWarn = console.warn;

let consoleErrors: unknown[][] = [];
let consoleWarns: unknown[][] = [];

beforeEach(() => {
  consoleErrors = [];
  consoleWarns = [];

  console.error = (...args: unknown[]) => {
    if (!isSuppressed(args)) {
      consoleErrors.push(args);
    }
    originalError(...args);
  };

  console.warn = (...args: unknown[]) => {
    if (!isSuppressed(args)) {
      consoleWarns.push(args);
    }
    originalWarn(...args);
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();

  console.error = originalError;
  console.warn = originalWarn;

  // Fail on unexpected console errors (opt-out per test with vi.spyOn(console, 'error'))
  if (consoleErrors.length > 0) {
    const messages = consoleErrors.map(args => args.map(String).join(' ')).join('\n');
    consoleErrors = [];
    throw new Error(`Unexpected console.error calls in test:\n${messages}`);
  }
});
