import { Head, Html, Main, NextScript } from 'next/document';

/**
 * NOTE: next/font classes/variables must NOT be applied here — `next/font`
 * is not allowed in pages/_document (its CSS would be silently dropped).
 * The font variables are applied in _app.tsx on #parent-container instead,
 * mirroring the original site's DOM (body > #parent-container.font-lato).
 *
 * D7 (analytics): structure is wired, dormant until NEXT_PUBLIC_GTM_ID is
 * set at build time. The original site used GTM-W6DVCTW; Vantara supplies
 * its own container ID later ("same IDs, wired later" decision). The
 * dataLayer snippet lives in _app via next/script; only the noscript
 * fallback stays here (it must sit directly under <body>).
 */
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? '';

export default function Document() {
  return (
    <Html lang="en-US">
      <Head />
      <body>
        {GTM_ID ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
              title="Google Tag Manager"
            />
          </noscript>
        ) : null}
        <Main />
        {/* portal mount used by modal/dialog hosts (captured at body level) */}
        <div id="portal" />
        <NextScript />
      </body>
    </Html>
  );
}
