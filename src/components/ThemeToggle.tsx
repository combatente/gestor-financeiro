
// src/components/ThemeToggle.tsx
export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement
    const isLight = root.dataset.theme === 'light'
    const next = isLight ? 'dark' : 'light'

    if (next === 'light') {
      root.classList.remove('dark')
      root.classList.add('light')
    } else {
      root.classList.add('dark')
      root.classList.remove('light')
    }
    root.dataset.theme = next
    localStorage.setItem('theme', next)
  }

  return (
    <button onClick={toggle} className="border border-neutral-600 hover:border-neutral-400">
      Toggle theme
    </button>
  )
}
