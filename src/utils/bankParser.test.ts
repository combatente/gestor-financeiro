// @vitest-environment jsdom
import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { autoDetectColumns, parseExcelFile, readExcelHeaders } from './bankParser'

function makeExcelFile(rows: (string | number)[][], name = 'extrato.xlsx'): File {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new File([buffer], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

describe('autoDetectColumns', () => {
  it('deteta colunas de data, descrição e valor num extrato de coluna única', () => {
    const mapping = autoDetectColumns(['Data Movimento', 'Descritivo', 'Valor'])
    expect(mapping.mode).toBe('single')
    expect(mapping.dateCol).toBe('Data Movimento')
    expect(mapping.descCol).toBe('Descritivo')
    expect(mapping.amountCol).toBe('Valor')
  })

  it('deteta modo débito/crédito quando ambas as colunas existem', () => {
    const mapping = autoDetectColumns(['Data', 'Descrição', 'Débito', 'Crédito'])
    expect(mapping.mode).toBe('debit_credit')
    expect(mapping.debitCol).toBe('Débito')
    expect(mapping.creditCol).toBe('Crédito')
    expect(mapping.amountCol).toBe('')
  })
})

describe('readExcelHeaders', () => {
  it('lê a primeira linha como cabeçalhos', async () => {
    const file = makeExcelFile([
      ['Data', 'Descrição', 'Valor'],
      ['01/03/2026', 'LIDL LISBOA', -25.5],
    ])
    const headers = await readExcelHeaders(file)
    expect(headers).toEqual(['Data', 'Descrição', 'Valor'])
  })
})

describe('parseExcelFile (modo single)', () => {
  const mapping = { dateCol: 'Data', descCol: 'Descrição', amountCol: 'Valor', mode: 'single' as const }

  it('converte datas PT, classifica tipo pelo sinal e sugere categoria', async () => {
    const file = makeExcelFile([
      ['Data', 'Descrição', 'Valor'],
      ['05/03/2026', 'COMPRA LIDL LISBOA', -25.5],
      ['06/03/2026', 'TRANSFERENCIA - VENCIMENTO ACCENTURE', 2000],
    ])

    const result = await parseExcelFile(file, mapping)

    expect(result.errors).toHaveLength(0)
    expect(result.transactions).toHaveLength(2)

    const [despesa, receita] = result.transactions
    expect(despesa).toMatchObject({
      data: '2026-03-05',
      valor: 25.5,
      type: 'despesa',
      suggestedCategory: 'Supermercado',
    })
    expect(receita).toMatchObject({
      data: '2026-03-06',
      valor: 2000,
      type: 'receita',
      suggestedCategory: 'Salário',
    })
  })

  it('assinala como erro e ignora linhas com data inválida', async () => {
    const file = makeExcelFile([
      ['Data', 'Descrição', 'Valor'],
      ['não é uma data', 'DESCONHECIDO', -10],
      ['07/03/2026', 'OK', -10],
    ])

    const result = await parseExcelFile(file, mapping)

    expect(result.transactions).toHaveLength(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatch(/data inválida/)
  })

  it('marca transações como duplicadas quando já existem', async () => {
    const file = makeExcelFile([
      ['Data', 'Descrição', 'Valor'],
      ['05/03/2026', 'COMPRA LIDL LISBOA', -25.5],
    ])

    const result = await parseExcelFile(file, mapping, [
      { data: '2026-03-05', valor: 25.5, descricao: 'COMPRA LIDL LISBOA' },
    ])

    expect(result.transactions[0].isDuplicate).toBe(true)
    expect(result.transactions[0].selected).toBe(false)
  })
})

describe('parseExcelFile (modo débito/crédito)', () => {
  const mapping = {
    dateCol: 'Data',
    descCol: 'Descrição',
    amountCol: '',
    debitCol: 'Débito',
    creditCol: 'Crédito',
    mode: 'debit_credit' as const,
  }

  it('calcula o valor como crédito menos débito', async () => {
    const file = makeExcelFile([
      ['Data', 'Descrição', 'Débito', 'Crédito'],
      ['10/03/2026', 'LEVANTAMENTO ATM', 50, ''],
      ['11/03/2026', 'VENCIMENTO ACCENTURE', '', 1800],
    ])

    const result = await parseExcelFile(file, mapping)

    expect(result.transactions).toEqual([
      expect.objectContaining({ data: '2026-03-10', valor: 50, type: 'despesa' }),
      expect.objectContaining({ data: '2026-03-11', valor: 1800, type: 'receita' }),
    ])
  })
})
