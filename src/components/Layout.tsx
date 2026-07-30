// src/components/Layout.tsx
import { type ReactNode, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useTheme } from '../hooks/useTheme'
import type { TabId, AuthUserLike } from '../types'
import { ResetAppModal } from './ResetAppModal'
import {
  LayoutDashboard, CreditCard, Upload, Target, Tag,
  PiggyBank, TrendingUp, FileBarChart, RefreshCw,
  Wallet, Calculator, CalendarDays, LogOut, Sun, Moon,
  Menu, X, ChevronRight, Landmark, LineChart, AlertTriangle
} from 'lucide-react'

type LayoutProps = {
  tab: TabId
  onTabChange: (id: TabId) => void
  user?: AuthUserLike | null
  children: ReactNode
}

type NavItem = {
  id: TabId
  label: string
  icon: typeof LayoutDashboard
  group?: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',    label: 'Dashboard',          icon: LayoutDashboard, group: 'principal' },
  { id: 'transactions', label: 'Transações',          icon: CreditCard,      group: 'principal' },
  { id: 'import',       label: 'Importar Extrato',    icon: Upload,          group: 'principal' },
  { id: 'budgets',      label: 'Orçamentos',          icon: Target,          group: 'gestao' },
  { id: 'categories',   label: 'Categorias',          icon: Tag,             group: 'gestao' },
  { id: 'savings',      label: 'Poupanças',           icon: PiggyBank,       group: 'gestao' },
  { id: 'investments',  label: 'Investimentos',       icon: LineChart,       group: 'gestao' },
  { id: 'debt',         label: 'Dívidas',             icon: Landmark,        group: 'gestao' },
  { id: 'accounts',     label: 'Contas',              icon: Wallet,          group: 'gestao' },
  { id: 'recurring',    label: 'Recorrentes',         icon: RefreshCw,       group: 'gestao' },
  { id: 'summary',      label: 'Resumo / KPIs',       icon: TrendingUp,      group: 'analise' },
  { id: 'reports',      label: 'Relatórios',          icon: FileBarChart,    group: 'analise' },
  { id: 'calendar',     label: 'Calendário',          icon: CalendarDays,    group: 'analise' },
  { id: 'calculators',  label: 'Calculadoras',        icon: Calculator,      group: 'analise' },
]

const GROUP_LABELS: Record<string, string> = {
  principal: 'Principal',
  gestao: 'Gestão',
  analise: 'Análise',
}

const PAGE_TITLES: Record<TabId, string> = {
  dashboard:    'Dashboard',
  transactions: 'Transações',
  import:       'Importar Extrato Bancário',
  budgets:      'Orçamentos',
  categories:   'Categorias',
  savings:      'Poupanças',
  investments:  'Investimentos',
  debt:         'Dívidas',
  accounts:     'Contas Bancárias',
  recurring:    'Transações Recorrentes',
  summary:      'Resumo Financeiro',
  reports:      'Relatórios',
  calendar:     'Calendário Financeiro',
  calculators:  'Calculadoras Financeiras',
}

export default function Layout({ tab, onTabChange, user, children }: LayoutProps) {
  const { theme, setTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  const groups = ['principal', 'gestao', 'analise']

  const handleNav = (id: TabId) => {
    onTabChange(id)
    setSidebarOpen(false)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[rgba(var(--border),var(--border-alpha))]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[rgba(var(--brand),0.15)] flex items-center justify-center">
            <span className="text-lg">💰</span>
          </div>
          <div>
            <div className="font-bold text-[rgb(var(--text))] text-sm leading-tight">Orçamento</div>
            <div className="text-[rgb(var(--text-muted))] text-xs">Familiar</div>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {groups.map((group) => {
          const items = NAV_ITEMS.filter(n => n.group === group)
          return (
            <div key={group} className="mb-2">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--text-muted))] opacity-60">
                {GROUP_LABELS[group]}
              </div>
              {items.map((item) => {
                const Icon = item.icon
                const isActive = tab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={16} className="nav-icon flex-shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {isActive && <ChevronRight size={12} className="opacity-50" />}
                  </button>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Rodapé da sidebar */}
      <div className="px-3 py-3 border-t border-[rgba(var(--border),var(--border-alpha))] space-y-1">
        <button
          onClick={() => setTheme(theme === 'pastel-dark' ? 'pastel-light' : 'pastel-dark')}
          className="nav-link"
        >
          {theme === 'pastel-dark'
            ? <><Sun size={16} className="nav-icon" /><span>Modo Claro</span></>
            : <><Moon size={16} className="nav-icon" /><span>Modo Escuro</span></>
          }
        </button>
        <button
          onClick={() => setResetOpen(true)}
          className="nav-link text-rose-400 hover:bg-rose-400/10"
        >
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span className="flex-1 text-left truncate">Repor Dados</span>
        </button>
        <button
          onClick={() => signOut(auth)}
          className="nav-link text-rose-400 hover:bg-rose-400/10"
          title={user?.email ?? undefined}
        >
          <LogOut size={16} className="flex-shrink-0" />
          <span className="flex-1 text-left truncate">{user?.email ? user.email.split('@')[0] : 'Sair'}</span>
        </button>
      </div>
    </div>
  )

  // Bottom nav items para mobile
  const bottomNavIds: TabId[] = ['dashboard', 'transactions', 'import', 'summary']
  const bottomNav: NavItem[] = bottomNavIds
    .map(id => NAV_ITEMS.find(n => n.id === id))
    .filter((n): n is NavItem => Boolean(n))

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'rgb(var(--bg))' }}>

      <AnimatePresence>
        {resetOpen && <ResetAppModal onClose={() => setResetOpen(false)} />}
      </AnimatePresence>

      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 border-r border-[rgba(var(--border),var(--border-alpha))]"
        style={{ background: 'rgb(var(--surface))' }}>
        <SidebarContent />
      </aside>

      {/* SIDEBAR MOBILE (overlay) */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              className="fixed left-0 top-0 bottom-0 w-72 z-50 md:hidden flex flex-col"
              style={{ background: 'rgb(var(--surface))' }}
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="flex items-center justify-end px-4 py-3 border-b border-[rgba(var(--border),var(--border-alpha))]">
                <button onClick={() => setSidebarOpen(false)} className="btn btn-ghost p-1.5">
                  <X size={20} />
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ÁREA PRINCIPAL */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* TOPBAR */}
        <header
          className="flex items-center gap-3 px-5 py-3.5 border-b border-[rgba(var(--border),var(--border-alpha))] flex-shrink-0"
          style={{ background: 'rgb(var(--surface))' }}
        >
          <button
            className="md:hidden btn btn-ghost p-1.5"
            onClick={() => setSidebarOpen(true)}
            aria-label="Menu"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-[rgb(var(--text))] truncate">
              {PAGE_TITLES[tab]}
            </h1>
          </div>

          {/* Tema e user no topo (apenas mobile) */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setTheme(theme === 'pastel-dark' ? 'pastel-light' : 'pastel-dark')}
              className="btn btn-ghost p-1.5"
            >
              {theme === 'pastel-dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          {/* Info do utilizador desktop */}
          <div className="hidden md:flex items-center gap-2 text-sm text-[rgb(var(--text-muted))]">
            <div className="w-7 h-7 rounded-full bg-[rgba(var(--brand),0.15)] flex items-center justify-center text-xs font-bold text-[rgb(var(--brand))]">
              {user?.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <span className="truncate max-w-[180px]">{user?.email ?? ''}</span>
          </div>
        </header>

        {/* CONTEÚDO */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="px-4 md:px-6 py-5 max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* BOTTOM NAVIGATION MOBILE */}
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden z-30 border-t border-[rgba(var(--border),var(--border-alpha))] flex"
        style={{ background: 'rgb(var(--surface))' }}
      >
        {bottomNav.map((item) => {
          const Icon = item.icon
          const isActive = tab === item.id
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold transition-colors ${
                isActive
                  ? 'text-[rgb(var(--brand))]'
                  : 'text-[rgb(var(--text-muted))]'
              }`}
            >
              <Icon size={20} />
              <span className="leading-none">{item.label.split(' ')[0]}</span>
            </button>
          )
        })}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold text-[rgb(var(--text-muted))]"
        >
          <Menu size={20} />
          <span>Mais</span>
        </button>
      </nav>
    </div>
  )
}
