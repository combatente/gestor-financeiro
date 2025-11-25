import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useBudgetAllocation } from '../hooks/useBudgetAllocation'

const COLORS = {
  necessidade: '#059669',
  vontade: '#F59E0B',
  poupanca: '#3B82F6',
}

type Props = {
  mes: string // 'YYYY-MM'
  userId?: string
  minSegmentPct?: number // ex.: 5
}

type Allocation = {
  necessidadePct: number
  vontadePct: number
  poupancaPct: number
}

export default function BudgetAllocationDragBar({
  mes,
  userId,
  minSegmentPct = 5,
}: Props) {
  const { loading, value, setAndPersist } = useBudgetAllocation(mes, userId)
  const [alloc, setAlloc] = useState<Allocation>(value)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef<'handle1' | 'handle2' | null>(null)

  useEffect(() => setAlloc(value), [value])

  // percentagens como limites cumulativos [0, a, b, 100]
  const a = alloc.necessidadePct
  const b = alloc.necessidadePct + alloc.vontadePct

  const segments = useMemo(() => ([
    { key: 'necessidadePct', label: 'Necessidade', color: COLORS.necessidade, value: alloc.necessidadePct },
    { key: 'vontadePct',     label: 'Vontade',     color: COLORS.vontade,     value: alloc.vontadePct },
    { key: 'poupancaPct',    label: 'Poupança',    color: COLORS.poupanca,    value: alloc.poupancaPct },
  ] as const), [alloc])

  const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)))

  const applyFromAB = (na: number, nb: number) => {
    // Respeita mínimos por segmento
    const min = minSegmentPct
    na = Math.max(min, Math.min(100 - 2 * min, na))
    nb = Math.max(na + min, Math.min(100 - min, nb))

    const n = na
    const v = nb - na
    const p = 100 - nb
    const next = { necessidadePct: n, vontadePct: v, poupancaPct: p }
    setAlloc(next)
    setAndPersist(next)
  }

  // Conversões posição-pixel -> %
  const pxToPct = (clientX: number) => {
    const el = containerRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const rel = clientX - rect.left
    const pct = (rel / rect.width) * 100
    return clamp(pct)
  }

  const startDrag = (handle: 'handle1' | 'handle2') => (e: React.MouseEvent | React.TouchEvent) => {
    draggingRef.current = handle
    // prevenir scroll em mobile
    if ('touches' in e) e.preventDefault()
    window.addEventListener('mousemove', onMove as any)
    window.addEventListener('touchmove', onMove as any, { passive: false })
    window.addEventListener('mouseup', endDrag)
    window.addEventListener('touchend', endDrag)
  }

  const onMove = (e: MouseEvent | TouchEvent) => {
    const handle = draggingRef.current
    if (!handle) return
    const clientX = 'touches' in e && e.touches[0] ? e.touches[0].clientX : (e as MouseEvent).clientX
    const pct = pxToPct(clientX)

    if (handle === 'handle1') {
      // mover a (limite entre necessidade e vontade) limitado pelo mínimo dos três
      const min = minSegmentPct
      const maxA = 100 - 2 * min // para sobrar min para V e min para P
      const newA = Math.max(min, Math.min(maxA, pct))
      // manter b >= newA + min (para V) e b <= 100 - min
      const newB = Math.max(newA + min, Math.min(b, 100 - min))
      applyFromAB(newA, newB)
    } else {
      // mover b (limite entre vontade e poupanca) limitado por a + min e 100 - min
      const min = minSegmentPct
      const newB = Math.max(a + min, Math.min(100 - min, pct))
      const newA = Math.min(a, newB - min) // garantir espaço para V
      applyFromAB(newA, newB)
    }
  }

  const endDrag = () => {
    draggingRef.current = null
    window.removeEventListener('mousemove', onMove as any)
    window.removeEventListener('touchmove', onMove as any)
    window.removeEventListener('mouseup', endDrag)
    window.removeEventListener('touchend', endDrag)
  }

  // Acessibilidade (teclado) nas divisórias
  const onKey = (which: 'handle1' | 'handle2') => (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 5 : 1
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const dir = e.key === 'ArrowLeft' ? -1 : 1
    if (which === 'handle1') {
      const newA = clamp(a + dir * step)
      const min = minSegmentPct
      const maxA = 100 - 2 * min
      const clampedA = Math.max(min, Math.min(maxA, newA))
      const clampedB = Math.max(clampedA + min, Math.min(b, 100 - min))
      applyFromAB(clampedA, clampedB)
    } else {
      const newB = clamp(b + dir * step)
      const min = minSegmentPct
      const clampedB = Math.max(a + min, Math.min(100 - min, newB))
      const clampedA = Math.min(a, clampedB - min)
      applyFromAB(clampedA, clampedB)
    }
  }

  const resetDefault = () => applyFromAB(50, 80) // 50/30/20

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Orçamento 50/30/20 (drag)</h3>
        <div className="flex items-center gap-2">
          <label className="text-sm text-neutral-400">Mês</label>
          <input type="month" value={mes} readOnly className="border rounded px-2 py-1 bg-transparent" />
        </div>
      </header>

      <div className="rounded border border-white/10 p-4 bg-white/5 dark:bg-black/20">
        {/* Barra com segmentos */}
        <div ref={containerRef} className="relative h-10 w-full select-none rounded overflow-hidden">
          {/* segmentos */}
          <div className="absolute left-0 top-0 h-full" style={{ width: `${a}%`, background: COLORS.necessidade }} />
          <div className="absolute top-0 h-full" style={{ left: `${a}%`, width: `${(b - a)}%`, background: COLORS.vontade }} />
          <div className="absolute right-0 top-0 h-full" style={{ width: `${100 - b}%`, background: COLORS.poupanca }} />

          {/* handle 1 */}
          <button
            type="button"
            aria-label="Ajustar divisão Necessidade/Vontade"
            onMouseDown={startDrag('handle1')}
            onTouchStart={startDrag('handle1')}
            onKeyDown={onKey('handle1')}
            className="absolute top-0 -translate-x-1/2 h-full w-2 cursor-col-resize focus:outline-none focus:ring-2 focus:ring-white/50"
            style={{ left: `${a}%`, background: 'linear-gradient(#fff,#fff) center/2px 100% no-repeat' }}
          />
          {/* handle 2 */}
          <button
            type="button"
            aria-label="Ajustar divisão Vontade/Poupança"
            onMouseDown={startDrag('handle2')}
            onTouchStart={startDrag('handle2')}
            onKeyDown={onKey('handle2')}
            className="absolute top-0 -translate-x-1/2 h-full w-2 cursor-col-resize focus:outline-none focus:ring-2 focus:ring-white/50"
            style={{ left: `${b}%`, background: 'linear-gradient(#fff,#fff) center/2px 100% no-repeat' }}
          />
        </div>

        {/* legenda / valores */}
        <div className="grid sm:grid-cols-3 gap-3 mt-3 text-sm">
          {segments.map(s => (
            <div key={s.key} className="rounded border border-white/10 p-3">
              <div className="flex items-center justify-between">
                <span style={{ color: s.color }}>{s.label}</span>
                <strong>{s.value}%</strong>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-3">
          <button onClick={resetDefault} className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">
            Repor 50/30/20
          </button>
          {loading && <span className="text-xs text-neutral-400">A guardar…</span>}
        </div>
      </div>
    </section>
  )
}