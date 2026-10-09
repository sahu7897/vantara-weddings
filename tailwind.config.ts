import type { Config } from 'tailwindcss';

/**
 * Design tokens extracted verbatim from the original site's compiled CSS
 * (_next/static/css/12807397349bb01c.css of build GP-9a4dTH6S6yEF7jhjhm).
 * Font utility names intentionally preserve original spelling
 * (e.g. `font-plus-jakarata-sans`) so captured markup can be reused 1:1.
 */
const config: Config = {
  content: ['./src/pages/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // xs from original CSS: @media (min-width:400px){ .xs\:... }
      screens: {
        xs: '400px',
      },
      // .bg-planMyWeddingForm{background-image:linear-gradient(180deg,rgba(255,253,232,0) .24%,hsla(54,86%,83%,.78) 105.68%)}
      backgroundImage: {
        planMyWeddingForm:
          'linear-gradient(180deg, rgba(255, 253, 232, 0) 0.24%, hsla(54, 86%, 83%, 0.78) 105.68%)',
      },
      // .shadow-whitey{--tw-shadow:0 4px 32px 0 #fff}
      // .shadow-header{--tw-shadow:0px 4px 4px rgba(0,0,0,.04)}
      boxShadow: {
        whitey: '0 4px 32px 0 #fff',
        header: '0px 4px 4px rgba(0, 0, 0, 0.04)',
      },
      colors: {
        appTheme: '#FF5B95',
        appThemeNew: '#7B0242',
        primaryTextColor: '#333333',
        darkGrey: '#8D8D8D',
        disabledColor: '#808080',
        primaryPink: '#FF5B91',
        TWCPrimaryTheme: '#A1285E',
        brightGray: '#EFEeee',
        darkWhite: '#EFEFEF',
        greyWhite: '#FBFBFB',
        lightGray: '#E4E4E4',
        lighterGray: '#F2F2F2',
        shadesOfWhite: '#F5F5F5',
        footerGrey: '#CCCCCC',
        lightestPink: '#FADEDE',
        lightPink: '#FFEFF4',
        lighterPink: '#FFF4FA',
        lightPinkPeak: '#C59D95',
        candyBar: '#FFBBD2',
        spanishPink: '#F0C3B9',
        darkSalmon: '#E69A71',
        veryPaleOrange: '#FFE0C0',
        caramel: '#FDE095',
        tanColor: '#D4B08B',
        desertSand: '#D4AD67',
        goldenDark: '#CC6F2B',
        darkGold: '#B38E4B',
        gold: '#FF9900',
        darkGreen: '#11AE87',
        oceanGreen: '#57C88C',
        lightGreen: '#8BB67C',
        mustard: '#EBA103',
        royalty: '#5C27B2',
        lightPurple: '#DBC5FE',
        lightestPurple: '#FAF8FF',
        checkListBg: '#FFFEF7',
        plannerPrimary: '#FFDF7C',
        plannerGradient: '#FFFDE8',
        weddingPlannerForm: '#FFFDE8',
        homepageGradientBackground: '#FFFFFE',
        progressBar: '#FED215',
        rangeColor: '#FF5B91',
        trackColor: '#FFEDF3',
        textDescription: '#838383',
        filterTextColor: '#6A6A6A',
        primary: '#1A202C',
        secondary: '#808080',
      },
      fontFamily: {
        lato: ['var(--font-lato)', 'sans-serif'],
        playfair: ['var(--font-playfair-display)', 'serif'],
        'plus-jakarata-sans': ['var(--font-plus-jakarta-sans)', 'sans-serif'],
        poppins: ['var(--font-poppins)', 'sans-serif'],
        moisette: ['var(--font-moisette)', 'cursive'],
      },
    },
  },
  plugins: [],
};

export default config;
