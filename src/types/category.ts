// src/types/category.ts
export type CategoryType = 'receita' | 'despesa' | 'poupanca'

export type Category = {
  id?: string
  type: CategoryType                // 'receita' | 'despesa' | 'poupanca'
  name: string                      // Ex.: "Alimentação"
  slug: string                      // "alimentacao" (útil para evitar duplicados lógicos)
  parentId?: string | null          // null = categoria de topo; string = subcategoria
  path?: string[]                   // [topId, ..., leafId] (opcional para relatórios)
  order?: number                    // ordenação manual (drag’n’drop no futuro)
  color?: string                    // cor opcional (#hex)
  icon?: string                     // emoji/nome de ícone
  active?: boolean                  // ativo/inativo
  spendNature?: 'necessidade' | 'vontade' | null //  Apenas para despesas: 'necessidade' | 'vontade'; nos outros tipos é null
  createdAt?: any                   // serverTimestamp()
  updatedAt?: any
}