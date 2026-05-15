import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const ADMIN_EMAILS = ['embroyitltdjay@gmail.com', 'embroyitricky@gmail.com'];

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const galleryCount = parseInt(formData.get('galleryCount') as string) || 0;

    if (galleryCount === 0) {
      return Response.json({ success: false, error: 'No images provided' }, { status: 400 });
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'gallery');
    
    // Ensure directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const uploadedImages: string[] = [];

    for (let i = 0; i < galleryCount; i++) {
      const file = formData.get(`gallery_${i}`) as File;
      
      if (!file) continue;

      // Validate image/video type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4', 'video/webm', 'video/quicktime'];
      if (!allowedTypes.includes(file.type)) {
        return Response.json({ success: false, error: 'Only JPEG, PNG and common video formats (MP4, WebM) are allowed' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const filename = `${Date.now()}_${i}_${file.name}`;
      const filepath = join(uploadDir, filename);
      
      await writeFile(filepath, buffer);
      
      uploadedImages.push(`/uploads/gallery/${filename}`);
    }

    return Response.json({
      success: true,
      images: uploadedImages,
      message: `${uploadedImages.length} image(s) uploaded successfully`,
    });
  } catch (error) {
    console.error('Gallery upload error:', error);
    return Response.json(
      { success: false, error: 'Failed to upload gallery images' },
      { status: 500 }
    );
  }
}
