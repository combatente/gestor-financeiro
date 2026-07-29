import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useFirestore } from '../hooks/useFirestore'
import { useCategories } from '../hooks/useCategories'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { FileSpreadsheet, FileText, Download, Calendar, Filter } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const eur = (v: number) => (Number.isFinite(v) ? v : 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })

function nowMonth() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`
}

export default function Reports() {
  const { transacoes } = useFirestore()
  const { items: categories } = useCategories()
  const [month, setMonth] = useState(nowMonth())
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [loading, setLoading] = useState<string | null>(null)

  const catNameMap = new Map(categories.map((c: any) => [c.id, c.name ?? '']))

  const txOf = (from: Date, to: Date) =>
    transacoes.filter(t => {
      const d = new Date(t.data)
      return d >= from && d <= to
    })

  const totais = (list: any[]) => ({
    receitas: list.filter(t => t.type === 'receita').reduce((s, t) => s + t.valor, 0),
    despesas: list.filter(t => t.type === 'despesa').reduce((s, t) => s + t.valor, 0),
    poupancas: list.filter(t => t.type === 'poupanca').reduce((s, t) => s + t.valor, 0),
  })

  const monthList = (list: any[]) => list.map(t => ({
    Data: t.data,
    Descrição: t.descricao || '—',
    Tipo: { receita: 'Receita', despesa: 'Despesa', poupanca: 'Poupança', divida: 'Dívida', transferencia: 'Transferência' }[t.type as string] || t.type,
    Categoria: catNameMap.get(t.categoryId ?? '') || t.categoria || '—',
    Valor: t.valor,
  }))

  const exportMonthExcel = async () => {
    setLoading('month-excel')
    const [y, m] = month.split('-').map(Number)
    const from = new Date(y, m-1, 1)
    const to   = new Date(y, m,   0, 23, 59, 59)
    const list  = txOf(from, to)
    const rows  = monthList(list)
    const tt    = totais(list)

    const ws = XLSX.utils.json_to_sheet(rows.map(r => ({
      ...r,
      Valor: Number(r.Valor).toLocaleString('pt-PT', { minimumFractionDigits: 2 })
    })))
    ws['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 14 }, { wch: 20 }, { wch: 14 }]

    const summaryWS = XLSX.utils.aoa_to_sheet([
      ['Resumo do Mês', month],
      [],
      ['Receitas',  eur(tt.receitas)],
      ['Despesas',  eur(tt.despesas)],
      ['Poupanças', eur(tt.poupancas)],
      ['Saldo',     eur(tt.receitas - tt.despesas - tt.poupancas)],
    ])

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transações')
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Resumo')
    XLSX.writeFile(wb, `extrato-${month}.xlsx`)
    toast.success('Excel exportado!')
    setLoading(null)
  }

  const exportMonthPDF = async () => {
    setLoading('month-pdf')
    const [y, m] = month.split('-').map(Number)
    const from = new Date(y, m-1, 1)
    const to   = new Date(y, m,   0, 23, 59, 59)
    const list  = txOf(from, to)
    const tt    = totais(list)
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.setTextColor(50, 50, 120)
    doc.text('Orçamento Familiar', 14, 20)
    doc.setFontSize(12)
    doc.setTextColor(80, 80, 80)
    doc.text(`Relatório Mensal — ${months[m-1]} ${y}`, 14, 30)
    doc.setDrawColor(200, 200, 220)
    doc.line(14, 34, 196, 34)

    // Resumo
    doc.setFontSize(11)
    doc.setTextColor(50, 50, 50)
    doc.text('Resumo', 14, 44)
    autoTable(doc, {
      startY: 48,
      head: [['Indicador', 'Valor']],
      body: [
        ['Receitas',  eur(tt.receitas)],
        ['Despesas',  eur(tt.despesas)],
        ['Poupanças', eur(tt.poupancas)],
        ['Saldo',     eur(tt.receitas - tt.despesas - tt.poupancas)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [100, 110, 220] },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })

    // Transações
    const finalY = (doc as any).lastAutoTable?.finalY ?? 90
    doc.text('Transações', 14, finalY + 12)
    autoTable(doc, {
      startY: finalY + 16,
      head: [['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor']],
      body: list.map(t => [
        t.data,
        (t.descricao || '—').slice(0, 40),
        { receita:'Receita', despesa:'Despesa', poupanca:'Poupança', divida:'Dívida', transferencia:'Transf.' }[t.type as string] || t.type,
        (catNameMap.get(t.categoryId ?? '') || t.categoria || '—').slice(0, 20),
        eur(t.valor),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [100, 110, 220] },
      columnStyles: { 4: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })

    doc.save(`relatorio-${month}.pdf`)
    toast.success('PDF exportado!')
    setLoading(null)
  }

  const exportYearExcel = async () => {
    setLoading('year-excel')
    const y = parseInt(year)
    const from = new Date(y, 0, 1)
    const to   = new Date(y, 11, 31, 23, 59, 59)
    const list  = txOf(from, to)

    // Resumo por mês
    const byMonth: Record<string, { r: number; d: number; p: number }> = {}
    for (let m = 1; m <= 12; m++) {
      const k = `${y}-${String(m).padStart(2,'0')}`
      byMonth[k] = { r: 0, d: 0, p: 0 }
    }
    list.forEach(t => {
      const mk = t.data.slice(0, 7)
      if (byMonth[mk]) {
        if (t.type === 'receita')  byMonth[mk].r += t.valor
        if (t.type === 'despesa')  byMonth[mk].d += t.valor
        if (t.type === 'poupanca') byMonth[mk].p += t.valor
      }
    })

    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    const summaryRows = Object.entries(byMonth).map(([, v], i) => ({
      Mês: meses[i],
      Receitas:  Number(v.r.toFixed(2)),
      Despesas:  Number(v.d.toFixed(2)),
      Poupanças: Number(v.p.toFixed(2)),
      Saldo:     Number((v.r - v.d - v.p).toFixed(2)),
    }))

    const txRows = list.map(t => ({
      Data:       t.data,
      Descrição:  t.descricao || '—',
      Tipo:       t.type,
      Categoria:  catNameMap.get(t.categoryId ?? '') || t.categoria || '—',
      Valor:      Number(t.valor),
    }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Resumo Anual')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows), 'Transações')
    XLSX.writeFile(wb, `relatorio-anual-${year}.xlsx`)
    toast.success('Excel anual exportado!')
    setLoading(null)
  }

  const reportCards = [
    {
      id: 'month-excel',
      title: 'Extrato Mensal',
      desc: 'Todas as transações do mês em Excel, com resumo de totais.',
      icon: FileSpreadsheet,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      control: (
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="input text-sm py-1.5 w-auto" />
      ),
      actions: [
        { label: 'Excel', icon: Download, fn: exportMonthExcel, id: 'month-excel' },
        { label: 'PDF',   icon: FileText, fn: exportMonthPDF,   id: 'month-pdf' },
      ],
    },
    {
      id: 'year-excel',
      title: 'Relatório Anual',
      desc: 'Comparação mensal de receitas, despesas e poupanças durante o ano.',
      icon: Calendar,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
      control: (
        <input type="number" value={year} min="2020" max="2099"
          onChange={e => setYear(e.target.value)}
          className="input text-sm py-1.5 w-24" />
      ),
      actions: [
        { label: 'Excel', icon: Download, fn: exportYearExcel, id: 'year-excel' },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div className="text-sm text-[rgb(var(--text-muted))]">
        Exporte os seus dados financeiros em Excel ou PDF para análise offline, contabilidade ou arquivo.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reportCards.map((rc, idx) => {
          const Icon = rc.icon
          return (
            <motion.div key={rc.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
              <Card className="h-full flex flex-col gap-5">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl ${rc.bg}`}>
                    <Icon size={20} className={rc.color} />
                  </div>
                  <div>
                    <div className="font-bold text-[rgb(var(--text))]">{rc.title}</div>
                    <div className="text-sm text-[rgb(var(--text-muted))] mt-0.5">{rc.desc}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-[rgb(var(--text-muted))]" />
                  <span className="text-xs text-[rgb(var(--text-muted))] font-medium">Período:</span>
                  {rc.control}
                </div>

                <div className="flex gap-2 mt-auto">
                  {rc.actions.map(action => {
                    const ActIcon = action.icon
                    return (
                      <Button key={action.id} variant="primary" icon={ActIcon}
                        loading={loading === action.id}
                        onClick={action.fn}
                      >
                        {action.label}
                      </Button>
                    )
                  })}
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Card>
        <div className="section-header">
          <div className="section-title">Resumo de dados</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total de transações', value: transacoes.length },
            { label: 'Receitas totais', value: eur(transacoes.filter(t => t.type==='receita').reduce((s,t) => s+t.valor, 0)) },
            { label: 'Despesas totais', value: eur(transacoes.filter(t => t.type==='despesa').reduce((s,t) => s+t.valor, 0)) },
            { label: 'Categorias ativas', value: categories.length },
          ].map(item => (
            <div key={item.label} className="text-center p-4 rounded-xl bg-[rgba(var(--surface-2),0.5)]">
              <div className="text-xl font-bold text-[rgb(var(--text))]">{item.value}</div>
              <div className="text-xs text-[rgb(var(--text-muted))] mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
