const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testGoogle() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    console.log('Missing Google configuration');
    return;
  }

  console.log('Testing Google Sheets connection...');
  const formattedKey = privateKey.replace(/\\n/g, '\n');
  
  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: formattedKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.get({ spreadsheetId });
    console.log('Successfully connected to Google Sheets!');
    console.log('Spreadsheet Title:', response.data.properties.title);
  } catch (err) {
    console.error('Google Sheets Error:', err.message);
    if (err.stack) console.error(err.stack);
  }
}

testGoogle();
