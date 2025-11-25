import { useMemo } from 'react'
// Para CSV não precisas de libs.
// Para Excel (XLSX), instala: npm i xlsx
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as XLSX from 'xlsx'

type Transacao = {
  id?: string
  type: 'receita' | 'despesa' | 'divida' | 'poupanca'
  valor: number | string
  data?: string // 'YYYY-MM-DD'
  categoria?: string | null
  descricao?: string | null
  categoryId?: string | null
  natureza?: 'necessidade' | 'vontade' | 'poupanca' | 'desconhecido'
  [k: string]: any
}

type Props = {
  transacoes: Transacao[]
  /** filtro opcional (ex.: mes 'YYYY-MM', tipo, categoria) */
  filter?: {
    mes?: string
    tipo?: Transacao['type'] | 'todas'
    categoria?: string | 'todas'
  }
  /** filename base sem extensão */
  filenameBase?: string
}

const fmtEUR = (n: number) =>
  Number(n || 0).toLocaleString('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  })

function normalizeRow(t: Transacao) {
  const valorNum = Number(t.valor) || 0
  const isDespesa = t.type === 'despesa'
  const valorSigned = isDespesa ? -Math.abs(valorNum) : Math.abs(valorNum)
  return {
    ID: t.id ?? '',
    Data: String(t.data ?? ''),
    Tipo: t.type,
    Categoria: String(t.categoria ?? ''),
    Descrição: String(t.descricao ?? ''),
    Natureza: t.natureza ?? '',
    Valor: valorSigned,
    ValorEUR: fmtEUR(valorSigned),
  }
}

function toCSV(rows: any[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: any) => {
    const s = String(v ?? '')
    // envolver em aspas se contém vírgula/aspas/quebra de linha
    if (/[",\n]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const lines = [headers.join(',')]
  for (const r of rows) {
    const line = headers.map((h) => escape(r[h])).join(',')
    lines.push(line)
  }
  return lines.join('\n')
}

export default function ExportTransactionsButtons({
  transacoes,
  filter,
  filenameBase = 'transacoes',
}: Props) {
  const filtered = useMemo(() => {
    let out = [...transacoes]
    if (filter?.mes) {
      const ym = filter.mes
      out = out.filter((t) => String(t.data ?? '').slice(0, 7) === ym)
    }
    if (filter?.tipo && filter.tipo !== 'todas') {
      out = out.filter((t) => t.type === filter.tipo)
    }
    if (filter?.categoria && filter.categoria !== 'todas') {
      out = out.filter((t) => String(t.categoria ?? '') === filter.categoria)
    }
    return out
  }, [transacoes, filter])

  const rows = useMemo(() => filtered.map(normalizeRow), [filtered])

  const downloadCSV = () => {
    const csv = toCSV(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const suffix =
      (filter?.mes ? `_${filter.mes}` : '') +
      (filter?.tipo && filter.tipo !== 'todas' ? `_${filter.tipo}` : '') +
      (filter?.categoria && filter.categoria !== 'todas' ? `_${filter.categoria}` : '')
    a.download = `${filenameBase}${suffix}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadXLSX = () => {
    // Cria sheet com os valores *numéricos* e a coluna ValorEUR como texto
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transacoes')
    const suffix =
      (filter?.mes ? `_${filter.mes}` : '') +
      (filter?.tipo && filter.tipo !== 'todas' ? `_${filter.tipo}` : '') +
      (filter?.categoria && filter.categoria !== 'todas' ? `_${filter.categoria}` : '')
    XLSX.writeFile(workbook, `${filenameBase}${suffix}.xlsx`)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={downloadCSV}
        className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm"
        title="Exportar lista em CSV"
      >
        Exportar CSV
      </button>
      <button
        type="button"
        onClick={downloadXLSX}
        className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-sm"
        title="Exportar lista em Excel (XLSX)"
      >
        Exportar Excel
      </button>
      <div className="text-xs text-neutral-400 self-center">
        {rows.length} registos
        {filter?.mes ? ` • ${filter.mes}` : ''}
        {filter?.tipo && filter.tipo !== 'todas' ? ` • ${filter.tipo}` : ''}
        {filter?.categoria && filter.categoria !== 'todas' ? ` • ${filter.categoria}` : ''}
      </div>
    </div>
  )
}