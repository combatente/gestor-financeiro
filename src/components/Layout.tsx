// src/components/Layout.tsx
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useTheme } from '../hooks/useTheme'
import type { TabId, AuthUserLike } from '../types'

type LayoutProps = {
  tab: TabId
  onTabChange: (id: TabId) => void
  user?: AuthUserLike | null
  children: ReactNode
}

export default function Layout({ tab, onTabChange, user, children }: LayoutProps) {
  const tabs: { id: TabId; label: string }[] = [
    { id: 'dashboard',    label: '📊 Dashboard' },
    { id: 'transactions', label: '📋 Transações' },
    { id: 'budgets',      label: '🎯 Orçamentos' },
    { id: 'categories',   label: '🏷️ Categorias' },
    { id: 'analytics',    label: '📈 Análises' },
  ]

  const { theme, setTheme } = useTheme()

  return (
    <div className="min-h-screen text-[rgb(var(--text))]">
      <header className="sticky top-0 z-40 border-b border-[rgb(var(--border))] backdrop-blur-xs bg-[rgba(var(--surface),.75)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="mr-2">💰</span> Orçamento Familiar
          </h1>

          <div className="flex items-center gap-2">
            <button
              className="btn btn-outline"
              onClick={() => setTheme(theme === 'pastel-dark' ? 'pastel-light' : 'pastel-dark')}
              title="Alternar tema"
            >
              {theme === 'pastel-dark' ? '☀️ Claro' : '🌙 Escuro'}
            </button>

            <button
              onClick={() => signOut(auth)}
              className="btn btn-outline"
              title={user?.email ?? undefined}
            >
              Sair {user?.email ? `(${user.email})` : ''}
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`navlink ${tab === t.id ? 'navlink-active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <motion.main
        key={tab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mx-auto max-w-6xl px-4 py-6"
      >
        {children}
      </motion.main>
    </div>
  )
}
