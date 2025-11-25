// src/hooks/useTheme.ts
import { useEffect, useState } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState<'pastel-light'|'pastel-dark'>(() =>
    (localStorage.getItem('theme') as 'pastel-light'|'pastel-dark') || 'pastel-dark'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (theme === 'pastel-dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  return { theme, setTheme }
}