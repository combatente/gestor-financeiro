import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tag, Plus, Trash2, Power, RefreshCw } from 'lucide-react'
import { EmojiPicker } from './EmojiPicker'
import { ColorPicker } from './ColorPicker'
import { useCategories } from '../hooks/useCategories'
import type { CategoryType } from '../types/category'
import { Card } from './ui/Card'
import { EmptyState } from './ui/EmptyState'

const TYPES: { id: CategoryType; label: string }[] = [
  { id: 'despesa',  label: 'Despesas' },
  { id: 'receita',  label: 'Receitas' },
  { id: 'poupanca', label: 'Poupança' },
]

const NATURE = {
  necessidade: {
    label: 'Necessidade',
    bg: 'rgba(var(--pastel-green-bg),0.6)',
    color: 'rgb(var(--pastel-green-text))',
    activeBorder: 'rgba(var(--pastel-green-text),0.5)',
  },
  vontade: {
    label: 'Vontade',
    bg: 'rgba(var(--pastel-amber-bg),0.6)',
    color: 'rgb(var(--pastel-amber-text))',
    activeBorder: 'rgba(var(--pastel-amber-text),0.5)',
  },
}

export default function Categories() {
  const { tree, addCategory, updateCategory, deleteCategory, loading, error } = useCategories()

  const [active, setActive] = useState<CategoryType>('despesa')
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState('')

  // Form state
  const [name, setName]               = useState('')
  const [color, setColor]             = useState('')
  const [icon, setIcon]               = useState('')
  const [spendNature, setSpendNature] = useState<'necessidade' | 'vontade'>('necessidade')
  const [showEmoji, setShowEmoji]     = useState(false)
  const [showColor, setShowColor]     = useState(false)

  function resetForm() {
    setName(''); setColor(''); setIcon(''); setSpendNature('necessidade')
    setShowEmoji(false); setShowColor(false); setFormError('')
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setFormError('')
    try {
      await addCategory({
        type: active,
        name: name.trim(),
        color: color || undefined,
        icon: icon || undefined,
        spendNature: active === 'despesa' ? spendNature : undefined,
      })
      resetForm()
      setShowForm(false)
    } catch (err: any) {
      setFormError(err?.message ?? 'Erro ao adicionar categoria')
    }
  }

  const renderList = (nodes: typeof tree['despesa']) => {
    if (nodes.length === 0) {
      return (
        <EmptyState icon={Tag} title="Sem categorias"
          description="Clique em 'Nova Categoria' para adicionar a primeira." />
      )
    }
    return (
      <div className="space-y-2">
        {nodes.map(n => {
          const isActive = n.active ?? true
          const nat = n.type === 'despesa'
            ? NATURE[n.spendNature as 'necessidade' | 'vontade'] ?? null
            : null

          return (
            <motion.div key={n.id ?? `${n.type}_${n.slug}`}
              layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: isActive ? 1 : 0.4, y: 0 }}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[rgba(var(--border),var(--border-alpha))] bg-[rgba(var(--surface-2),0.35)] hover:bg-[rgba(var(--surface-2),0.65)] transition-colors"
            >
              {/* Left: dot + name + badge */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-black/20"
                  style={{ background: n.color || 'rgb(var(--text-muted))' }} />
                <span className="font-medium text-sm text-[rgb(var(--text))] truncate">
                  {n.icon ? `${n.icon} ` : ''}{n.name}
                </span>
                {nat && (
                  <span className="hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                    style={{ background: nat.bg, color: nat.color }}>
                    {nat.label}
                  </span>
                )}
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {n.type === 'despesa' && (
                  <button title={`Alternar para ${n.spendNature === 'vontade' ? 'Necessidade' : 'Vontade'}`}
                    onClick={() => updateCategory(n.id!, {
                      spendNature: n.spendNature === 'vontade' ? 'necessidade' : 'vontade',
                    })}
                    className="btn btn-sm btn-ghost">
                    <RefreshCw size={12} />
                  </button>
                )}
                <button title={isActive ? 'Desativar' : 'Ativar'}
                  onClick={() => updateCategory(n.id!, { active: !isActive })}
                  className="btn btn-sm btn-ghost">
                  <Power size={12} className={isActive ? 'text-emerald-400' : 'text-[rgb(var(--text-muted))]'} />
                </button>
                <button title="Remover categoria"
                  onClick={async () => {
                    if (!confirm(`Remover "${n.name}"?`)) return
                    try { await deleteCategory(n.id!) }
                    catch (e: any) { alert(e?.message ?? 'Não foi possível remover.') }
                  }}
                  className="btn btn-sm btn-danger">
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Children */}
              {n.children.length > 0 && (
                <div className="pl-6 border-l border-[rgba(var(--border),var(--border-alpha))] mt-2 space-y-2 col-span-full">
                  {renderList(n.children)}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--text))]">Categorias</h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-0.5">
            Organize e classifique as suas transações
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(v => !v) }}>
          <Plus size={16} />
          Nova Categoria
        </button>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-4">
                Nova categoria · {TYPES.find(t => t.id === active)?.label}
              </p>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="flex flex-wrap gap-3 items-end">
                  {/* Name */}
                  <div className="flex-1 min-w-[180px] space-y-1">
                    <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Nome *</label>
                    <input className="input" value={name}
                      onChange={e => setName(e.target.value)} placeholder="Ex: Alimentação" required />
                  </div>

                  {/* Nature toggle (despesa only) */}
                  {active === 'despesa' && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Natureza</label>
                      <div className="inline-flex rounded-xl overflow-hidden border border-[rgba(var(--border),var(--border-alpha))]">
                        {(['necessidade', 'vontade'] as const).map(n => (
                          <button key={n} type="button" onClick={() => setSpendNature(n)}
                            className="px-3 py-2 text-xs font-medium transition-colors"
                            style={spendNature === n
                              ? { background: NATURE[n].bg, color: NATURE[n].color }
                              : { color: 'rgb(var(--text-muted))' }}>
                            {NATURE[n].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Emoji picker */}
                  <div className="space-y-1 relative">
                    <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Ícone</label>
                    <button type="button"
                      onClick={() => { setShowEmoji(v => !v); setShowColor(false) }}
                      className="input !w-auto flex items-center gap-2 cursor-pointer">
                      {icon
                        ? <span className="text-lg leading-none">{icon}</span>
                        : <span className="text-[rgb(var(--text-muted))] text-xs">Selecionar</span>}
                    </button>
                    {showEmoji && (
                      <div className="absolute z-30 top-full mt-1">
                        <EmojiPicker value={icon}
                          onChange={e => { setIcon(e); setShowEmoji(false) }}
                          onClose={() => setShowEmoji(false)} />
                      </div>
                    )}
                  </div>

                  {/* Color picker */}
                  <div className="space-y-1 relative">
                    <label className="text-xs font-medium text-[rgb(var(--text-muted))]">Cor</label>
                    <button type="button"
                      onClick={() => { setShowColor(v => !v); setShowEmoji(false) }}
                      className="input !w-auto flex items-center gap-2 cursor-pointer">
                      <span className="w-4 h-4 rounded-full ring-1 ring-black/20 flex-shrink-0"
                        style={{ background: color || 'rgb(var(--text-muted))' }} />
                      <span className="text-xs text-[rgb(var(--text-muted))]">{color || 'Cor'}</span>
                    </button>
                    {showColor && (
                      <div className="absolute z-30 top-full mt-1">
                        <ColorPicker value={color}
                          onChange={c => { setColor(c); setShowColor(false) }}
                          onClose={() => setShowColor(false)} />
                      </div>
                    )}
                  </div>
                </div>

                {formError && (
                  <p className="text-xs px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(var(--pastel-red-bg),0.5)', color: 'rgb(var(--pastel-red-text))' }}>
                    {formError}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <button type="submit" className="btn btn-primary btn-sm" disabled={loading || !name.trim()}>
                    <Plus size={14} />
                    {loading ? 'A adicionar…' : 'Adicionar'}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm"
                    onClick={() => { resetForm(); setShowForm(false) }}>
                    Cancelar
                  </button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab navigation + count */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl overflow-hidden border border-[rgba(var(--border),var(--border-alpha))]">
          {TYPES.map(t => (
            <button key={t.id}
              onClick={() => { setActive(t.id); setSpendNature('necessidade') }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                active === t.id
                  ? 'bg-[rgba(var(--brand),0.15)] text-[rgb(var(--brand))]'
                  : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-[rgb(var(--text-muted))]">
          {tree[active]?.length ?? 0} {tree[active]?.length === 1 ? 'categoria' : 'categorias'}
        </span>
      </div>

      {error && (
        <p className="text-xs px-3 py-2 rounded-lg"
          style={{ background: 'rgba(var(--pastel-red-bg),0.5)', color: 'rgb(var(--pastel-red-text))' }}>
          {error}
        </p>
      )}

      {/* Category list */}
      <Card>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 rounded-xl bg-[rgba(var(--surface-2),0.5)] animate-pulse" />
            ))}
          </div>
        ) : renderList(tree[active])}
      </Card>

      {/* Legend for despesa */}
      {active === 'despesa' && (
        <div className="flex items-center gap-4 px-1">
          <span className="text-xs text-[rgb(var(--text-muted))]">Legenda:</span>
          {(['necessidade', 'vontade'] as const).map(n => (
            <span key={n} className="inline-flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full" style={{ background: NATURE[n].color }} />
              <span style={{ color: NATURE[n].color }}>{NATURE[n].label}</span>
            </span>
          ))}
          <span className="text-xs text-[rgb(var(--text-muted))] ml-2">
            · Usado na análise 50/30/20 do Dashboard
          </span>
        </div>
      )}
    </div>
  )
}
