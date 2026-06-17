import { NextResponse } from 'next/server';
import { normalizeEmail } from '@/lib/adminConfig';
import { syncNewsletterSubscriberToSheets } from '@/lib/sheetsSync';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail((body.email as string) || '');

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    const result = await syncNewsletterSubscriberToSheets(email);

    if (!result.syncedToSheets) {
      console.error('Newsletter subscribe failed:', result.reason);
      return NextResponse.json(
        { error: result.reason || 'Unable to save subscription. Please try again later.' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        result.reason === 'Already subscribed'
          ? 'You are already on the list.'
          : 'Thank you for subscribing to Embroyit.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('Subscription error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
