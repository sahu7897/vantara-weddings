import { Lato, Playfair_Display, Plus_Jakarta_Sans, Poppins } from 'next/font/google';

/**
 * Original site uses next/font with CSS variables:
 *   --font-lato, --font-playfair-display, --font-plus-jakarta-sans,
 *   --font-poppins, --font-moisette (custom script font, self-hosted — Stage 2)
 * Weights are the commonly used set from the original compiled CSS;
 * refined during the pixel-comparison stage if needed.
 *
 * IMPORTANT: these must be applied in _app.tsx (on #parent-container) —
 * next/font is not allowed inside pages/_document.tsx; importing it there
 * silently drops the @font-face CSS (next/font only errors when called
 * directly in _document).
 */
export const lato = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700', '900'],
  variable: '--font-lato',
  display: 'swap',
});

export const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair-display',
  display: 'swap',
});

export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

export const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const fontVariables = [lato.variable, playfairDisplay.variable, plusJakartaSans.variable, poppins.variable].join(
  ' ',
);
