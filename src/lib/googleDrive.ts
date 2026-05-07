import { google } from 'googleapis';
import { Readable } from 'stream';

export interface DriveUploadResult {
  fileId: string;
  driveLink: string;
}

export async function uploadToGoogleDrive(
  file: File,
  customName: string,
  folderId?: string
): Promise<DriveUploadResult> {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const defaultFolderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!clientEmail || !privateKey || !defaultFolderId) {
    throw new Error('Google Drive configuration missing (Email, Private Key, or Folder ID)');
  }

  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  const timestamp = new Date().getTime();
  const safeName = customName.replace(/\s+/g, '_').toLowerCase();
  const fileName = `${timestamp}_${safeName}_${file.name}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const stream = Readable.from(buffer);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [defaultFolderId],
    },
    media: {
      mimeType: file.type,
      body: stream,
    },
    fields: 'id, webViewLink',
  });

  const fileId = response.data.id;
  const driveLink = response.data.webViewLink;

  if (!fileId || !driveLink) {
    throw new Error('Failed to get file ID or link from Google Drive response');
  }

  // Make file viewable by anyone with the link
  await drive.permissions.create({
    fileId: fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  return { fileId, driveLink };
}
