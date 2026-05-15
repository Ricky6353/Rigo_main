import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { uploadToMongoDB } from '@/lib/mongoFiles';
import { getGoogleAuth } from '@/lib/googleAuth';

const CUSTOMIZATIONS_SHEET_NAME = 'Customizations';
const CUSTOMIZATIONS_HEADER = ['Name', 'Email', 'Phone', 'File Name', 'Date', 'Link', 'Instructions'];

async function ensureCustomizationSheet(sheets: any, spreadsheetId: string) {
  try {
    const metadata = await sheets.spreadsheets.get({ spreadsheetId });
    const titleExists = metadata.data.sheets?.some((sheet: any) => sheet.properties?.title === CUSTOMIZATIONS_SHEET_NAME);

    if (!titleExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: CUSTOMIZATIONS_SHEET_NAME } } }],
        },
      });
    }

    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${CUSTOMIZATIONS_SHEET_NAME}!A1:G1`,
    });

    const currentHeader = headerResponse.data.values?.[0] || [];
    if (currentHeader.length < CUSTOMIZATIONS_HEADER.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${CUSTOMIZATIONS_SHEET_NAME}!A1:G1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [CUSTOMIZATIONS_HEADER] },
      });
    }
  } catch (err) {
    console.error('Error ensuring customization sheet:', err);
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const email = formData.get('email') as string || 'N/A';
    const phone = formData.get('phone') as string || 'N/A';
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

    // Initialize MongoDB Storage
    const { fileId, viewLink } = await uploadToMongoDB(file, { 
      customerName: name, 
      email,
      phone,
      instructions 
    });

    // We still log to Google Sheets if possible, but point to the MongoDB link
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Ensure the sheet exists and has headers
    await ensureCustomizationSheet(sheets, spreadsheetId);
    
    const fullViewLink = `${new URL(req.url).origin}${viewLink}`;

    // Log metadata to "Customizations" sheet (Name, Email, Phone, Date, Link, Instructions)
    // We prefix phone with ' to prevent Google Sheets from treating it as a formula
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${CUSTOMIZATIONS_SHEET_NAME}!A:G`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[name, email, `'${phone}`, file.name, new Date().toISOString(), fullViewLink, instructions]],
      },
    });

    return NextResponse.json({ success: true, fileId, driveLink: fullViewLink });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
