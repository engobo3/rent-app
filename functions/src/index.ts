import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Stripe from "stripe";

admin.initializeApp();

// Use environment variable for Stripe Secret Key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2025-12-15.clover", // or whichever version is current
});

/**
 * 1. CREATE PAYMENT INTENT
 * The frontend asks for this when the user clicks "Pay".
 * It tells Stripe we are about to collect money.
 */
export const createPaymentIntent = onCall(async (request) => {
    // Gen 2: Data is in request.data
    const data = request.data as { amount: number; tenantId: string };
    // XOF is a zero-decimal currency (e.g. 5000 CFA = 5000), so no *100
    const amountInt = Math.round(data.amount);

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInt,
        currency: "xof",
        metadata: {
            tenantId: data.tenantId // Tag the payment with the tenant's ID
        },
        automatic_payment_methods: {
            enabled: true,
        },
    });

    // Send the "secret" key back to the frontend so it can draw the credit card form
    return {
        clientSecret: paymentIntent.client_secret,
    };
});
