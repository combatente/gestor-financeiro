import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  setDoc,
  serverTimestamp,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore'
import { db, auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'

// --- Tipos ---
export type Transacao = {
  id?: string
  type: 'receita' | 'despesa' | 'divida' | 'poupanca'
  valor: number
  data: string // YYYY-MM-DD
  categoria?: string | null
  categoryId?: string | null
  descricao?: string | null
  [key: string]: any
}

export type Orcamento = {
  id?: string
  categoryId?: string | null
  periodo: string // YYYY-MM
  limite: number
  [k: string]: any
}

export type AddTransacaoInput = Omit<Transacao, 'id'>
export type AddOrcamentoInput = {
  categoryId: string
  periodo: string
  limite: number
}

// ---- Alocação orçamental mensal (50/30/20) ----
export type BudgetAllocation = {
  necessidadePct: number
  vontadePct: number
  poupancaPct: number
}

const DEFAULT_ALLOCATION: BudgetAllocation = {
  necessidadePct: 50,
  vontadePct: 30,
  poupancaPct: 20,
}

// --- Helpers ---
const isYYYYMM = (v: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v)

const isYYYYMMDD = (v: string) =>
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v)

const isEvent = (x: any) => x && typeof x === 'object' && typeof x.preventDefault === 'function'

type RangeOption = '1M' | '3M' | '6M' | '1A' | '2A'

function getMonthsFromRange(range: RangeOption): number {
  switch (range) {
    case '1M': return 1
    case '3M': return 3
    case '6M': return 6
    case '1A': return 12
    case '2A': return 24
    default:   return 6
  }
}

function getPeriodBounds(range: RangeOption) {
  const to = new Date()
  to.setHours(23, 59, 59, 999)
  const from = new Date(to)
  const months = getMonthsFromRange(range)
  // incluir mês atual
  from.setMonth(to.getMonth() - (months - 1))
  from.setDate(1)
  from.setHours(0, 0, 0, 0)
  return { from, to }
}

export function useFirestore() {
  const HOUSEHOLD_ID = 'minha-carteira'
  const basePath = `households/${HOUSEHOLD_ID}`

  const [uid, setUid] = useState<string | null>(null)
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [budgetAllocations, setBudgetAllocations] = useState<Record<string, BudgetAllocation>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const unsubRefs = useRef<Unsubscribe[]>([])

  // ---------- STOP ALL LISTENERS ----------
  const stopAll = useCallback(() => {
    unsubRefs.current.forEach((fn) => {
      try { fn() } catch {}
    })
    unsubRefs.current = []
  }, [])

  // ---------- AUTH LISTENER ----------
  useEffect(() => {
    const off = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null)
    })
    return () => off()
  }, [])

  // ---------- FIRESTORE SNAPSHOT LISTENERS ----------
  useEffect(() => {
    stopAll()

    if (!uid) {
      setTransacoes([])
      setOrcamentos([])
      setBudgetAllocations({})
      return
    }

    // transacoes (ordenadas por data asc)
    const unsubT = onSnapshot(
      query(collection(db, `${basePath}/transacoes`), orderBy('data', 'asc')),
      (snap) => {
        setTransacoes(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as Transacao[]
        )
      },
      (e) => {
        console.error('[onSnapshot transacoes]', e)
        setError((e as any)?.message ?? 'Erro a ler transações')
      }
    )

    // orcamentos (por categoria+periodo)
    const unsubO = onSnapshot(
      collection(db, `${basePath}/orcamentos`),
      (snap) => {
        setOrcamentos(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as Orcamento[]
        )
      },
      (e) => {
        console.error('[onSnapshot orcamentos]', e)
        setError((e as any)?.message ?? 'Erro a ler orçamentos')
      }
    )

    // allocations (por YYYY-MM) — 50/30/20
    const unsubA = onSnapshot(
      collection(db, `${basePath}/allocations`),
      (snap) => {
        const map: Record<string, BudgetAllocation> = {}
        snap.forEach((d) => {
          const id = d.id // esperado "YYYY-MM"
          const data = d.data() as Partial<BudgetAllocation>
          map[id] = {
            necessidadePct: Number.isFinite(data.necessidadePct) ? Number(data.necessidadePct) : DEFAULT_ALLOCATION.necessidadePct,
            vontadePct:     Number.isFinite(data.vontadePct)     ? Number(data.vontadePct)     : DEFAULT_ALLOCATION.vontadePct,
            poupancaPct:    Number.isFinite(data.poupancaPct)    ? Number(data.poupancaPct)    : DEFAULT_ALLOCATION.poupancaPct,
          }
        })
        setBudgetAllocations(map)
      },
      (e) => {
        console.error('[onSnapshot allocations]', e)
        setError((e as any)?.message ?? 'Erro a ler alocação orçamental')
      }
    )

    unsubRefs.current = [unsubT, unsubO, unsubA]
    return () => stopAll()
  }, [uid, basePath, stopAll])

  // ---------- TOTAIS + SALDO (memoizado) ----------
  const totais = useMemo(() => {
    const sum = (type: string) =>
      transacoes.filter((t) => t.type === type).reduce((s, t) => s + (Number(t.valor) || 0), 0)

    return {
      receitas:  sum('receita'),
      despesas:  sum('despesa'),
      dividas:   sum('divida'),
      poupancas: sum('poupanca'),
    }
  }, [transacoes])

  // saldo considera poupança como saída
  const saldo = useMemo(
    () => totais.receitas - totais.despesas - totais.dividas - totais.poupancas,
    [totais]
  )

  // ---------- GERAÇÃO DO GRÁFICO (dinâmica) ----------
  const dadosGraficoTempo = useCallback((range: RangeOption) => {
    const { from, to } = getPeriodBounds(range)

    // Pré-criar baldes por mês
    const mesesMap: Record<string, { receitas: number; despesas: number; poupancas: number }> = {}

    // Gera todas as chaves YYYY-MM no intervalo
    const months = getMonthsFromRange(range)
    for (let i = 0; i < months; i++) {
      const d = new Date(to.getFullYear(), to.getMonth() - i, 1)
      const key = d.toISOString().slice(0, 7)
      mesesMap[key] = { receitas: 0, despesas: 0, poupancas: 0 }
    }

    transacoes.forEach((t) => {
      const d = new Date(t.data)
      if (d < from || d > to) return
      const key = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 7)
      if (!mesesMap[key]) return

      const val = Number(t.valor) || 0
      if (t.type === 'receita')  mesesMap[key].receitas  += val
      if (t.type === 'despesa')  mesesMap[key].despesas  += val
      if (t.type === 'poupanca') mesesMap[key].poupancas += val
    })

    return Object.entries(mesesMap)
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([mes, v]) => ({
        mes: mes.slice(5),
        receitas: v.receitas,
        despesas: v.despesas,
        poupancas: v.poupancas,
      }))
  }, [transacoes])

  // ---------- Utilitário para o Dashboard: transações filtradas pelo range (cliente) ----------
  const getTransacoesInRange = useCallback((range: RangeOption) => {
    const { from, to } = getPeriodBounds(range)
    return transacoes.filter((t) => {
      const d = new Date(t.data)
      return d >= from && d <= to
    })
  }, [transacoes])

  // ---------- Helpers opcionais (server-side filtering) ----------
  const getTransacoesByMonth = useCallback(
    async (periodo: string): Promise<Transacao[]> => {
      if (!isYYYYMM(periodo)) throw new Error('Período inválido (YYYY-MM).')
      try {
        const [yy, mm] = periodo.split('-').map(Number)
        const from = new Date(yy, mm - 1, 1)
        const to   = new Date(yy, mm, 0)
        const fmt  = (d: Date) => d.toISOString().slice(0, 10)

        const q = query(
          collection(db, `${basePath}/transacoes`),
          where('data', '>=', fmt(from)),
          where('data', '<=', fmt(to)),
          orderBy('data', 'asc'),
        )
        const snap = await getDocs(q)
        return snap.docs.map(d => ({ id: d.id, ...(d.data() as DocumentData) })) as Transacao[]
      } catch (e: any) {
        console.error('[getTransacoesByMonth]', e)
        setError(e?.message ?? 'Erro a ler transações do mês.')
        return []
      }
    },
    [basePath]
  )

  const getTransacoesByBounds = useCallback(
    async (from: Date, to: Date): Promise<Transacao[]> => {
      try {
        const fmt = (d: Date) => d.toISOString().slice(0, 10)
        const q = query(
          collection(db, `${basePath}/transacoes`),
          where('data', '>=', fmt(from)),
          where('data', '<=', fmt(to)),
          orderBy('data', 'asc'),
        )
        const snap = await getDocs(q)
        return snap.docs.map(d => ({ id: d.id, ...(d.data() as DocumentData) })) as Transacao[]
      } catch (e: any) {
        console.error('[getTransacoesByBounds]', e)
        setError(e?.message ?? 'Erro a ler transações no intervalo.')
        return []
      }
    },
    [basePath]
  )

  // ---------- AÇÕES (todas memorizadas) ----------
  const adicionarTransacao = useCallback(
    async (t: AddTransacaoInput | any) => {
      setError(null)
      setSaving(true)

      try {
        if (isEvent(t)) return

        const type = String(t.type ?? t.tipo ?? '').toLowerCase().trim()
        const valorNum = Number(t.valor ?? t.amount)
        const dataStr =
          typeof (t.data ?? t.date) === 'string' && (t.data ?? t.date)
            ? String(t.data ?? t.date)
            : new Date().toISOString().slice(0, 10)

        const categoria  = t.categoria  ? String(t.categoria).trim() : undefined
        const categoryId = t.categoryId ? String(t.categoryId) : undefined
        const descricaoRaw = (t.descricao ?? t.description ?? '') as string
        const descricao    = descricaoRaw.trim().slice(0, 200) || undefined

        if (!['receita', 'despesa', 'divida', 'poupanca'].includes(type))
          throw new Error('Tipo inválido.')
        if (!Number.isFinite(valorNum)) throw new Error('Valor inválido.')
        if (!isYYYYMMDD(dataStr)) throw new Error('Data inválida.')

        await addDoc(collection(db, `${basePath}/transacoes`), {
          type,
          valor: valorNum,
          data: dataStr,
          categoria:  categoria  ?? null,
          categoryId: categoryId ?? null,
          descricao:  descricao  ?? null,
          createdAt: serverTimestamp(),
        })
      } catch (e: any) {
        console.error('[add transacao]', e)
        setError(e?.message ?? 'Erro ao adicionar transação.')
        throw e
      } finally {
        setSaving(false)
      }
    },
    [basePath]
  )

  const removerTransacao = useCallback(
    async (id: string) => {
      setError(null)
      setSaving(true)
      try {
        await deleteDoc(doc(db, `${basePath}/transacoes/${id}`))
      } catch (e: any) {
        console.error('[remove transacao]', e)
        setError(e?.message ?? 'Erro ao remover transação.')
        throw e
      } finally {
        setSaving(false)
      }
    },
    [basePath]
  )

  const adicionarOrcamento = useCallback(
    async (o: AddOrcamentoInput | any) => {
      setError(null)
      setSaving(true)
      try {
        const categoryId = String(o.categoryId ?? '')
        const periodo    = String(o.periodo ?? '')
        const limite     = Number(o.limite)

        if (!categoryId) throw new Error('Categoria obrigatória.')
        if (!isYYYYMM(periodo)) throw new Error('Período inválido.')
        if (!Number.isFinite(limite) || limite < 0) throw new Error('Limite inválido.')

        const key = `${categoryId}_${periodo}`

        await setDoc(
          doc(db, `${basePath}/orcamentos/${key}`),
          {
            categoryId,
            periodo,
            limite,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )
      } catch (e: any) {
        console.error('[add orcamento]', e)
        setError(e?.message ?? 'Erro ao adicionar orçamento.')
        throw e
      } finally {
        setSaving(false)
      }
    },
    [basePath]
  )

  const removerOrcamento = useCallback(
    async (categoryId: string, periodo: string) => {
      setError(null)
      setSaving(true)
      try {
        const key = `${categoryId}_${periodo}`
        await deleteDoc(doc(db, `${basePath}/orcamentos/${key}`))
      } catch (e: any) {
        console.error('[remove orcamento]', e)
        setError(e?.message ?? 'Erro ao remover orçamento.')
        throw e
      } finally {
        setSaving(false)
      }
    },
    [basePath]
  )

  // ---------- Ações: Alocação orçamental 50/30/20 ----------
  const getBudgetAllocation = useCallback(
    async (periodo: string): Promise<BudgetAllocation> => {
      if (!isYYYYMM(periodo)) throw new Error('Período inválido (YYYY-MM).')
      try {
        const ref  = doc(db, `${basePath}/allocations/${periodo}`)
        const snap = await getDoc(ref)
        if (!snap.exists()) return DEFAULT_ALLOCATION
        const d = snap.data() as Partial<BudgetAllocation>
        return {
          necessidadePct: Number.isFinite(d.necessidadePct) ? Number(d.necessidadePct) : DEFAULT_ALLOCATION.necessidadePct,
          vontadePct:     Number.isFinite(d.vontadePct)     ? Number(d.vontadePct)     : DEFAULT_ALLOCATION.vontadePct,
          poupancaPct:    Number.isFinite(d.poupancaPct)    ? Number(d.poupancaPct)    : DEFAULT_ALLOCATION.poupancaPct,
        }
      } catch (e: any) {
        console.error('[get allocation]', e)
        setError(e?.message ?? 'Erro a ler alocação.')
        return DEFAULT_ALLOCATION
      }
    },
    [basePath]
  )

  const setBudgetAllocation = useCallback(
    async (periodo: string, alloc: BudgetAllocation) => {
      setError(null)
      setSaving(true)
      try {
        if (!isYYYYMM(periodo)) throw new Error('Período inválido (YYYY-MM).')

        const total =
          Number(alloc.necessidadePct) + Number(alloc.vontadePct) + Number(alloc.poupancaPct)
        if (!Number.isFinite(total) || Math.round(total) !== 100) {
          throw new Error('A soma das percentagens tem de ser 100%.')
        }

        await setDoc(
          doc(db, `${basePath}/allocations/${periodo}`),
          {
            necessidadePct: Math.round(Number(alloc.necessidadePct)),
            vontadePct:     Math.round(Number(alloc.vontadePct)),
            poupancaPct:    Math.round(Number(alloc.poupancaPct)),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )
      } catch (e: any) {
        console.error('[set allocation]', e)
        setError(e?.message ?? 'Erro ao guardar alocação.')
        throw e
      } finally {
        setSaving(false)
      }
    },
    [basePath]
  )

  // ---------- RETORNO MEMOIZADO (ESSENCIAL) ----------
  const api = useMemo(
    () => ({
      transacoes,
      orcamentos,
      budgetAllocations,     // mapa YYYY-MM -> allocation
      totais,
      saldo,
      dadosGraficoTempo,     // (range) -> série para gráfico mensal
      getTransacoesInRange,  // (range) -> transações filtradas (cliente)
      // Helpers opcionais (server-side):
      getTransacoesByMonth,
      getTransacoesByBounds,

      adicionarTransacao,
      removerTransacao,
      adicionarOrcamento,
      removerOrcamento,
      getBudgetAllocation,   // leitura pontual
      setBudgetAllocation,   // escrita/merge
      stopAll,
      saving,
      error,
    }),
    [
      transacoes,
      orcamentos,
      budgetAllocations,
      totais,
      saldo,
      dadosGraficoTempo,
      getTransacoesInRange,
      getTransacoesByMonth,
      getTransacoesByBounds,
      adicionarTransacao,
      removerTransacao,
      adicionarOrcamento,
      removerOrcamento,
      getBudgetAllocation,
      setBudgetAllocation,
      stopAll,
      saving,
      error,
    ]
  )

  return api
}