import { describe, expect, it } from 'vitest'
import { fmt, formatPeriod } from './format'

describe('fmt', () => {
  it('formata com duas casas decimais e separador de milhares pt-PT', () => {
    expect(fmt(1234.5)).toBe('1 234,50')
  })

  it('formata zero corretamente', () => {
    expect(fmt(0)).toBe('0,00')
  })

  it('formata valores negativos', () => {
    expect(fmt(-42.1)).toBe('-42,10')
  })
})

describe('formatPeriod', () => {
  it('formata YYYY-MM para "Mês/Ano" capitalizado', () => {
    expect(formatPeriod('2025-12')).toBe('Dezembro de 2025')
  })

  it('devolve "Desconhecido" para período vazio', () => {
    expect(formatPeriod('')).toBe('Desconhecido')
  })

  it('devolve "Desconhecido" para período demasiado curto', () => {
    expect(formatPeriod('2025')).toBe('Desconhecido')
  })
})
