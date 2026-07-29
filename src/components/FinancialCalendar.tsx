import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFirestore } from '../hooks/useFirestore'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const eur = (v: number) => v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const WEEKDAYS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

export default function FinancialCalendar() {
  const { transacoes } = useFirestore()
  const now  = new Date()
  const [yr, setYr] = useState(now.getFullYear())
  const [mo, setMo] = useState(now.getMonth())
  const [selected, setSelected] = useState<string | null>(null)

  const prevMonth = () => { if (mo === 0) { setMo(11); setYr(y => y-1) } else setMo(m => m-1); setSelected(null) }
  const nextMonth = () => { if (mo === 11) { setMo(0); setYr(y => y+1) } else setMo(m => m+1); setSelected(null) }

  // Transações do mês agrupadas por dia
  const txByDay = useMemo(() => {
    const map = new Map<string, typeof transacoes>()
    transacoes.forEach(t => {
      const d = new Date(t.data)
      if (d.getFullYear() === yr && d.getMonth() === mo) {
        const key = t.data.slice(0, 10)
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(t)
      }
    })
    return map
  }, [transacoes, yr, mo])

  // Construir grelha do calendário
  const firstDay  = new Date(yr, mo, 1).getDay()
  const daysInMo  = new Date(yr, mo + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMo }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const dayKey = (d: number) => `${yr}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const today = new Date(); const isToday = (d: number) => d === today.getDate() && mo === today.getMonth() && yr === today.getFullYear()

  const selectedTx = selected ? (txByDay.get(selected) ?? []) : []
  const selectedSum = { r: 0, d: 0 }
  selectedTx.forEach(t => {
    if (t.type === 'receita') selectedSum.r += t.valor
    if (t.type === 'despesa') selectedSum.d += t.valor
  })

  // Resumo do mês
  const monthTotals = useMemo(() => {
    let r = 0, d = 0, p = 0
    txByDay.forEach(list => list.forEach(t => {
      if (t.type==='receita')  r += t.valor
      if (t.type==='despesa')  d += t.valor
      if (t.type==='poupanca') p += t.valor
    }))
    return { r, d, p }
  }, [txByDay])

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="btn btn-ghost p-1.5"><ChevronLeft size={20}/></button>
        <h2 className="text-lg font-bold text-[rgb(var(--text))]">{MONTHS_PT[mo]} {yr}</h2>
        <button onClick={nextMonth} className="btn btn-ghost p-1.5"><ChevronRight size={20}/></button>
      </div>

      {/* Resumo mensal */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Receitas',  value: monthTotals.r, color: 'text-emerald-400' },
          { label: 'Despesas',  value: monthTotals.d, color: 'text-rose-400' },
          { label: 'Poupanças', value: monthTotals.p, color: 'text-blue-400' },
        ].map(item => (
          <Card key={item.label} className="text-center py-3">
            <div className={`text-lg font-bold ${item.color}`}>{eur(item.value)}</div>
            <div className="text-xs text-[rgb(var(--text-muted))]">{item.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendário */}
        <div className="lg:col-span-2">
          <Card padding="none">
            {/* Dias da semana */}
            <div className="grid grid-cols-7 border-b border-[rgba(var(--border),var(--border-alpha))]">
              {WEEKDAYS.map(d => (
                <div key={d} className="py-2 text-center text-xs font-bold text-[rgb(var(--text-muted))] uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>
            {/* Células */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (day === null) return <div key={`e${i}`} className="h-14 border-b border-r border-[rgba(var(--border),var(--border-alpha))] last:border-r-0" />
                const key   = dayKey(day)
                const txs   = txByDay.get(key) ?? []
                const hasR  = txs.some(t => t.type === 'receita')
                const hasD  = txs.some(t => t.type === 'despesa')
                const hasSel = selected === key

                return (
                  <div key={key}
                    className={`h-14 border-b border-r border-[rgba(var(--border),var(--border-alpha))] last-of-type:border-r-0 p-1 cursor-pointer flex flex-col transition-colors ${
                      hasSel ? 'bg-[rgba(var(--brand),0.12)]' : 'hover:bg-[rgba(var(--surface-2),0.5)]'
                    }`}
                    onClick={() => setSelected(hasSel ? null : key)}
                  >
                    <div className={`text-xs font-semibold self-end ${isToday(day) ? 'w-5 h-5 rounded-full bg-[rgb(var(--brand))] text-white flex items-center justify-center text-[10px]' : 'text-[rgb(var(--text-muted))]'}`}>
                      {day}
                    </div>
                    <div className="flex gap-0.5 mt-auto">
                      {hasR && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                      {hasD && <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
                      {txs.length > 2 && <div className="text-[8px] text-[rgb(var(--text-muted))] leading-none">{txs.length}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Detalhe do dia */}
        <div>
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div key={selected} initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }}>
                <Card>
                  <div className="font-bold text-[rgb(var(--text))] mb-1">{selected}</div>
                  <div className="flex gap-3 mb-4 text-xs">
                    <span className="text-emerald-400 font-semibold">+{eur(selectedSum.r)}</span>
                    <span className="text-rose-400 font-semibold">−{eur(selectedSum.d)}</span>
                  </div>
                  {selectedTx.length === 0 ? (
                    <p className="text-sm text-[rgb(var(--text-muted))]">Sem transações neste dia.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedTx.map(tx => (
                        <div key={tx.id} className="flex items-center gap-2 py-1.5 border-b border-[rgba(var(--border),var(--border-alpha))] last:border-0">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-[rgb(var(--text))] truncate">{tx.descricao || tx.categoria || '—'}</div>
                            <Badge variant={tx.type==='receita'?'green':tx.type==='poupanca'?'blue':'red'} className="mt-0.5">
                              {tx.type==='receita'?'Receita':tx.type==='poupanca'?'Poupança':'Despesa'}
                            </Badge>
                          </div>
                          <div className={`text-sm font-bold ${tx.type==='receita'?'text-emerald-400':tx.type==='poupanca'?'text-blue-400':'text-rose-400'}`}>
                            {tx.type==='receita'?'+':'−'}{eur(tx.valor)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity:0 }} animate={{ opacity:1 }}>
                <Card className="text-center py-10">
                  <div className="text-3xl mb-2">📅</div>
                  <p className="text-sm text-[rgb(var(--text-muted))]">Clique num dia para ver as transações</p>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
