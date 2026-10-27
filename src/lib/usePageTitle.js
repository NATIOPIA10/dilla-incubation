import { useEffect } from 'react'

const BASE = 'Dilla University Incubation Center'

export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE}` : BASE
    return () => {
      document.title = BASE
    }
  }, [title])
}