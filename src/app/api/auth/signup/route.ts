import { NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';
import { hashPassword } from '@/lib/auth';

type SignupBody = {
  name?: string;
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignupBody;
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const client = await getMongoClient();
    const dbName = process.env.MONGODB_DB;
    if (!client || !dbName) {
      return NextResponse.json({ error: 'MongoDB is not configured' }, { status: 500 });
    }

    const users = client.db(dbName).collection('users');
    const existing = await users.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const role: 'admin' | 'user' = email === 'jayembroyit@gmail.com' ? 'admin' : 'user';
    const result = await users.insertOne({
      name,
      email,
      password: hashPassword(password),
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      user: {
        id: result.insertedId.toString(),
        name,
        email,
        role,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create user' },
      { status: 500 }
    );
  }
}
