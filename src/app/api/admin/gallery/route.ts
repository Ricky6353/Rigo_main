import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { resolveRole } from '@/lib/adminConfig';
import { createGalleryItem, fetchGalleryItems } from '@/lib/gallery';
import { uploadGalleryMedia } from '@/lib/catalog';

export async function GET() {
  try {
    const items = await fetchGalleryItems();
    return NextResponse.json({ success: true, items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load gallery';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-expect-error role from session
    if (!session?.user?.email || resolveRole(session.user.email, session.user.role) !== 'admin') {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const galleryCount = parseInt(formData.get('galleryCount') as string) || 0;

    if (galleryCount === 0) {
      return Response.json({ success: false, error: 'No images provided' }, { status: 400 });
    }

    const uploadedImages: string[] = [];

    for (let i = 0; i < galleryCount; i++) {
      const file = formData.get(`gallery_${i}`) as File;
      if (!file) continue;

      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'video/mp4',
        'video/webm',
        'video/quicktime',
      ];
      if (!allowedTypes.includes(file.type)) {
        return Response.json(
          { success: false, error: 'Only JPEG, PNG and common video formats (MP4, WebM) are allowed' },
          { status: 400 }
        );
      }

      const uploaded = await uploadGalleryMedia(file);
      if (!uploaded?.url) {
        return Response.json({ success: false, error: 'Failed to upload to Supabase gallery bucket' }, { status: 500 });
      }

      const { error } = await createGalleryItem({
        url: uploaded.url,
        storagePath: uploaded.path,
        mimeType: file.type,
      });

      if (error) {
        return Response.json({ success: false, error }, { status: 500 });
      }

      uploadedImages.push(uploaded.url);
    }

    return Response.json({
      success: true,
      images: uploadedImages,
      message: `${uploadedImages.length} image(s) uploaded successfully`,
    });
  } catch (error) {
    console.error('Gallery upload error:', error);
    return Response.json({ success: false, error: 'Failed to upload gallery images' }, { status: 500 });
  }
}
