/**
 * /twc-exclusive/* — catch-all shell for the deals SPA (original manifest has
 * `/twc-exclusive/:path*`). SSR keeps every deep link (SPA-internal routes:
 * /deals, /experience, /deals/<slug>) serving the shell.
 */
import type { GetServerSideProps } from 'next';
export { default } from '@/components/ExclusiveDealsSpa';

export const getServerSideProps: GetServerSideProps = async () => ({
  props: {},
});
