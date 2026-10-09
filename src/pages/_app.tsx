import type { AppProps } from 'next/app';
import Head from 'next/head';
import Script from 'next/script';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import NProgress from 'nprogress';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { fontVariables } from '@/lib/fonts';
import { SiteSettingsProvider, type SiteSettings } from '@/lib/cms/siteSettings';
import '@/styles/globals.css';

// D7 (analytics): GTM is wired but dormant — empty env = no script emitted.
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? '';

/**
 * App shell (Stage 3):
 *  - #parent-container + <main class="pb-2 lg:pb-6"> mirror the original DOM
 *    (both captured in docs/research/homepage/app_shell.json).
 *  - nprogress bar (#FF5B95 styles in globals.css) on route transitions.
 *  - ToastContainer sits next to #parent-container — matches the original
 *    `<div class="Toastify">` mount position (inside #__next, after main).
 *
 * Phase 6 CMS: `getInitialProps` loads the effective `site_settings` rows and
 * publishes them through <SiteSettingsProvider> so the header, footer and CTA
 * bar render admin-edited branding/contacts/socials instead of frozen
 * constants. It is fail-soft and lazily imports the Supabase client server-side,
 * so a missing key or an outage simply yields the static fallbacks.
 */
App.getInitialProps = async () => {
  const { loadEffectiveSiteSettings } = await import('@/lib/cms/loadSiteSettings');
  const siteSettings = await loadEffectiveSiteSettings();
  return { pageProps: { siteSettings } };
};

export default function App({ Component, pageProps }: AppProps<{ siteSettings?: SiteSettings }>) {
  const router = useRouter();
  const { siteSettings, ...restPageProps } = pageProps;

  useEffect(() => {
    const start = () => NProgress.start();
    const done = () => NProgress.done();
    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', done);
    router.events.on('routeChangeError', done);
    return () => {
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', done);
      router.events.off('routeChangeError', done);
    };
  }, [router.events]);

  return (
    <SiteSettingsProvider value={siteSettings}>
      <Head>
        <meta name="viewport" content="width=device-width" />
        <link rel="icon" href="/brand/favicon-32.png" sizes="32x32" />
        <link rel="icon" href="/brand/favicon-16.png" sizes="16x16" />
        <link rel="icon" href="/brand/favicon.png" sizes="48x48" />
        <link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />
      </Head>
      {/* Font CSS variables live here (not in _document — see fonts.ts note).
          #parent-container mirrors the original site's single wrapper div. */}
      <div
        id="parent-container"
        className={`${fontVariables} font-lato text-primaryTextColor`}
      >
        {/* Original DOM: homepage <main class="pb-2 lg:pb-6">; subpages render
            <main class=""> (captured) — className is route-dependent. */}
        <main className={router.pathname === '/' ? 'pb-2 lg:pb-6' : ''}>
          <Component {...restPageProps} />
        </main>
      </div>
      <ToastContainer position="bottom-right" autoClose={4000} newestOnTop />
      {/* D7: GTM dataLayer bootstrap (no-op unless NEXT_PUBLIC_GTM_ID set) */}
      {GTM_ID ? (
        <Script
          id="gtm"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
      ) : null}
      {/* #portal mount point lives in _document (body level, as captured). */}
    </SiteSettingsProvider>
  );
}