import Head from 'next/head';
import Link from 'next/link';
import site from '@/config/site';

export default function NotFound() {
  return (
    <>
      <Head>
        <title>{`Page Not Found | ${site.shortName}`}</title>
      </Head>
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-4xl font-extrabold text-appTheme">404</h1>
        <p className="text-lg text-primaryTextColor">This page could not be found.</p>
        <Link
          href="/"
          className="rounded-2xl bg-[linear-gradient(to_right,#9A2157,#A1285E,#BC2D6D,#A1285E,#9A2157)] px-6 py-3 font-plus-jakarata-sans text-sm font-semibold text-white shadow-[0px_6px_15px_0px_rgba(0,0,0,0.20)]"
        >
          Go home
        </Link>
      </main>
    </>
  );
}
