import { useEffect, useState } from 'react'

/** True on phone-sized viewports. Drives the mobile-first shell and layout. */
export function useIsMobile(maxWidth = 768): boolean {
  const query = `(max-width: ${maxWidth - 1}px)`
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && 'matchMedia' in window ? window.matchMedia(query).matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return isMobile
}
