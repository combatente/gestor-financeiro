// src/components/DebtManagement.tsx
import { useState } from 'react'; // Apenas useState é necessário

// 1. Definição do Tipo de Dados
type DebtType = {
  id: string;
  name: string;
  originalAmount: number;
  currentBalance: number;
  interestRate: number; // Ex: 0.05 para 5%
  minimumPayment: number;
};

// Dados simulados iniciais
const initialDebts: DebtType[] = [
  { 
    id: 'd1', 
    name: 'Empréstimo Habitação', 
    originalAmount: 150000, 
    currentBalance: 120000, 
    interestRate: 0.035, 
    minimumPayment: 650 
  },
  { 
    id: 'd2', 
    name: 'Cartão de Crédito', 
    originalAmount: 500, 
    currentBalance: 320, 
    interestRate: 0.18, 
    minimumPayment: 25 
  },
];

const formatCurrency = (value: number) => value.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
const formatPercent = (value: number) => (value * 100).toFixed(2) + '%';

export default function DebtManagement() {
  const [debts, setDebts] = useState<DebtType[]>(initialDebts);
  const [amortizationInput, setAmortizationInput] = useState<{ [key: string]: number }>({});

  // 2. Função para adicionar uma nova dívida (Modal/Form simplificado)
  const handleAddDebt = () => {
    const name = prompt('Nome da nova dívida:')
    const originalAmount = prompt('Valor Original (EUR):')
    
    if (name && originalAmount) {
        const amount = Number(originalAmount)
        if (isNaN(amount) || amount <= 0) return alert('Valor inválido.')

        const newDebt: DebtType = {
            id: Date.now().toString(),
            name: name,
            originalAmount: amount,
            currentBalance: amount,
            interestRate: 0.05, // Valor padrão para simplificar
            minimumPayment: amount * 0.02,
        };
        setDebts([...debts, newDebt]);
    }
  };

  // 3. Função para registar um pagamento/abatimento (amortização)
  const handleAmortization = (debtId: string, value: number) => {
    if (value <= 0 || isNaN(value)) return alert('Insira um valor positivo válido.');
    
    setDebts(debts.map(debt => {
      if (debt.id === debtId) {
        // Reduzir o saldo, garantindo que não fica negativo
        const newBalance = Math.max(0, debt.currentBalance - value);
        return { ...debt, currentBalance: newBalance };
      }
      return debt;
    }));

    setAmortizationInput({ ...amortizationInput, [debtId]: 0 }); // Limpar input
    console.log(`Amortização registada para a dívida ${debtId} no valor de ${formatCurrency(value)}`); 
  };

  // 4. Função para liquidar/remover dívida
  const handleRemoveDebt = (debtId: string) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    const action = debt.currentBalance > 0 
        ? 'liquidar' 
        : 'remover';

    const confirmation = window.confirm(
        debt.currentBalance > 0
            ? `Tem a certeza que quer liquidar a dívida "${debt.name}"? Saldo pendente: ${formatCurrency(debt.currentBalance)}.`
            : `Tem a certeza que quer remover a dívida liquidada "${debt.name}"?`
    );

    if (confirmation) {
        setDebts(debts.filter(d => d.id !== debtId));
        console.log(`Dívida ${debtId} (${debt.name}) ${action} e removida.`);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-red-400">🚨 Gestão de Dívidas Ativas</h2>

      <div className="flex justify-end">
        <button onClick={handleAddDebt} className="bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded text-sm">
          + Adicionar Nova Dívida
        </button>
      </div>

      {/* Tabela de Dívidas */}
      <div className="card p-4">
        <h3 className="text-xl font-semibold mb-3">Lista de Dívidas</h3>
        
        {debts.length === 0 ? (
            <p className="text-neutral-400 italic">Não tem dívidas ativas registadas.</p>
        ) : (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                    <thead>
                        <tr className="text-neutral-400 text-sm">
                            <th className="py-2 text-left">Nome</th>
                            <th className="py-2 text-right">Saldo Atual</th>
                            <th className="py-2 text-right">Juros (Taxa)</th>
                            <th className="py-2 text-right">Pag. Mínimo</th>
                            <th className="py-2 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {debts.map((debt) => {
                            const progress = (1 - (debt.currentBalance / debt.originalAmount)) * 100;
                            const isLiquidated = debt.currentBalance <= 0;

                            return (
                                <tr key={debt.id} className={`${isLiquidated ? 'opacity-50' : ''}`}>
                                    <td className="py-3 font-medium">
                                        {debt.name}
                                        {isLiquidated && <span className="ml-2 text-green-400 text-xs">(Liquidada)</span>}
                                        <div className="w-full bg-slate-600 rounded-full h-1.5 mt-1">
                                            <div 
                                                className="bg-red-500 h-1.5 rounded-full" 
                                                style={{ width: `${Math.min(progress, 100)}%` }} 
                                            />
                                        </div>
                                    </td>
                                    <td className="py-3 text-right font-bold">{formatCurrency(debt.currentBalance)}</td>
                                    <td className="py-3 text-right">{formatPercent(debt.interestRate)}</td>
                                    <td className="py-3 text-right">{formatCurrency(debt.minimumPayment)}</td>
                                    <td className="py-3 text-right whitespace-nowrap">
                                        {!isLiquidated && (
                                            <div className="flex items-center justify-end gap-2">
                                                <input
                                                    type="number"
                                                    value={amortizationInput[debt.id] || ''}
                                                    onChange={(e) => setAmortizationInput({ 
                                                        ...amortizationInput, 
                                                        [debt.id]: Number(e.target.value) 
                                                    })}
                                                    placeholder="Valor"
                                                    className="input w-24 text-center p-1 text-sm bg-slate-700"
                                                    min="1"
                                                />
                                                <button
                                                    onClick={() => handleAmortization(debt.id, amortizationInput[debt.id] || 0)}
                                                    className="btn btn-sm px-3 bg-blue-600 hover:bg-blue-500 text-white"
                                                    disabled={!amortizationInput[debt.id] || amortizationInput[debt.id] <= 0}
                                                >
                                                    Abater
                                                </button>
                                            </div>
                                        )}
                                        <button 
                                            onClick={() => handleRemoveDebt(debt.id)} 
                                            className="btn btn-sm ml-2 px-3 text-red-400 hover:bg-red-400/10"
                                        >
                                            {isLiquidated ? 'Remover' : 'Liquidar'}
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      {/* Histórico de Amortizações */}
      <div className="pt-4 border-t border-white/10">
        <h3 className="text-xl font-semibold mb-3">Histórico de Abatimentos (Extraordinários)</h3>
        <p className="text-sm text-neutral-400 italic">Esta secção requer a integração com um histórico de transações.</p>
      </div>
    </div>
  );
}