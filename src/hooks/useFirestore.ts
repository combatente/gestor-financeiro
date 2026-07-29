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

export type FirestoreHookResult = {
    transacoes: Transacao[];
    orcamentos: Orcamento[];
    debts: DebtType[];
    goals: GoalType[];
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
    setBudgetAllocation: (periodo: string, alloc: BudgetAllocation) => Promise<void>;
    clearAllFinancialData: () => Promise<void>;
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

        unsubRefs.current = [unsubT, unsubO, unsubA, unsubD, unsubG]
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
            const key = d.toISOString().slice(0, 7)
            mesesMap[key] = { receitas: 0, despesas: 0, poupancas: 0 }
        }

        transacoes.forEach((t) => {
            const d = new Date(t.data)
            if (d < from || d > to) return
            const key = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 7)
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
        setBudgetAllocation,
        clearAllFinancialData,
    }
}