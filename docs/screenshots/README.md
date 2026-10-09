# Local verification screenshots

Captured against the **local dev server** (`npm.cmd run dev`, http://localhost:3001) with
headless Chrome driven over the DevTools Protocol, signing in through the app's real
`/auth/callback?token_hash=…&type=magiclink` flow (the admin-minted-link method described in
`docs/BLUEPRINT.md` §13.10 — used because free-tier GoTrue email sending is rate limited).

Nothing here is mocked: the session, the middleware gate, the RLS-scoped queries and the
CMS read path are all the real ones. The Supabase project had migration
`0008_fix_site_settings_contacts.sql` applied, so the footer/contact values shown are the
values the admin panel now edits.

| File | What it shows |
|---|---|
| `login-phone-tab.png` | `/login` — phone (OTP) method, Send OTP, Google fallback |
| `login-email-tab.png` | `/login` — email magic-link method selected (renders the email field) |
| `login-otp-step.png` | `/login` — OTP entry step reached |
| `login-otp-error.png` | `/login` — the honest "Unsupported phone provider" error, because SMS is not yet configured on the Supabase project |
| `admin-leads.png` | `/admin/dashboard` → Leads: search, status filter, 6 real leads, vendor assignment |
| `admin-vendors.png` | `/admin/dashboard` → Vendors: approval queue with Approve/Reject |
| `admin-site-settings.png` | `/admin/dashboard` → Site Settings: 18 fields loaded from `site_settings` |
| `admin-hero-videos.png` | `/admin/dashboard` → Hero Videos: CMS editor over the seeded hero slides |
| `vendor-dashboard.png` | `/vendor/dashboard` for an account with no vendor row — the honest empty state |
| `account.png` | `/account` — role, member since, "My enquiries" |

Note: these were captured in headless Chrome, which reports a zero-size layout viewport on
first paint; every capture sets an explicit device-metrics override, otherwise the PNG comes
out blank.

## Media editing from the admin panel (added later)

| File | What it shows |
|---|---|
| `admin-media-library.png` | Media tab � image **and video** upload, external CDN URL form, type filters |
| `admin-media-library-filled.png` | Media tab after uploading a real PNG + MP4 through the panel |
| `admin-hero-media-picker.png` | Hero slide's **Choose / Upload** modal (Library / Upload new / External URL), with live thumbnails on the fields |
| `admin-hero-after-pick.png` | Hero panel after picking a library asset � the URL is written back into the CMS field |

Verified end-to-end in this run: a PNG and an MP4 were uploaded through the panel, registered
in `cms_media` with the correct `media_type`, rendered with inline previews, and the picker
wrote the public URL back into the hero field. Test rows were removed afterwards � the media
library was left at its original 0 rows.