/**
 * Shared shell for the §13.6 public directory pages (venues / decorators /
 * photographers). Mirrors the sticky-header + lightPink hero + breadcrumb
 * pattern already used by contact-us, so new data pages stay on-brand without
 * touching the captured design tokens (appTheme, lightPink, plus-jakarata).
 */
import type { ReactNode } from 'react';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';

export interface Crumb {
  label: string;
  href?: string;
}

interface Props {
  title: string;
  intro?: string;
  crumbs: Crumb[];
  children: ReactNode;
}

export default function DirectoryLayout({ title, intro, crumbs, children }: Props) {
  return (
    <>
      <SiteHeader variant="sticky" />
      <section className="bg-lightPink py-8 lg:py-14">
        <div className="mx-auto max-w-6xl px-5">
          <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-appTheme lg:text-sm">
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                {crumb.href ? (
                  <a className="hover:underline" href={crumb.href}>
                    {crumb.label}
                  </a>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
                {index < crumbs.length - 1 && <span aria-hidden="true">&gt;</span>}
              </span>
            ))}
          </nav>
          <h1 className="mt-4 font-plus-jakarata-sans text-3xl font-extrabold text-black lg:text-[40px] lg:leading-[48px]">
            {title}
          </h1>
          {intro && <p className="mt-2 max-w-3xl text-base text-secondary lg:text-lg">{intro}</p>}
        </div>
      </section>
      <section className="py-8 lg:py-12">
        <div className="mx-auto max-w-6xl px-5">{children}</div>
      </section>
      <SiteFooter />
    </>
  );
}
