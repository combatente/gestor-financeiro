// src/components/SavingsGoals.tsx
import { useState } from 'react';

// --- Tipos ---

type SavingGoal = {
  id: string;
  name: string;
  targetAmount: number; // Montante a atingir
  currentAmount: number; // Saldo atual
};

type GoalCardProps = {
    goal: SavingGoal;
    onContribute: (goalId: string, value: number) => void;
    onWithdraw: (goalId: string, value: number) => void;
};

const initialGoals: SavingGoal[] = [
  { id: '1', name: 'Fundo de Emergência', targetAmount: 5000, currentAmount: 3200 },
  { id: '2', name: 'Viagem a Bali', targetAmount: 3000, currentAmount: 150 },
];

// --- Novo Componente GoalCard ---
/**
 * Componente separado para renderizar um cartão de meta.
 * Isto permite o uso válido de 'useState' dentro dele.
 */
const GoalCard: React.FC<GoalCardProps> = ({ goal, onContribute, onWithdraw }) => {
    // ✅ CORREÇÃO: O Hook useState agora está no topo do componente GoalCard
    const [contributionValue, setContributionValue] = useState<number>(100);
    
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
    const isCompleted = goal.currentAmount >= goal.targetAmount;

    return (
        <div key={goal.id} className="p-4 border border-white/10 rounded-lg space-y-3 bg-white/5">
            <h3 className="text-xl font-semibold">{isCompleted ? '✅ ' : '🎯 '}{goal.name}</h3>
            
            <p className="text-neutral-400 text-sm">
              **Objetivo:** {goal.targetAmount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
            </p>
            
            <p className="text-lg">
              **Atual:** <span className="text-green-300 font-bold">{goal.currentAmount.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>
            </p>

            {/* Barra de Progresso */}
            <div className="w-full bg-neutral-600 rounded-full h-2.5">
                <div 
                  className="bg-green-500 h-2.5 rounded-full" 
                  style={{ width: `${Math.min(progress, 100)}%` }} 
                />
            </div>
            <p className={`text-sm ${isCompleted ? 'text-green-400' : 'text-neutral-300'}`}>
              Progresso: **{Math.min(progress, 100).toFixed(1)}%**
            </p>

            {/* Ações */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                <input
                  type="number"
                  value={contributionValue}
                  onChange={(e) => setContributionValue(Number(e.target.value))}
                  min="1"
                  className="input w-24 text-center p-1"
                />
                <button
                  onClick={() => onContribute(goal.id, contributionValue)}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-sm py-1 px-3 rounded whitespace-nowrap"
                >
                  Contribuir
                </button>
                <button
                  onClick={() => onWithdraw(goal.id, contributionValue)}
                  className="bg-red-600 hover:bg-red-500 text-white text-sm py-1 px-3 rounded whitespace-nowrap"
                >
                  Levantar
                </button>
            </div>
        </div>
    );
};
// --- Componente Principal ---

export default function SavingsGoals() {
  const [goals, setGoals] = useState<SavingGoal[]>(initialGoals);

  /**
   * Função para adicionar uma nova meta
   */
  const handleAddGoal = () => {
    const newGoalName = prompt('Qual o nome da nova meta?')
    const newGoalTarget = prompt('Qual o valor alvo (Target Amount)?')

    if (newGoalName && newGoalTarget) {
      const target = Number(newGoalTarget)
      if (isNaN(target) || target <= 0) {
        alert('O valor alvo tem que ser um número positivo.');
        return;
      }

      const newGoal: SavingGoal = {
        id: Date.now().toString(), // ID simples
        name: newGoalName,
        targetAmount: target,
        currentAmount: 0,
      };
      setGoals([...goals, newGoal]);
    }
  };

  /**
   * Função para registar uma contribuição (aumento)
   */
  const handleContribute = (goalId: string, value: number) => {
    if (value <= 0 || isNaN(value)) return;
    setGoals(goals.map(goal =>
      goal.id === goalId
        ? { ...goal, currentAmount: goal.currentAmount + value }
        : goal
    ));
  };

  /**
   * Função para registar um levantamento (redução)
   */
  const handleWithdraw = (goalId: string, value: number) => {
    if (value <= 0 || isNaN(value)) return;
    setGoals(goals.map(goal => {
      if (goal.id === goalId) {
        // Não permitir saldo negativo
        const newAmount = Math.max(0, goal.currentAmount - value);
        return { ...goal, currentAmount: newAmount };
      }
      return goal;
    }));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-green-400">💰 Poupança e Metas de Investimento</h2>

      <div className="flex justify-end">
        <button 
          onClick={handleAddGoal} 
          className="bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded text-sm"
        >
          + Adicionar Nova Meta
        </button>
      </div>

      {/* Lista de Metas de Poupança (Cards/Tabela) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ✅ Chamada correta do novo componente */}
        {goals.map(goal => (
            <GoalCard 
                key={goal.id} 
                goal={goal} 
                onContribute={handleContribute} 
                onWithdraw={handleWithdraw} 
            />
        ))}

        {goals.length === 0 && (
            <p className="text-neutral-400 italic md:col-span-2">Não tem metas de poupança ativas. Adicione uma para começar!</p>
        )}
      </div>
      
      {/* Histórico de movimentações (mantido comentado) */}
    </div>
  );
}