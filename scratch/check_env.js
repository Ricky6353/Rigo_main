const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('.env.local not found');
  process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf-8');
const lines = content.split('\n');

console.log('Checking .env.local for common issues...');

lines.forEach((line, i) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;

  if (trimmed.includes('=')) {
    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=');

    // Check for spaces around =
    if (line.includes(' =') || line.includes('= ')) {
      console.log(`Line ${i + 1}: Found spaces around '=' which can cause issues in some environments.`);
    }

    // Check for GOOGLE_PRIVATE_KEY specifically
    if (key === 'GOOGLE_PRIVATE_KEY') {
      if (!value.includes('-----BEGIN PRIVATE KEY-----')) {
        console.log(`Line ${i + 1}: GOOGLE_PRIVATE_KEY seems to be missing the standard header.`);
      }
      if (value.startsWith('"') && !value.endsWith('"')) {
        console.log(`Line ${i + 1}: GOOGLE_PRIVATE_KEY has a leading quote but no trailing quote.`);
      }
      if (!value.includes('\\n') && value.includes('\n')) {
        console.log(`Line ${i + 1}: GOOGLE_PRIVATE_KEY contains literal newlines instead of \\n escape sequences.`);
      }
    }
    
    // Check for invalid characters at the end
    if (value.endsWith('\r')) {
      console.log(`Line ${i + 1}: Line ends with \\r (CRLF issues).`);
    }
  }
});

console.log('Done checking.');
