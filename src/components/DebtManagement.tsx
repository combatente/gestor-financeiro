// DebtManagement.tsx (Versão Final Corrigida)
import React, { useState, useCallback, useMemo } from 'react';

// CORREÇÃO 1: Importar AddDebtInput e remover LocalDebtType não utilizado.
// A Transacao é mantida. 
// Assumimos que AddDebtInput e Transacao estão definidos e exportados corretamente em '../hooks/useFirestore'.
import { useFirestore, type Transacao, type AddDebtInput } from '../hooks/useFirestore'; 
import { DebtForm } from './DebtForm'; // Assegurar que este componente é o formulário pop-up


// Componente para mostrar uma transação de histórico
const HistoricoItem: React.FC<{ transacao: Transacao }> = ({ transacao }) => {
    const isPayment = transacao.valor > 0;
    const typeText = isPayment ? 'Pagamento' : 'Encargo/Criação';
    const amountClass = isPayment ? 'text-green-500' : 'text-red-500';

    return (
        <div className="flex justify-between items-center p-2 border-b border-gray-700">
            <div className="text-sm">
                <span className={`font-semibold ${amountClass}`}>{isPayment ? '+' : '-'} {transacao.valor.toFixed(2)}€</span>
                <span className="text-gray-400 ml-2">({typeText})</span>
            </div>
            <div className="text-xs text-gray-500">{transacao.data}</div>
        </div>
    );
};

// Componente para a Barra de Progresso da Dívida
const DebtProgress: React.FC<{ target: number, current: number }> = ({ target, current }) => {
    // Calculamos o montante já pago
    const paidAmount = target - current;
    // A percentagem é o montante pago sobre o montante alvo (montante total da dívida)
    const percentage = target > 0 ? (paidAmount / target) * 100 : 0;
    const roundedPercent = Math.min(100, Math.max(0, percentage)).toFixed(1);

    return (
        <div className="mt-2">
            <div className="flex justify-between mb-1 text-sm">
                <span className="text-gray-400">Progresso</span>
                <span className="font-semibold text-orange-400">{roundedPercent}%</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2.5">
                <div 
                    className="bg-orange-500 h-2.5 rounded-full" 
                    style={{ width: `${roundedPercent}%` }}
                ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
                {paidAmount.toFixed(2)}€ pagos de {target.toFixed(2)}€
            </div>
        </div>
    );
};


const DebtManagement: React.FC = () => {
    // isFormOpen controla se o modal DebtForm é visível ou não
    const [isFormOpen, setIsFormOpen] = useState(false); 
    const [error, setError] = useState<string | null>(null);

    const {
        debts,
        transacoes,
        addDebt,
        clearAllFinancialData,
    } = useFirestore();

    // Lógica e cálculos
    const totalCurrentDebt = useMemo(() => {
        return debts.reduce((sum, debt) => sum + (debt.currentAmount || 0), 0);
    }, [debts]);

    const debtTransactions = useMemo(() => {
        // Filtra por transações de dívida e ordena da mais recente para a mais antiga
        return transacoes
            .filter(t => t.type === 'divida')
            .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    }, [transacoes]);

    
    const handleAddDebt = useCallback(
        async (inputDebt: AddDebtInput) => { 
            setError(null);
            try {
                // CORREÇÃO 2: Criar o objeto de dívida final, adicionando o campo 'status'
                // que o useFirestore.ts exige (TS2345) e garantindo que 'category' e 'description' 
                // cumprem a tipagem (para TS2322).
                const debtPayload = {
                    ...inputDebt,
                    // Se o status estiver em falta no formulário, definimos como 'active'
                    status: (inputDebt as any).status || 'active', 
                    // Garante que 'category' e 'description' são strings, tratando undefined/null,
                    // caso o DebtForm tenha devolvido-os (parte do TS2322/TS2345).
                    category: inputDebt.category || '', 
                    description: (inputDebt as any).description || '',
                } as AddDebtInput; // Fazemos um cast para garantir que o tipo final é compatível

                await addDebt(debtPayload); 
                setIsFormOpen(false);
            } catch (e) {
                console.error('Erro ao adicionar dívida:', e);
                setError('Erro ao adicionar dívida. Verifique os dados.');
            }
        },
        [addDebt]
    );

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-3xl font-bold mb-4">Gestão de Dívidas 💰</h2>

            {/* Secção de Ações: Apenas Botões */}
            <div className="flex space-x-4 mb-6">
                <button 
                    onClick={() => setIsFormOpen(true)} // ABRIR O MODAL
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
                >
                    Adicionar Nova Dívida
                </button>
                {/* Botão para Limpar Dados (com aviso implícito) */}
                <button 
                    onClick={clearAllFinancialData}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-200"
                >
                    Limpar Todos os Dados Financeiros
                </button>
            </div>

            {error && <p className="text-red-500 bg-red-900/30 p-3 rounded">{error}</p>}

            {/* 1. TOTAL DE DÍVIDAS */}
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg w-full">
                <h3 className="text-xl font-semibold text-orange-400">
                    Total de Dívidas Existentes: 
                    <span className="text-white ml-2">
                        {totalCurrentDebt.toFixed(2)}€
                    </span>
                </h3>
            </div>

            {/* 2. DÍVIDAS INDIVIDUAIS */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold border-b border-gray-700 pb-3 mb-4">
                    Dívidas Individuais
                </h3>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {debts.length === 0 ? (
                        <p className="text-gray-500">Nenhuma dívida registada.</p>
                    ) : (
                        debts.map(debt => (
                            <div key={debt.id} className="bg-gray-700 p-4 rounded-lg border-l-4 border-orange-500">
                                <h4 className="text-lg font-bold text-white">{debt.name}</h4>
                                <p className="text-sm text-gray-400 mb-2">{debt.category || 'Não Classificado'}</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <p>Montante Inicial: <span className="font-semibold">{debt.targetAmount.toFixed(2)}€</span></p>
                                    <p>Saldo Atual: <span className="font-semibold text-red-400">{debt.currentAmount.toFixed(2)}€</span></p>
                                    <p>Pagamento Mínimo: <span className="font-semibold">{debt.minimumPayment.toFixed(2)}€</span></p>
                                    <p>Juro Anual: <span className="font-semibold">{debt.interestRate}%</span></p>
                                    <p className="col-span-2">Vencimento: <span className="font-semibold">{debt.dueDate}</span></p>
                                </div>
                                <DebtProgress target={debt.targetAmount} current={debt.currentAmount} />
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 3. HISTÓRICO DE ABATIMENTO/CRIAÇÃO */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold border-b border-gray-700 pb-3 mb-4">
                    Histórico de Movimentos (Pagamentos e Encargos)
                </h3>
                <div className="space-y-1 max-h-60 overflow-y-auto pr-2">
                    {debtTransactions.length === 0 ? (
                        <p className="text-gray-500">Nenhum movimento de dívida registado (Tipo 'divida').</p>
                    ) : (
                        debtTransactions.map(t => (
                            <HistoricoItem key={t.id} transacao={t} />
                        ))
                    )}
                </div>
            </div>

            {/* Modal de Adicionar Dívida - Só aparece se isFormOpen for true */}
            {isFormOpen && (
                <DebtForm
                    onClose={() => setIsFormOpen(false)}
                    onSubmit={handleAddDebt} 
                />
            )}
        </div>
    );
};

export default DebtManagement;