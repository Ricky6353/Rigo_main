import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { uploadToGoogleDrive } from '@/lib/googleDrive';
import { getGoogleAuth } from '@/lib/googleAuth';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const instructions = formData.get('instructions') as string || 'N/A';

    if (!file || !name) {
      return NextResponse.json({ error: 'File and name are required' }, { status: 400 });
    }

    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    const auth = getGoogleAuth(['https://www.googleapis.com/auth/spreadsheets']);

    if (!auth || !spreadsheetId) {
      console.warn('Google Credentials missing. Running in mock mode.');
      return NextResponse.json({ 
        success: true, 
        driveLink: 'https://mock-drive-link.com/file/123',
        message: 'Mock upload successful' 
      });
    }

    // Initialize Google Drive & Sheets
    const { fileId, driveLink } = await uploadToGoogleDrive(file, name);

    const sheets = google.sheets({ version: 'v4', auth });

    // Log metadata to "Customizations" sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Customizations!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[name, file.name, new Date().toISOString(), driveLink || 'N/A', instructions]],
      },
    });

    return NextResponse.json({ success: true, fileId, driveLink });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
