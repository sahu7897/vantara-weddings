import { useEffect, useState } from 'react';

/**
 * isMobile hook used by the original slider components (chunk 7168 calls
 * `(0, P.Z)()` / `(0, r.Z)()` to pick perView: isMobile ? 3 : 5 etc).
 * Desktop breakpoint follows the site's Tailwind `md:` = 768px.
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [breakpoint]);

  return isMobile;
}
