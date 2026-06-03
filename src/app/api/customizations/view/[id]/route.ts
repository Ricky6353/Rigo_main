import { NextResponse } from 'next/server';
import { getFileFromSupabase } from '@/lib/supabaseFiles';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // id in this context would be the filePath in Supabase Storage
    const file = await getFileFromSupabase(id);

    if (!file || !file.data) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Set the appropriate content type
    const headers = new Headers();
    headers.set('Content-Type', file.mimeType || 'application/octet-stream');
    headers.set('Content-Disposition', `inline; filename="${file.fileName}"`);

    // Supabase download returns a Blob/File
    return new NextResponse(file.data, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
