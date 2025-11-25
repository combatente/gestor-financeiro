// src/components/CategorySelect.tsx
import { useMemo } from 'react'
import { useCategories } from '../hooks/useCategories'
import type { CategoryType } from '../types/category'

export type CategorySelectProps = {
  /** Tipo de categoria a listar */
  type: CategoryType
  /** categoryId atualmente selecionado (ou vazio) */
  value?: string
  /** devolve o categoryId selecionado ('' quando limpar) */
  onChange: (id: string) => void
  /** texto do placeholder (opcional) */
  placeholder?: string
  /** permite a opção “limpar” (valor vazio) */
  allowClear?: boolean
  /** desativa o seletor */
  disabled?: boolean
  /** classes adicionais */
  className?: string
}

/**
 * Seletor hierárquico de categorias por tipo (receita/despesa/poupanca).
 * Usa a árvore do hook `useCategories` e devolve o `categoryId`.
 */
export default function CategorySelect({
  type,
  value = '',
  onChange,
  placeholder = 'Seleciona categoria',
  allowClear = true,
  disabled = false,
  className = '',
}: CategorySelectProps) {
  const { tree, loading, error } = useCategories()

  // Achata a árvore por tipo para opções com indentação
  const options = useMemo(() => {
    type Node = { id?: string; name: string; icon?: string | null; children?: Node[] }
    type Opt = { id: string; label: string; depth: number }

    const nodes: Node[] = (tree[type] as Node[]) ?? []
    const out: Opt[] = []

    const walk = (arr: Node[], depth: number) => {
      for (const n of arr) {
        if (!n?.id) continue
        const indent = depth > 0 ? '— '.repeat(depth) : ''
        const icon = n.icon ? `${n.icon} ` : ''
        out.push({ id: n.id, label: `${indent}${icon}${n.name}`, depth })
        if (n.children?.length) walk(n.children as Node[], depth + 1)
      }
    }

    walk(nodes, 0)
    return out
  }, [tree, type])

  const mergedClass =
    'border rounded px-2 py-1 bg-transparent min-w-56 ' + (className || '')

  return (
    <div className="inline-flex flex-col gap-1">
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading || !!error}
        className={mergedClass}
        aria-label={`Selecionar categoria (${type})`}
      >
        {allowClear && <option value="">{placeholder}</option>}

        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>

      {loading && (
        <span className="text-xs text-neutral-400">A carregar categorias…</span>
      )}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}