/* One-time bootstrap. Requires migration 0011 and server-side Supabase credentials.
   Run: node scripts/bootstrap-super-admin.js
   Prints the generated one-time credentials only after successful provisioning. */
const { randomBytes, scryptSync } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the shell environment.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const randomToken = (bytes) => randomBytes(bytes).toString('base64url');
const isHex = (value) => /^[0-9a-f]+$/i.test(value);

async function main() {
  const { count, error: countError } = await supabase.from('admin_access_credentials').select('*', { count: 'exact', head: true });
  if (countError) throw new Error(`Could not check bootstrap state (apply migration 0011 first): ${countError.message}`);
  if (count) throw new Error('An admin credential already exists. Bootstrap is intentionally one-time.');

  const username = `vw-admin-${randomBytes(8).toString('hex')}`;
  const password = `${randomToken(36)}!A9`;
  const authPassword = randomToken(48);
  const email = `${username}@admin.vantara.local`;
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('hex');
  if (!isHex(salt) || !isHex(hash)) throw new Error('Could not derive a valid password hash.');
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email, email_confirm: true, password: authPassword, user_metadata: { full_name: 'VANTARA Super Admin', admin_username: username },
  });
  if (createError || !created.user) throw new Error(`Could not create auth principal: ${createError?.message ?? 'no user returned'}`);

  const { error: profileError } = await supabase.from('profiles').upsert({ id: created.user.id, role: 'admin', full_name: 'VANTARA Super Admin' }, { onConflict: 'id' });
  if (profileError) {
    await supabase.auth.admin.deleteUser(created.user.id);
    throw new Error(`Could not set admin role: ${profileError.message}`);
  }

  const { error: credentialError } = await supabase.from('admin_access_credentials').insert({ username, password_salt: salt, password_hash: hash, auth_user_id: created.user.id });
  if (credentialError) {
    await supabase.auth.admin.deleteUser(created.user.id);
    throw new Error(`Could not store the credential hash: ${credentialError.message}`);
  }

  console.log('\nVANTARA WEDDINGS — initial Super Admin (save these now; password is not stored in recoverable form)');
  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
  console.log('Login URL: https://<your-domain>/admin/login');
  console.log('\nStore these in a password manager. Do not commit them or paste them into GitHub.');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
