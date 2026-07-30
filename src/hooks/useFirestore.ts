// useFirestore.ts
import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    where,
    setDoc,
    serverTimestamp,
    updateDoc,
    type DocumentData,
    type DocumentReference,
    type Unsubscribe,
    writeBatch,
} from 'firebase/firestore'
import { db, auth } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'

// --- Tipos Existentes ---
export type Transacao = {
    id?: string
    type: 'receita' | 'despesa' | 'divida' | 'poupanca'
    valor: number
    data: string // YYYY-MM-DD
    categoria?: string | null
    categoryId?: string | null
    descricao?: string | null
    debtId?: string | null
    goalId?: string | null 
    [key: string]: any
}

export type Orcamento = {
    id?: string
    categoryId?: string | null
    periodo: string // YYYY-MM
    limite: number
    [k: string]: any
}

export type AddTransacaoInput = Omit<Transacao, 'id'>
export type AddOrcamentoInput = {
    categoryId: string
    periodo: string
    limite: number
}

// ----------------------------------------------------------------------
// CORREÇÃO DE TIPAGEM DE DÍVIDAS (DEBT)
// ----------------------------------------------------------------------

// 1. DebtType (Base de dados / Leitura)
export type DebtType = {
    id: string
    name: string
    description?: string | null 
    category?: string | null 
    targetAmount: number // O montante inicial total
    currentAmount: number // Saldo atual da dívida
    interestRate: number // Guardado como decimal (e.g., 0.05 para 5%)
    minimumPayment: number // Pagamento mínimo em EUR
    dueDate: string // (YYYY-MM-DD)
    createdAt: any // Firestore Timestamp (Required na base de dados)
    status: 'active' | 'paid' | 'defaulted' 
}

export type LocalDebtType = DebtType

// 2. AddDebtInput (Entrada de Formulário / Escrita)
export type AddDebtInput = Omit<DebtType, 'id' | 'createdAt'>

// O Omit acima é o suficiente. O status já está incluído no DebtType, 
// e o formulário o envia. Remover a redundância.

// ----------------------------------------------------------------------

export type GoalType = {
    id: string
    name: string
    description?: string | null
    targetAmount: number // Objetivo Total
    currentAmount: number // Saldo Atual
    startDate: string // Data de início (YYYY-MM-DD)
    targetDate: string // Data Alvo (YYYY-MM-DD)
    assetClass: 'CASH' | 'STOCKS' | 'ETFS' | 'CRYPTO' | 'RETIREMENT' | 'OTHER'
    createdAt: any // Firestore Timestamp
    [key: string]: any
}

export type AddGoalInput = Omit<GoalType, 'id' | 'createdAt'>

export type BudgetAllocation = {
    necessidadePct: number
    vontadePct: number
    poupancaPct: number
}

const DEFAULT_ALLOCATION: BudgetAllocation = {
    necessidadePct: 50,
    vontadePct: 30,
    poupancaPct: 20,
}

// ----------------------------------------------------------------------
// INVESTIMENTOS (posições individuais) + DIVIDENDOS
// ----------------------------------------------------------------------

export type Platform = 'DEGIRO' | 'XTB' | 'YOUHODLER' | 'TRADE_REPUBLIC' | 'OUTRA'
export type InvestmentAssetType = 'ACAO' | 'ETF' | 'CRYPTO'
export type Currency = 'EUR' | 'USD'

export type InvestmentType = {
    id: string
    ticker: string
    name: string
    platform: Platform
    assetType: InvestmentAssetType
    currency: Currency
    quantity: number
    avgCost: number         // preço médio de compra, na `currency`
    currentPrice: number    // última cotação conhecida, na `currency`
    quoteUpdatedAt: string  // YYYY-MM-DD
    notes?: string | null
    createdAt: any
}

export type AddInvestmentInput = Omit<InvestmentType, 'id' | 'createdAt'>

export type DividendStatus = 'anunciado' | 'recebido'

export type DividendType = {
    id: string
    investmentId: string
    exDividendDate: string   // YYYY-MM-DD
    paymentDate: string      // YYYY-MM-DD
    amountPerShare: number
    totalAmount: number
    currency: Currency
    status: DividendStatus
    notes?: string | null
    createdAt: any
}

export type AddDividendInput = Omit<DividendType, 'id' | 'createdAt'>

export type FxRate = { usdToEur: number }

const DEFAULT_FX_RATE: FxRate = { usdToEur: 0.92 }
const PLATFORMS: Platform[] = ['DEGIRO', 'XTB', 'YOUHODLER', 'TRADE_REPUBLIC', 'OUTRA']
const INVESTMENT_ASSET_TYPES: InvestmentAssetType[] = ['ACAO', 'ETF', 'CRYPTO']
const CURRENCIES: Currency[] = ['EUR', 'USD']
const DIVIDEND_STATUSES: DividendStatus[] = ['anunciado', 'recebido']

// ----------------------------------------------------------------------
// SNAPSHOTS MENSAIS DE PATRIMÓNIO LÍQUIDO (histórico real, não simulado)
// ----------------------------------------------------------------------

export type NetWorthSnapshot = {
    id: string // YYYY-MM
    totalInvested: number
    totalDebt: number
    netWorth: number
}

export type FirestoreHookResult = {
    transacoes: Transacao[];
    orcamentos: Orcamento[];
    debts: DebtType[];
    goals: GoalType[];
    investments: InvestmentType[];
    dividends: DividendType[];
    fxRate: FxRate;
    netWorthSnapshots: NetWorthSnapshot[];
    budgetAllocations: Record<string, BudgetAllocation>;
    saving: boolean;
    error: string | null;

    totais: {
        receitas: number;
        despesas: number;
        dividas: number;
        poupancas: number;
    };
    saldo: number;

    dadosGraficoTempo: (range: RangeOption) => { mes: string; receitas: number; despesas: number; poupancas: number }[];
    getTransacoesInRange: (range: RangeOption) => Transacao[];
    getTransacoesByMonth: (periodo: string) => Promise<Transacao[]>;
    getTransacoesByBounds: (from: Date, to: Date) => Promise<Transacao[]>;
    getBudgetAllocation: (periodo: string) => Promise<BudgetAllocation>;
    adicionarTransacao: (t: Record<string, any>) => Promise<void>;
    removerTransacao: (id: string) => Promise<void>;
    adicionarOrcamento: (o: Record<string, any>) => Promise<void>;
    removerOrcamento: (categoryId: string, periodo: string) => Promise<void>;
    addDebt: (d: AddDebtInput) => Promise<DocumentReference<DocumentData>>;
    updateDebt: (debtId: string, updates: Partial<DebtType>) => Promise<void>;
    removeDebt: (id: string) => Promise<void>;
    addGoal: (g: AddGoalInput) => Promise<DocumentReference<DocumentData>>;
    updateGoal: (goalId: string, updates: Partial<GoalType>) => Promise<void>;
    removeGoal: (id: string) => Promise<void>;
    addInvestment: (i: AddInvestmentInput) => Promise<DocumentReference<DocumentData>>;
    updateInvestment: (investmentId: string, updates: Partial<InvestmentType>) => Promise<void>;
    removeInvestment: (id: string) => Promise<void>;
    addDividend: (d: AddDividendInput) => Promise<DocumentReference<DocumentData>>;
    updateDividend: (dividendId: string, updates: Partial<DividendType>) => Promise<void>;
    removeDividend: (id: string) => Promise<void>;
    setFxRate: (rate: number) => Promise<void>;
    upsertNetWorthSnapshot: (month: string, data: { totalInvested: number; totalDebt: number; netWorth: number }) => Promise<void>;
    setBudgetAllocation: (periodo: string, alloc: BudgetAllocation) => Promise<void>;
    clearAllFinancialData: () => Promise<void>;
    resetAllHouseholdData: () => Promise<void>;
};
const isYYYYMM = (v: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v)

const isYYYYMMDD = (v: string) =>
    /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v)

const isEvent = (x: any) => x && typeof x === 'object' && typeof x.preventDefault === 'function'

type RangeOption = '1M' | '3M' | '6M' | '1A' | '2A'

function getMonthsFromRange(range: RangeOption): number {
    switch (range) {
        case '1M': return 1
        case '3M': return 3
        case '6M': return 6
        case '1A': return 12
        case '2A': return 24
        default: return 6
    }
}

function getPeriodBounds(range: RangeOption) {
    const to = new Date()
    to.setHours(23, 59, 59, 999)
    const from = new Date(to)
    const months = getMonthsFromRange(range)
    // incluir mês atual
    from.setMonth(to.getMonth() - (months - 1))
    from.setDate(1)
    from.setHours(0, 0, 0, 0)
    return { from, to }
}

export function useFirestore(): FirestoreHookResult {
    const HOUSEHOLD_ID = 'minha-carteira'
    const basePath = `households/${HOUSEHOLD_ID}`

    const [uid, setUid] = useState<string | null>(null)
    const [transacoes, setTransacoes] = useState<Transacao[]>([])
    const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
    const [debts, setDebts] = useState<DebtType[]>([])
    const [goals, setGoals] = useState<GoalType[]>([])
    const [investments, setInvestments] = useState<InvestmentType[]>([])
    const [dividends, setDividends] = useState<DividendType[]>([])
    const [fxRate, setFxRateState] = useState<FxRate>(DEFAULT_FX_RATE)
    const [netWorthSnapshots, setNetWorthSnapshots] = useState<NetWorthSnapshot[]>([])
    const [budgetAllocations, setBudgetAllocations] = useState<Record<string, BudgetAllocation>>({})
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const unsubRefs = useRef<Unsubscribe[]>([])

    const stopAll = useCallback(() => {
        unsubRefs.current.forEach((fn) => {
            try { fn() } catch { }
        })
        unsubRefs.current = []
    }, [])

        useEffect(() => {
           const off = onAuthStateChanged(auth, (user) => {
               setUid(user?.uid ?? null)
           })
           return () => off()
    }, [])

    useEffect(() => {
        stopAll()

        if (!uid) {
            setTransacoes([])
            setOrcamentos([])
            setDebts([])
            setGoals([])
            setInvestments([])
            setDividends([])
            setFxRateState(DEFAULT_FX_RATE)
            setNetWorthSnapshots([])
            setBudgetAllocations({})
            return
        }

        const unsubT = onSnapshot(
            query(collection(db, `${basePath}/transacoes`), orderBy('data', 'asc')),
            (snap) => {
                setTransacoes(
                    snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as Transacao[]
                )
            },
            (e) => {
                console.error('[onSnapshot transacoes]', e)
                setError((e as any)?.message ?? 'Erro a ler transações')
            }
        )

        const unsubO = onSnapshot(
            collection(db, `${basePath}/orcamentos`),
            (snap) => {
                setOrcamentos(
                    snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as Orcamento[]
                )
            },
            (e) => {
                console.error('[onSnapshot orcamentos]', e)
                setError((e as any)?.message ?? 'Erro a ler orçamentos')
            }
        )

        // 3. allocations (por YYYY-MM) — 50/30/20
        const unsubA = onSnapshot(
            collection(db, `${basePath}/allocations`),
            (snap) => {
                const map: Record<string, BudgetAllocation> = {}
                snap.forEach((d) => {
                    const id = d.id // esperado "YYYY-MM"
                    const data = d.data() as Partial<BudgetAllocation>
                    map[id] = {
                        necessidadePct: Number.isFinite(data.necessidadePct) ? Number(data.necessidadePct) : DEFAULT_ALLOCATION.necessidadePct,
                        vontadePct: Number.isFinite(data.vontadePct) ? Number(data.vontadePct) : DEFAULT_ALLOCATION.vontadePct,
                        poupancaPct: Number.isFinite(data.poupancaPct) ? Number(data.poupancaPct) : DEFAULT_ALLOCATION.poupancaPct,
                    }
                })
                setBudgetAllocations(map)
            },
            (e) => {
                console.error('[onSnapshot allocations]', e)
                setError((e as any)?.message ?? 'Erro a ler alocação orçamental')
            }
        )

        // 4. DÍVIDAS (Saldos Atuais) - Coleção 'liabilities'
        const unsubD = onSnapshot(
            collection(db, `${basePath}/liabilities`),
            (snap) => {
                setDebts(
                    snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as DebtType[]
                )
            },
            (e) => {
                console.error('[onSnapshot liabilities]', e)
                setError((e as any)?.message ?? 'Erro a ler dívidas')
            }
        )

        // 5. METAS/POUPANÇAS (Saldos Atuais) - Coleção 'assets'
        const unsubG = onSnapshot(
            collection(db, `${basePath}/assets`),
            (snap) => {
                setGoals(
                    snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as GoalType[]
                )
            },
            (e) => {
                console.error('[onSnapshot assets]', e)
                setError((e as any)?.message ?? 'Erro a ler metas/poupanças')
            }
        )

        // 6. INVESTIMENTOS (posições) - Coleção 'investments'
        const unsubI = onSnapshot(
            collection(db, `${basePath}/investments`),
            (snap) => {
                setInvestments(
                    snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as InvestmentType[]
                )
            },
            (e) => {
                console.error('[onSnapshot investments]', e)
                setError((e as any)?.message ?? 'Erro a ler investimentos')
            }
        )

        // 7. DIVIDENDOS - Coleção 'dividends'
        const unsubDiv = onSnapshot(
            collection(db, `${basePath}/dividends`),
            (snap) => {
                setDividends(
                    snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as DividendType[]
                )
            },
            (e) => {
                console.error('[onSnapshot dividends]', e)
                setError((e as any)?.message ?? 'Erro a ler dividendos')
            }
        )

        // 8. TAXA DE CÂMBIO USD→EUR - documento único 'meta/fxRate'
        const unsubFx = onSnapshot(
            doc(db, `${basePath}/meta/fxRate`),
            (snap) => {
                if (!snap.exists()) {
                    setFxRateState(DEFAULT_FX_RATE)
                    return
                }
                const data = snap.data() as Partial<FxRate>
                setFxRateState({
                    usdToEur: Number.isFinite(data.usdToEur) ? Number(data.usdToEur) : DEFAULT_FX_RATE.usdToEur,
                })
            },
            (e) => {
                console.error('[onSnapshot fxRate]', e)
                setError((e as any)?.message ?? 'Erro a ler taxa de câmbio')
            }
        )

        // 9. SNAPSHOTS MENSAIS DE PATRIMÓNIO LÍQUIDO - Coleção 'netWorthSnapshots'
        const unsubNW = onSnapshot(
            collection(db, `${basePath}/netWorthSnapshots`),
            (snap) => {
                setNetWorthSnapshots(
                    snap.docs
                        .map((d) => ({ id: d.id, ...(d.data() as DocumentData) })) as NetWorthSnapshot[]
                )
            },
            (e) => {
                console.error('[onSnapshot netWorthSnapshots]', e)
                setError((e as any)?.message ?? 'Erro a ler histórico de património')
            }
        )

        unsubRefs.current = [unsubT, unsubO, unsubA, unsubD, unsubG, unsubI, unsubDiv, unsubFx, unsubNW]
        return () => stopAll()
    }, [uid, basePath, stopAll])

    // ---------- TOTAIS + SALDO (memoizado) ----------
    const totais = useMemo(() => {
        // Nota: Estes totais calculam a SOMA dos MOVIMENTOS de transação 
        const sum = (type: string) =>
            transacoes.filter((t) => t.type === type).reduce((s, t) => s + (Number(t.valor) || 0), 0)

        return {
            receitas: sum('receita'),
            despesas: sum('despesa'),
            dividas: sum('divida'),
            poupancas: sum('poupanca'),
        }
    }, [transacoes])

    // saldo considera poupança e dívidas (pagamentos) como saída
    const saldo = useMemo(
        () => totais.receitas - totais.despesas - totais.dividas - totais.poupancas,
        [totais]
    )

    // ---------- GERAÇÃO DO GRÁFICO (dinâmica) ----------
    const dadosGraficoTempo = useCallback((range: RangeOption) => {
        const { from, to } = getPeriodBounds(range)

        // Pré-criar baldes por mês
        const mesesMap: Record<string, { receitas: number; despesas: number; poupancas: number }> = {}

        // Gera todas as chaves YYYY-MM no intervalo
        const months = getMonthsFromRange(range)
        for (let i = 0; i < months; i++) {
            const d = new Date(to.getFullYear(), to.getMonth() - i, 1)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            mesesMap[key] = { receitas: 0, despesas: 0, poupancas: 0 }
        }

        transacoes.forEach((t) => {
            const d = new Date(t.data)
            if (d < from || d > to) return
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            if (!mesesMap[key]) return

            const val = Number(t.valor) || 0
            if (t.type === 'receita') mesesMap[key].receitas += val
            if (t.type === 'despesa') mesesMap[key].despesas += val
            if (t.type === 'poupanca') mesesMap[key].poupancas += val
        })

        return Object.entries(mesesMap)
            .sort(([a], [b]) => (a > b ? 1 : -1))
            .map(([mes, v]) => ({
                mes: mes.slice(5),
                receitas: v.receitas,
                despesas: v.despesas,
                poupancas: v.poupancas,
            }))
    }, [transacoes])

    // ---------- Utilitário para o Dashboard: transações filtradas pelo range (cliente) ----------
    const getTransacoesInRange = useCallback((range: RangeOption) => {
        const { from, to } = getPeriodBounds(range)
        return transacoes.filter((t) => {
            const d = new Date(t.data)
            return d >= from && d <= to
        })
    }, [transacoes])

    // ---------- Helpers opcionais (server-side filtering) ----------
    const getTransacoesByMonth = useCallback(
        async (periodo: string): Promise<Transacao[]> => {
            if (!isYYYYMM(periodo)) throw new Error('Período inválido (YYYY-MM).')
            try {
                const [yy, mm] = periodo.split('-').map(Number)
                const from = new Date(yy, mm - 1, 1)
                const to = new Date(yy, mm, 0)
                const fmt = (d: Date) => d.toISOString().slice(0, 10)

                const q = query(
                    collection(db, `${basePath}/transacoes`),
                    where('data', '>=', fmt(from)),
                    where('data', '<=', fmt(to)),
                    orderBy('data', 'asc'),
                )
                const snap = await getDocs(q)
                return snap.docs.map(d => ({ id: d.id, ...(d.data() as DocumentData) })) as Transacao[]
            } catch (e: any) {
                console.error('[getTransacoesByMonth]', e)
                setError(e?.message ?? 'Erro a ler transações do mês.')
                return []
            }
        },
        [basePath]
    )

    const getTransacoesByBounds = useCallback(
        async (from: Date, to: Date): Promise<Transacao[]> => {
            try {
                const fmt = (d: Date) => d.toISOString().slice(0, 10)
                const q = query(
                    collection(db, `${basePath}/transacoes`),
                    where('data', '>=', fmt(from)),
                    where('data', '<=', fmt(to)),
                    orderBy('data', 'asc'),
                )
                const snap = await getDocs(q)
                return snap.docs.map(d => ({ id: d.id, ...(d.data() as DocumentData) })) as Transacao[]
            } catch (e: any) {
                console.error('[getTransacoesByBounds]', e)
                setError(e?.message ?? 'Erro a ler transações no intervalo.')
                return []
            }
        },
        [basePath]
    )

    // ---------- AÇÕES (todas memorizadas) ----------
    const adicionarTransacao = useCallback(
        async (t: Record<string, any>) => {
            setError(null)
            setSaving(true)

            try {
                if (isEvent(t)) return

                const type = String(t.type ?? t.tipo ?? '').toLowerCase().trim()
                const valorNum = Number(t.valor ?? t.amount)
                const dataStr =
                    typeof (t.data ?? t.date) === 'string' && (t.data ?? t.date)
                        ? String(t.data ?? t.date)
                        : new Date().toISOString().slice(0, 10)

                const categoria = t.categoria ? String(t.categoria).trim() : undefined
                const categoryId = t.categoryId ? String(t.categoryId) : undefined
                const descricaoRaw = (t.descricao ?? t.description ?? '') as string
                const descricao = descricaoRaw.trim().slice(0, 200) || undefined
                const debtId = t.debtId ? String(t.debtId) : undefined
                const goalId = t.goalId ? String(t.goalId) : undefined
                const pessoa = t.pessoa ? String(t.pessoa).trim() : undefined

                if (!['receita', 'despesa', 'divida', 'poupanca'].includes(type))
                    throw new Error('Tipo inválido.')
                if (!Number.isFinite(valorNum)) throw new Error('Valor inválido.')
                if (!isYYYYMMDD(dataStr)) throw new Error('Data inválida.')

                await addDoc(collection(db, `${basePath}/transacoes`), {
                    type,
                    valor: valorNum,
                    data: dataStr,
                    categoria: categoria ?? null,
                    categoryId: categoryId ?? null,
                    descricao: descricao ?? null,
                    debtId: debtId ?? null,
                    goalId: goalId ?? null,
                    pessoa: pessoa ?? null,
                    createdAt: serverTimestamp(),
                })
            } catch (e: any) {
                console.error('[add transacao]', e)
                setError(e?.message ?? 'Erro ao adicionar transação.')
                throw e
            } finally {
                setSaving(false)
            }
        },
        [basePath]
    )

    const removerTransacao = useCallback(
        async (id: string) => {
            setError(null)
            setSaving(true)
            try {
                await deleteDoc(doc(db, `${basePath}/transacoes/${id}`))
            } catch (e: any) {
                console.error('[remove transacao]', e)
                setError(e?.message ?? 'Erro ao remover transação.')
                throw e
            } finally {
                setSaving(false)
            }
        },
        [basePath]
    )

    /**
      * @description Adiciona uma nova dívida (liabilities)
      */
    const addDebt = useCallback(
        async (d: AddDebtInput): Promise<DocumentReference<DocumentData>> => {
            setError(null)
            setSaving(true)

            try {
                const sanitizeNumber = (value: any) => Number.isFinite(Number(value)) ? Number(value) : 0;              
                const name = String(d.name ?? '').trim();
                const targetAmount = sanitizeNumber(d.targetAmount); // Montante Inicial
                const currentAmount = sanitizeNumber(d.currentAmount); // Saldo Atual
                const interestRate = sanitizeNumber(d.interestRate);
                const minimumPayment = sanitizeNumber(d.minimumPayment);
                const dueDate = String(d.dueDate ?? '').trim();

                if (
                    !name ||
                    !Number.isFinite(currentAmount) || currentAmount < 0 || 
                    !Number.isFinite(interestRate) || interestRate < 0 ||
                    !Number.isFinite(minimumPayment) || minimumPayment < 0 ||
                    !Number.isFinite(targetAmount) || targetAmount <= 0 || 
                    currentAmount > targetAmount || // Saldo atual não pode ser maior que o original
                    !isYYYYMMDD(dueDate)
                ) {
                    throw new Error('Dados de dívida inválidos ou incompletos. Verifique os campos: Nome, Montante Original (>0), Saldo Atual (>=0 e <= Original) e Data (AAAA-MM-DD).')
                }
                
                // Determina o status: se o saldo for 0, marca como pago (Paid)
                const validStatuses = ['active', 'paid', 'defaulted'];
                const inferredStatus = currentAmount <= 0 ? 'paid' : 'active';
                
                // Usa o status enviado pelo formulário, se for válido, senão usa o inferido.
                const statusValue = d.status && validStatuses.includes(d.status) 
                    ? d.status as 'active' | 'paid' | 'defaulted'
                    : inferredStatus; 

                // O AddDebtInput já está correto. Usamos a desestruturação para enviar apenas as propriedades esperadas.
                const { name: debtName, description: debtDescription, category: debtCategory, targetAmount: target, currentAmount: current, interestRate: rate, minimumPayment: minPayment, dueDate: due } = d;


                const docRef = await addDoc(collection(db, `${basePath}/liabilities`), {
                    name: debtName,
                    description: debtDescription ?? null,
                    category: debtCategory ?? null,
                    targetAmount: target, 
                    currentAmount: current, 
                    interestRate: rate, 
                    minimumPayment: minPayment, 
                    dueDate: due, 
                    status: statusValue,
                    createdAt: serverTimestamp(),
                })
                return docRef
            } catch (e: any) {
                console.error('[add debt]', e)
                setError(e?.message ?? 'Erro ao adicionar dívida.')
                throw e
            } finally {
                setSaving(false)
            }
        },
        [basePath]
    )

    /**
      * @description Atualiza uma dívida existente (usado para pagamentos/encargos)
      */
    const updateDebt = useCallback(
        async (debtId: string, updates: Partial<DebtType>) => {
            setError(null)
            setSaving(true)

            try {
                if (!debtId) throw new Error('ID da dívida inválido.')

                // Sanitização e Validação para CurrentAmount (Saldo Atual)
                if (updates.currentAmount !== undefined) {
                    const amount = Number(updates.currentAmount);
                    if (!Number.isFinite(amount) || amount < 0) {
                        throw new Error('Saldo de dívida inválido.')
                    }
                    // Atualiza o status se o saldo for 0
                    if (amount <= 0) {
                        updates.status = 'paid';
                    } else if (updates.status === 'paid' && amount > 0) {
                        updates.status = 'active'; // Se o status for pago, mas o saldo > 0, volta a ativo
                    }
                    updates.currentAmount = amount; // OK
                }

                if (updates.dueDate !== undefined && !isYYYYMMDD(updates.dueDate)) {
                    throw new Error('Data de vencimento inválida.')
                }

                const ref = doc(db, `${basePath}/liabilities/${debtId}`)

                await updateDoc(ref, {
                    ...updates,
                    updatedAt: serverTimestamp(),
                })
            } catch (e: any) {
                console.error('[update debt]', e)
                setError(e?.message ?? 'Erro ao atualizar dívida.')
                throw e
            } finally {
                setSaving(false)
            }
        },
        [basePath]
    )

    /**
      * @description Remove uma dívida
      */
    const removeDebt = useCallback(
        async (id: string) => {
            setError(null)
            setSaving(true)
            try {
                await deleteDoc(doc(db, `${basePath}/liabilities/${id}`))
            } catch (e: any) {
                console.error('[remove debt]', e)
                setError(e?.message ?? 'Erro ao remover dívida.')
                throw e
            } finally {
                setSaving(false)
            }
        },
        [basePath]
    )

    /**
      * @description Adiciona uma nova meta/poupança (assets)
      */
    const addGoal = useCallback(
        async (g: AddGoalInput): Promise<DocumentReference<DocumentData>> => {
            setError(null)
            setSaving(true)

            try {
                // --- SANITIZAÇÃO DE DADOS ---
                const sanitizeNumber = (value: any) => Number.isFinite(Number(value)) ? Number(value) : 0;

                const name = String(g.name ?? '').trim();
                const targetAmount = sanitizeNumber(g.targetAmount);
                const currentAmount = sanitizeNumber(g.currentAmount);
                const startDate = String(g.startDate ?? '').trim();
                const targetDate = String(g.targetDate ?? '').trim();
                const assetClass = g.assetClass;

                // 💡 Validação dos campos essenciais
                if (
                    !name ||
                    !Number.isFinite(targetAmount) || targetAmount <= 0 ||
                    !Number.isFinite(currentAmount) || currentAmount < 0 ||
                    currentAmount > targetAmount || // Saldo atual não pode ser maior que o alvo
                    !isYYYYMMDD(targetDate) ||
                    !isYYYYMMDD(startDate) || 
                    !assetClass
                ) {
                    throw new Error('Dados da meta inválidos ou incompletos. Verifique os valores: Nome, Objetivo Total (>0), Saldo Atual (>=0 e <= Objetivo), Categoria e Datas válidas (AAAA-MM-DD).')
                }

                const newGoal: Omit<GoalType, 'id' | 'createdAt'> = {
                    name,
                    description: g.description ?? null,
                    targetAmount,
                    currentAmount,
                    startDate, 
                    targetDate,
                    assetClass,
                }

                const docRef = await addDoc(collection(db, `${basePath}/assets`), {
                    ...newGoal,
                    createdAt: serverTimestamp(), 
                })
                return docRef
            } catch (e: any) {
                console.error('[add goal]', e)
                setError(e?.message ?? 'Erro ao adicionar meta.')
                throw e
            } finally {
                setSaving(false)
            }
        },
        [basePath]
    )

    /**
      * @description Atualiza meta/poupança
      */
    const updateGoal = useCallback(
        async (goalId: string, updates: Partial<GoalType>) => {
            setError(null)
            setSaving(true)

            try {
                if (!goalId) throw new Error('ID da meta inválido.')

                // Sanitização e Validação para o saldo, se estiver a ser atualizado
                if (updates.currentAmount !== undefined) {
                    const amount = Number(updates.currentAmount);
                    if (!Number.isFinite(amount) || amount < 0) {
                        throw new Error('Saldo da meta inválido.')
                    }
                    updates.currentAmount = amount; 
                }

                // Garante que a data alvo/início está no formato correto
                if (updates.targetDate !== undefined && !isYYYYMMDD(updates.targetDate)) {
                    throw new Error('Data alvo inválida.')
                }
                if (updates.startDate !== undefined && !isYYYYMMDD(updates.startDate)) {
                    throw new Error('Data de início inválida.')
                }

                const ref = doc(db, `${basePath}/assets/${goalId}`)

                await updateDoc(ref, {
                    ...updates,
                    updatedAt: serverTimestamp(),
                })
            } catch (e: any) {
                console.error('[update goal]', e)
                setError(e?.message ?? 'Erro ao atualizar meta.')
                throw e
            } finally {
                setSaving(false)
            }
        },
        [basePath]
    )

    /**
      * @description Remove meta/poupança
      */
    const removeGoal = useCallback(
        async (id: string) => {
            setError(null)
            setSaving(true)
            try {
                await deleteDoc(doc(db, `${basePath}/assets/${id}`))
            } catch (e: any) {
                console.error('[remove goal]', e)
                setError(e?.message ?? 'Erro ao remover meta.')
                throw e
            } finally {
                setSaving(false)
            }
        },
        [basePath]
    )


    /**
      * @description Adiciona uma nova posição de investimento (investments)
      */
    const addInvestment = useCallback(
        async (i: AddInvestmentInput): Promise<DocumentReference<DocumentData>> => {
            setError(null)
            setSaving(true)

            try {
                const sanitizeNumber = (value: any) => Number.isFinite(Number(value)) ? Number(value) : 0

                const ticker = String(i.ticker ?? '').trim().toUpperCase()
                const name = String(i.name ?? '').trim()
                const quantity = sanitizeNumber(i.quantity)
                const avgCost = sanitizeNumber(i.avgCost)
                const currentPrice = sanitizeNumber(i.currentPrice)
                const quoteUpdatedAt = String(i.quoteUpdatedAt ?? '').trim()

                if (
                    !ticker || !name ||
                    !PLATFORMS.includes(i.platform) ||
                    !INVESTMENT_ASSET_TYPES.includes(i.assetType) ||
                    !CURRENCIES.includes(i.currency) ||
                    !Number.isFinite(quantity) || quantity <= 0 ||
                    !Number.isFinite(avgCost) || avgCost < 0 ||
                    !Number.isFinite(currentPrice) || currentPrice < 0 ||
                    !isYYYYMMDD(quoteUpdatedAt)
                ) {
                    throw new Error('Dados de investimento inválidos ou incompletos. Verifique: ticker, nome, plataforma, tipo de ativo, moeda, quantidade (>0), preços (>=0) e data da cotação (AAAA-MM-DD).')
                }

                const docRef = await addDoc(collection(db, `${basePath}/investments`), {
                    ticker,
                    name,
                    platform: i.platform,
                    assetType: i.assetType,
                    currency: i.currency,
                    quantity,
                    avgCost,
                    currentPrice,
                    quoteUpdatedAt,
                    notes: i.notes ?? null,
                    createdAt: serverTimestamp(),
                })
                return docRef
            } catch (e: any) {
                console.error('[add investment]', e)
                setError(e?.message ?? 'Erro ao adicionar investimento.')
                throw e
            } finally {
                setSaving(false)
            }
        },
        [basePath]
    )

    /**
      * @description Atualiza uma posição de investimento existente
      */
    const updateInvestment = useCallback(
        async (investmentId: string, updates: Partial<InvestmentType>) => {
            setError(null)
            setSaving(true)

            try {
                if (!investmentId) throw new Error('ID do investimento inválido.')

                if (updates.quantity !== undefined) {
                    const q = Number(updates.quantity)
                    if (!Number.isFinite(q) || q <= 0) throw new Error('Quantidade inválida.')
                    updates.quantity = q
                }
                if (updates.avgCost !== undefined) {
                    const v = Number(updates.avgCost)
                    if (!Number.isFinite(v) || v < 0) throw new Error('Preço médio inválido.')
                    updates.avgCost = v
                }
                if (updates.currentPrice !== undefined) {
                    const v = Number(updates.currentPrice)
                    if (!Number.isFinite(v) || v < 0) throw new Error('Cotação atual inválida.')
                    updates.currentPrice = v
                }
                if (updates.quoteUpdatedAt !== undefined && !isYYYYMMDD(updates.quoteUpdatedAt)) {
                    throw new Error('Data da cotação inválida.')
                }

                const ref = doc(db, `${basePath}/investments/${investmentId}`)
                await updateDoc(ref, {
                    ...updates,
                    updatedAt: serverTimestamp(),
                })
            } catch (e: any) {
                console.error('[update investment]', e)
                setError(e?.message ?? 'Erro ao atualizar investimento.')
                throw e
            } finally {
                setSaving(false)
            }
        },
        [basePath]
    )

    /**
      * @description Remove uma posição de investimento
      */
    const removeInvestment = useCallback(
        async (id: string) => {
            setError(null)
            setSaving(true)
            try {
                await deleteDoc(doc(db, `${basePath}/investments/${id}`))
            } catch (e: any) {
                console.error('[remove investment]', e)
                setError(e?.message ?? 'Erro ao remover investimento.')
                throw e
            } finally {
                setSaving(false)
            }
        },
        [basePath]
    )

    /**
      * @description Regista um dividendo (anunciado ou recebido) de uma posição
      */
    const addDividend = useCallback(
        async (d: AddDividendInput): Promise<DocumentReference<DocumentData>> => {
            setError(null)
            setSaving(true)

            try {
                const sanitizeNumber = (value: any) => Number.isFinite(Number(value)) ? Number(value) : 0

                const investmentId = String(d.investmentId ?? '').trim()
                const exDividendDate = String(d.exDividendDate ?? '').trim()
                const paymentDate = String(d.paymentDate ?? '').trim()
                const amountPerShare = sanitizeNumber(d.amountPerShare)
                const totalAmount = sanitizeNumber(d.totalAmount)

                if (
                    !investmentId ||
                    !isYYYYMMDD(exDividendDate) ||
                    !isYYYYMMDD(paymentDate) ||
                    !Number.isFinite(amountPerShare) || amountPerShare < 0 ||
                    !Number.isFinite(totalAmount) || totalAmount <= 0 ||
                    !CURRENCIES.includes(d.currency) ||
                    !DIVIDEND_STATUSES.includes(d.status)
                ) {
                    throw new Error('Dados de dividendo inválidos ou incompletos. Verifique: posição, datas ex-dividendo/pagamento (AAAA-MM-DD), valores e moeda.')
                }

                const docRef = await addDoc(collection(db, `${basePath}/dividends`), {
                    investmentId,
                    exDividendDate,
                    paymentDate,
                    amountPerShare,
                    totalAmount,
                    currency: d.currency,
                    status: d.status,
                    notes: d.notes ?? null,
                    createdAt: serverTimestamp(),
                })
                return docRef
            } catch (e: any) {
                console.error('[add dividend]', e)
                setError(e?.message ?? 'Erro ao adicionar dividendo.')
                throw e
            } finally {
                setSaving(false)
            }
        },
        [basePath]
    )

    /**
      * @description Atualiza um dividendo existente (ex: passar de "anunciado" a "recebido")
      */
    const updateDividend = useCallback(
        async (dividendId: string, updates: Partial<DividendType>) => {
            setError(null)
            setSaving(true)

            try {
                if (!dividendId) throw new Error('ID do dividendo inválido.')

                if (updates.exDividendDate !== undefined && !isYYYYMMDD(updates.exDividendDate)) {
                    throw new Error('Data ex-dividendo inválida.')
                }
                if (updates.paymentDate !== undefined && !isYYYYMMDD(updates.paymentDate)) {
                    throw new Error('Data de pagamento inválida.')
                }
                if (updates.totalAmount !== undefined) {
                    const v = Number(updates.totalAmount)
                    if (!Number.isFinite(v) || v <= 0) throw new Error('Valor total inválido.')
                    updates.totalAmount = v
                }

                const ref = doc(db, `${basePath}/dividends/${dividendId}`)
                await updateDoc(ref, {
                    ...updates,
                    updatedAt: serverTimestamp(),
                })
            } catch (e: any) {
                console.error('[update dividend]', e)
                setError(e?.message ?? 'Erro ao atualizar dividendo.')
                throw e
            } finally {
                setSaving(false)
            }
        },
        [basePath]
    )

    /**
      * @description Remove um dividendo
      */
    const removeDividend = useCallback(
        async (id: string) => {
            setError(null)
            setSaving(true)
            try {
                await deleteDoc(doc(db, `${basePath}/dividends/${id}`))
            } catch (e: any) {
                console.error('[remove dividend]', e)
                setError(e?.message ?? 'Erro ao remover dividendo.')
                throw e
            } finally {
                setSaving(false)
            }
        },
        [basePath]
    )

    /**
      * @description Define a taxa de câmbio USD→EUR usada para consolidar a carteira
      */
    const setFxRate = useCallback(
        async (rate: number) => {
            setError(null)
            setSaving(true)
            try {
                const usdToEur = Number(rate)
                if (!Number.isFinite(usdToEur) || usdToEur <= 0) throw new Error('Taxa de câmbio inválida.')

                await setDoc(
                    doc(db, `${basePath}/meta/fxRate`),
                    { usdToEur, updatedAt: serverTimestamp() },
                    { merge: true }
                )
            } catch (e: any) {
                console.error('[set fxRate]', e)
                setError(e?.message ?? 'Erro ao definir taxa de câmbio.')
                throw e
            } finally {
                setSaving(false)
            }
        },
        [basePath]
    )

    /**
      * @description Regista/atualiza o snapshot de património líquido do mês indicado.
      * Construído de forma incremental (chamado sempre que o Resumo Financeiro é
      * visto) para gerar um histórico real ao longo do tempo, em vez de simulado.
      */
    const upsertNetWorthSnapshot = useCallback(
        async (month: string, data: { totalInvested: number; totalDebt: number; netWorth: number }) => {
            try {
                if (!isYYYYMM(month)) throw new Error('Mês inválido.')
                await setDoc(
                    doc(db, `${basePath}/netWorthSnapshots/${month}`),
                    {
                        totalInvested: data.totalInvested,
                        totalDebt: data.totalDebt,
                        netWorth: data.netWorth,
                        updatedAt: serverTimestamp(),
                    },
                    { merge: true }
                )
            } catch (e: any) {
                console.error('[upsert net worth snapshot]', e)
            }
        },
        [basePath]
    )

    /**
      * @description Limpa todos os dados de Dívidas, Metas, e respetivas Transações.
      */
    const clearAllFinancialData = useCallback(async () => {
        setError(null);
        setSaving(true);
        try {
            const batch = writeBatch(db);

            // 1. Apagar Metas (Coleção 'assets')
            const goalsSnapshot = await getDocs(collection(db, `${basePath}/assets`));
            goalsSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            // 2. Apagar Dívidas (Coleção 'liabilities')
            const debtsSnapshot = await getDocs(collection(db, `${basePath}/liabilities`));
            debtsSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            // 3. Apagar Transações de Poupança (type == 'poupanca')
            const qPoupanca = query(collection(db, `${basePath}/transacoes`), where('type', '==', 'poupanca'));
            const transacoesPoupancaSnapshot = await getDocs(qPoupanca);
            transacoesPoupancaSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // 4. Apagar Transações de Dívida (type == 'divida')
            const qDivida = query(collection(db, `${basePath}/transacoes`), where('type', '==', 'divida'));
            const transacoesDividaSnapshot = await getDocs(qDivida);
            transacoesDividaSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });


            await batch.commit();

        } catch (e: any) {
            console.error("Erro ao limpar dados:", e);
            setError(e?.message ?? 'Erro ao limpar dados financeiros (dívidas, metas e transações relacionadas).');
            throw e;
        } finally {
            setSaving(false);
        }
    }, [basePath]);

    /**
      * @description Apaga TODOS os dados do agregado familiar (transações, orçamentos,
      * alocações, dívidas, metas, investimentos, dividendos, contas, recorrentes,
      * histórico de património e categorias) e repõe a taxa de câmbio por defeito.
      * Ação destrutiva e irreversível — deve ter confirmação explícita na UI antes
      * de ser chamada.
      */
    const resetAllHouseholdData = useCallback(async () => {
        setError(null)
        setSaving(true)
        try {
            const householdCollections = [
                `${basePath}/transacoes`,
                `${basePath}/orcamentos`,
                `${basePath}/allocations`,
                `${basePath}/liabilities`,
                `${basePath}/assets`,
                `${basePath}/investments`,
                `${basePath}/dividends`,
                `${basePath}/netWorthSnapshots`,
                `${basePath}/accounts`,
                `${basePath}/recurring`,
            ]

            const allRefs: DocumentReference[] = []
            for (const path of householdCollections) {
                const snap = await getDocs(collection(db, path))
                snap.docs.forEach(d => allRefs.push(d.ref))
            }
            // Categorias vivem numa coleção de topo (não são por agregado familiar)
            const categoriesSnap = await getDocs(collection(db, 'categories'))
            categoriesSnap.docs.forEach(d => allRefs.push(d.ref))
            // Taxa de câmbio (documento único)
            allRefs.push(doc(db, `${basePath}/meta/fxRate`))

            // Firestore só permite 500 operações por batch — divide em lotes seguros.
            const CHUNK_SIZE = 400
            for (let i = 0; i < allRefs.length; i += CHUNK_SIZE) {
                const batch = writeBatch(db)
                allRefs.slice(i, i + CHUNK_SIZE).forEach(ref => batch.delete(ref))
                await batch.commit()
            }
        } catch (e: any) {
            console.error('[reset all household data]', e)
            setError(e?.message ?? 'Erro ao repor os dados da aplicação.')
            throw e
        } finally {
            setSaving(false)
        }
    }, [basePath])

    // --- Funções de Orçamento (Inalteradas, mas completas para o retorno) ---
    const adicionarOrcamento = useCallback(
        async (o: Record<string, any>) => {
            setError(null)
            setSaving(true)
            try {
                const categoryId = String(o.categoryId ?? '')
                const periodo = String(o.periodo ?? '')
                const limite = Number(o.limite)

                if (!categoryId) throw new Error('Categoria obrigatória.')
                if (!isYYYYMM(periodo)) throw new Error('Período inválido.')
                if (!Number.isFinite(limite) || limite < 0) throw new Error('Limite inválido.')

                const key = `${categoryId}_${periodo}`

                await setDoc(
                    doc(db, `${basePath}/orcamentos/${key}`),
                    {
                        categoryId,
                        periodo,
                        limite,
                        updatedAt: serverTimestamp(),
                    },
                    { merge: true }
                )
            } catch (e: any) {
                console.error('[add orcamento]', e)
                setError(e?.message ?? 'Erro ao adicionar orçamento.')
                throw e
            } finally {
                setSaving(false)
            }
        },
        [basePath]
    )

    const removerOrcamento = useCallback(
        async (categoryId: string, periodo: string) => {
            setError(null)
            setSaving(true)
            try {
                const key = `${categoryId}_${periodo}`
                await deleteDoc(doc(db, `${basePath}/orcamentos/${key}`))
            } catch (e: any) {
                console.error('[remove orcamento]', e)
                setError(e?.message ?? 'Erro ao remover orçamento.')
                throw e
            } finally {
                setSaving(false)
            }
        },
        [basePath]
    )

    // --- Funções de Alocação Orçamental (Inalteradas, mas completas para o retorno) ---
    const getBudgetAllocation = useCallback(
        async (periodo: string): Promise<BudgetAllocation> => {
            if (!isYYYYMM(periodo)) throw new Error('Período inválido (YYYY-MM).')
            try {
                const ref = doc(db, `${basePath}/allocations/${periodo}`)
                const snap = await getDoc(ref)
                if (!snap.exists()) return DEFAULT_ALLOCATION
                const d = snap.data() as Partial<BudgetAllocation>
                return {
                    necessidadePct: Number.isFinite(d.necessidadePct) ? Number(d.necessidadePct) : DEFAULT_ALLOCATION.necessidadePct,
                    vontadePct: Number.isFinite(d.vontadePct) ? Number(d.vontadePct) : DEFAULT_ALLOCATION.vontadePct,
                    poupancaPct: Number.isFinite(d.poupancaPct) ? Number(d.poupancaPct) : DEFAULT_ALLOCATION.poupancaPct,
                }
            } catch (e: any) {
                console.error('[get allocation]', e)
                setError(e?.message ?? 'Erro a ler alocação.')
                return DEFAULT_ALLOCATION
            }
        },
        [basePath]
    )

    const setBudgetAllocation = useCallback(
        async (periodo: string, alloc: BudgetAllocation) => {
            setError(null)
            setSaving(true)
            try {
                if (!isYYYYMM(periodo)) throw new Error('Período inválido.')
                
                await setDoc(
                    doc(db, `${basePath}/allocations/${periodo}`),
                    {
                        necessidadePct: alloc.necessidadePct,
                        vontadePct: alloc.vontadePct,
                        poupancaPct: alloc.poupancaPct,
                    },
                    { merge: true }
                )
            } catch (e: any) {
                console.error('[set allocation]', e)
                setError(e?.message ?? 'Erro ao definir alocação.')
                throw e
            } finally {
                setSaving(false)
            }
        },
        [basePath]
    )


    return {
        transacoes,
        orcamentos,
        debts,
        goals,
        investments,
        dividends,
        fxRate,
        netWorthSnapshots,
        budgetAllocations,
        saving,
        error,
        totais,
        saldo,
        dadosGraficoTempo,
        getTransacoesInRange,
        getTransacoesByMonth,
        getTransacoesByBounds,
        getBudgetAllocation,
        adicionarTransacao,
        removerTransacao,
        adicionarOrcamento,
        removerOrcamento,
        addDebt,
        updateDebt,
        removeDebt,
        addGoal,
        updateGoal,
        removeGoal,
        addInvestment,
        updateInvestment,
        removeInvestment,
        addDividend,
        updateDividend,
        removeDividend,
        setFxRate,
        upsertNetWorthSnapshot,
        setBudgetAllocation,
        clearAllFinancialData,
        resetAllHouseholdData,
    }
}