import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const ADMIN_EMAILS = ['embroyitltdjay@gmail.com', 'embroyitricky@gmail.com'];

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    
    const id = formData.get('id') as string || `p_${Date.now()}`;
    const name = formData.get('name') as string;
    const category = formData.get('category') as string;
    const price = parseFloat(formData.get('price') as string);
    const description = formData.get('description') as string;
    const sizes = (formData.get('sizes') as string)?.split(',').map(s => s.trim()) || [];
    const details = (formData.get('details') as string)?.split('\n').map(d => d.trim()).filter(Boolean) || [];
    const fileCount = parseInt(formData.get('fileCount') as string) || 0;

    let imageUrls: string[] = [];
    let primaryImage = formData.get('image') as string || '/placeholder.png';

    // Handle multiple file uploads
    if (fileCount > 0) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      for (let i = 0; i < fileCount; i++) {
        const file = formData.get(`file_${i}`) as File | null;
        
        if (file && file.size > 0) {
          // Validate image/video type
          const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4', 'video/webm', 'video/quicktime'];
          if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Only JPEG, PNG and common video formats (MP4, WebM) are allowed' }, { status: 400 });
          }

          const buffer = Buffer.from(await file.arrayBuffer());
          const safeName = file.name.replace(/\s+/g, '_').toLowerCase();
          const newFileName = `${Date.now()}_${i}_${safeName}`;
          
          const filePath = path.join(uploadDir, newFileName);
          fs.writeFileSync(filePath, buffer);
          
          imageUrls.push(`/uploads/${newFileName}`);
        }
      }
    }

    // Use first uploaded image as primary, or keep existing
    if (imageUrls.length > 0) {
      primaryImage = imageUrls[0];
    }

    const dataPath = path.join(process.cwd(), 'src', 'data', 'products.json');
    const existingData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    const isEdit = existingData.findIndex((p: any) => p.id === id);
    const newProduct = {
      id, 
      name, 
      category, 
      price, 
      description, 
      sizes, 
      details, 
      image: primaryImage,
      images: imageUrls.length > 0 ? imageUrls : undefined // Store all images if multiple
    };

    if (isEdit !== -1) {
      existingData[isEdit] = newProduct;
    } else {
      existingData.push(newProduct);
    }

    fs.writeFileSync(dataPath, JSON.stringify(existingData, null, 2));

    return NextResponse.json({ success: true, product: newProduct });
  } catch (err: any) {
    console.error('Save product error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const dataPath = path.join(process.cwd(), 'src', 'data', 'products.json');
    let products = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    const initialLength = products.length;
    products = products.filter((p: any) => p.id !== id);

    if (products.length === initialLength) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    fs.writeFileSync(dataPath, JSON.stringify(products, null, 2));

    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (err: any) {
    console.error('Delete product error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
