// src/hooks/useCategories.ts
import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  addDoc,
  setDoc,
  deleteDoc,
  getDocs,
  limit,
  doc,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '../firebase'

export type CategoryType = 'receita' | 'despesa' | 'poupanca'

export type Category = {
  id?: string
  type: CategoryType
  name: string
  slug: string
  /** Mantemos suporte a parentId (dados antigos), mesmo que a UI atual não use parent */
  parentId?: string | null
  order?: number
  color?: string | null
  icon?: string | null
  active?: boolean
  /** Para despesas: 'necessidade' | 'vontade'; outros tipos = null */
  spendNature?: 'necessidade' | 'vontade' | null
  createdAt?: any
  updatedAt?: any
}

type TreeNode = Category & { children: TreeNode[] }

const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export function useCategories() {
  const [items, setItems] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 🔄 Listener à coleção "categories"
  useEffect(() => {
    setLoading(true)
    const q = query(
      collection(db, 'categories'),
      orderBy('type'),
      orderBy('order', 'asc')
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as Category[]
        setItems(rows)
        setLoading(false)
      },
      (e) => {
        console.error('[categories snapshot]', e)
        const msg =
          (e as any)?.code === 'permission-denied'
            ? 'Sem permissões para ler categorias. Verifica as Rules do Firestore.'
            : (e as any)?.message ?? 'Erro ao ler categorias.'
        setError(msg)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  // 🌳 Árvore por tipo (respeita parentId caso exista)
  const tree = useMemo(() => {
    const byType: Record<CategoryType, TreeNode[]> = { receita: [], despesa: [], poupanca: [] }

    ;(['receita', 'despesa', 'poupanca'] as CategoryType[]).forEach((t) => {
      const map = new Map<string, TreeNode>()
      items
        .filter((c) => c.type === t)
        .forEach((c) => {
          if (c.id) map.set(c.id, { ...c, children: [] })
        })

      const roots: TreeNode[] = []
      map.forEach((n) => {
        const p = n.parentId ?? null
        if (p && map.has(p)) map.get(p)!.children.push(n)
        else roots.push(n)
      })

      const sortTree = (arr: TreeNode[]) => {
        arr.sort(
          (a, b) =>
            (a.order ?? 0) - (b.order ?? 0) ||
            a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' })
        )
        arr.forEach((child) => sortTree(child.children))
      }

      sortTree(roots)
      byType[t] = roots
    })

    return byType
  }, [items])

  /**
   * ➕ Criar categoria
   * - Evita duplicados por (type + parentId + slug)
   * - Para 'despesa', aceita spendNature ('necessidade' | 'vontade'); default: 'necessidade'
   */
  async function addCategory(input: {
    type: CategoryType
    name: string
    parentId?: string | null
    color?: string
    icon?: string
    spendNature?: 'necessidade' | 'vontade' | 'poupanca'
  }) {
    const name = input.name.trim()
    if (!name) throw new Error('Nome da categoria é obrigatório.')

    const slug = slugify(name)
    const parentId = input.parentId || null

    // Duplicados na mesma hierarquia (ou raiz, se parentId=null)
    const dup = await getDocs(
      query(
        collection(db, 'categories'),
        where('type', '==', input.type),
        where('parentId', '==', parentId),
        where('slug', '==', slug),
        limit(1)
      )
    )
    if (!dup.empty) throw new Error('Já existe uma categoria com esse nome nesta hierarquia.')

    await addDoc(collection(db, 'categories'), {
      type: input.type,
      name,
      slug,
      parentId,
      order: 0,
      color: input.color ?? null,
      icon: input.icon ?? null,
      active: true,
      spendNature: input.type === 'despesa' ? input.spendNature ?? 'necessidade' : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  /**
   * ✏️ Atualizar categoria (inclui spendNature)
   */
  async function updateCategory(
    id: string,
    patch: Partial<
      Pick<Category, 'name' | 'color' | 'icon' | 'active' | 'order' | 'parentId' | 'spendNature'>
    >
  ) {
    const data: any = { ...patch, updatedAt: serverTimestamp() }
    if (patch.name) data.slug = slugify(patch.name)
    await setDoc(doc(db, 'categories', id), data, { merge: true })
  }

  /**
   * 🗑️ Remover categoria
   */
  async function deleteCategory(id: string) {
    await deleteDoc(doc(db, 'categories', id))
  }

  return { items, tree, loading, error, addCategory, updateCategory, deleteCategory }
}
