
import { createPaymentIntent } from './index';
import Stripe from 'stripe';

// Mock firebase-admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
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

// Mock firebase-functions
jest.mock('firebase-functions/v2/https', () => ({
  onCall: (handler: (req: unknown) => Promise<unknown>) => handler,
}));

describe('Cloud Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent and return client secret', async () => {
      // Access the mock instance
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
  });
});
