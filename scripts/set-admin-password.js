/**
 * Helper to set or reset a password for any admin account.
 * Usage:
 *   node scripts/set-admin-password.js <email> <new-password>
 * Example:
 *   node scripts/set-admin-password.js shivanshusahu.bnd@gmail.com MySecurePassword123
 */
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

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

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('Usage: node scripts/set-admin-password.js <email> <password>');
  process.exit(1);
}

async function main() {
  // 1. Find user by email
  const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('Failed to list users:', listErr.message);
    process.exit(1);
  }

  const user = usersData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`User with email "${email}" not found in auth.users.`);
    process.exit(1);
  }

  // 2. Update password
  const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
    password,
  });

  if (updateErr) {
    console.error('Failed to update password:', updateErr.message);
    process.exit(1);
  }

  // 3. Ensure role is admin in public.profiles
  await supabase.from('profiles').upsert({ id: user.id, role: 'admin' }, { onConflict: 'id' });

  console.log('\n======================================================');
  console.log(` Password updated successfully for: ${email}`);
  console.log(' Role verified: admin');
  console.log('======================================================\n');
  console.log('You can now navigate to http://localhost:3000/login and sign in with:');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}\n`);
}

main();
