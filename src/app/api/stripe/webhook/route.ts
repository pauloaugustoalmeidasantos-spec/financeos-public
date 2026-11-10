import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/server/services/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/client";
import { sendCancellationEmail, sendPaymentConfirmationEmail } from "@/server/services/email";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId = session.subscription as string;
          const customerId = session.customer as string;
          
          await handleSubscriptionCreatedOrUpdated(subscriptionId, customerId);

          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          
          if (customer.email) {
            const user = await prisma.user.findFirst({ where: { email: customer.email } });
            if (user) {
              const latestSub = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: subscriptionId } });
              void sendPaymentConfirmationEmail({
                to: customer.email,
                name: user.name || "Membro",
                planName: latestSub?.plan === "YEARLY" ? "Anual" : "Mensal"
              });
            }
          }
        }
        break;
      }
      
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        if (typeof invoice.subscription === "string") {
           await handleSubscriptionCreatedOrUpdated(
             invoice.subscription, 
             typeof invoice.customer === "string" ? invoice.customer : ""
           );
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreatedOrUpdated(
          subscription.id, 
          subscription.customer as string
        );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: "CANCELED",
            cancelAtPeriodEnd: false,
          },
        });

        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        if (customer.email) {
          const user = await prisma.user.findFirst({ where: { email: customer.email } });
          if (user) {
            void sendCancellationEmail({
              to: customer.email,
              name: user.name || "Membro",
            });
          }
        }
        break;
      }
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return new Response(`Webhook handler error: ${error.message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}

async function handleSubscriptionCreatedOrUpdated(
  stripeSubscriptionId: string, 
  stripeCustomerId: string
) {
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
    expand: ["items.data.price"]
  });

  const priceId = subscription.items.data[0].price.id;
  
  const isMonthly = priceId === process.env.STRIPE_MONTHLY_PRICE_ID;
  const isYearly = priceId === process.env.STRIPE_YEARLY_PRICE_ID;
  
  let plan: SubscriptionPlan = "FREE";
  if (isMonthly) plan = "MONTHLY";
  if (isYearly) plan = "YEARLY";

  let status: SubscriptionStatus = "TRIALING";
  if (subscription.status === "active") status = "ACTIVE";
  else if (subscription.status === "canceled") status = "CANCELED";
  else if (subscription.status === "past_due") status = "PAST_DUE";
  else if (subscription.status === "paused") status = "PAUSED";
  
  const sub = subscription as any;
  const currentPeriodStart = new Date(sub.current_period_start * 1000);
  const currentPeriodEnd = new Date(sub.current_period_end * 1000);
  
  await prisma.subscription.updateMany({
    where: { stripeCustomerId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plan,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}
