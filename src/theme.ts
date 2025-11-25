
// src/theme.ts
export function initTheme() {
  try {
    const stored = localStorage.getItem('theme') as 'pastel-light'|'pastel-dark'|null
    const theme = stored || 'pastel-dark'
    document.documentElement.setAttribute('data-theme', theme)
    if (theme === 'pastel-dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  } catch {}
}