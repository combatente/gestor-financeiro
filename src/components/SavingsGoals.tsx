// src/components/SavingsManagement.tsx

import { useState, useMemo, useCallback } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import type { GoalType, Transacao } from '../hooks/useFirestore';

// --- 1. Tipos de Dados e Categorias ---

type AssetClass = 'CASH' | 'STOCKS' | 'ETFS' | 'CRYPTO' | 'RETIREMENT' | 'OTHER';

const ASSET_CLASS_LABELS: { [key in AssetClass]: string } = {
    CASH: 'Caixa / Conta Poupança',
    STOCKS: 'Ações (Diretas)',
    ETFS: 'ETFs / Fundos de Índice',
    CRYPTO: 'Criptomoedas (BTC, ETH, etc.)',
    RETIREMENT: 'PPR / Planos de Reforma',
    OTHER: 'Outros Investimentos',
};

type GoalHistoryItem = {
    id: string;
    date: Date;
    description: string;
    type: 'CONTRIBUTION' | 'WITHDRAWAL';
    amount: number;
    goalName: string;
};

// --- Funções Auxiliares de Formatação ---
const formatCurrency = (value: number) =>
    value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });

const formatPercent = (value: number) =>
    (value * 100).toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';

// Função auxiliar para validar e formatar datas
const normalizeDateInput = (dateString: string): string | null => {
    // Substitui barras por hífens e garante o formato YYYY-MM-DD
    const normalized = dateString.replace(/\//g, '-');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;

    const dateObj = new Date(normalized);
    // Verifica se é uma data válida (exclui 'Invalid Date')
    if (isNaN(dateObj.getTime())) return null;

    // Retorna a string formatada AAAA-MM-DD
    return normalized;
};


// --- Componente Principal ---

export default function SavingsManagement() {
    
    // 💡 1. IMPORTAR CORRETO MÉTODO: clearAllFinancialData
    const {
        goals,
        transacoes,
        addGoal,
        updateGoal,
        adicionarTransacao,
        saving,
        error,
        clearAllFinancialData // <--- CORRIGIDO
    } = useFirestore();

    const [inputValues, setInputValues] = useState<{ [key: string]: number }>({});
    const [showAddForm, setShowAddForm] = useState(false);

    // --- 2. Mapeamento do Histórico de Poupança (Transações) ---
    const goalHistory = useMemo(() => {
        return transacoes
            .filter(t =>
                // Filtra APENAS movimentos associados a uma meta (goalId), que são os manuais (CONTRIBUTION/WITHDRAWAL).
                // O saldo inicial de uma meta é registado com goalId, mas sem descrição ou categoria definida, 
                // e é normalmente filtrado por uma lógica mais complexa, mas aqui filtramos APENAS o saldo inicial
                // se tiver a descrição "Registo inicial..." que adicionamos no handler.
                t.type === 'poupanca' &&
                t.valor !== null &&
                t.valor !== 0 &&
                t.goalId &&
                !String(t.descricao).includes('Registo inicial da meta:') // Exclui a transação de saldo inicial se tiver a descrição padrão
            )
            .map(t => {
                const isContribution = t.valor! > 0;
                let historyType: GoalHistoryItem['type'] = 'CONTRIBUTION';

                if (!isContribution) {
                    historyType = 'WITHDRAWAL';
                }

                // Encontra o nome da meta
                const goal = goals.find(g => g.id === t.goalId);
                const goalName = goal ? goal.name : t.categoria || 'Meta Desconhecida';


                return {
                    id: t.id!,
                    date: new Date(t.data),
                    description: t.descricao || (isContribution ? 'Contribuição manual' : 'Levantamento manual'),
                    type: historyType,
                    amount: Math.abs(t.valor!),
                    goalName: goalName,
                } as GoalHistoryItem;
            })
            .sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [transacoes, goals]);

    // --- 3. Lógica para o Dashboard de Distribuição (KPI) ---

    const assetDistribution = useMemo(() => {
        const distribution: { [key in AssetClass]?: number } = {};
        let totalInvested = 0;

        goals.forEach(goal => {
            const current = goal.currentAmount || 0;
            totalInvested += current;
            distribution[goal.assetClass as AssetClass] = (distribution[goal.assetClass as AssetClass] || 0) + current;
        });

        const sortedDistribution = Object.entries(distribution)
            .sort(([, amountA], [, amountB]) => amountB - amountA) as [AssetClass, number][];

        return { totalInvested, sortedDistribution };
    }, [goals]);


    const calculateProgressMetrics = (goal: GoalType) => {
        const targetAmount = goal.targetAmount || 0;
        const currentAmount = goal.currentAmount || 0;

        const remainingAmount = targetAmount - currentAmount;

        // 1. Cálculos de Tempo (targetDate e startDate vêm como strings YYYY-MM-DD do Firestore)
        const targetDateObj = goal.targetDate ? new Date(goal.targetDate) : new Date();
        const startDateObj = goal.startDate ? new Date(goal.startDate) : new Date();

        const totalTimeMs = targetDateObj.getTime() - startDateObj.getTime();
        const elapsedTimeMs = Date.now() - startDateObj.getTime();

        const timeElapsedRatio = totalTimeMs > 0 ? Math.min(1, elapsedTimeMs / totalTimeMs) : 0;

        const daysRemaining = Math.max(0, Math.ceil((targetDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

        // 2. Cálculos Financeiros
        const financialProgressRatio = targetAmount > 0 ? currentAmount / targetAmount : 0;
        const progress = financialProgressRatio * 100;
        const isCompleted = financialProgressRatio >= 1;

        // 3. Lógica de Status Dinâmico
        let statusText = 'No Prazo';
        let statusColor = 'text-green-400';

        if (isCompleted) {
            statusText = 'Concluído';
            statusColor = 'text-green-500';
        } else if (daysRemaining <= 60 && remainingAmount > 0) {
            statusText = 'Em Risco (Prazo Curto)';
            statusColor = 'text-red-400';
        } else if (financialProgressRatio < timeElapsedRatio * 0.9) {
            statusText = 'Atrasado';
            statusColor = 'text-yellow-500';
        }

        return {
            daysRemaining,
            progress,
            timeElapsedRatio,
            statusText,
            statusColor,
            isCompleted,
            targetDateObj
        };
    };

    // 4. Função para Adicionar Nova Meta (AGORA USA FIRESTORE)
    const handleAddGoal = useCallback(async (data: {
        name: string,
        description: string,
        targetAmount: number,
        initialAmount: number,
        targetDate: string,
        assetClass: AssetClass
    }) => {
        // A validação de data está agora mais robusta no componente GoalForm
        const targetDateISO = normalizeDateInput(data.targetDate);

        if (!targetDateISO) {
             console.error('Data Alvo inválida no handleAddGoal');
             throw new Error('Data Alvo Inválida. Use o formato AAAA-MM-DD.');
        }

        try {
            
            // O targetDate já vem formatado como AAAA-MM-DD
            const newGoal = {
                name: data.name,
                description: data.description || 'Nenhuma descrição fornecida.',
                targetAmount: data.targetAmount,
                currentAmount: data.initialAmount, 
                startDate: new Date().toISOString().slice(0, 10), 
                targetDate: targetDateISO, 
                assetClass: data.assetClass,
            };

            const goalRef = await addGoal(newGoal);
            const newGoalId = goalRef?.id;

            // Transação inicial - esta deve ser filtrada do histórico manual, mas fica na transacoes
            if (newGoalId && data.initialAmount > 0) {
                // A descrição aqui é CRUCIAL para o filtro no useMemo (goalHistory)
                await adicionarTransacao({
                    type: 'poupanca',
                    valor: data.initialAmount, 
                    data: new Date().toISOString().slice(0, 10),
                    categoria: data.name,
                    descricao: `Registo inicial da meta: ${data.name}. Objetivo: ${formatCurrency(data.targetAmount)}.`,
                    goalId: newGoalId,
                } as Transacao);
            }

            setShowAddForm(false);
        } catch (e) {
            console.error("Erro ao adicionar meta (Firestore ou Transação):", e);
            throw e; 
        }
    }, [addGoal, adicionarTransacao]);


    // 5. Lógica de Contribuição/Levantamento (AGORA USA FIRESTORE)
    const handleGoalTransaction = useCallback(async (goalId: string, amount: number, type: 'CONTRIBUTION' | 'WITHDRAWAL') => {
        const cleanAmount = Number(amount) > 0 ? Number(amount) : 0;
        if (cleanAmount <= 0 || saving) return;

        const goalToUpdate = goals.find(g => g.id === goalId);
        if (!goalToUpdate) return;

        let newAmount = goalToUpdate.currentAmount || 0;
        let transactionValue: number;
        let descriptionText: string;

        if (type === 'CONTRIBUTION') {
            newAmount += cleanAmount;
            transactionValue = cleanAmount; 
            descriptionText = `Contribuição manual para a meta: ${goalToUpdate.name}.`;
        } else if (type === 'WITHDRAWAL') {
            if (cleanAmount > goalToUpdate.currentAmount) {
                alert("Não pode levantar mais dinheiro do que o saldo atual da meta.");
                return;
            }
            newAmount -= cleanAmount;
            transactionValue = -cleanAmount; 
            descriptionText = `Levantamento manual da meta: ${goalToUpdate.name}.`;
        } else {
            return;
        }

        try {
            // 1. Atualizar o saldo da meta (Coleção 'assets')
            await updateGoal(goalId, { currentAmount: newAmount });

            // 2. Adicionar a transação (Coleção 'transacoes')
            await adicionarTransacao({
                type: 'poupanca',
                valor: transactionValue,
                data: new Date().toISOString().slice(0, 10),
                categoria: goalToUpdate.name,
                // Usar descrição padrão para o histórico manual
                descricao: descriptionText, 
                goalId: goalId, 
            } as Transacao);

        } catch (e) {
            console.error("Erro ao realizar transação:", e);
            alert("Erro ao guardar a transação. Verifique a consola.");
        } finally {
            setInputValues(prev => {
                const newState = { ...prev };
                delete newState[goalId];
                return newState;
            });
        }
    }, [updateGoal, adicionarTransacao, goals, saving]);


    // --- Componente de Formulário de Adição de Meta ---

    const GoalForm = () => {
        const [name, setName] = useState('');
        const [description, setDescription] = useState('');
        const [targetAmountInput, setTargetAmountInput] = useState<string>(''); 
        const [initialAmountInput, setInitialAmountInput] = useState<string>('0'); // Default para 0
        const [targetDate, setTargetDate] = useState('');
        const [assetClass, setAssetClass] = useState<AssetClass>('CASH');

        const handleSubmit = async (e: React.FormEvent) => { 
            e.preventDefault();

            // Substitui vírgula por ponto para garantir a conversão de número
            const targetAmount = Number(targetAmountInput.replace(',', '.'));
            const initialAmount = Number(initialAmountInput.replace(',', '.'));
            const normalizedDate = normalizeDateInput(targetDate);
            
            if (
                name && 
                targetAmount > 0 && 
                normalizedDate && // Validada
                assetClass && 
                !isNaN(targetAmount) && 
                !isNaN(initialAmount) &&
                initialAmount <= targetAmount // Saldo inicial não pode ser superior ao objetivo
            ) {
                
                try {
                    await handleAddGoal({
                        name,
                        description,
                        targetAmount,
                        initialAmount,
                        targetDate: normalizedDate, // Passa a data já formatada
                        assetClass
                    });
                } catch (e) {
                    alert("Erro ao guardar a meta. Por favor, verifique a consola para mais detalhes e certifique-se que todos os valores estão corretos.");
                }

            } else {
                alert('Erro ao guardar a meta. Por favor, verifique se todos os valores estão corretos (apenas números positivos, saldo inicial <= objetivo, e formato de data AAAA-MM-DD).');
            }
        };

        const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
            // Permite apenas números, ponto e vírgula. Limpa outros caracteres.
            setter(e.target.value.replace(/[^0-9,.]/g, '')); 
        };

        return (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20">
                <div className="bg-slate-900 p-6 rounded-lg w-full max-w-md shadow-2xl border border-green-600">
                    <h3 className="text-xl font-bold mb-4 text-green-400">🎯 Adicionar Nova Meta de Poupança</h3>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input
                            type="text"
                            placeholder="Nome da Meta (Ex: Fundo de Emergência)"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                            required
                        />
                        <textarea
                            placeholder="Descrição (Opcional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="textarea w-full p-2 bg-slate-700 border border-slate-600 rounded resize-none text-white"
                            rows={2}
                        />
                         <label className="text-sm text-neutral-400 block pt-1">
                             Classe de Ativo:
                             <select
                                 value={assetClass}
                                 onChange={(e) => setAssetClass(e.target.value as AssetClass)}
                                 className="input w-full p-2 bg-slate-700 border border-slate-600 rounded mt-1 text-white"
                                 required
                             >
                                 {Object.entries(ASSET_CLASS_LABELS).map(([key, label]) => (
                                     <option key={key} value={key}>{label}</option>
                                 ))}
                             </select>
                         </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Objetivo Total (EUR) - Ex: 10000"
                            value={targetAmountInput}
                            onChange={(e) => handleAmountChange(e, setTargetAmountInput)}
                            className="input w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                            min="1"
                            required
                        />
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="Saldo Inicial (Já poupado) - Ex: 1000"
                                value={initialAmountInput}
                                onChange={(e) => handleAmountChange(e, setInitialAmountInput)}
                                className="input w-full p-2 bg-slate-700 border border-slate-600 rounded text-white"
                                required
                            />
                         <label className="text-sm text-neutral-400 block pt-1">
                             Data Alvo (Formato AAAA-MM-DD):
                             <input
                                type="text"
                                value={targetDate}
                                onChange={(e) => setTargetDate(e.target.value)}
                                className="input w-full p-2 bg-slate-700 border border-slate-600 rounded mt-1 text-white"
                                placeholder="Ex: 2030-12-24" 
                                required
                            />
                         </label>
                            <div className="flex justify-end space-x-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="bg-neutral-600 hover:bg-neutral-500 text-white font-bold py-2 px-4 rounded"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                                    disabled={saving}
                                >
                                    {saving ? 'A Guardar...' : 'Criar Meta'}
                                </button>
                            </div>
                    </form>
                </div>
            </div>
        );
    };


    // Mostrar erro global do Firestore, se houver
    if (error) {
        return <div className="p-4 bg-red-900/50 text-red-300 rounded-lg">Erro ao carregar dados: {error}</div>;
    }


    return (
        <div className="space-y-8 relative">
            {showAddForm && <GoalForm />}

            <h2 className="text-2xl font-bold text-green-400">💰 Poupança e Metas de Investimento</h2>

            {/* --- KPI DO PATRIMÓNIO TOTAL --- */}
            <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
                <p className="text-sm text-neutral-400 mb-1">Valor Total de Património (Metas):</p>
                <p className="text-3xl font-extrabold text-green-400">
                    {formatCurrency(assetDistribution.totalInvested)}
                </p>
                
                {/* Distribuição por Classe de Ativo */}
                <div className="mt-4 pt-3 border-t border-slate-700/50">
                    <h4 className="text-sm font-semibold text-neutral-300 mb-2">Distribuição por Classe de Ativo</h4>
                    {assetDistribution.sortedDistribution.map(([assetClass, amount]) => (
                        <div key={assetClass} className="flex justify-between text-xs py-1">
                            <span className="text-neutral-400">{ASSET_CLASS_LABELS[assetClass]}</span>
                            <span className="font-semibold text-white">{formatCurrency(amount)} ({formatPercent(amount / assetDistribution.totalInvested)})</span>
                        </div>
                    ))}
                    {assetDistribution.sortedDistribution.length === 0 && (
                        <p className="text-xs text-neutral-500 italic">Nenhuma distribuição registada.</p>
                    )}
                </div>
            </div>
            {/* ------------------------------------- */}

            {/* --- BOTÕES DE AÇÃO --- */}
            <div className="flex justify-end space-x-3"> 
                
                {/* --- BOTÃO DE LIMPEZA GERAL --- */}
                <button
                    onClick={() => {
                        if (window.confirm("ATENÇÃO: Tem a certeza que deseja apagar TODOS os dados de metas e movimentos de poupança/investimento? Esta ação é IRREVERSÍVEL. Irá limpar as Metas, Dívidas, Orçamentos e Transações associadas.")) {
                            // 💡 Chamada CORRIGIDA
                            clearAllFinancialData(); 
                        }
                    }}
                    className="bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded text-sm disabled:opacity-50"
                    // Desativa se estiver a guardar ou se não houver metas para apagar
                    disabled={saving || goals.length === 0} 
                >
                    🗑️ Limpar Todos os Dados
                </button>
                {/* ------------------------------------- */}
                
                <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded text-sm"
                    disabled={saving}
                >
                    {saving ? 'A Guardar...' : '+ Adicionar Nova Meta'}
                </button>
            </div>

            {/* --- Cartões de Metas (Loop através das metas) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.length === 0 ? (
                    <p className="text-neutral-400 italic col-span-full">Não tem metas de poupança ativas. Clique em "Adicionar Nova Meta" para começar.</p>
                ) : (
                    goals.map((goal) => {
                        const metrics = calculateProgressMetrics(goal);
                        const { daysRemaining, progress, statusText, statusColor, isCompleted, targetDateObj } = metrics;

                        // Lógica para cor e ícone da categoria
                        const assetLabel = ASSET_CLASS_LABELS[goal.assetClass as AssetClass];
                        const assetIcon =
                            goal.assetClass === 'STOCKS' ? '📈' :
                            goal.assetClass === 'ETFS' ? '🧺' :
                            goal.assetClass === 'CRYPTO' ? '₿' :
                            goal.assetClass === 'RETIREMENT' ? '👵' :
                            '💵';

                        return (
                            <div key={goal.id} className={`card p-5 rounded-xl shadow-lg border-2 ${isCompleted ? 'border-green-500 bg-slate-800' : 'border-slate-700 bg-slate-900'}`}>
                                <h3 className="text-xl font-bold text-green-400 mb-2">{goal.name}</h3>
                                <p className="text-sm text-neutral-400 italic mb-2">{goal.description}</p>

                                <p className="text-xs text-neutral-500 mb-4 font-semibold p-1 bg-slate-800 rounded inline-block">
                                    {assetIcon} Categoria: {assetLabel}
                                </p>

                                <p className={`text-center font-bold text-sm mb-4 p-2 rounded ${statusColor} border ${statusColor.replace('text', 'border')}/30`}>
                                    Status: {statusText}
                                </p>

                                <div className="grid grid-cols-2 gap-y-2 mb-4 text-sm">
                                    <div>
                                        <span className="text-neutral-500">Objetivo:</span>
                                        <span className="font-semibold text-white ml-2">{formatCurrency(goal.targetAmount)}</span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500">Data Alvo:</span>
                                        <span className="font-semibold text-white ml-2">{targetDateObj.toLocaleDateString('pt-PT')}</span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500">Atual:</span>
                                        <span className="font-extrabold text-green-500 ml-2">{formatCurrency(goal.currentAmount)}</span>
                                    </div>
                                    <div>
                                        <span className="text-neutral-500">Dias Restantes:</span>
                                        <span className="font-semibold text-yellow-400 ml-2">{daysRemaining}</span>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="flex justify-between text-xs text-neutral-400">
                                        <span>Progresso Financeiro</span>
                                        <span className="font-bold text-white">{formatPercent(progress / 100)}</span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-2.5 mt-1">
                                        <div
                                            className={`h-2.5 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-green-600'}`}
                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-700">
                                    <h4 className="text-neutral-300 font-semibold mb-2">Fazer Transação:</h4>
                                    <input
                                        type="number"
                                        placeholder="Montante (€)"
                                        value={inputValues[goal.id] || ''}
                                        onChange={(e) => setInputValues({ ...inputValues, [goal.id]: Number(e.target.value) })}
                                        className="input w-full p-2 bg-slate-700 border border-slate-600 rounded mb-2 text-white"
                                        min="1"
                                        required
                                    />
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleGoalTransaction(goal.id, inputValues[goal.id] || 0, 'CONTRIBUTION')}
                                            disabled={!inputValues[goal.id] || inputValues[goal.id] <= 0 || saving}
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-3 rounded text-sm disabled:opacity-50"
                                        >
                                            ➕ Contribuir
                                        </button>
                                        <button
                                            onClick={() => handleGoalTransaction(goal.id, inputValues[goal.id] || 0, 'WITHDRAWAL')}
                                            disabled={!inputValues[goal.id] || inputValues[goal.id] <= 0 || inputValues[goal.id] > goal.currentAmount || saving}
                                            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-3 rounded text-sm disabled:opacity-50"
                                        >
                                            ➖ Retirar
                                        </button>
                                    </div>
                                </div>

                            </div>
                        )
                    })
                )}
            </div>

            {/* --- Histórico de Movimentos (Transações de Poupança) --- */}
            <div className="pt-8 border-t border-white/10">
                <h3 className="text-xl font-semibold mb-4 text-neutral-300">Histórico de Movimentos (Contribuições/Levantamentos Manuais)</h3>
                <div className="divide-y divide-slate-700/50">
                    {goalHistory.length === 0 ? (
                        <p className="text-neutral-400 italic py-2">Nenhum movimento manual de poupança/investimento registado.</p>
                    ) : (
                        goalHistory.slice(0, 10).map((item) => {
                            const isContribution = item.type === 'CONTRIBUTION';
                            const amountDisplay = formatCurrency(Math.abs(item.amount));
                            const colorClass = isContribution ? 'text-green-400' : 'text-red-400';

                            return ( 
                                <div key={item.id} className="flex justify-between items-center py-2 px-1 hover:bg-slate-800 transition duration-100">
                                    <div className="flex-1">
                                        <span className="text-sm font-semibold text-neutral-200">{item.description}</span>
                                        <p className="text-xs text-neutral-500">Meta: {item.goalName}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`font-extrabold ${colorClass}`}>
                                            {isContribution ? '+' : '-'} {amountDisplay}
                                        </span>
                                        <p className="text-xs text-neutral-500">{item.date.toLocaleDateString('pt-PT')}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}