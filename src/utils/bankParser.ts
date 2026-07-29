import * as XLSX from 'xlsx'
import { autoDetectCategory, detectTransactionType } from './autoCategories'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

export type ParsedTransaction = {
  data: string         // YYYY-MM-DD
  descricao: string
  valor: number
  type: 'receita' | 'despesa'
  suggestedCategory: string | null
  isDuplicate?: boolean
  selected: boolean
  pessoa?: string
}

export type ColumnMapping = {
  dateCol: string
  descCol: string
  amountCol: string
  debitCol?: string
  creditCol?: string
  mode: 'single' | 'debit_credit'
}

export type ParseResult = {
  transactions: ParsedTransaction[]
  headers: string[]
  totalRows: number
  errors: string[]
}

// ─── Date parsing ──────────────────────────────────────────────────────────────

function parseDate(raw: string | number): string | null {
  if (!raw) return null

  // Excel serial date
  if (typeof raw === 'number') {
    const d = XLSX.SSF.parse_date_code(raw)
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
    return null
  }

  const str = String(raw).trim()

  const ptFmt = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (ptFmt) return `${ptFmt[3]}-${ptFmt[2].padStart(2,'0')}-${ptFmt[1].padStart(2,'0')}`

  const isoFmt = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
  if (isoFmt) return `${isoFmt[1]}-${isoFmt[2].padStart(2,'0')}-${isoFmt[3].padStart(2,'0')}`

  const dotFmt = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (dotFmt) return `${dotFmt[3]}-${dotFmt[2].padStart(2,'0')}-${dotFmt[1].padStart(2,'0')}`

  return null
}

function parseAmount(raw: string | number): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw === 'number') return raw
  const str = String(raw).trim().replace(/\s/g,'').replace('€','').replace('EUR','')
  const ptNum = str.replace(/\.(?=\d{3})/g,'').replace(',','.')
  const n = parseFloat(ptNum)
  return isNaN(n) ? null : n
}

// ─── Excel/CSV parser ─────────────────────────────────────────────────────────

export function readExcelHeaders(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary', cellDates: false })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        resolve(rows[0]?.map(String) ?? [])
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsBinaryString(file)
  })
}

export function parseExcelFile(
  file: File,
  mapping: ColumnMapping,
  existingTx: { data: string; valor: number; descricao?: string | null }[] = []
): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const errors: string[] = []
      const transactions: ParsedTransaction[] = []

      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary', cellDates: false })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
        const totalRows = rows.length

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]
          const rawDate = row[mapping.dateCol]
          const date = parseDate(rawDate as string | number)
          if (!date) { errors.push(`Linha ${i+2}: data inválida "${rawDate}"`); continue }

          const desc = String(row[mapping.descCol] ?? '').trim()

          let amount: number
          if (mapping.mode === 'debit_credit') {
            const debit  = parseAmount(row[mapping.debitCol  ?? ''] as string | number) ?? 0
            const credit = parseAmount(row[mapping.creditCol ?? ''] as string | number) ?? 0
            amount = credit - debit
          } else {
            const parsed = parseAmount(row[mapping.amountCol] as string | number)
            if (parsed === null) { errors.push(`Linha ${i+2}: valor inválido "${row[mapping.amountCol]}"`); continue }
            amount = parsed
          }

          const absAmount = Math.abs(amount)
          const txType = amount > 0 ? 'receita' as const
            : amount < 0 ? 'despesa' as const
            : detectTransactionType(desc, amount)

          const rule = autoDetectCategory(desc)

          const isDuplicate = existingTx.some(t =>
            t.data === date && Math.abs(t.valor - absAmount) < 0.01 &&
            (t.descricao ?? '').toLowerCase() === desc.toLowerCase()
          )

          transactions.push({
            data: date, descricao: desc, valor: absAmount, type: txType,
            suggestedCategory: rule?.category ?? null, isDuplicate, selected: !isDuplicate,
          })
        }

        resolve({ transactions, headers: Object.keys(rows[0] ?? {}), totalRows, errors })
      } catch (err) {
        errors.push(`Erro a ler o ficheiro: ${String(err)}`)
        resolve({ transactions: [], headers: [], totalRows: 0, errors })
      }
    }
    reader.readAsBinaryString(file)
  })
}

export function autoDetectColumns(headers: string[]): Partial<ColumnMapping> {
  const find = (...terms: string[]) =>
    headers.find(h => terms.some(t => h.toLowerCase().includes(t))) ?? ''

  const dateCol   = find('data', 'date', 'dia', 'movimento')
  const descCol   = find('descri', 'desc', 'detalhe', 'histor', 'motivo')
  const amountCol = find('valor', 'amount', 'montante', 'importe')
  const debitCol  = find('debito', 'débito', 'debit', 'saida', 'saída')
  const creditCol = find('credito', 'crédito', 'credit', 'entrada')

  const hasDebitCredit = !!(debitCol && creditCol)

  return {
    dateCol, descCol,
    amountCol: hasDebitCredit ? '' : amountCol,
    debitCol: hasDebitCredit ? debitCol : undefined,
    creditCol: hasDebitCredit ? creditCol : undefined,
    mode: hasDebitCredit ? 'debit_credit' : 'single',
  }
}

// ─── PDF parser (Millennium BCP format) ──────────────────────────────────────

let _pdfWorkerSet = false

async function getPdfjsLib() {
  const pdfjsLib = await import('pdfjs-dist')
  if (!_pdfWorkerSet) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc
    _pdfWorkerSet = true
  }
  return pdfjsLib
}

// Parse Portuguese number: "1 691.45" or "270,62" → float
function ptNum(s: string): number {
  return parseFloat(s.trim().replace(/\s+/g,'').replace(',','.')) || 0
}

export async function parsePDFBankStatement(
  file: File,
  existingTx: { data: string; valor: number; descricao?: string | null }[] = []
): Promise<ParseResult> {
  const errors: string[] = []
  const transactions: ParsedTransaction[] = []

  try {
    const pdfjsLib = await getPdfjsLib()
    const bytes = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise

    let stmtYear = new Date().getFullYear()
    let prevBal: number | null = null

    for (let pn = 1; pn <= pdf.numPages; pn++) {
      const page = await pdf.getPage(pn)
      const vp = page.getViewport({ scale: 1 })
      const W = vp.width

      const textContent = await page.getTextContent()

      // Group items by Y line (rounded to int for grouping)
      const byY: Record<number, Array<{ str: string; x: number }>> = {}

      for (const raw of textContent.items) {
        const item = raw as { str?: string; transform?: number[] }
        if (!item.str?.trim() || !item.transform) continue
        const x = item.transform[4]
        const y = Math.round(item.transform[5])
        if (!byY[y]) byY[y] = []
        byY[y].push({ str: item.str, x })
      }

      // Process lines top→bottom (descending y in PDF coordinate space)
      const ys = Object.keys(byY).map(Number).sort((a, b) => b - a)

      for (const y of ys) {
        const lineItems = byY[y].sort((a, b) => a.x - b.x)
        const full = lineItems.map(i => i.str).join(' ').trim()

        // Extract statement year
        const ym = full.match(/EXTRATO\s+DE\s+(\d{4})/)
        if (ym) { stmtYear = +ym[1]; continue }

        // Sync balance from SALDO INICIAL
        if (/SALDO INICIAL/.test(full)) {
          const bm = full.match(/SALDO INICIAL\s+([\d\s,.]+)/)
          if (bm) prevBal = ptNum(bm[1])
          continue
        }

        // Sync balance from TRANSPORTE (page continuation marker)
        if (/^TRANSPORTE\b/.test(full)) {
          const bm = full.match(/TRANSPORTE\s+([\d\s,.]+)/)
          if (bm && prevBal === null) prevBal = ptNum(bm[1])
          continue
        }

        // Skip header/footer/info lines
        if (/A TRANSPORTAR|SALDO FINAL|SALDO DISPONIVEL|DATA\s*LANC|DESCRITIVO|DEBITO|CREDITO|\bSALDO\b$|CONTA (MILLENNIUM|APPARTE)|EMPRESTIMOS|AGENDA|SEGUROS|MENSAGEM|ULTRAPASSAGEM|SUCURSAL|CARTOES|PRODUTO|RESUMO|DETALHE|TAXA DE JURO|CAPITAL AMORT|TOTAL A PAGAR|TIPO DE CREDITO|NUMERO DE AUT|CARTEIRA|BIC|IBAN:|www\.|Banco Comercial|Capital Social|Atendimento|MOEDA: EUR/.test(full)) continue

        // Match transaction line: M.DD M.DD [description] ...
        const dm = full.match(/^(\d{1,2})\.(\d{2})\s+\d{1,2}\.\d{2}\s+/)
        if (!dm) continue
        const mo = +dm[1], dd = +dm[2]
        if (mo < 1 || mo > 12 || dd < 1 || dd > 31) continue

        // Financial amounts are in the rightmost ~45% of the page
        const finThresh = W * 0.55
        const finItems = lineItems
          .filter(i => i.x >= finThresh && /^\d[\d\s]*[.,]\d{2}$/.test(i.str.trim()))
          .sort((a, b) => a.x - b.x)

        let amt = 0, bal = 0

        if (finItems.length >= 2) {
          bal = ptNum(finItems[finItems.length - 1].str)
          amt = ptNum(finItems[finItems.length - 2].str)
        } else if (finItems.length === 1) {
          bal = ptNum(finItems[0].str)
          if (prevBal !== null) amt = Math.abs(bal - prevBal)
        } else {
          // Fallback: extract all PT numbers from text
          const nums = [...full.matchAll(/\b(\d[\d\s]*[.,]\d{2})\b/g)]
            .map(m => ptNum(m[1]))
            .filter(n => n > 0.005)
          if (nums.length >= 2) {
            bal = nums[nums.length - 1]
            amt = nums[nums.length - 2]
          } else {
            errors.push(`Linha não reconhecida (pág. ${pn}): ${full.slice(0, 60)}`)
            continue
          }
        }

        if (amt < 0.005) { prevBal = bal; continue }

        // Determine type from balance change
        let type: 'receita' | 'despesa' = 'despesa'
        if (prevBal !== null) {
          const diff = bal - prevBal
          // diff ≈ +amt → credit (receita); diff ≈ -amt → debit (despesa)
          if (Math.abs(diff - amt) < Math.abs(diff + amt)) type = 'receita'
        }

        // Build description from left-side items (description column)
        const desc = lineItems
          .filter(i => i.x < finThresh)
          .map(i => i.str.trim())
          .filter(s => s && !/^\d{1,2}\.\d{2}$/.test(s)) // remove M.DD date items
          .join(' ')
          .trim()

        const date = `${stmtYear}-${String(mo).padStart(2,'0')}-${String(dd).padStart(2,'0')}`
        const rule = autoDetectCategory(desc)
        const isDuplicate = existingTx.some(t =>
          t.data === date && Math.abs(t.valor - amt) < 0.01 &&
          (t.descricao ?? '').slice(0, 20).toLowerCase() === desc.slice(0, 20).toLowerCase()
        )

        transactions.push({
          data: date,
          descricao: desc || full.slice(0, 120),
          valor: amt,
          type,
          suggestedCategory: rule?.category ?? null,
          isDuplicate,
          selected: !isDuplicate,
        })

        prevBal = bal
      }
    }
  } catch (err) {
    errors.push(`Erro ao processar PDF: ${String(err)}`)
  }

  return { transactions, headers: [], totalRows: transactions.length, errors }
}
