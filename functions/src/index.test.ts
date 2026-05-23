import { createPaymentIntent, scheduledMonthlyBilling, generateListingDescription, emailReceipt } from './index';
import Stripe from 'stripe';

// ─── Firestore mock surface ───────────────────────────────────────────────
//
// Cloud Functions code calls `admin.firestore()` and chains:
//   .collection(...).get()
//   .collection(...).where(...).where(...).limit(...).get()
//   .collection(...).doc(...).get()
//   .runTransaction(fn)  (rate limiter)
//   .batch()             (returns mockBatch)
//
// We expose a flexible mock that lets each test stub the response.
const mockBatch = {
  update: jest.fn(),
  set: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
};

const mockAdd = jest.fn().mockResolvedValue({ id: 'billing-1' });

interface MockQuery {
  collection: jest.Mock;
  where: jest.Mock;
  limit: jest.Mock;
  doc: jest.Mock;
  get: jest.Mock;
  add: jest.Mock;
  batch: jest.Mock;
  runTransaction: jest.Mock;
}

const mockFirestore: MockQuery = {
  collection: jest.fn(),
  where: jest.fn(),
  limit: jest.fn(),
  doc: jest.fn(),
  get: jest.fn(),
  add: mockAdd,
  batch: jest.fn(() => mockBatch),
  runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<void>) => {
    // Rate-limit transactions: just immediately invoke the body with a
    // stubbed tx that does nothing (we don't assert rate-limit state here).
    const tx = { get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }), set: jest.fn() };
    await fn(tx);
  }),
};
// All collection/where/limit/doc calls return the same fluent object so we
// don't have to thread chains in individual tests.
mockFirestore.collection.mockReturnValue(mockFirestore);
mockFirestore.where.mockReturnValue(mockFirestore);
mockFirestore.limit.mockReturnValue(mockFirestore);
mockFirestore.doc.mockReturnValue(mockFirestore);

// Sentinel returned by FieldValue.increment so tests can match on the delta.
const fieldValueIncrement = jest.fn((n: number) => ({ __increment: n }));

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: Object.assign(
    jest.fn(() => mockFirestore),
    { FieldValue: { increment: (n: number) => fieldValueIncrement(n) } },
  ),
}));

// ─── Stripe / OpenAI / nodemailer ────────────────────────────────────────

jest.mock('stripe', () => {
  const mStripe = {
    paymentIntents: {
      create: jest.fn(),
    },
  };
  return jest.fn(() => mStripe);
});

const mockChatCreate = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockChatCreate,
      },
    },
  }));
});

const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

// ─── firebase-functions ──────────────────────────────────────────────────
//
// jest.mock factories are hoisted to the top of the file, so the
// HttpsError replacement is declared INSIDE the factory closure.
jest.mock('firebase-functions/v2/https', () => {
  class MockHttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = 'HttpsError';
    }
  }
  return {
    onCall: (_opts: unknown, handler: (req: unknown) => Promise<unknown>) => handler,
    HttpsError: MockHttpsError,
  };
});

jest.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: (_opts: unknown, handler: () => Promise<void>) => handler,
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: jest.fn(() => ({ value: () => 'mock-secret' })),
}));

// ─── Test helpers ────────────────────────────────────────────────────────

function authedRequest<T>(data: T, opts: { uid?: string; email?: string } = {}) {
  return {
    data,
    auth: {
      uid: opts.uid ?? 'caller-uid',
      token: { email: opts.email ?? 'caller@example.com' },
    },
  };
}

/** Make `.get()` return the supplied tenant doc on the next call. */
function stubTenantGet(tenantData: Record<string, unknown>, exists = true) {
  mockFirestore.get.mockResolvedValueOnce({
    exists,
    data: () => tenantData,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('Cloud Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFirestore.collection.mockReturnValue(mockFirestore);
    mockFirestore.where.mockReturnValue(mockFirestore);
    mockFirestore.limit.mockReturnValue(mockFirestore);
    mockFirestore.doc.mockReturnValue(mockFirestore);
    mockFirestore.add = mockAdd;
  });

  // ─── createPaymentIntent ────────────────────────────────────────────────

  describe('createPaymentIntent', () => {
    it('creates a PaymentIntent when the caller is the tenant and the amount is within balance', async () => {
      stubTenantGet({ ownerId: 'landlord-1', email: 'caller@example.com', balance: 5000 });

      const stripeInstance = new (Stripe as unknown as new (...args: unknown[]) => Stripe)('k', { apiVersion: '2025-12-15.clover' });
      const mockCreate = stripeInstance.paymentIntents.create as jest.Mock;
      mockCreate.mockResolvedValue({ client_secret: 'cs_123' });

      const result = await (createPaymentIntent as unknown as (req: unknown) => Promise<unknown>)(
        authedRequest({ amount: 5000, tenantId: 't1' }),
      );

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        amount: 5000,
        currency: 'xof',
        metadata: expect.objectContaining({ tenantId: 't1' }),
      }));
      expect(result).toEqual({ clientSecret: 'cs_123' });
    });

    it('rounds fractional amounts before sending to Stripe', async () => {
      stubTenantGet({ ownerId: 'landlord-1', email: 'caller@example.com', balance: 10000 });

      const stripeInstance = new (Stripe as unknown as new (...args: unknown[]) => Stripe)('k', { apiVersion: '2025-12-15.clover' });
      const mockCreate = stripeInstance.paymentIntents.create as jest.Mock;
      mockCreate.mockResolvedValue({ client_secret: 'cs' });

      await (createPaymentIntent as unknown as (req: unknown) => Promise<unknown>)(
        authedRequest({ amount: 5000.7, tenantId: 't1' }),
      );

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 5001 }));
    });

    it('rejects unauthenticated callers', async () => {
      await expect(
        (createPaymentIntent as unknown as (req: unknown) => Promise<unknown>)({
          data: { amount: 5000, tenantId: 't1' },
          // no .auth
        }),
      ).rejects.toThrow(/Sign in required/);
    });

    it('rejects callers who are neither the tenant nor their landlord', async () => {
      stubTenantGet({ ownerId: 'someone-else', email: 'other@example.com', balance: 5000 });

      await expect(
        (createPaymentIntent as unknown as (req: unknown) => Promise<unknown>)(
          authedRequest({ amount: 5000, tenantId: 't1' }),
        ),
      ).rejects.toThrow(/Not authorized/);
    });

    it('rejects an amount greater than the tenant balance', async () => {
      stubTenantGet({ ownerId: 'landlord-1', email: 'caller@example.com', balance: 1000 });

      await expect(
        (createPaymentIntent as unknown as (req: unknown) => Promise<unknown>)(
          authedRequest({ amount: 5000, tenantId: 't1' }),
        ),
      ).rejects.toThrow(/exceeds outstanding balance/);
    });
  });

  // ─── generateListingDescription ─────────────────────────────────────────

  describe('generateListingDescription', () => {
    const listingData = {
      type: 'Apartment',
      location: 'Cotonou',
      rent: 75000,
      features: 'Pool, Parking',
    };

    it('returns AI-generated description on success', async () => {
      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: 'Magnifique appartement à Cotonou avec piscine.' } }],
      });

      const result = await (generateListingDescription as unknown as (req: unknown) => Promise<{ description: string }>)(
        authedRequest(listingData),
      );

      expect(result.description).toBe('Magnifique appartement à Cotonou avec piscine.');
    });

    it('returns the fallback description when OpenAI fails', async () => {
      mockChatCreate.mockRejectedValue(new Error('API rate limit'));

      const result = await (generateListingDescription as unknown as (req: unknown) => Promise<{ description: string }>)(
        authedRequest(listingData),
      );

      expect(result.description).toContain('Apartment');
      expect(result.description).toContain('Cotonou');
      expect(result.description).toContain('75000');
    });

    it('rejects unauthenticated callers', async () => {
      await expect(
        (generateListingDescription as unknown as (req: unknown) => Promise<unknown>)({ data: listingData }),
      ).rejects.toThrow(/Sign in required/);
    });
  });

  // ─── emailReceipt ───────────────────────────────────────────────────────

  describe('emailReceipt', () => {
    it('sends to the tenant\'s email derived server-side, with HTML-escaped fields', async () => {
      // Tenant email matches the authenticated caller — so this is the
      // tenant themselves requesting their own receipt.
      stubTenantGet({
        ownerId: 'landlord-1',
        email: 'caller@example.com',
        name: '<Alice & "Bob">',
      });
      mockSendMail.mockResolvedValue({ messageId: 'msg-1' });

      const result = await (emailReceipt as unknown as (req: unknown) => Promise<{ success: boolean }>)(
        authedRequest({
          tenantId: 't1',
          amount: 50000,
          date: '2/1/2026',
          paymentId: 'pay_123',
        }),
      );

      expect(result).toEqual({ success: true });
      const mailOptions = mockSendMail.mock.calls[0][0];
      // Recipient is taken from the tenant doc, never from the request.
      expect(mailOptions.to).toBe('caller@example.com');
      // HTML escaping should neutralise the angle brackets / quotes in the name.
      expect(mailOptions.html).toContain('&lt;Alice &amp; &quot;Bob&quot;&gt;');
      expect(mailOptions.html).not.toContain('<Alice');
      expect(mailOptions.html).toContain('pay_123');
    });

    it('rejects callers who are not the tenant or their landlord', async () => {
      stubTenantGet({ ownerId: 'someone-else', email: 'other@test.com', name: 'X' });

      await expect(
        (emailReceipt as unknown as (req: unknown) => Promise<unknown>)(
          authedRequest({ tenantId: 't1', amount: 1000, date: 'today', paymentId: 'p' }),
        ),
      ).rejects.toThrow(/Not authorized/);
    });

    it('throws when the SMTP layer fails', async () => {
      stubTenantGet({ ownerId: 'landlord-1', email: 'caller@example.com', name: 'A' });
      mockSendMail.mockRejectedValue(new Error('SMTP connection refused'));

      await expect(
        (emailReceipt as unknown as (req: unknown) => Promise<unknown>)(
          authedRequest({ tenantId: 't1', amount: 1000, date: 'today', paymentId: 'p' }),
        ),
      ).rejects.toThrow(/Failed to send email/);
    });
  });

  // ─── scheduledMonthlyBilling ────────────────────────────────────────────

  describe('scheduledMonthlyBilling', () => {
    /** Helper: stub the tenants `collection().get()` then the per-landlord `where(...).where(...).limit(1).get()` */
    function stubBillingRun(
      tenantsDocs: Array<{ id: string; data: Record<string, unknown> }>,
      perOwnerAlreadyBilled: Record<string, boolean> = {},
    ) {
      // First `.get()` is the tenants collection scan.
      mockFirestore.get.mockResolvedValueOnce({
        docs: tenantsDocs.map((d) => ({
          ref: { id: d.id },
          data: () => d.data,
        })),
      });
      // Each subsequent `.get()` is the per-owner billingHistory existence check.
      const owners = Array.from(new Set(tenantsDocs.map((d) => d.data.ownerId).filter(Boolean) as string[]));
      owners.forEach((ownerId) => {
        mockFirestore.get.mockResolvedValueOnce({
          empty: !perOwnerAlreadyBilled[ownerId],
        });
      });
    }

    it('charges long-term tenants and skips short-term, writing one history doc per landlord', async () => {
      stubBillingRun([
        { id: 't1', data: { ownerId: 'landlord-1', monthlyRent: 50000, balance: 0, type: 'long-term' } },
        { id: 't2', data: { ownerId: 'landlord-1', monthlyRent: 10000, balance: 0, type: 'short-term' } },
      ]);

      await (scheduledMonthlyBilling as unknown as () => Promise<void>)();

      // Only one tenant updated, with an `increment` sentinel rather than a static value.
      expect(mockBatch.update).toHaveBeenCalledTimes(1);
      expect(mockBatch.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 't1' }),
        expect.objectContaining({ balance: { __increment: 50000 } }),
      );
      expect(mockBatch.commit).toHaveBeenCalled();

      // History doc written for landlord-1 with the per-tenant snapshot.
      expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
        ownerId: 'landlord-1',
        tenantsCharged: 1,
        totalRentAdded: 50000,
        triggeredBy: 'auto',
        tenantSnapshots: [{ tenantId: 't1', rentAdded: 50000 }],
      }));
    });

    it('skips a landlord whose monthly history already exists', async () => {
      stubBillingRun(
        [
          { id: 't1', data: { ownerId: 'landlord-1', monthlyRent: 50000, type: 'long-term' } },
        ],
        { 'landlord-1': true },
      );

      await (scheduledMonthlyBilling as unknown as () => Promise<void>)();

      expect(mockBatch.update).not.toHaveBeenCalled();
      expect(mockAdd).not.toHaveBeenCalled();
    });

    it('skips tenants with zero or missing monthlyRent', async () => {
      stubBillingRun([
        { id: 't1', data: { ownerId: 'landlord-1', monthlyRent: 50000 } },
        { id: 't2', data: { ownerId: 'landlord-1', monthlyRent: 0 } },
        { id: 't3', data: { ownerId: 'landlord-1' /* no rent */ } },
      ]);

      await (scheduledMonthlyBilling as unknown as () => Promise<void>)();

      expect(mockBatch.update).toHaveBeenCalledTimes(1);
      expect(mockBatch.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: 't1' }),
        expect.objectContaining({ balance: { __increment: 50000 } }),
      );
    });

    it('groups tenants by ownerId — one history doc per landlord', async () => {
      stubBillingRun([
        { id: 't1', data: { ownerId: 'landlord-A', monthlyRent: 50000 } },
        { id: 't2', data: { ownerId: 'landlord-B', monthlyRent: 30000 } },
      ]);

      await (scheduledMonthlyBilling as unknown as () => Promise<void>)();

      expect(mockAdd).toHaveBeenCalledTimes(2);
      const ownerIds = mockAdd.mock.calls.map((c: unknown[]) => (c[0] as Record<string, unknown>).ownerId);
      expect(new Set(ownerIds)).toEqual(new Set(['landlord-A', 'landlord-B']));
    });
  });
});
