import React, { useMemo, useState } from 'react'
import { db } from '../firebase'
import { doc, getDoc, writeBatch } from 'firebase/firestore'
import { useBudgetAllocation } from '../hooks/useBudgetAllocation'

type Props = {
  mesOrigem: string   // 'YYYY-MM' que serve de base por defeito
  userId?: string
}

type Allocation = {
  necessidadePct: number
  vontadePct: number
  poupancaPct: number
}

const listMonths = (startYYYYMM: string, endYYYYMM: string) => {
  const out: string[] = []
  const [ys, ms] = startYYYYMM.split('-').map(Number)
  const [ye, me] = endYYYYMM.split('-').map(Number)
  const d = new Date(ys, (ms ?? 1) - 1, 1)
  const end = new Date(ye, (me ?? 1) - 1, 1)
  d.setHours(0,0,0,0)
  end.setHours(0,0,0,0)
  while (d <= end) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    out.push(`${y}-${m}`)
    d.setMonth(d.getMonth() + 1)
  }
  return out
}

export default function AllocationBulkApply({ mesOrigem, userId }: Props) {
  const { value: allocOrigem } = useBudgetAllocation(mesOrigem, userId)

  const [from, setFrom] = useState<string>(mesOrigem)
  const [to, setTo] = useState<string>(mesOrigem)
  const [onlyIfMissing, setOnlyIfMissing] = useState<boolean>(false)
  const [mode, setMode] = useState<'copy' | 'custom'>('copy')
  const [custom, setCustom] = useState<Allocation>(allocOrigem)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  React.useEffect(() => {
    setCustom(allocOrigem)
  }, [allocOrigem])

  const months = useMemo(() => listMonths(from, to), [from, to])

  const onChangeCustom = (k: keyof Allocation, v: number) => {
    v = Math.max(0, Math.min(100, Math.round(v)))
    const keys: (keyof Allocation)[] = ['necessidadePct','vontadePct','poupancaPct']
    const others = keys.filter(x => x !== k)
    const remainder = 100 - v
    const a = custom[others[0]]
    const b = custom[others[1]]
    const sum = a + b
    const na = sum === 0 ? Math.floor(remainder/2) : Math.round((a as number) / (sum as number) * remainder)
    const nb = remainder - na
    setCustom({ ...custom, [k]: v, [others[0]]: na as number, [others[1]]: nb as number })
  }

  const apply = async () => {
    try {
      setBusy(true); setMessage(null)

      const uid = userId || 'public'
      let batch = writeBatch(db)
      let writesInBatch = 0
      let totalWrites = 0

      const src = mode === 'copy' ? allocOrigem : custom

      for (const ym of months) {
        const ref = doc(db, 'budgets', uid, 'allocations', ym)
        if (onlyIfMissing) {
          const snap = await getDoc(ref)
          if (snap.exists()) continue
        }

        batch.set(ref, src, { merge: true })
        writesInBatch++
        totalWrites++

        // commit parcial para evitar limite de 500 writes por batch
        if (writesInBatch >= 450) {
          await batch.commit()
          batch = writeBatch(db)
          writesInBatch = 0
        }
      }

      if (writesInBatch > 0) {
        await batch.commit()
      }

      setMessage(`Alocação aplicada a ${totalWrites} registo(s).`)
    } catch (e: any) {
      console.error(e)
      setMessage('Falha ao aplicar alocação.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">Propagar alocação</h3>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded border border-white/10 p-3">
          <label className="block text-sm text-neutral-400 mb-1">De (mês)</label>
          <input type="month" value={from} onChange={(e)=>setFrom(e.target.value)} className="border rounded px-2 py-1 w-full bg-transparent" />
        </div>
        <div className="rounded border border-white/10 p-3">
          <label className="block text-sm text-neutral-400 mb-1">Até (mês)</label>
          <input type="month" value={to} onChange={(e)=>setTo(e.target.value)} className="border rounded px-2 py-1 w-full bg-transparent" />
        </div>
      </div>

      <div className="rounded border border-white/10 p-3 space-y-3">
        <div className="flex items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="radio" checked={mode==='copy'} onChange={()=>setMode('copy')} />
            Copiar do mês origem ({mesOrigem})
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" checked={mode==='custom'} onChange={()=>setMode('custom')} />
            Definir manualmente
          </label>
        </div>

        {mode === 'custom' && (
          <div className="grid sm:grid-cols-3 gap-3">
            {([
              {k:'necessidadePct', label:'Necessidade', color:'#059669'},
              {k:'vontadePct',     label:'Vontade',     color:'#F59E0B'},
              {k:'poupancaPct',    label:'Poupança',    color:'#3B82F6'},
            ] as const).map(it => (
              <div key={it.k} className="rounded border border-white/10 p-3">
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span style={{ color: it.color }}>{it.label}</span>
                  <strong>{custom[it.k as keyof Allocation]}%</strong>
                </div>
                <input
                  type="range" min={0} max={100} step={1}
                  value={custom[it.k as keyof Allocation] as number}
                  onChange={(e) => onChangeCustom(it.k as keyof Allocation, Number(e.target.value))}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        )}

        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyIfMissing} onChange={(e)=>setOnlyIfMissing(e.target.checked)} />
          Só criar onde ainda não existe
        </label>

        <div className="flex items-center gap-3">
          <button disabled={busy} onClick={apply} className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-50">
            {busy ? 'A aplicar…' : `Aplicar a ${months.length} mês(es)`}
          </button>
          {message && <span className="text-xs text-neutral-300">{message}</span>}
        </div>
      </div>
    </section>
  )
}
