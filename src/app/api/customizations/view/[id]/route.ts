import { NextResponse } from 'next/server';
import { getFileFromMongoDB } from '@/lib/mongoFiles';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const file = await getFileFromMongoDB(id);

    if (!file || !file.data) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Set the appropriate content type
    const headers = new Headers();
    headers.set('Content-Type', file.mimeType || 'application/pdf');
    headers.set('Content-Disposition', `inline; filename="${file.fileName}"`);

    // file.data is stored as a Buffer in MongoDB
    return new NextResponse(file.data.buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
