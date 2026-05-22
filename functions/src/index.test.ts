
import { createPaymentIntent, scheduledMonthlyBilling, generateListingDescription, emailReceipt } from './index';
import Stripe from 'stripe';

// Mock firebase-admin with Firestore
const mockBatch = {
  update: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
};

const mockAdd = jest.fn().mockResolvedValue({ id: 'billing-1' });

const mockFirestore = {
  collection: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  get: jest.fn(),
  batch: jest.fn(() => mockBatch),
  add: jest.fn(),
};

// Chain collection().where().where().limit().get() and collection().get()
// We'll configure per-test below via mockFirestore.get

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(() => mockFirestore),
}));

// Mock Stripe
jest.mock('stripe', () => {
  const mStripe = {
    paymentIntents: {
      create: jest.fn(),
    },
  };
  return jest.fn(() => mStripe);
});

// Mock OpenAI
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

// Mock nodemailer
const mockSendMail = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

// Mock firebase-functions
jest.mock('firebase-functions/v2/https', () => ({
  onCall: (_opts: unknown, handler: (req: unknown) => Promise<unknown>) => handler,
}));

jest.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: (_opts: unknown, handler: () => Promise<void>) => handler,
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: jest.fn(() => ({ value: () => 'mock-secret' })),
}));

describe('Cloud Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFirestore.collection.mockReturnThis();
    mockFirestore.where.mockReturnThis();
    mockFirestore.limit.mockReturnThis();
  });

  // ─── createPaymentIntent ──────────────────────────────────────────────────

  describe('createPaymentIntent', () => {
    it('should create a payment intent and return client secret', async () => {
      const stripeInstance = new (Stripe as unknown as new (...args: unknown[]) => Stripe)('key', { apiVersion: '2025-12-15.clover' });
      const mockCreate = stripeInstance.paymentIntents.create as jest.Mock;
      mockCreate.mockResolvedValue({ client_secret: 'test_client_secret' });

      const request = {
        data: {
          amount: 5000,
          tenantId: 'tenant123',
        },
      };

      const result = await (createPaymentIntent as unknown as (req: unknown) => Promise<unknown>)(request);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        amount: 5000,
        currency: 'xof',
        metadata: { tenantId: 'tenant123' },
      }));

      expect(result).toEqual({ clientSecret: 'test_client_secret' });
    });

    it('should round fractional amounts', async () => {
      const stripeInstance = new (Stripe as unknown as new (...args: unknown[]) => Stripe)('key', { apiVersion: '2025-12-15.clover' });
      const mockCreate = stripeInstance.paymentIntents.create as jest.Mock;
      mockCreate.mockResolvedValue({ client_secret: 'cs_123' });

      const request = { data: { amount: 5000.7, tenantId: 't1' } };
      await (createPaymentIntent as unknown as (req: unknown) => Promise<unknown>)(request);

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 5001 }));
    });
  });

  // ─── generateListingDescription ───────────────────────────────────────────

  describe('generateListingDescription', () => {
    const listingData = {
      type: 'Apartment',
      location: 'Cotonou',
      rent: 75000,
      features: 'Pool, Parking',
    };

    it('should return AI-generated description on success', async () => {
      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: 'Magnifique appartement à Cotonou avec piscine.' } }],
      });

      const result = await (generateListingDescription as unknown as (req: unknown) => Promise<{ description: string }>)({
        data: listingData,
      });

      expect(result.description).toBe('Magnifique appartement à Cotonou avec piscine.');
      expect(mockChatCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-3.5-turbo' })
      );
    });

    it('should return fallback description when OpenAI fails', async () => {
      mockChatCreate.mockRejectedValue(new Error('API rate limit'));

      const result = await (generateListingDescription as unknown as (req: unknown) => Promise<{ description: string }>)({
        data: listingData,
      });

      expect(result.description).toContain('Apartment');
      expect(result.description).toContain('Cotonou');
      expect(result.description).toContain('75000');
    });

    it('should include property details in the prompt', async () => {
      mockChatCreate.mockResolvedValue({
        choices: [{ message: { content: 'Test description' } }],
      });

      await (generateListingDescription as unknown as (req: unknown) => Promise<unknown>)({
        data: listingData,
      });

      const promptArg = mockChatCreate.mock.calls[0][0];
      const promptText = promptArg.messages[0].content;
      expect(promptText).toContain('Apartment');
      expect(promptText).toContain('Cotonou');
      expect(promptText).toContain('75000');
      expect(promptText).toContain('Pool, Parking');
    });
  });

  // ─── emailReceipt ─────────────────────────────────────────────────────────

  describe('emailReceipt', () => {
    const receiptData = {
      email: 'tenant@test.com',
      tenantName: 'Alice',
      amount: 50000,
      date: '2/1/2026',
      paymentId: 'pay_123',
    };

    it('should send email with correct data and return success', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'msg-1' });

      const result = await (emailReceipt as unknown as (req: unknown) => Promise<{ success: boolean }>)({
        data: receiptData,
      });

      expect(result).toEqual({ success: true });
      expect(mockSendMail).toHaveBeenCalledTimes(1);

      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe('tenant@test.com');
      expect(mailOptions.subject).toContain('2/1/2026');
      expect(mailOptions.html).toContain('Alice');
      expect(mailOptions.html).toContain('pay_123');
    });

    it('should throw error when email sending fails', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP connection refused'));

      await expect(
        (emailReceipt as unknown as (req: unknown) => Promise<unknown>)({ data: receiptData })
      ).rejects.toThrow('Failed to send email: SMTP connection refused');
    });
  });

  // ─── scheduledMonthlyBilling ──────────────────────────────────────────────

  describe('scheduledMonthlyBilling', () => {
    it('should charge long-term tenants and skip short-term', async () => {
      const mockRef1 = { id: 't1' };
      const mockRef2 = { id: 't2' };
      const mockTenants = {
        docs: [
          { ref: mockRef1, data: () => ({ monthlyRent: 50000, balance: 0, type: 'long-term' }) },
          { ref: mockRef2, data: () => ({ monthlyRent: 10000, balance: 0, type: 'short-term' }) },
        ],
      };

      // First call: billingHistory check (empty = not yet billed)
      // Second call: tenants collection
      let callCount = 0;
      mockFirestore.get.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ empty: true }); // No existing billing
        return Promise.resolve(mockTenants); // Tenants
      });
      mockFirestore.add = mockAdd;

      await (scheduledMonthlyBilling as unknown as () => Promise<void>)();

      // Should only update 1 tenant (long-term), not the short-term one
      expect(mockBatch.update).toHaveBeenCalledTimes(1);
      expect(mockBatch.update).toHaveBeenCalledWith(mockRef1, { balance: 50000 });
      expect(mockBatch.commit).toHaveBeenCalled();

      // Should write a billing record
      expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
        tenantsCharged: 1,
        totalRentAdded: 50000,
        triggeredBy: 'auto',
      }));
    });

    it('should skip billing if already billed this month', async () => {
      // billingHistory check returns a document (already billed)
      mockFirestore.get.mockResolvedValueOnce({ empty: false });

      await (scheduledMonthlyBilling as unknown as () => Promise<void>)();

      // Should NOT update any tenants
      expect(mockBatch.update).not.toHaveBeenCalled();
      expect(mockBatch.commit).not.toHaveBeenCalled();
    });

    it('should skip tenants with zero or no monthly rent', async () => {
      const mockRef1 = { id: 't1' };
      const mockRef2 = { id: 't2' };
      const mockRef3 = { id: 't3' };
      const mockTenants = {
        docs: [
          { ref: mockRef1, data: () => ({ monthlyRent: 50000, balance: 0 }) },
          { ref: mockRef2, data: () => ({ monthlyRent: 0, balance: 0 }) },
          { ref: mockRef3, data: () => ({ balance: 0 }) }, // no monthlyRent
        ],
      };

      let callCount = 0;
      mockFirestore.get.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ empty: true });
        return Promise.resolve(mockTenants);
      });
      mockFirestore.add = mockAdd;

      await (scheduledMonthlyBilling as unknown as () => Promise<void>)();

      // Only t1 should be charged
      expect(mockBatch.update).toHaveBeenCalledTimes(1);
      expect(mockBatch.update).toHaveBeenCalledWith(mockRef1, { balance: 50000 });
    });

    it('should add to existing balance when billing', async () => {
      const mockRef = { id: 't1' };
      const mockTenants = {
        docs: [
          { ref: mockRef, data: () => ({ monthlyRent: 50000, balance: 20000 }) },
        ],
      };

      let callCount = 0;
      mockFirestore.get.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve({ empty: true });
        return Promise.resolve(mockTenants);
      });
      mockFirestore.add = mockAdd;

      await (scheduledMonthlyBilling as unknown as () => Promise<void>)();

      // Balance should be 20000 + 50000 = 70000
      expect(mockBatch.update).toHaveBeenCalledWith(mockRef, { balance: 70000 });
    });
  });
});
