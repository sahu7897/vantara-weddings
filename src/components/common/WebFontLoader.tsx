/**
 * WebFontLoader — loads Google Fonts through the legacy WebFont Loader.
 *
 * Root cause this fixes ("ReferenceError: WebFont is not defined"): pages used
 * an inline `WebFont.load({...})` script that ran before the external
 * webfont.js had finished loading, and the CDN <script> had no completion
 * hook. The loader is now:
 *   1. client-only (renders nothing on the server, no SSR reference),
 *   2. injected once via next/script with `afterInteractive`,
 *   3. only calls WebFont.load() from `onLoad`, after the library exists.
 */
import { useCallback, useRef } from 'react';
import Script from 'next/script';

const WEBFONT_SRC = 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js';

const GOOGLE_FAMILIES = [
  'Open Sans:300,300italic,400,400italic,600,600italic,700,700italic,800,800italic',
  'Lato:100,100italic,300,300italic,400,400italic,700,700italic,900,900italic',
  'Montserrat:100,100italic,200,200italic,300,300italic,400,400italic,500,500italic,600,600italic,700,700italic,800,800italic,900,900italic',
  'PT Serif:400,400italic,700,700italic',
  'PT Sans:400,400italic,700,700italic',
];

type WebFontGlobal = { load: (config: { google: { families: string[] } }) => void };

export default function WebFontLoader() {
  const loadedRef = useRef(false);

  const handleLoad = useCallback(() => {
    if (loadedRef.current) return;
    const wf = (window as unknown as { WebFont?: WebFontGlobal }).WebFont;
    if (!wf) return;
    loadedRef.current = true;
    wf.load({ google: { families: GOOGLE_FAMILIES } });
  }, []);

  return <Script src={WEBFONT_SRC} strategy="afterInteractive" onLoad={handleLoad} />;
}
