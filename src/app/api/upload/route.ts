import { NextResponse } from 'next/server';
import { uploadToSupabase } from '@/lib/supabaseFiles';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const email = (formData.get('email') as string) || 'N/A';
    const phone = (formData.get('phone') as string) || 'N/A';
    if (!file || !name) {
      return NextResponse.json({ error: 'File and name are required' }, { status: 400 });
    }

    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      return NextResponse.json({ error: 'Only PDF files are allowed.' }, { status: 400 });
    }

    if (file.size >= MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File must be smaller than 20MB.' }, { status: 400 });
    }

    const { fileId, viewLink } = await uploadToSupabase(file, {
      customerName: name,
      email,
      phone,
    });

    return NextResponse.json({ success: true, fileId, driveLink: viewLink });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('Upload Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
