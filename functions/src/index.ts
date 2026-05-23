import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
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

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Escape user-supplied strings before embedding in HTML. */
function escapeHtml(str: unknown): string {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Authorize the caller against a tenant record. Returns the tenant doc data
 * on success; throws `permission-denied` otherwise.
 *
 * Allowed callers:
 *   - the tenant themselves (auth email matches tenant.email)
 *   - the tenant's landlord (auth uid matches tenant.ownerId)
 */
async function authorizeForTenant(
    request: CallableRequest<unknown>,
    tenantId: string,
): Promise<FirebaseFirestore.DocumentData> {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Sign in required.");
    }
    if (typeof tenantId !== "string" || !tenantId) {
        throw new HttpsError("invalid-argument", "tenantId is required.");
    }
    const tenantRef = admin.firestore().collection("tenants").doc(tenantId);
    const tenantSnap = await tenantRef.get();
    if (!tenantSnap.exists) {
        throw new HttpsError("not-found", "Tenant not found.");
    }
    const tenant = tenantSnap.data() as FirebaseFirestore.DocumentData;
    const callerUid = request.auth.uid;
    const callerEmail = request.auth.token?.email;
    const isTenant = !!callerEmail && callerEmail === tenant.email;
    const isLandlord = callerUid === tenant.ownerId;
    if (!isTenant && !isLandlord) {
        throw new HttpsError("permission-denied", "Not authorized for this tenant.");
    }
    return tenant;
}

/**
 * Crude per-caller rate limit using Firestore. Throws `resource-exhausted`
 * if the caller exceeded `maxPerWindow` calls within `windowMs`.
 *
 * Counter docs live under `rateLimits/{key}` and are best-effort — they may
 * drift slightly under heavy concurrency, which is acceptable for cost
 * protection (not fairness).
 */
async function enforceRateLimit(
    key: string,
    maxPerWindow: number,
    windowMs: number,
): Promise<void> {
    const ref = admin.firestore().collection("rateLimits").doc(key);
    const now = Date.now();
    const windowStart = now - windowMs;
    await admin.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.exists ? (snap.data() as { calls?: number[] }) : { calls: [] };
        const recent = (data.calls ?? []).filter((t) => t > windowStart);
        if (recent.length >= maxPerWindow) {
            throw new HttpsError("resource-exhausted", "Rate limit exceeded.");
        }
        recent.push(now);
        tx.set(ref, { calls: recent }, { merge: true });
    });
}

// ─── 1. CREATE PAYMENT INTENT ──────────────────────────────────────────────

/**
 * Frontend asks for this when the user clicks "Pay". Verifies the caller is
 * the tenant or their landlord, caps the amount at the current balance, then
 * creates a Stripe PaymentIntent in XOF (zero-decimal currency).
 */
export const createPaymentIntent = onCall({ secrets: [stripeKey] }, async (request) => {
    const data = request.data as { amount: unknown; tenantId: unknown };
    if (typeof data.tenantId !== "string") {
        throw new HttpsError("invalid-argument", "tenantId is required.");
    }
    if (typeof data.amount !== "number" || !Number.isFinite(data.amount) || data.amount <= 0) {
        throw new HttpsError("invalid-argument", "amount must be a positive number.");
    }

    const tenant = await authorizeForTenant(request, data.tenantId);
    const currentBalance = typeof tenant.balance === "number" ? tenant.balance : 0;

    // Never let a caller charge more than what they owe.
    if (data.amount > currentBalance) {
        throw new HttpsError(
            "failed-precondition",
            `Amount ${data.amount} exceeds outstanding balance ${currentBalance}.`,
        );
    }

    const stripe = new Stripe(stripeKey.value(), {
        apiVersion: "2025-12-15.clover",
    });

    // XOF is zero-decimal — no *100.
    const amountInt = Math.round(data.amount);

    const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInt,
        currency: "xof",
        metadata: {
            tenantId: data.tenantId,
            callerUid: request.auth?.uid ?? "unknown",
        },
        automatic_payment_methods: {
            enabled: true,
        },
    });

    return {
        clientSecret: paymentIntent.client_secret,
    };
});

// ─── 2. AI LISTING GENERATOR ───────────────────────────────────────────────

/**
 * Generates a French listing description via GPT-3.5-turbo. Rate-limited per
 * caller to 30 calls per hour to cap OpenAI spend.
 */
export const generateListingDescription = onCall({ secrets: [openaiKey] }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Sign in required.");
    }
    await enforceRateLimit(`gen-listing:${request.auth.uid}`, 30, 60 * 60 * 1000);

    const data = request.data as {
        type?: string; location?: string; rent?: number | string; features?: string;
    };

    try {
        const prompt = `Write a professional, attractive rental listing description in French for Benin real estate.
        Type: ${data.type}
        Location: ${data.location}
        Rent: ${data.rent} CFA
        Features: ${data.features}

        Keep it concise (max 3 sentences). Make it sound premium.`;

        const openai = new OpenAI({ apiKey: openaiKey.value() });
        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-3.5-turbo",
        });

        return { description: completion.choices[0].message.content };
    } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        console.error("AI Error:", err);
        // Fallback so the dashboard never gets stuck if OpenAI is down or quota is hit.
        return {
            description: `Magnifique ${data.type} à ${data.location}. Loyer: ${data.rent} CFA. Contactez-nous pour visiter!`,
        };
    }
});

// ─── 3. EMAIL RECEIPTS ─────────────────────────────────────────────────────

/**
 * Sends an HTML payment receipt. The recipient is always derived
 * server-side from the tenant record — callers cannot specify the
 * destination email. All interpolated user data is HTML-escaped.
 */
export const emailReceipt = onCall({ secrets: [emailUser, emailPass] }, async (request) => {
    const data = request.data as {
        tenantId: unknown;
        amount: unknown;
        date: unknown;
        paymentId: unknown;
    };

    if (typeof data.tenantId !== "string") {
        throw new HttpsError("invalid-argument", "tenantId is required.");
    }
    if (typeof data.amount !== "number" || !Number.isFinite(data.amount) || data.amount < 0) {
        throw new HttpsError("invalid-argument", "amount must be a non-negative number.");
    }

    const tenant = await authorizeForTenant(request, data.tenantId);
    const recipient = typeof tenant.email === "string" ? tenant.email : "";
    if (!recipient) {
        throw new HttpsError("failed-precondition", "Tenant has no email on file.");
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: emailUser.value(),
            pass: emailPass.value(),
        },
    });

    const tenantName = escapeHtml(tenant.name);
    const date = escapeHtml(data.date);
    const paymentId = escapeHtml(data.paymentId);
    const amountStr = escapeHtml(data.amount.toLocaleString());

    const mailOptions = {
        from: `"Xwegbe Vivi" <${emailUser.value()}>`,
        to: recipient,
        subject: `Payment Receipt - ${date}`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 500px;">
                <h2 style="color: #007A80;">Payment Receipt</h2>
                <p>Dear ${tenantName},</p>
                <p>Thank you for your payment.</p>
                <table style="width: 100%; margin: 20px 0;">
                    <tr><td><strong>Amount:</strong></td><td>${amountStr} CFA</td></tr>
                    <tr><td><strong>Date:</strong></td><td>${date}</td></tr>
                    <tr><td><strong>Reference:</strong></td><td>#${paymentId}</td></tr>
                </table>
                <p style="color: green; font-weight: bold;">PAID</p>
                <hr>
                <p style="font-size: 0.8rem; color: #888;">Xwegbe Vivi Management</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (e: unknown) {
        console.error("Email Error:", e);
        const message = e instanceof Error ? e.message : String(e);
        throw new HttpsError("internal", "Failed to send email: " + message);
    }
});

// ─── 4. SCHEDULED MONTHLY BILLING ──────────────────────────────────────────

/**
 * Runs at midnight on the 1st of each month (Benin time). Charges each
 * long-term tenant's `monthlyRent` against their balance and records ONE
 * `billingHistory` doc PER LANDLORD, scoped with `ownerId` and the per-tenant
 * snapshots so `handleUndoBilling` can reverse exactly the deltas applied.
 *
 * Firestore batches are capped at 500 writes — tenants are chunked
 * accordingly so any single landlord with >500 tenants still bills cleanly.
 */
export const scheduledMonthlyBilling = onSchedule(
    { schedule: "0 0 1 * *", timeZone: "Africa/Porto-Novo" },
    async () => {
        const db = admin.firestore();
        const now = new Date();
        const billingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        // Pull all tenants once, then group by ownerId.
        const tenantsSnap = await db.collection("tenants").get();
        type TenantWithRef = {
            ref: FirebaseFirestore.DocumentReference;
            ownerId: string;
            monthlyRent: number;
            balance: number;
            type: string | undefined;
        };
        const tenantsByOwner = new Map<string, TenantWithRef[]>();
        tenantsSnap.docs.forEach((docSnap) => {
            const t = docSnap.data();
            if (typeof t.ownerId !== "string" || !t.ownerId) return;
            if (t.type === "short-term") return;
            const rent = typeof t.monthlyRent === "number" ? t.monthlyRent : 0;
            if (rent <= 0) return;
            const list = tenantsByOwner.get(t.ownerId) ?? [];
            list.push({
                ref: docSnap.ref,
                ownerId: t.ownerId,
                monthlyRent: rent,
                balance: typeof t.balance === "number" ? t.balance : 0,
                type: t.type,
            });
            tenantsByOwner.set(t.ownerId, list);
        });

        let landlordsBilled = 0;
        let totalChargedAcrossPlatform = 0;

        for (const [ownerId, ownerTenants] of tenantsByOwner.entries()) {
            // Per-landlord double-billing protection.
            const existing = await db.collection("billingHistory")
                .where("billingMonth", "==", billingMonth)
                .where("ownerId", "==", ownerId)
                .limit(1)
                .get();
            if (!existing.empty) {
                console.log(`[${ownerId}] ${billingMonth} already billed, skipping.`);
                continue;
            }

            // Chunk batches at 500 writes (Firestore hard limit).
            const CHUNK = 500;
            let totalRentAdded = 0;
            const tenantSnapshots: { tenantId: string; rentAdded: number }[] = [];

            for (let i = 0; i < ownerTenants.length; i += CHUNK) {
                const chunk = ownerTenants.slice(i, i + CHUNK);
                const batch = db.batch();
                chunk.forEach((tw) => {
                    batch.update(tw.ref, {
                        balance: admin.firestore.FieldValue.increment(tw.monthlyRent),
                    });
                    totalRentAdded += tw.monthlyRent;
                    tenantSnapshots.push({ tenantId: tw.ref.id, rentAdded: tw.monthlyRent });
                });
                await batch.commit();
            }

            await db.collection("billingHistory").add({
                billingMonth,
                ownerId,
                date: now.toISOString(),
                tenantsCharged: ownerTenants.length,
                totalRentAdded,
                triggeredBy: "auto",
                tenantSnapshots,
            });

            landlordsBilled++;
            totalChargedAcrossPlatform += totalRentAdded;
            console.log(
                `[${ownerId}] ${billingMonth}: ${ownerTenants.length} tenants, ${totalRentAdded} CFA.`,
            );
        }

        console.log(
            `Monthly billing complete for ${billingMonth}: ` +
            `${landlordsBilled} landlords, ${totalChargedAcrossPlatform} CFA total.`,
        );
    },
);
