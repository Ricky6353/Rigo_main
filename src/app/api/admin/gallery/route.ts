import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(req: Request) {
  try {
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

      // Validate image type
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        return Response.json({ success: false, error: 'Only JPEG and PNG formats are allowed' }, { status: 400 });
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
