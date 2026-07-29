// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getDocMock = vi.fn()
const setDocMock = vi.fn()

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
}))

vi.mock('../firebase', () => ({ db: {} }))

import { DEFAULT_ALLOCATION, useBudgetAllocation } from './useBudgetAllocation'

function mockExistingDoc(data: Record<string, number>) {
  getDocMock.mockResolvedValue({ exists: () => true, data: () => data })
}

function mockMissingDoc() {
  getDocMock.mockResolvedValue({ exists: () => false })
}

describe('useBudgetAllocation', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    getDocMock.mockReset()
    setDocMock.mockReset()
    setDocMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('usa a alocação por defeito quando não existe documento', async () => {
    mockMissingDoc()
    const { result } = renderHook(() => useBudgetAllocation('2026-07'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.value).toEqual(DEFAULT_ALLOCATION)
  })

  it('normaliza uma alocação existente cuja soma não é 100', async () => {
    mockExistingDoc({ necessidadePct: 40, vontadePct: 40, poupancaPct: 40 })
    const { result } = renderHook(() => useBudgetAllocation('2026-07'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    const { necessidadePct, vontadePct, poupancaPct } = result.current.value
    expect(necessidadePct + vontadePct + poupancaPct).toBe(100)
  })

  it('update mescla parcialmente, normaliza para soma 100 e persiste com debounce', async () => {
    mockMissingDoc()
    const { result } = renderHook(() => useBudgetAllocation('2026-07', 'user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.update({ necessidadePct: 70 })
    })

    // valor local atualiza de imediato...
    expect(
      result.current.value.necessidadePct +
        result.current.value.vontadePct +
        result.current.value.poupancaPct
    ).toBe(100)
    // ...mas a escrita no Firestore só acontece depois do debounce
    expect(setDocMock).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(600)
    })

    expect(setDocMock).toHaveBeenCalledTimes(1)
    expect(setDocMock.mock.calls[0][0]).toEqual({ path: 'budgets/user-1/allocations/2026-07' })
  })

  it('agrupa chamadas repetidas dentro da janela de debounce numa única escrita', async () => {
    mockMissingDoc()
    const { result } = renderHook(() => useBudgetAllocation('2026-07'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.setAndPersist({ necessidadePct: 60, vontadePct: 20, poupancaPct: 20 })
      result.current.setAndPersist({ necessidadePct: 55, vontadePct: 25, poupancaPct: 20 })
    })

    await act(async () => {
      vi.advanceTimersByTime(600)
    })

    expect(setDocMock).toHaveBeenCalledTimes(1)
  })

  it('resetDefault repõe a alocação 50/30/20', async () => {
    mockExistingDoc({ necessidadePct: 10, vontadePct: 10, poupancaPct: 80 })
    const { result } = renderHook(() => useBudgetAllocation('2026-07'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.resetDefault()
    })

    expect(result.current.value).toEqual(DEFAULT_ALLOCATION)
  })
})
