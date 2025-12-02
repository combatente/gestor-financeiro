import { fmt } from '../utils/format'; // Depende da sua nova importação em utils/format
import BudgetBar from './BudgetBar';

// O nome do componente é o mesmo do ficheiro
export default function BudgetInputRow({ cat, limite, onLimitChange, spentForBudget, orcamentoExistente }: any) {
    
    const categoryLabel = `${cat.icon ? cat.icon + ' ' : ''}${cat.name}`;
    const { spent } = spentForBudget({
        categoryId: cat.id,
        periodo: orcamentoExistente?.periodo,
        limite: Number(limite) || 0, // Usar o limite do formulário para o cálculo
    });

    const isExisting = !!orcamentoExistente;
    const currentLimit = Number(limite) || 0;
    const remaining = currentLimit - spent;
    const isOver = remaining < 0 && currentLimit > 0;
    const statusText = currentLimit <= 0 ? 'Sem Orçamento' : isOver ? 'Ultrapassado' : 'Ativo';
    const statusColor = currentLimit <= 0 ? 'text-neutral-500' : isOver ? 'text-red-400' : 'text-emerald-400';

    return (
        <div className="card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Informação da Categoria / Gasto */}
            <div className="flex-grow min-w-[150px]">
                <div className="font-semibold text-sm">{categoryLabel}</div>
                <div className="text-xs text-neutral-400">
                    Gasto: <span className="font-medium">€{fmt(spent)}</span>
                    {' / '}
                    <span className={statusColor}>{statusText}</span>
                </div>
            </div>

            {/* Input do Limite */}
            <div className="flex-shrink-0 w-full md:w-40">
                <label htmlFor={`limit-${cat.id}`} className="sr-only">Limite para {cat.name}</label>
                <input
                    id={`limit-${cat.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={isExisting ? '0.00' : '—'}
                    value={limite || ''}
                    onChange={(e) => onLimitChange(cat.id, e.target.value)}
                    className="input w-full text-right"
                />
            </div>

            {/* Barra de Progresso e Restante */}
            <div className="flex-grow w-full md:w-auto mt-2 md:mt-0">
                <BudgetBar
                    value={spent}
                    max={currentLimit}
                    ariaLabel={`Progresso para ${cat.name}`}
                />
                <div className="mt-1 flex justify-between text-xs text-neutral-400">
                    <div>{currentLimit > 0 ? `${Math.round((spent / currentLimit) * 100)}%` : '0%'}</div>
                    {currentLimit > 0 && (
                        <div className={isOver ? 'text-red-400' : 'text-neutral-400'}>
                            {isOver ? 'A mais: ' : 'Por gastar: '}€{fmt(Math.abs(remaining))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}