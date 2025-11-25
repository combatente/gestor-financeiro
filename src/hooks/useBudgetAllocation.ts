import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

/** Modelo de alocação 50/30/20 (valores em percentagem) */
export type Allocation = {
  necessidadePct: number
  vontadePct: number
  poupancaPct: number
}

/** Valores por defeito (regra 50/30/20) */
export const DEFAULT_ALLOCATION: Allocation = {
  necessidadePct: 50,
  vontadePct: 30,
  poupancaPct: 20,
}

type HookReturn = {
  loading: boolean
  error: unknown | null
  value: Allocation
  setAndPersist: (next: Allocation) => void
  update: (partial: Partial<Allocation>) => void
  resetDefault: () => void
  pathId: string // YYYY-MM
  userId: string // uid resolvido
}

/** Garante limites [0..100], arredonda inteiros e soma total = 100. */
function normalizeAllocation(a: Allocation): Allocation {
  const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(Number(x || 0))))
  let n = clamp(a.necessidadePct)
  let v = clamp(a.vontadePct)
  let p = clamp(a.poupancaPct)

  let sum = n + v + p
  if (sum === 0) return { ...DEFAULT_ALLOCATION }

  if (sum !== 100) {
    // ajusta proporcionalmente
    const k = 100 / sum
    n = Math.round(n * k)
    v = Math.round(v * k)
    p = Math.round(p * k)

    // corrige dif. residual de arredondamento
    let diff = 100 - (n + v + p)
    const order = [
      { key: 'n', val: n },
      { key: 'v', val: v },
      { key: 'p', val: p },
    ].sort((a, b) => b.val - a.val)

    let i = 0
    while (diff !== 0 && i < 6) {
      if (diff > 0) {
        if (order[0].key === 'n') n++
        else if (order[0].key === 'v') v++
        else p++
        diff--
      } else {
        if (order[0].key === 'n' && n > 0) n--
        else if (order[0].key === 'v' && v > 0) v--
        else if (p > 0) p--
        diff++
      }
      i++
    }
  }

  return { necessidadePct: n, vontadePct: v, poupancaPct: p }
}

/** Merge + normalize para updates parciais */
function mergeAndNormalize(base: Allocation, partial: Partial<Allocation>): Allocation {
  return normalizeAllocation({ ...base, ...partial } as Allocation)
}

/**
 * Hook para gerir a alocação mensal 50/30/20 no Firestore.
 * Caminho: budgets/{uid}/allocations/{YYYY-MM}
 *
 * @param mesYYYYMM Formato 'YYYY-MM'
 * @param providedUserId Opcional; se não fornecido, usa 'public'
 */
export function useBudgetAllocation(mesYYYYMM: string, providedUserId?: string): HookReturn {
  const userId = providedUserId || 'public'
  const pathRef = useMemo(
    () => doc(db, 'budgets', userId, 'allocations', mesYYYYMM),
    [userId, mesYYYYMM]
  )

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<unknown | null>(null)
  const [value, setValue] = useState<Allocation>(DEFAULT_ALLOCATION)

  const saveTimer = useRef<number | undefined>(undefined)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current)
        saveTimer.current = undefined
      }
    }
  }, [])

  // Carregamento do documento (on mount / quando muda mês ou user)
  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const snap = await getDoc(pathRef)
        if (!active || !mounted.current) return
        if (snap.exists()) {
          const data = snap.data() as Partial<Allocation>
          setValue(
            normalizeAllocation({
              ...DEFAULT_ALLOCATION,
              ...data,
            } as Allocation)
          )
        } else {
          setValue({ ...DEFAULT_ALLOCATION })
        }
      } catch (e) {
        if (active) setError(e)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [pathRef])

  const persist = useCallback(
    async (next: Allocation) => {
      try {
        await setDoc(
          pathRef,
          {
            ...next,
            _meta: { updatedAt: serverTimestamp() },
          },
          { merge: true }
        )
      } catch (e) {
        setError(e)
      }
    },
    [pathRef]
  )

  /** Define e persiste (debounce 600ms) a alocação completa */
  const setAndPersist = useCallback(
    (next: Allocation) => {
      const normalized = normalizeAllocation(next)
      setValue(normalized)
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        if (mounted.current) persist(normalized)
      }, 600) as unknown as number
    },
    [persist]
  )

  /** Atualiza parcialmente (merge + normalize) e persiste (debounce) */
  const update = useCallback(
    (partial: Partial<Allocation>) => {
      setAndPersist(mergeAndNormalize(value, partial))
    },
    [setAndPersist, value]
  )

  /** Repõe o default 50/30/20 e persiste */
  const resetDefault = useCallback(() => {
    setAndPersist({ ...DEFAULT_ALLOCATION })
  }, [setAndPersist])

  return {
    loading,
    error,
    value,
    setAndPersist,
    update,
    resetDefault,
    pathId: mesYYYYMM,
    userId,
  }
}