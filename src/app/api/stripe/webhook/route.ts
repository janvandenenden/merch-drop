import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { user, drop } from "@/lib/db/schema";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "account.updated") {
    return NextResponse.json({ received: true });
  }

  const account = event.data.object;
  if (!account.charges_enabled) {
    return NextResponse.json({ received: true });
  }

  const [creator] = await db
    .select()
    .from(user)
    .where(eq(user.stripeAccountId, account.id))
    .limit(1);

  if (!creator || creator.chargesEnabled) {
    return NextResponse.json({ received: true });
  }

  await db
    .update(user)
    .set({ chargesEnabled: true })
    .where(eq(user.id, creator.id));

  await db
    .update(drop)
    .set({ status: "live", updatedAt: new Date() })
    .where(and(eq(drop.userId, creator.id), eq(drop.status, "pre_live")));

  return NextResponse.json({ received: true });
}
