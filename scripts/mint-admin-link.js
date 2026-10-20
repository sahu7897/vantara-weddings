/**
 * Helper to generate a 1-click admin login link without burning email quotas or needing SMS.
 * Usage:
 *   node scripts/mint-admin-link.js [port] [email]
 * Example:
 *   node scripts/mint-admin-link.js 3000
 */
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
  envFile
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const port = process.argv[2] || '3000';
const email = process.argv[3] || 'shivanshusahu.bnd@gmail.com';
const redirectTo = `http://localhost:${port}/admin/dashboard`;

async function main() {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  });

  if (error) {
    console.error('Error generating link:', error.message);
    process.exit(1);
  }

  const actionLink = data.properties.action_link;
  console.log('\n======================================================');
  console.log(` Admin 1-Click Login Link for: ${email}`);
  console.log('======================================================\n');
  console.log(actionLink);
  console.log('\n👉 Open the URL above in your browser to sign in directly as Admin!\n');
}

main();
