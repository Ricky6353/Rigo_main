require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pdf = fs.readFileSync(path.join(process.cwd(), 'public/references/reference.pdf'));
const testPath = `uploads/test-admin-${Date.now()}.pdf`;

(async () => {
  const anon = createClient(url, anonKey);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const anonRes = await anon.storage.from('customizations').upload(`uploads/test-anon-${Date.now()}.pdf`, pdf, {
    contentType: 'application/pdf',
    upsert: false,
  });
  console.log('Anon upload:', anonRes.error ? `FAIL - ${anonRes.error.message}` : 'OK');

  const adminRes = await admin.storage.from('customizations').upload(testPath, pdf, {
    contentType: 'application/pdf',
    upsert: false,
  });
  console.log('Admin upload:', adminRes.error ? `FAIL - ${adminRes.error.message}` : `OK (${adminRes.data.path})`);

  if (!adminRes.error) {
    await admin.storage.from('customizations').remove([testPath]);
    console.log('Cleaned up admin test file');
  }
})();
