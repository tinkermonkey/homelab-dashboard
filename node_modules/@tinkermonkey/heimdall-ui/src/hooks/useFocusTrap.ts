import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
]

export function useFocusTrap(ref: React.RefObject<HTMLElement>, isActive: boolean) {
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive || !ref.current) return

    previousActiveElementRef.current = document.activeElement as HTMLElement

    const focusableElements = ref.current.querySelectorAll(
      FOCUSABLE_SELECTORS.join(',')
    ) as NodeListOf<HTMLElement>

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    if (focusableElements.length > 0) {
      focusableElements[0].focus()
      ref.current.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      ref.current?.removeEventListener('keydown', handleKeyDown)
      if (previousActiveElementRef.current && previousActiveElementRef.current.focus) {
        previousActiveElementRef.current.focus()
      }
    }
  }, [ref, isActive])
}
