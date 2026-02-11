import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import OpenAI from "openai";
import * as nodemailer from "nodemailer";
import { defineSecret } from "firebase-functions/params";

admin.initializeApp();

// Define Secrets
const stripeKey = defineSecret("STRIPE_SECRET_KEY");
const openaiKey = defineSecret("OPENAI_API_KEY");
const emailUser = defineSecret("EMAIL_USER");
const emailPass = defineSecret("EMAIL_PASS");

/**
 * 1. CREATE PAYMENT INTENT
 * The frontend asks for this when the user clicks "Pay".
 * It tells Stripe we are about to collect money.
 */
export const createPaymentIntent = onCall({ secrets: [stripeKey] }, async (request) => {
    // Initialize Stripe inside the function with the secret
    const stripe = new Stripe(stripeKey.value(), {
        apiVersion: "2025-12-15.clover",
    });

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

/**
 * 2. AI LISTING GENERATOR
 * Uses OpenAI to write a professional description.
 */
export const generateListingDescription = onCall({ secrets: [openaiKey] }, async (request) => {
    // Initialize OpenAI inside the function
    const openai = new OpenAI({ apiKey: openaiKey.value() });

    const data = request.data;
    // data: { type: 'Apartment', location: 'Ekpe', rent: 50000, features: 'Secure, Near Beach' }

    try {
        const prompt = `Write a professional, attractive rental listing description in French for Benin real estate.
        Type: ${data.type}
        Location: ${data.location}
        Rent: ${data.rent} CFA
        Features: ${data.features}
        
        Keep it concise (max 3 sentences). Make it sound premium.`;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-3.5-turbo",
        });

        return { description: completion.choices[0].message.content };
    } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        console.error("AI Error:", err);
        // Fallback if AI fails (or no key)
        return { description: `Magnifique ${data.type} à ${data.location}. Loyer: ${data.rent} CFA. Contactez-nous pour visiter!` };
    }
});

/**
 * 3. EMAIL RECEIPTS
 * Sends a PDF-like receipt summary to the tenant.
 */
export const emailReceipt = onCall({ secrets: [emailUser, emailPass] }, async (request) => {
    // Initialize Transporter inside the function
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: emailUser.value(),
            pass: emailPass.value()
        }
    });

    const data = request.data;
    // data: { email, tenantName, amount, date, paymentId }

    const mailOptions = {
        from: `"Xwegbe Vivi" <${emailUser.value()}>`,
        to: data.email,
        subject: `Payment Receipt - ${data.date}`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 500px;">
                <h2 style="color: #007A80;">Payment Receipt</h2>
                <p>Dear ${data.tenantName},</p>
                <p>Thank you for your payment.</p>
                <table style="width: 100%; margin: 20px 0;">
                    <tr><td><strong>Amount:</strong></td><td>${data.amount.toLocaleString()} CFA</td></tr>
                    <tr><td><strong>Date:</strong></td><td>${data.date}</td></tr>
                    <tr><td><strong>Reference:</strong></td><td>#${data.paymentId}</td></tr>
                </table>
                <p style="color: green; font-weight: bold;">PAID</p>
                <hr>
                <p style="font-size: 0.8rem; color: #888;">Xwegbe Vivi Management</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (e: unknown) {
        console.error("Email Error:", e);
        const message = e instanceof Error ? e.message : String(e);
        throw new Error("Failed to send email: " + message);
    }
});
