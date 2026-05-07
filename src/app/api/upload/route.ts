import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { uploadToGoogleDrive } from '@/lib/googleDrive';
import { Readable } from 'stream';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const instructions = formData.get('instructions') as string || 'N/A';

    if (!file || !name) {
      return NextResponse.json({ error: 'File and name are required' }, { status: 400 });
    }

    // Google Drive & Sheets Credentials
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    if (!clientEmail || !privateKey || !folderId || !spreadsheetId) {
      console.warn('Google Credentials missing. Running in mock mode.');
      return NextResponse.json({ 
        success: true, 
        driveLink: 'https://mock-drive-link.com/file/123',
        message: 'Mock upload successful' 
      });
    }

    // Initialise Google Drive & Sheets
    const { fileId, driveLink } = await uploadToGoogleDrive(file, name, folderId);

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
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
