import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useFirestore } from '../hooks/useFirestore'
import { useCategories } from '../hooks/useCategories'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { EmptyState } from './ui/EmptyState'
import {
  readExcelHeaders, parseExcelFile, parsePDFBankStatement, autoDetectColumns,
  type ParsedTransaction, type ColumnMapping
} from '../utils/bankParser'
import { FAMILY_MEMBERS } from '../types'
import {
  Upload, FileSpreadsheet, ChevronRight, ChevronLeft,
  Check, AlertTriangle, Info, RefreshCw, Download, User, FileText
} from 'lucide-react'
import * as XLSX from 'xlsx'

const STEPS = ['Upload', 'Mapeamento', 'Revisão', 'Conclusão']

const eur = (v: number) => v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })

export default function BankImport() {
  const { adicionarTransacao, transacoes } = useFirestore()
  const { items: categories } = useCategories()

  const [step, setStep] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [isPDF, setIsPDF] = useState(false)
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({})
  const [parsedTx, setParsedTx] = useState<ParsedTransaction[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(0)
  const [selectedPessoa, setSelectedPessoa] = useState('')
  const dropRef = useRef<HTMLDivElement>(null)

  const catByName = new Map(categories.map((c: { name?: string; id?: string }) => [c.name?.toLowerCase(), c.id]))

  const handleFile = useCallback(async (f: File) => {
    const pdfFile = /\.pdf$/i.test(f.name)
    const excelFile = /\.(xlsx|xls|csv)$/i.test(f.name)

    if (!pdfFile && !excelFile) {
      toast.error('Formato não suportado. Use .pdf, .xlsx, .xls ou .csv')
      return
    }

    setLoading(true)
    setFile(f)
    setIsPDF(pdfFile)

    try {
      if (pdfFile) {
        // PDF: parse directly, skip column mapping step
        const existing = transacoes.map(t => ({
          data: t.data, valor: Number(t.valor), descricao: t.descricao ?? null,
        }))
        const result = await parsePDFBankStatement(f, existing)
        setParsedTx(result.transactions)
        setParseErrors(result.errors)
        setStep(2)
        if (result.transactions.length === 0 && result.errors.length > 0) {
          toast.error('Não foi possível extrair transações do PDF.')
        }
      } else {
        // Excel/CSV: go to column mapping step
        const hdrs = await readExcelHeaders(f)
        setHeaders(hdrs)
        const auto = autoDetectColumns(hdrs)
        setMapping({ mode: 'single', ...auto })
        setStep(1)
      }
    } catch {
      toast.error('Erro ao ler o ficheiro.')
    } finally {
      setLoading(false)
    }
  }, [transacoes])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleParse = async () => {
    if (!file) return
    setLoading(true)
    try {
      const fullMapping: ColumnMapping = {
        dateCol: mapping.dateCol ?? '',
        descCol: mapping.descCol ?? '',
        amountCol: mapping.amountCol ?? '',
        debitCol: mapping.debitCol,
        creditCol: mapping.creditCol,
        mode: mapping.mode ?? 'single',
      }
      const existing = transacoes.map(t => ({
        data: t.data, valor: Number(t.valor), descricao: t.descricao ?? null,
      }))
      const result = await parseExcelFile(file, fullMapping, existing)
      setParsedTx(result.transactions)
      setParseErrors(result.errors)
      setStep(2)
    } catch {
      toast.error('Erro ao processar o ficheiro.')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    const toImport = parsedTx.filter(t => t.selected && !t.isDuplicate)
    if (!toImport.length) { toast.error('Nenhuma transação selecionada.'); return }

    setImporting(true)
    let count = 0
    for (const tx of toImport) {
      const catId = tx.suggestedCategory
        ? catByName.get(tx.suggestedCategory.toLowerCase()) ?? null
        : null
      await adicionarTransacao({
        type: tx.type,
        valor: tx.valor,
        data: tx.data,
        descricao: tx.descricao,
        categoryId: catId ?? null,
        pessoa: selectedPessoa || undefined,
      })
      count++
    }
    setImported(count)
    setImporting(false)
    setStep(3)
  }

  const reset = () => {
    setStep(0); setFile(null); setIsPDF(false); setHeaders([]); setMapping({})
    setParsedTx([]); setParseErrors([]); setImported(0); setSelectedPessoa('')
  }

  const toggleTx = (i: number) =>
    setParsedTx(prev => prev.map((t, idx) => idx === i ? { ...t, selected: !t.selected } : t))

  const toggleAll = (val: boolean) =>
    setParsedTx(prev => prev.map(t => ({ ...t, selected: t.isDuplicate ? false : val })))

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Data', 'Descrição', 'Valor'],
      ['25/06/2025', 'Salário Junho', '1500.00'],
      ['26/06/2025', 'Continente compras', '-85.30'],
      ['27/06/2025', 'Netflix', '-16.99'],
      ['28/06/2025', 'EDP eletricidade', '-62.00'],
    ])
    ws['!cols'] = [{ wch: 14 }, { wch: 40 }, { wch: 12 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Extrato')
    XLSX.writeFile(wb, 'template-extrato-bancario.xlsx')
  }

  const selectedCount = parsedTx.filter(t => t.selected && !t.isDuplicate).length
  const dupCount = parsedTx.filter(t => t.isDuplicate).length

  const mapField = (field: keyof ColumnMapping, label: string) => (
    <div>
      <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] mb-1.5 uppercase tracking-wider">{label}</label>
      <select
        className="input"
        value={(mapping[field] as string) ?? ''}
        onChange={e => setMapping(m => ({ ...m, [field]: e.target.value }))}
      >
        <option value="">— Selecionar coluna —</option>
        {headers.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
    </div>
  )

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Progresso */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          // For PDF, step 1 is auto-completed
          const completed = i < step || (isPDF && i === 1 && step >= 2)
          const active = i === step && !(isPDF && i === 1)
          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  completed ? 'bg-emerald-400/20 text-emerald-400 border-2 border-emerald-400/50'
                    : active ? 'bg-[rgba(var(--brand),0.15)] text-[rgb(var(--brand))] border-2 border-[rgba(var(--brand),0.4)]'
                    : 'bg-[rgb(var(--surface-2))] text-[rgb(var(--text-muted))] border-2 border-transparent'
                }`}>
                  {completed ? <Check size={14} /> : i + 1}
                </div>
                <span className={`text-[10px] font-semibold hidden sm:block ${
                  active ? 'text-[rgb(var(--brand))]' : 'text-[rgb(var(--text-muted))]'
                }`}>
                  {isPDF && i === 1 ? 'Auto' : s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 transition-all ${completed ? 'bg-emerald-400/40' : 'bg-[rgba(var(--border),0.15)]'}`} />
              )}
            </div>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* PASSO 0: Upload */}
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card>
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-[rgb(var(--text))]">Importar Extrato Bancário</h2>
                <p className="text-sm text-[rgb(var(--text-muted))] mt-1">
                  Suporta PDF (Millennium BCP detectado automaticamente) e Excel/CSV de qualquer banco.
                </p>
              </div>

              {/* Titular */}
              <div className="mb-5 p-4 rounded-xl bg-[rgba(var(--surface-2),0.5)]">
                <div className="flex items-center gap-2 mb-2">
                  <User size={15} className="text-[rgb(var(--brand))]" />
                  <label className="text-sm font-semibold text-[rgb(var(--text))]">Titular do Extrato</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      selectedPessoa === ''
                        ? 'border-[rgba(var(--brand),0.5)] bg-[rgba(var(--brand),0.1)] text-[rgb(var(--brand))]'
                        : 'border-[rgba(var(--border),0.2)] text-[rgb(var(--text-muted))] hover:border-[rgba(var(--brand),0.3)]'
                    }`}
                    onClick={() => setSelectedPessoa('')}
                  >
                    Não definido
                  </button>
                  {FAMILY_MEMBERS.map(p => (
                    <button key={p}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        selectedPessoa === p
                          ? 'border-[rgba(var(--brand),0.5)] bg-[rgba(var(--brand),0.1)] text-[rgb(var(--brand))]'
                          : 'border-[rgba(var(--border),0.2)] text-[rgb(var(--text-muted))] hover:border-[rgba(var(--brand),0.3)]'
                      }`}
                      onClick={() => setSelectedPessoa(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zona de drop */}
              <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                className="border-2 border-dashed border-[rgba(var(--brand),0.3)] rounded-2xl p-12 text-center cursor-pointer hover:bg-[rgba(var(--brand),0.04)] transition-colors"
                onClick={() => {
                  const i = document.createElement('input')
                  i.type = 'file'
                  i.accept = '.pdf,.xlsx,.xls,.csv'
                  i.onchange = (e) => {
                    const f = (e.target as HTMLInputElement).files?.[0]
                    if (f) handleFile(f)
                  }
                  i.click()
                }}
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw size={32} className="text-[rgb(var(--brand))] animate-spin" />
                    <p className="text-sm text-[rgb(var(--text-muted))]">A analisar ficheiro...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 rounded-2xl bg-[rgba(var(--brand),0.1)]">
                      <Upload size={32} className="text-[rgb(var(--brand))]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[rgb(var(--text))]">Arraste e solte o ficheiro aqui</p>
                      <p className="text-sm text-[rgb(var(--text-muted))] mt-1">ou clique para selecionar</p>
                      <div className="flex gap-2 justify-center mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-[rgba(var(--brand),0.1)] text-[rgb(var(--brand))] font-medium">
                          <FileText size={11} /> PDF
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-emerald-400/10 text-emerald-400 font-medium">
                          <FileSpreadsheet size={11} /> Excel / CSV
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Nota sobre PDF */}
              <div className="mt-4 p-3 rounded-xl bg-blue-400/5 border border-blue-400/20 text-xs text-blue-400 flex items-start gap-2">
                <Info size={13} className="flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">PDF Millennium BCP:</span> O extrato PDF é reconhecido automaticamente — não é necessário configurar colunas. Outras versões PDF podem não ser suportadas.
                </div>
              </div>

              {/* Template download */}
              <div className="mt-4 flex items-center justify-between p-4 rounded-xl bg-[rgba(var(--surface-2),0.5)]">
                <div className="flex items-start gap-3">
                  <Info size={16} className="text-[rgb(var(--text-muted))] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-[rgb(var(--text))]">Não sabe o formato Excel?</div>
                    <div className="text-xs text-[rgb(var(--text-muted))]">Descarregue o template com o formato correto.</div>
                  </div>
                </div>
                <Button variant="secondary" icon={Download} size="sm" onClick={downloadTemplate}>Template</Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* PASSO 1: Mapeamento de colunas (apenas Excel) */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card>
              <div className="flex items-center gap-3 mb-6">
                <FileSpreadsheet size={20} className="text-[rgb(var(--brand))]" />
                <div>
                  <h2 className="font-bold text-[rgb(var(--text))]">Mapear colunas</h2>
                  <p className="text-sm text-[rgb(var(--text-muted))]">
                    Ficheiro: <span className="font-medium">{file?.name}</span> · {headers.length} colunas detetadas
                    {selectedPessoa && <span className="ml-2 text-[rgb(var(--brand))]">· {selectedPessoa}</span>}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-semibold text-[rgb(var(--text-muted))] mb-2 uppercase tracking-wider">Formato do valor</label>
                <div className="flex gap-3">
                  {[
                    { val: 'single', label: 'Uma coluna de valor (positivo/negativo)' },
                    { val: 'debit_credit', label: 'Colunas separadas Débito/Crédito' },
                  ].map(opt => (
                    <button key={opt.val}
                      className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all ${
                        mapping.mode === opt.val
                          ? 'border-[rgba(var(--brand),0.5)] bg-[rgba(var(--brand),0.08)] text-[rgb(var(--brand))]'
                          : 'border-[rgba(var(--border),var(--border-alpha))] text-[rgb(var(--text-muted))] hover:border-[rgba(var(--brand),0.3)]'
                      }`}
                      onClick={() => setMapping(m => ({ ...m, mode: opt.val as ColumnMapping['mode'] }))}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mapField('dateCol', 'Coluna de Data *')}
                {mapField('descCol', 'Coluna de Descrição *')}
                {mapping.mode === 'single'
                  ? mapField('amountCol', 'Coluna de Valor *')
                  : <>
                      {mapField('debitCol', 'Coluna Débito (Saídas) *')}
                      {mapField('creditCol', 'Coluna Crédito (Entradas) *')}
                    </>
                }
              </div>

              {mapping.dateCol && mapping.descCol && (
                <div className="mt-4 p-3 rounded-xl bg-[rgba(var(--surface-2),0.5)] text-xs text-emerald-400 flex items-center gap-2">
                  <Check size={14} /> Colunas detetadas automaticamente. Verifique e ajuste se necessário.
                </div>
              )}

              <div className="flex justify-between mt-6">
                <Button variant="ghost" icon={ChevronLeft} onClick={() => setStep(0)}>Voltar</Button>
                <Button variant="primary" icon={ChevronRight} loading={loading}
                  disabled={!mapping.dateCol || !mapping.descCol || (mapping.mode === 'single' ? !mapping.amountCol : !mapping.debitCol || !mapping.creditCol)}
                  onClick={handleParse}
                >
                  Processar Ficheiro
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* PASSO 2: Revisão */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card padding="none">
              <div className="p-5 border-b border-[rgba(var(--border),var(--border-alpha))]">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="font-bold text-[rgb(var(--text))]">Rever e confirmar</h2>
                    <p className="text-sm text-[rgb(var(--text-muted))] mt-0.5">
                      {parsedTx.length} transações · {selectedCount} selecionadas · {dupCount} duplicadas
                      {selectedPessoa && (
                        <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[rgba(var(--brand),0.1)] text-[rgb(var(--brand))]">
                          <User size={10} /> {selectedPessoa}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => toggleAll(true)}>Selecionar todas</Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleAll(false)}>Limpar</Button>
                  </div>
                </div>

                {isPDF && (
                  <div className="mt-3 p-3 rounded-xl bg-blue-400/5 border border-blue-400/20 text-xs text-blue-400 flex items-center gap-2">
                    <FileText size={12} />
                    Extrato PDF processado automaticamente. O tipo (receita/despesa) foi determinado com base na variação do saldo.
                  </div>
                )}

                {parseErrors.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-400/10 text-amber-400 text-xs">
                    <div className="font-semibold mb-1 flex items-center gap-1"><AlertTriangle size={12} />{parseErrors.length} linhas com erro (ignoradas)</div>
                    {parseErrors.slice(0, 3).map((e, i) => <div key={i}>{e}</div>)}
                  </div>
                )}
              </div>

              {parsedTx.length === 0 ? (
                <EmptyState icon={FileSpreadsheet} title="Sem transações" description="O ficheiro não continha transações válidas." />
              ) : (
                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                  <table className="table-pro">
                    <thead className="sticky top-0 z-10">
                      <tr>
                        <th className="w-10">
                          <input type="checkbox" className="rounded" checked={selectedCount === parsedTx.filter(t => !t.isDuplicate).length}
                            onChange={e => toggleAll(e.target.checked)} />
                        </th>
                        <th>Data</th>
                        <th>Descrição</th>
                        <th>Tipo</th>
                        <th>Categoria Sugerida</th>
                        <th className="text-right">Valor</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedTx.map((tx, i) => (
                        <tr key={i} className={tx.isDuplicate ? 'opacity-40' : ''}>
                          <td>
                            <input type="checkbox" className="rounded" checked={tx.selected && !tx.isDuplicate}
                              disabled={tx.isDuplicate} onChange={() => toggleTx(i)} />
                          </td>
                          <td className="text-[rgb(var(--text-muted))] text-xs whitespace-nowrap">{tx.data}</td>
                          <td className="max-w-[200px]">
                            <div className="truncate text-sm" title={tx.descricao}>{tx.descricao || '—'}</div>
                          </td>
                          <td>
                            <Badge variant={tx.type === 'receita' ? 'green' : 'red'}>
                              {tx.type === 'receita' ? 'Receita' : 'Despesa'}
                            </Badge>
                          </td>
                          <td>
                            {tx.suggestedCategory
                              ? <Badge variant="purple">{tx.suggestedCategory}</Badge>
                              : <span className="text-xs text-[rgb(var(--text-muted))]">—</span>}
                          </td>
                          <td className={`text-right font-semibold text-sm ${tx.type === 'receita' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {tx.type === 'receita' ? '+' : '−'}{eur(tx.valor)}
                          </td>
                          <td>
                            {tx.isDuplicate
                              ? <Badge variant="amber">Duplicado</Badge>
                              : tx.selected
                                ? <Badge variant="green">OK</Badge>
                                : <Badge variant="neutral">Ignorado</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="p-5 border-t border-[rgba(var(--border),var(--border-alpha))] flex justify-between items-center">
                <Button variant="ghost" icon={ChevronLeft} onClick={() => setStep(isPDF ? 0 : 1)}>Voltar</Button>
                <Button variant="primary" icon={Check} loading={importing}
                  disabled={selectedCount === 0}
                  onClick={handleImport}
                >
                  Importar {selectedCount} transação{selectedCount !== 1 ? 'ões' : ''}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* PASSO 3: Conclusão */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <Card className="text-center py-12">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-emerald-400/15 flex items-center justify-center mx-auto mb-5"
              >
                <Check size={36} className="text-emerald-400" />
              </motion.div>
              <h2 className="text-2xl font-bold text-[rgb(var(--text))] mb-2">Importação concluída!</h2>
              <p className="text-[rgb(var(--text-muted))] mb-2">
                <span className="text-2xl font-bold text-emerald-400">{imported}</span> transações importadas com sucesso.
              </p>
              {selectedPessoa && (
                <p className="text-sm text-[rgb(var(--text-muted))] mb-2">Titular: <span className="font-semibold text-[rgb(var(--brand))]">{selectedPessoa}</span></p>
              )}
              {dupCount > 0 && (
                <p className="text-sm text-[rgb(var(--text-muted))] mb-6">{dupCount} duplicadas foram ignoradas automaticamente.</p>
              )}
              <div className="flex gap-3 justify-center mt-6">
                <Button variant="secondary" icon={RefreshCw} onClick={reset}>Importar outro ficheiro</Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
