import { NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';
import { verifyPassword } from '@/lib/auth';

type LoginBody = {
  email?: string;
  password?: string;
};
const ADMIN_EMAILS = ['embroyitltdjay@gmail.com', 'embroyitricky@gmail.com'];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const client = await getMongoClient();
    const dbName = process.env.MONGODB_DB;
    if (!client || !dbName) {
      return NextResponse.json({ error: 'MongoDB is not configured' }, { status: 500 });
    }

    const users = client.db(dbName).collection('users');
    const user = await users.findOne<{ _id: { toString: () => string }; name: string; email: string; password: string; role?: string }>({ email });

    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: ADMIN_EMAILS.includes(user.email) ? 'admin' : 'user',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to login' },
      { status: 500 }
    );
  }
}
