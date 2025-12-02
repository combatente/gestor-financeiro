// src/components/Categories.tsx
import { useState } from 'react'
import { EmojiPicker } from './EmojiPicker'
import { ColorPicker } from './ColorPicker'
import { useCategories } from '../hooks/useCategories'
import type { CategoryType } from '../types/category'

// Função auxiliar para classes CSS da Natureza (centralizada)
// ✅ CORREÇÃO TS2345: Aceitar explicitamente 'null' no tipo
const getNatureClasses = (nature: string | null | undefined) => {
    if (nature === 'vontade') return 'border-amber-400 text-amber-300'
    if (nature === 'necessidade') return 'border-emerald-400 text-emerald-300'
    return 'border-white/10 text-neutral-400'
}


const types: { id: CategoryType; label: string }[] = [
  { id: 'receita', label: 'Receitas' },
  { id: 'despesa', label: 'Despesas' },
  { id: 'poupanca', label: 'Poupança' },
]

export default function Categories() {
  const {
    tree,
    addCategory,
    updateCategory,
    deleteCategory,
    loading,
    error,
  } = useCategories()

  const [active, setActive] = useState<CategoryType>('despesa')

  // Formulário
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>('')
  const [icon, setIcon] = useState<string>('')

  // Natureza (dropdown) agora é gerida para ser usada com toggle buttons
  const [spendNature, setSpendNature] = useState<'necessidade' | 'vontade' | ''>('necessidade') // Default

  // Popovers
  const [showEmoji, setShowEmoji] = useState(false)
  const [showColor, setShowColor] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    try {
      await addCategory({
        type: active,
        name: name.trim(),
        color: color || undefined,
        icon: icon || undefined,
        // Garante que o valor não é vazio para despesa
        spendNature: active === 'despesa' ? (spendNature || 'necessidade') : undefined,
      })
      // Reset
      setName('')
      setColor('')
      setIcon('')
      setSpendNature('necessidade') // Reset para o valor default
      setShowEmoji(false)
      setShowColor(false)
    } catch (err: any) {
      alert(err?.message ?? 'Erro ao adicionar categoria')
    }
  }

  // Render lista
  const renderList = (nodes: typeof tree['despesa']) => (
    <ul className="pl-0">
      {nodes.map((n) => (
        <li key={n.id ?? `${n.type}_${n.slug}`} className="py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: n.color || '#64748b' }}
              />
              <span className="font-medium">
                {n.icon ? `${n.icon} ` : ''}
                {n.name}
              </span>

              {/* Badge Natureza apenas para despesas (agora usa a função auxiliar) */}
              {n.type === 'despesa' && (
                <span
                  className={
                    'text-[10px] px-1.5 py-0.5 rounded border ' +
                    getNatureClasses(n.spendNature)
                  }
                >
                  {n.spendNature
                    ? n.spendNature === 'necessidade'
                      ? 'Necessidade'
                      : 'Vontade'
                    : '—'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => updateCategory(n.id!, { active: !(n.active ?? true) })}
                className="px-2 py-1 border rounded hover:bg-white/5 whitespace-nowrap"
              >
                {(n.active ?? true) ? 'Desativar' : 'Ativar'}
              </button>

              {/* Alternar natureza apenas para despesas */}
              {n.type === 'despesa' && (
                <button
                  onClick={() =>
                    updateCategory(n.id!, {
                      spendNature: n.spendNature === 'vontade' ? 'necessidade' : 'vontade',
                    })
                  }
                  className="px-2 py-1 border rounded hover:bg-white/5 whitespace-nowrap"
                >
                  {n.spendNature === 'vontade' ? '→ Necessidade' : '→ Vontade'}
                </button>
              )}

              <button
                onClick={async () => {
                  const ok = confirm(`Remover "${n.name}"?`)
                  if (!ok) return
                  try {
                    await deleteCategory(n.id!)
                  } catch (e: any) {
                    alert(e?.message ?? 'Não foi possível remover.')
                  }
                }}
                className="px-2 py-1 border rounded text-red-400 hover:bg-red-400/10 whitespace-nowrap"
              >
                Remover
              </button>
            </div>
          </div>

          {n.children.length > 0 && (
            <div className="pl-4 border-l border-white/10 mt-2">{renderList(n.children)}</div>
          )}
        </li>
      ))}
    </ul>
  )

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">🏷️ Categorias</h2>
        <nav className="flex gap-2">
          {types.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActive(t.id)
                setSpendNature('necessidade') // Reset ao mudar de tab
              }}
              className={`px-3 py-1 rounded border ${
                active === t.id ? 'border-blue-500 text-blue-400' : 'border-white/10 text-neutral-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Formulário */}
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 relative">
        {/* Nome */}
        <div className="flex flex-col">
          <label className="text-sm text-neutral-400">Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Alimentação"
            className="input"
            required
          />
        </div>

        {/* Natureza apenas para despesas (AGORA COM TOGGLE BUTTONS) */}
        {active === 'despesa' && (
          <div className="flex flex-col">
            <label className="text-sm text-neutral-400">Natureza</label>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => setSpendNature('necessidade')}
                    className={`px-3 py-1 rounded border text-sm ${
                        spendNature === 'necessidade' ? 'border-emerald-500 text-emerald-400' : 'border-white/10 text-neutral-300'
                    }`}
                >
                    Necessidade
                </button>
                <button
                    type="button"
                    onClick={() => setSpendNature('vontade')}
                    className={`px-3 py-1 rounded border text-sm ${
                        spendNature === 'vontade' ? 'border-amber-500 text-amber-400' : 'border-white/10 text-neutral-300'
                    }`}
                >
                    Vontade
                </button>
            </div>
            {/* 💡 Nota: Mantenho o nome da função handleAdd, mas o tipo de evento deve ser React.FormEvent */}
          </div>
        )}
        
        {/* Emoji */}
        <div className="flex flex-col relative">
          <label className="text-sm text-neutral-400">Ícone (emoji)</label>
          <button
            type="button"
            onClick={() => {
              setShowEmoji((s) => !s)
              setShowColor(false)
            }}
            className="border rounded px-2 py-1 bg-transparent w-24 text-left"
          >
            {icon ? <span className="text-lg">{icon}</span> : <span className="text-neutral-500 text-sm">Selecionar</span>}
          </button>
          {icon && (
            <button type="button" onClick={() => setIcon('')} className="mt-1 text-xs text-neutral-400 hover:text-neutral-200">
              Limpar
            </button>
          )}
          {showEmoji && (
            <div className="absolute z-20 mt-1">
              <EmojiPicker value={icon} onChange={(e) => setIcon(e)} onClose={() => setShowEmoji(false)} />
            </div>
          )}
        </div>

        {/* Cor */}
        <div className="flex flex-col relative">
          <label className="text-sm text-neutral-400">Cor</label>
          <button
            type="button"
            onClick={() => {
              setShowColor((s) => !s)
              setShowEmoji(false)
            }}
            className="border rounded px-2 py-1 bg-transparent w-28 flex items-center gap-2"
          >
            <span className="inline-block h-4 w-4 rounded ring-1 ring-black/20" style={{ background: color || 'transparent' }} />
            <span className={`text-sm ${color ? '' : 'text-neutral-500'}`}>{color || 'Selecionar'}</span>
          </button>
          {color && (
            <button type="button" onClick={() => setColor('')} className="mt-1 text-xs text-neutral-400 hover:text-neutral-200">
              Limpar
            </button>
          )}
          {showColor && (
            <div className="absolute z-20 mt-1">
              <ColorPicker value={color} onChange={(c) => setColor(c)} onClose={() => setShowColor(false)} />
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
          {loading ? 'A adicionar...' : 'Adicionar categoria'}
        </button>
      </form>

      {/* Estados */}
      {loading ? <p className="text-neutral-400">A carregar categorias…</p> : null}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Lista */}
      <div className="card p-3">{renderList(tree[active])}</div>
    </section>
  )
}