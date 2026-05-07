import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {});

interface CheckoutItem {
  name: string;
  image?: string;
  price: number;
  quantity: number;
}

export async function POST(req: Request) {
  try {
    const { items, origin, email, shipping } = await req.json();

    const line_items = (items as any[]).map((item) => ({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: item.size ? `${item.name} (${item.size})` : item.name,
          images: item.image ? [item.image.startsWith('http') ? item.image : `${origin}${item.image}`] : [],
          metadata: {
            size: item.size || '',
          }
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items,
      mode: 'payment',
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },
      metadata: {
        firstName: shipping?.firstName || '',
        lastName: shipping?.lastName || '',
        phone: shipping?.phone || '',
        address: shipping?.address || '',
        city: shipping?.city || '',
        postalCode: shipping?.postalCode || '',
      },
      success_url: `${origin}/checkout?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?canceled=true`,
    });

    return NextResponse.json({ id: session.id, url: session.url });
  } catch (error: unknown) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown Stripe checkout error' },
      { status: 500 }
    );
  }
}
