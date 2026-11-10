import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error(
      "STRIPE_SECRET_KEY não configurada. Configure no .env.local para usar funcionalidades de pagamento."
    );
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    typescript: true,
  });
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { typescript: true })
  : (null as unknown as Stripe);

export async function createOrRetrieveCustomer({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (subscription?.stripeCustomerId) {
    return subscription.stripeCustomerId;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  // Ensure subscription record exists
  if (!subscription) {
    await prisma.subscription.create({
      data: {
        userId,
        stripeCustomerId: customer.id,
      },
    });
  } else {
    await prisma.subscription.update({
      where: { userId },
      data: { stripeCustomerId: customer.id },
    });
  }

  return customer.id;
}

export async function createCheckoutSession({
  userId,
  email,
  priceId,
}: {
  userId: string;
  email: string;
  priceId: string;
}) {
  const customerId = await createOrRetrieveCustomer({ userId, email });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Check if user has an active trial
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });
  
  const isTrialActive =
    subscription?.status === "TRIALING" &&
    subscription.trialEndsAt &&
    subscription.trialEndsAt > new Date();

  // Subscription data
  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {};
  
  if (isTrialActive) {
    // Math.floor(subscription.trialEndsAt.getTime() / 1000)
    subscriptionData.trial_end = Math.floor(subscription.trialEndsAt!.getTime() / 1000);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/configuracoes?checkout=success`,
    cancel_url: `${appUrl}/upgrade`,
    allow_promotion_codes: true,
    ...(Object.keys(subscriptionData).length > 0 && { subscription_data: subscriptionData }),
  });

  return session.url;
}

export async function createPortalSession({
  stripeCustomerId,
}: {
  stripeCustomerId: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${appUrl}/configuracoes`,
  });

  return session.url;
}
