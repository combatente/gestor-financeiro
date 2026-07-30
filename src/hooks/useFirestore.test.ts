// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type SnapshotCallback = (snap: { docs: Array<{ id: string; data: () => Record<string, unknown> }> }) => void

const snapshotCallbacks = new Map<string, SnapshotCallback>()
const authCallbacks: Array<(user: { uid: string } | null) => void> = []

const addDocMock = vi.fn(async (..._args: unknown[]) => ({ id: 'new-doc-id' }))
const deleteDocMock = vi.fn(async (..._args: unknown[]) => undefined)
const updateDocMock = vi.fn(async (..._args: unknown[]) => undefined)
const setDocMock = vi.fn(async (..._args: unknown[]) => undefined)
const getDocMock = vi.fn(async (..._args: unknown[]) => ({ exists: () => false }))
const getDocsMock = vi.fn(async (..._args: unknown[]) => ({ docs: [] as Array<{ id: string; data: () => Record<string, unknown> }> }))
const batchDeleteMock = vi.fn()
const batchCommitMock = vi.fn(async () => undefined)

vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, path: string) => ({ path }),
  query: (ref: { path: string }) => ref,
  orderBy: () => ({ __kind: 'orderBy' }),
  where: () => ({ __kind: 'where' }),
  doc: (_db: unknown, path: string) => ({ path }),
  onSnapshot: (ref: { path: string }, onNext: SnapshotCallback) => {
    snapshotCallbacks.set(ref.path, onNext)
    return () => snapshotCallbacks.delete(ref.path)
  },
  addDoc: (...args: unknown[]) => addDocMock(...args),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
  writeBatch: () => ({ delete: batchDeleteMock, commit: batchCommitMock }),
}))

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, cb: (user: { uid: string } | null) => void) => {
    authCallbacks.push(cb)
    return () => {
      const idx = authCallbacks.indexOf(cb)
      if (idx >= 0) authCallbacks.splice(idx, 1)
    }
  },
}))

vi.mock('../firebase', () => ({ db: {}, auth: {} }))

import { useFirestore } from './useFirestore'

const BASE = 'households/minha-carteira'

function emitAuth(user: { uid: string } | null) {
  act(() => {
    authCallbacks.forEach((cb) => cb(user))
  })
}

function emitSnapshot(path: string, docs: Array<{ id: string; data: Record<string, unknown> }>) {
  act(() => {
    const cb = snapshotCallbacks.get(path)
    if (!cb) throw new Error(`Nenhum listener registado para ${path}`)
    cb({ docs: docs.map((d) => ({ id: d.id, data: () => d.data })) })
  })
}

describe('useFirestore', () => {
  beforeEach(() => {
    snapshotCallbacks.clear()
    authCallbacks.length = 0
    addDocMock.mockClear()
    deleteDocMock.mockClear()
    updateDocMock.mockClear()
    setDocMock.mockClear()
    getDocMock.mockClear()
    getDocsMock.mockClear()
    batchDeleteMock.mockClear()
    batchCommitMock.mockClear()
  })

  it('calcula totais e saldo a partir das transações recebidas via onSnapshot', async () => {
    const { result } = renderHook(() => useFirestore())
    emitAuth({ uid: 'user-1' })
    await waitFor(() => expect(snapshotCallbacks.has(`${BASE}/transacoes`)).toBe(true))

    emitSnapshot(`${BASE}/transacoes`, [
      { id: 't1', data: { type: 'receita', valor: 1000, data: '2026-07-01' } },
      { id: 't2', data: { type: 'despesa', valor: 300, data: '2026-07-02' } },
      { id: 't3', data: { type: 'divida', valor: 100, data: '2026-07-03' } },
      { id: 't4', data: { type: 'poupanca', valor: 200, data: '2026-07-04' } },
    ])

    await waitFor(() => expect(result.current.totais.receitas).toBe(1000))
    expect(result.current.totais).toEqual({ receitas: 1000, despesas: 300, dividas: 100, poupancas: 200 })
    expect(result.current.saldo).toBe(400)
  })

  it('limpa os dados locais quando o utilizador termina sessão', async () => {
    const { result } = renderHook(() => useFirestore())
    emitAuth({ uid: 'user-1' })
    await waitFor(() => expect(snapshotCallbacks.has(`${BASE}/transacoes`)).toBe(true))

    emitSnapshot(`${BASE}/transacoes`, [{ id: 't1', data: { type: 'receita', valor: 100, data: '2026-07-01' } }])
    await waitFor(() => expect(result.current.transacoes).toHaveLength(1))

    emitAuth(null)

    await waitFor(() => expect(result.current.transacoes).toHaveLength(0))
  })

  describe('adicionarTransacao', () => {
    it('rejeita tipo inválido sem escrever no Firestore', async () => {
      const { result } = renderHook(() => useFirestore())

      await expect(
        result.current.adicionarTransacao({ type: 'invalido', valor: 10, data: '2026-07-01' })
      ).rejects.toThrow('Tipo inválido.')
      expect(addDocMock).not.toHaveBeenCalled()
    })

    it('rejeita valor não numérico', async () => {
      const { result } = renderHook(() => useFirestore())

      await expect(
        result.current.adicionarTransacao({ type: 'despesa', valor: 'abc', data: '2026-07-01' })
      ).rejects.toThrow('Valor inválido.')
      expect(addDocMock).not.toHaveBeenCalled()
    })

    it('rejeita data fora do formato AAAA-MM-DD', async () => {
      const { result } = renderHook(() => useFirestore())

      await expect(
        result.current.adicionarTransacao({ type: 'despesa', valor: 10, data: '2026/07/01' })
      ).rejects.toThrow('Data inválida.')
      expect(addDocMock).not.toHaveBeenCalled()
    })

    it('grava uma transação válida com os campos normalizados', async () => {
      const { result } = renderHook(() => useFirestore())

      await act(async () => {
        await result.current.adicionarTransacao({
          type: 'despesa',
          valor: 42.5,
          data: '2026-07-15',
          descricao: 'Teste',
        })
      })

      expect(addDocMock).toHaveBeenCalledTimes(1)
      const [, payload] = addDocMock.mock.calls[0]
      expect(payload).toMatchObject({ type: 'despesa', valor: 42.5, data: '2026-07-15', descricao: 'Teste' })
    })
  })

  describe('addDebt', () => {
    it('rejeita quando o saldo atual excede o montante original', async () => {
      const { result } = renderHook(() => useFirestore())

      await expect(
        result.current.addDebt({
          name: 'Cartão',
          targetAmount: 100,
          currentAmount: 200,
          interestRate: 0.05,
          minimumPayment: 10,
          dueDate: '2026-08-01',
          status: 'active',
        })
      ).rejects.toThrow(/inválidos ou incompletos/)
      expect(addDocMock).not.toHaveBeenCalled()
    })

    it('infere status "paid" quando o saldo atual é zero e nenhum status é enviado', async () => {
      const { result } = renderHook(() => useFirestore())

      await act(async () => {
        // status omitido de propósito para exercitar a inferência do hook
        await result.current.addDebt({
          name: 'Cartão',
          targetAmount: 500,
          currentAmount: 0,
          interestRate: 0.05,
          minimumPayment: 10,
          dueDate: '2026-08-01',
        } as unknown as Parameters<typeof result.current.addDebt>[0])
      })

      const [, payload] = addDocMock.mock.calls[0]
      expect(payload).toMatchObject({ status: 'paid' })
    })
  })

  describe('addGoal', () => {
    it('rejeita datas fora do formato AAAA-MM-DD', async () => {
      const { result } = renderHook(() => useFirestore())

      await expect(
        result.current.addGoal({
          name: 'Fundo de emergência',
          targetAmount: 1000,
          currentAmount: 0,
          startDate: '01-01-2026',
          targetDate: '2026-12-31',
          assetClass: 'CASH',
        })
      ).rejects.toThrow(/inválidos ou incompletos/)
      expect(addDocMock).not.toHaveBeenCalled()
    })

    it('grava uma meta válida', async () => {
      const { result } = renderHook(() => useFirestore())

      await act(async () => {
        await result.current.addGoal({
          name: 'Fundo de emergência',
          targetAmount: 1000,
          currentAmount: 100,
          startDate: '2026-01-01',
          targetDate: '2026-12-31',
          assetClass: 'CASH',
        })
      })

      expect(addDocMock).toHaveBeenCalledTimes(1)
      const [, payload] = addDocMock.mock.calls[0]
      expect(payload).toMatchObject({ name: 'Fundo de emergência', targetAmount: 1000, currentAmount: 100 })
    })
  })

  describe('addInvestment', () => {
    it('rejeita quantidade inválida', async () => {
      const { result } = renderHook(() => useFirestore())

      await expect(
        result.current.addInvestment({
          ticker: 'VWCE',
          name: 'Vanguard FTSE All-World',
          platform: 'XTB',
          assetType: 'ETF',
          currency: 'EUR',
          quantity: 0,
          avgCost: 95,
          currentPrice: 100,
          quoteUpdatedAt: '2026-07-01',
        })
      ).rejects.toThrow(/inválidos ou incompletos/)
      expect(addDocMock).not.toHaveBeenCalled()
    })

    it('grava uma posição válida com o ticker em maiúsculas', async () => {
      const { result } = renderHook(() => useFirestore())

      await act(async () => {
        await result.current.addInvestment({
          ticker: 'vwce',
          name: 'Vanguard FTSE All-World',
          platform: 'XTB',
          assetType: 'ETF',
          currency: 'EUR',
          quantity: 10,
          avgCost: 95,
          currentPrice: 100,
          quoteUpdatedAt: '2026-07-01',
        })
      })

      expect(addDocMock).toHaveBeenCalledTimes(1)
      const [, payload] = addDocMock.mock.calls[0]
      expect(payload).toMatchObject({ ticker: 'VWCE', platform: 'XTB', assetType: 'ETF', quantity: 10 })
    })
  })

  describe('dadosGraficoTempo', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('a etiqueta do último mês corresponde ao mês atual, mesmo em fusos com offset positivo', () => {
      // Fixa "agora" no dia 1 às 00:00 local, o caso que expõe o desfasamento de
      // toISOString() em fusos como Europe/Lisbon (UTC+1 no verão): a meia-noite
      // local do dia 1 corresponde ainda ao mês anterior em UTC.
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 6, 1, 0, 0, 0))

      const { result } = renderHook(() => useFirestore())
      const dados = result.current.dadosGraficoTempo('3M')

      expect(dados[dados.length - 1].mes).toBe('07')
    })
  })

  describe('addDividend', () => {
    it('rejeita datas fora do formato AAAA-MM-DD', async () => {
      const { result } = renderHook(() => useFirestore())

      await expect(
        result.current.addDividend({
          investmentId: 'inv-1',
          exDividendDate: '01-07-2026',
          paymentDate: '2026-07-15',
          amountPerShare: 0.5,
          totalAmount: 5,
          currency: 'EUR',
          status: 'recebido',
        })
      ).rejects.toThrow(/inválidos ou incompletos/)
      expect(addDocMock).not.toHaveBeenCalled()
    })

    it('grava um dividendo válido', async () => {
      const { result } = renderHook(() => useFirestore())

      await act(async () => {
        await result.current.addDividend({
          investmentId: 'inv-1',
          exDividendDate: '2026-07-01',
          paymentDate: '2026-07-15',
          amountPerShare: 0.5,
          totalAmount: 5,
          currency: 'EUR',
          status: 'recebido',
        })
      })

      expect(addDocMock).toHaveBeenCalledTimes(1)
      const [, payload] = addDocMock.mock.calls[0]
      expect(payload).toMatchObject({ investmentId: 'inv-1', totalAmount: 5, status: 'recebido' })
    })
  })
})
