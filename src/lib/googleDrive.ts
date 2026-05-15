import { google } from 'googleapis';
import { Readable } from 'stream';
import { getGoogleAuth } from './googleAuth';

export interface DriveUploadResult {
  fileId: string;
  driveLink: string;
}

export async function uploadToGoogleDrive(
  file: File,
  customName: string,
  folderId?: string
): Promise<DriveUploadResult> {
  const defaultFolderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
  const auth = getGoogleAuth([
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file'
  ]);

  if (!auth || !defaultFolderId) {
    throw new Error('Google Drive configuration missing (Email, Private Key, or Folder ID)');
  }

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
    supportsAllDrives: true, // Required for Shared Drives
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
    supportsAllDrives: true, // Required for Shared Drives
  });

  return { fileId, driveLink };
}
