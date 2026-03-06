import { useState } from 'react'

/**
 * useState that syncs to localStorage.
 * Mirrors the useState API: returns [value, setValue].
 */
export function useLocalStorage(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item !== null ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = (value) => {
    try {
      const toStore = value instanceof Function ? value(state) : value
      setState(toStore)
      window.localStorage.setItem(key, JSON.stringify(toStore))
    } catch {
      // Graceful degradation for private browsing / quota exceeded
      setState(value instanceof Function ? value(state) : value)
    }
  }

  return [state, setValue]
}
