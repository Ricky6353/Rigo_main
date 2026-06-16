import { NextResponse } from 'next/server';
import { uploadToSupabase } from '@/lib/supabaseFiles';
import { generateNextCustomizationRequestId } from '@/lib/idSerials';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const frontFile = formData.get('frontFile') as File;
    const backFile = formData.get('backFile') as File;
    const name = formData.get('name') as string;
    const email = (formData.get('email') as string) || 'N/A';
    const phone = (formData.get('phone') as string) || 'N/A';
    const frontPlacement = (formData.get('frontPlacement') as string) || '';
    const backPlacement = (formData.get('backPlacement') as string) || '';
    const category = (formData.get('category') as string) || '';
    const categoryName = (formData.get('categoryName') as string) || category;
    const description = (formData.get('description') as string) || '';
    const requestId = await generateNextCustomizationRequestId();

    if (!frontFile || !backFile || !name) {
      return NextResponse.json(
        { error: 'Front file, back file, and name are required.' },
        { status: 400 }
      );
    }

    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    const isAllowedFile = (file: File) => {
      const fileName = file.name.toLowerCase();
      const isPdf = file.type === 'application/pdf' || fileName.endsWith('.pdf');
      const isJpeg =
        file.type === 'image/jpeg' || fileName.endsWith('.jpeg') || fileName.endsWith('.jpg');
      return isPdf || isJpeg;
    };

    if (!isAllowedFile(frontFile) || !isAllowedFile(backFile)) {
      return NextResponse.json({ error: 'Only PDF or JPEG files are allowed.' }, { status: 400 });
    }

    if (frontFile.size >= MAX_FILE_SIZE || backFile.size >= MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Each file must be smaller than 20MB.' },
        { status: 400 }
      );
    }

    const commonMetadata = {
      customerName: name,
      email,
      phone,
      category,
      categoryName,
      requestId,
      instructions: description,
    };

    const frontResult = await uploadToSupabase(frontFile, {
      ...commonMetadata,
      designSide: 'front',
      placement: frontPlacement,
    });

    const backResult = await uploadToSupabase(backFile, {
      ...commonMetadata,
      designSide: 'back',
      placement: backPlacement,
    });

    return NextResponse.json({
      success: true,
      frontFileId: frontResult.fileId,
      frontLink: frontResult.viewLink,
      backFileId: backResult.fileId,
      backLink: backResult.viewLink,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('Upload Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
