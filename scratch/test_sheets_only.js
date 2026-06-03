require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

let privateKey = process.env.GOOGLE_PRIVATE_KEY;
if (privateKey && privateKey.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.slice(1, -1);
}

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: (privateKey || '').replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const spreadsheetId = process.env.GOOGLE_ORDERS_SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID;
const sheets = google.sheets({ version: 'v4', auth });

(async () => {
  console.log('Spreadsheet ID set:', Boolean(spreadsheetId));
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Customizations!A:H',
  });
  const values = res.data.values || [];
  console.log('Customizations sheet rows (incl header):', values.length);
  console.log('Header:', values[0]);
  console.log('Last row:', values[values.length - 1] || '(none)');
})().catch((e) => {
  console.error('Sheets test failed:', e.message);
  process.exit(1);
});
