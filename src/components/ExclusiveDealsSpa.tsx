import Head from 'next/head';
import { useEffect } from 'react';

/**
 * ExclusiveDealsSpa — shell for the original TWC deals SPA (Vite build,
 * captured from /twc-exclusive/deals, assets restored to public/twc-exclusive
 * and public/__l5e by scripts/wire_spas.py, brand strings + logos swapped).
 *
 * HAND-EXTENSION: the bundle mounts itself on `#root` and its routes use
 * basename `/twc-exclusive/`, so it works under any /twc-exclusive/* path we
 * serve. Modules only execute once per URL, so we append a `?mount=n` query
 * to re-execute the bundle when the user re-enters the page after a client-side
 * navigation (each execution mounts into the current #root).
 *
 * Data: deal content is hard-coded in the bundle; the enquiry sheet submits to
 * a public Google Apps Script endpoint (absolute URL) — no credentials needed.
 */
let mountSeq = 0;

const DEALS_META = {
  title: 'Vantara - Exclusive Deals',
  description: "Wedding Privileges from India's Leading Brands",
  ogImage:
    'https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/321962fe-368d-468a-898e-1c9937557dbe/id-preview-13f1e662--b9808177-6bb5-4444-bd1f-bda92f297b45.lovable.app-1773137555901.png',
};

export default function ExclusiveDealsSpa() {
  useEffect(() => {
    mountSeq += 1;
    const s = document.createElement('script');
    s.type = 'module';
    s.src = `/twc-exclusive/assets/index-B460GC4S.js?mount=${mountSeq}`;
    document.head.appendChild(s);
    return () => {
      s.remove();
    };
  }, []);

  return (
    <>
      <Head>
        <title>{DEALS_META.title}</title>
        <meta name="description" content={DEALS_META.description} />
        <link rel="canonical" href="/twc-exclusive/deals" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={DEALS_META.title} />
        <meta property="og:description" content={DEALS_META.description} />
        <meta property="og:image" content={DEALS_META.ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={DEALS_META.title} />
        <meta name="twitter:description" content={DEALS_META.description} />
        <meta name="twitter:image" content={DEALS_META.ogImage} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/twc-exclusive/assets/index-y9xGMsVb.css" />
        <link
          rel="preload"
          as="image"
          href="/__l5e/assets-v1/b8daa28a-341d-431e-890f-1a2c368cb0c7/tasva-v2.webp"
        />
      </Head>
      <div id="root" />
    </>
  );
}
