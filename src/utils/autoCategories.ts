// Motor de categorização automática baseado em palavras-chave
// Reconhece padrões de extratos bancários portugueses

export type AutoCategoryRule = {
  keywords: string[]
  category: string
  type: 'receita' | 'despesa'
  icon?: string
}

export const AUTO_CATEGORY_RULES: AutoCategoryRule[] = [
  // Supermercados (inclui Millennium BCP: RECHEIO, AUCHAN, MERCADONA)
  { keywords: ['lidl', 'continente', 'pingo doce', 'aldi', 'minipreço', 'intermarche', 'jumbo', 'el corte inglés', 'mercado', 'supermercado', 'mini mercado', 'recheio', 'auchan', 'mercadona', 'hipermercado'], category: 'Supermercado', type: 'despesa' },
  // Restaurantes (inclui HAMBURGUERIA, BOLAMA, FORNADA, PASTELARIA)
  { keywords: ['mcdonald', 'burger king', 'kfc', 'pizza', 'restaurante', 'rest.', 'cafe ', 'pastelaria', 'snack', 'takeaway', 'nandos', 'telepizza', 'dominos', 'sushi', 'kebab', 'hamburgueria', 'bolama', 'fornada', 'churrascaria', 'bifanas'], category: 'Restaurante', type: 'despesa' },
  // Combustível / Automóvel (inclui VIAVERDE, BXVAL)
  { keywords: ['galp', 'bp ', 'repsol', 'cepsa', 'prio', 'posto gasolina', 'combustivel', 'gasolina', 'gasóleo', 'carro', 'oficina', 'revisão', 'seguro auto', 'inspecção', 'portagem', 'via verde', 'viaverde', 'bxval'], category: 'Automóvel', type: 'despesa' },
  // Energia / Utilities (inclui GALP ENERGIA, MEO ENERGIA, EDP COMERCIAL)
  { keywords: ['edp', 'endesa', 'galp energia', 'iberdrola', 'eletricidade', 'electricidade', 'gás', 'agua ', 'águas ', 'saneamento', 'adp', 'epal', 'água', 'meo energia'], category: 'Energia e Água', type: 'despesa' },
  // Telecomunicações (inclui NOS, MEO SA, VODAFONE, PAGSERV)
  { keywords: ['nos ', 'meo, sa', 'meo ', 'vodafone', 'nowo', 'lyca', 'telecomunicações', 'internet', 'tv cabo', 'telemovel', 'telemóvel', 'pagserv'], category: 'Telecomunicações', type: 'despesa' },
  // Saúde (inclui FARMACIA, CorpoPerfeito)
  { keywords: ['farmácia', 'farmacia', 'clinica', 'clínica', 'hospital', 'médico', 'consulta', 'dentista', 'optika', 'óptica', 'dr.', 'enfermagem', 'análises', 'exames', 'seguro saúde', 'corpo perfeito', 'corpoperfeito'], category: 'Saúde', type: 'despesa' },
  // Educação
  { keywords: ['escola', 'colégio', 'universidade', 'faculdade', 'propina', 'mensalidade escolar', 'atividade extracurricular', 'explicação', 'fnac livro', 'wook', 'bertrand', 'livraria'], category: 'Educação', type: 'despesa' },
  // Entretenimento / Streaming
  { keywords: ['netflix', 'spotify', 'hbo', 'disney', 'amazon prime', 'youtube premium', 'apple tv', 'apple music', 'deezer', 'twitch', 'gaming', 'cinema', 'teatro', 'concerto'], category: 'Entretenimento', type: 'despesa' },
  // Compras Online / Electrónica (inclui WORTEN, FUSAO SHOPPING)
  { keywords: ['amazon', 'ebay', 'aliexpress', 'shein', 'zara online', 'fnac', 'worten', 'radio popular', 'pcdiga', 'paypal', 'ifthenpay', 'fusao shopping'], category: 'Compras Online', type: 'despesa' },
  // Vestuário (inclui PRIMARK, MERAMENTE FLORIDO)
  { keywords: ['zara', 'h&m', 'pull and bear', 'bershka', 'stradivarius', 'mango', 'massimo dutti', 'cortefiel', 'primark', 'decathlon', 'meramente florido', 'florido'], category: 'Vestuário', type: 'despesa' },
  // Habitação / Prestação (inclui PAG.PRESTACAO)
  { keywords: ['renda', 'arrendamento', 'condominio', 'condomínio', 'imobiliaria', 'imobiliária', 'seguro habitação', 'prestação habitação', 'empréstimo habitação', 'pag.prestacao', 'pag prestacao', 'pag. prest'], category: 'Habitação', type: 'despesa' },
  // Transportes
  { keywords: ['metro', 'carris', 'cp ', 'comboio', 'uber', 'bolt', 'free now', 'taxi', 'táxi', 'rede expressos', 'flixbus', 'ryanair', 'tap ', 'easyjet', 'renfe'], category: 'Transportes', type: 'despesa' },
  // Academia / Desporto
  { keywords: ['ginásio', 'ginasio', 'fitness', 'health club', 'sport zone', 'decathlon', 'natação', 'academia'], category: 'Desporto', type: 'despesa' },
  // Seguros (inclui OCIDENTAL, DD OCIDENTAL)
  { keywords: ['seguro', 'fidelidade', 'allianz', 'generali', 'ageas', 'millennium seguro', 'axa', 'ocidental', 'multiriscos', 'multirisc', 'homin'], category: 'Seguros', type: 'despesa' },
  // Crédito / Dívidas (CREDIBOM, WIZINK, BNP)
  { keywords: ['credibom', 'wizink', 'cetelem', 'cofidis', 'santander consumer', 'banco bnp', 'bnp paribas personal'], category: 'Crédito', type: 'despesa' },
  // Impostos / Taxas (PAG.DUC, AT)
  { keywords: ['pag.duc', 'pag duc', 'at - impostos', 'financas', 'finanças', 'seguranca social', 'segurança social', 'trf p/ seguranca', 'irs'], category: 'Impostos e Taxas', type: 'despesa' },
  // Correios / Serviços (CTT)
  { keywords: ['ctt ', 'correios', 'payshop', 'com.man.conta', 'imposto selo'], category: 'Serviços', type: 'despesa' },
  // Doações
  { keywords: ['unicef', 'greenpeace', 'amnistia', 'caritas', 'banco alimentar', 'cruz vermelha', 'associacao ppa'], category: 'Doações', type: 'despesa' },
  // Rendimentos — Salário (VENCIMENTO, ACCENTURE, VMJC)
  { keywords: ['salario', 'salário', 'vencimento', 'remuneração', 'ordenado', 'transferencia - vencimento', 'accenture', 'vmjc'], category: 'Salário', type: 'receita' },
  // Rendimentos Sociais (IEFP)
  { keywords: ['iefp', 'seg. social', 'subsidio desemprego', 'prestacao social'], category: 'Apoios Sociais', type: 'receita' },
  // Outros Rendimentos
  { keywords: ['freelance', 'consultoria', 'fatura ', 'factura ', 'honorarios', 'serviços prestados'], category: 'Rendimento Extra', type: 'receita' },
  { keywords: ['rendimento arrendamento', 'renda recebida', 'aluguer recebido'], category: 'Rendimento Arrendamento', type: 'receita' },
  { keywords: ['dividendo', 'juros recebidos', 'rentabilidade', 'subsídio', 'subsidio', 'abono'], category: 'Outros Rendimentos', type: 'receita' },
  // MB/Transferências
  { keywords: ['mb way', 'mbway', 'multibanco', 'transferência', 'transferencia', 'trf ', 'levantamento', 'deposito', 'depósito'], category: 'Transferência', type: 'despesa' },
]

export function autoDetectCategory(description: string): AutoCategoryRule | null {
  if (!description) return null
  const lower = description.toLowerCase()
  for (const rule of AUTO_CATEGORY_RULES) {
    if (rule.keywords.some(k => lower.includes(k))) {
      return rule
    }
  }
  return null
}

export function detectTransactionType(description: string, amount: number): 'receita' | 'despesa' {
  const rule = autoDetectCategory(description)
  if (rule) return rule.type
  // Se o valor é positivo, provavelmente é receita
  return amount >= 0 ? 'receita' : 'despesa'
}
