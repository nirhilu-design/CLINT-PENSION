import { useEffect, useState } from 'react'

/** Reactive media-query match. SSR-safe (defaults to false until mounted). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.(query).matches,
  )
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return !!matches
}

/** True on phone-width viewports (mobile breakpoint from the design brief: ≤767px). */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}
