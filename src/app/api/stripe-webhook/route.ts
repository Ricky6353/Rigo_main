import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { persistAndSyncOrder } from '@/lib/orderPipeline';
import { generateNextOrderId } from '@/lib/idSerials';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {});

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing Stripe webhook configuration' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: `Webhook signature verification failed: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`,
      },
      { status: 400 }
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
      const metadata = session.metadata || {};
      const customerName =
        session.customer_details?.name ||
        `${metadata.firstName || ''} ${metadata.lastName || ''}`.trim() ||
        'Unknown Customer';

      const items = lineItems.data.map((item) => {
        const description = item.description || 'Item';
        // Extract size from "Name (Size)" pattern
        const sizeMatch = description.match(/\(([^)]+)\)$/);
        const size = sizeMatch ? sizeMatch[1] : 'OS';
        const name = sizeMatch ? description.replace(/\s\([^)]+\)$/, '') : description;

        return {
          name,
          quantity: Number(item.quantity || 0),
          price: Number((item.price?.unit_amount || 0) / 100),
          size,
        };
      });

      const phoneNumber = session.customer_details?.phone || metadata.phone || '';
      const emailId = session.customer_details?.email || session.customer_email || '';
      const transactionId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || session.id;

      const orderId = await generateNextOrderId();
      await persistAndSyncOrder({
        orderId,
        orderDate: new Date((session.created || Date.now() / 1000) * 1000).toISOString(),
        customerName,
        contact: phoneNumber,
        phoneNumber,
        email: emailId,
        emailId,
        address: session.customer_details?.address?.line1 || metadata.address || '',
        city: session.customer_details?.address?.city || metadata.city || '',
        postalCode: session.customer_details?.address?.postal_code || metadata.postalCode || '',
        items,
        itemCount: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        total: Number((session.amount_total || 0) / 100),
        paymentMethod: 'stripe',
        transactionId,
        stripeSessionId: session.id,
        stripePaymentIntentId: transactionId,
        status: 'paid',
        source: 'stripe_webhook',
      });
    } catch (error) {
      console.error('Webhook order processing failed:', error);
      return NextResponse.json({ error: 'Failed to persist order' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
