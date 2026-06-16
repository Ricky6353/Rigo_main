import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { persistAndSyncOrder } from '@/lib/orderPipeline';
import { generateNextOrderId } from '@/lib/idSerials';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {});

export async function POST(req: Request) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
    }

    // 1. Retrieve the session from Stripe to get full details
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent'],
    });

    if (!session || session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Order not paid or not found' }, { status: 400 });
    }

    // 2. Prepare the data for persistence (similar to webhook logic)
    const lineItems = session.line_items?.data || [];
    const metadata = session.metadata || {};
    
    const customerName = 
      session.customer_details?.name || 
      `${metadata.firstName || ''} ${metadata.lastName || ''}`.trim() || 
      'Unknown Customer';

    const items = lineItems.map((item) => {
      const description = item.description || 'Item';
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
    const transactionId = typeof session.payment_intent === 'string' 
      ? session.payment_intent 
      : (session.payment_intent as any)?.id || session.id;

    const orderId = await generateNextOrderId();

    // 3. Persist and sync (this handles duplicates internally)
    const result = await persistAndSyncOrder({
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
      source: 'client_capture',
    });

    return NextResponse.json({ 
      success: true, 
      orderId: result.order.orderId,
      duplicate: (result.dbResult as any).duplicate || false 
    });

  } catch (error: any) {
    console.error('Stripe capture error:', error);
    return NextResponse.json({ error: error.message || 'Failed to capture order' }, { status: 500 });
  }
}
