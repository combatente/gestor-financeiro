import { describe, expect, it } from 'vitest'
import { autoDetectCategory, detectTransactionType } from './autoCategories'

describe('autoDetectCategory', () => {
  it('reconhece supermercados portugueses', () => {
    expect(autoDetectCategory('COMPRA LIDL LISBOA')?.category).toBe('Supermercado')
    expect(autoDetectCategory('CONTINENTE ONLINE')?.category).toBe('Supermercado')
  })

  it('reconhece o salário via palavra-chave do empregador', () => {
    const rule = autoDetectCategory('TRANSFERENCIA - VENCIMENTO ACCENTURE')
    expect(rule?.category).toBe('Salário')
    expect(rule?.type).toBe('receita')
  })

  it('não é sensível a maiúsculas/minúsculas', () => {
    expect(autoDetectCategory('netflix.com')?.category).toBe('Entretenimento')
  })

  it('devolve null quando não há correspondência', () => {
    expect(autoDetectCategory('DESCRICAO SEM CATEGORIA CONHECIDA XYZ')).toBeNull()
  })

  it('devolve null para descrição vazia', () => {
    expect(autoDetectCategory('')).toBeNull()
  })
})

describe('detectTransactionType', () => {
  it('usa o tipo da regra quando a descrição é reconhecida', () => {
    expect(detectTransactionType('GALP POSTO GASOLINA', -50)).toBe('despesa')
    expect(detectTransactionType('VENCIMENTO ACCENTURE', 2000)).toBe('receita')
  })

  it('recorre ao sinal do valor quando não há regra correspondente', () => {
    expect(detectTransactionType('DESCRICAO DESCONHECIDA', 100)).toBe('receita')
    expect(detectTransactionType('DESCRICAO DESCONHECIDA', -100)).toBe('despesa')
  })
})
