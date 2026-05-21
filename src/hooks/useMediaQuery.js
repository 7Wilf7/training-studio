import { useEffect, useState } from 'react';

// Wraps the browser's matchMedia API as a React hook. Re-renders the
// component whenever the query starts/stops matching (e.g. user rotates
// the phone, resizes the desktop window, opens DevTools mobile preview).
//
// SSR-safe: returns false on the server (no window) and snaps to the
// real value as soon as the client mounts.
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    // The lazy useState initializer above already captured the initial
    // match value at mount, so this effect only needs to subscribe to
    // future changes. No setMatches call in the effect body itself.
    const onChange = (e) => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

// Three breakpoints across the app. Aligned with common phone / tablet /
// desktop widths. Keep these as named hooks so call sites read clearly
// and we can re-tune the breakpoints in one place.
//   mobile:  < 768  (phones, narrow split-view)
//   tablet:  768 – 1023  (iPad portrait, small laptops)
//   desktop: ≥ 1024  (everything wider)
export const useIsMobile  = () => useMediaQuery('(max-width: 767px)');
export const useIsTablet  = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');

// "Up to tablet" — covers everything that ISN'T desktop. Useful when the
// mobile and tablet layouts share a code path that differs from desktop.
export const useIsNarrow  = () => useMediaQuery('(max-width: 1023px)');
