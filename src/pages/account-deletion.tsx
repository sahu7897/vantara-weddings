/**
 * AccountDeletionPage — generated from twc_research/raw/account-deletion.html by scripts/build_content_pages.py.
 * Source of truth = captured/crawled DOM. Hand edits allowed but mark them with
 * `// HAND-EXTENSION:` comments so regeneration can be merged.
 */
import Head from 'next/head';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';

export default function AccountDeletionPage() {
  return (
    <>
      <Head>
        <title>{"Delete Your Account | Vantara"}</title>
        <meta name="description" content={"Learn how to delete your Vantara account and what happens to your data across our mobile app and web experience."} />
      </Head>
      <SiteHeader variant="sticky" />
      <div className="flex h-11 items-center justify-center bg-[#A1285E] font-plus-jakarata-sans font-semibold text-white md:h-20 md:text-xl"><h1>Delete Your Account</h1></div><article className="mx-auto max-w-screen-lg px-6 py-10 font-plus-jakarata-sans text-[14px] leading-relaxed text-[#2E394A] md:px-10 md:py-14"><div className="space-y-6"><p className="text-xs text-secondary">Last updated: {/* */}17 July 2026</p><p>This page explains how to delete your Vantara account and what happens to your data. It applies to our mobile app and web experience.</p><h2 className="mt-10 text-base font-semibold text-[#2E394A]">Delete your account from within the app</h2><ol className="list-decimal space-y-2 pl-5"><li>Open the Vantara app.</li><li>Tap the profile icon in the top-right of the home header.</li><li>Select <b>&quot;Delete account&quot;</b>.</li><li>Confirm in the dialog. Your account is deleted and you are signed out immediately.</li></ol><h2 className="mt-10 text-base font-semibold text-[#2E394A]">Request deletion without the app (or if you can&#x27;t sign in)</h2><ul className="list-disc space-y-2 pl-5"><li>Email{/* */} <a href="mailto:bookings@vantaraweddings.com?subject=Account%20deletion%20request" className="text-[#A1285E] underline">bookings@vantaraweddings.com</a> {/* */}from the email address associated with your account, with the subject <b>&quot;Account deletion request&quot;</b>.</li><li>Include your registered name and phone number/email so we can verify ownership.</li><li>We verify the request and process it within {/* */}30{/* */} {/* */}days, and email you a confirmation once complete.</li></ul><h2 className="mt-10 text-base font-semibold text-[#2E394A]">What data is deleted</h2><p>When your account is deleted, we permanently remove the personal data associated with it, including:</p><ul className="list-disc space-y-2 pl-5"><li>Profile details (name, email, and phone number).</li><li>Wedding requirements (budget, city, dates, and preferences).</li><li>Uploaded images and moodboards.</li><li>Shortlists and saved vendors.</li><li>Analytics identifiers tied to your account.</li></ul><h2 className="mt-10 text-base font-semibold text-[#2E394A]">What data is retained (and why)</h2><p>After your account is deleted, we retain only a limited set of records where we are required to by law. Transaction, payment, and invoicing records are retained for {/* */}8 years{/* */} to meet our tax, accounting, and other legal obligations, after which they are permanently deleted.</p><h2 className="mt-10 text-base font-semibold text-[#2E394A]">Deletion timeline</h2><p>Account deletions initiated in the app take effect immediately. Requests made by email are completed within {/* */}30{/* */} {/* */}days.</p><p>Deleting your account does not automatically cancel confirmed venue or vendor bookings. If you have an active booking, please contact your wedding planner or support team before deleting your account.</p><p>Questions about deletion or your data? Contact us at{/* */} <a href="mailto:bookings@vantaraweddings.com" className="text-[#A1285E] underline">bookings@vantaraweddings.com</a>.</p><h2 className="mt-10 text-base font-semibold text-[#2E394A]">More information</h2><p>For details on how we collect, use, and protect your personal data, please read our{/* */} <a className="text-[#A1285E] underline" href="/twc-privacy-policy">Privacy Policy</a>.</p><p className="text-xs text-secondary">Last updated: {/* */}17 July 2026</p></div></article>
      <SiteFooter />
    </>
  );
}
