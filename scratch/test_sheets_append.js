require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

const MARKER = `sheets-append-test-${Date.now()}`;

function getGoogleAuth() {
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (privateKey && privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (privateKey || '').replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

(async () => {
  const spreadsheetId = process.env.GOOGLE_ORDERS_SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID;
  const auth = getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Customizations!A:H',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[MARKER, 'test@example.com', "'+44 123", 'test.pdf', new Date().toISOString(), 'https://example.com', '', 'uploads/test']],
    },
  });

  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Customizations!A:H' });
  const rows = (res.data.values || []).slice(1);
  const found = rows.some((r) => (r[0] || '').includes(MARKER));
  console.log('Append test:', found ? 'PASS' : 'FAIL');
  console.log('Marker:', MARKER);
})().catch((e) => {
  console.error('Append test FAIL:', e.message);
  process.exit(1);
});
