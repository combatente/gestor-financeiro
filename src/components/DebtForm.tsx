// DebtForm.tsx — versão corrigida
import React, { useState } from 'react';
// Importamos AddDebtInput e LocalDebtType (se AddDebtInput for Omit<LocalDebtType, 'id' | 'createdAt'>)
// Assumimos que AddDebtInput e LocalDebtType estão definidos em '../hooks/useFirestore'
import type { AddDebtInput } from '../hooks/useFirestore';

// A interface DebtFormProps usa AddDebtInput para garantir o tipo de dados esperado.
interface DebtFormProps {
    onClose: () => void;
    // O onSubmit deve aceitar o AddDebtInput e pode retornar uma Promessa
    onSubmit: (debt: AddDebtInput) => Promise<void>; 
}

export const DebtForm = ({ onClose, onSubmit }: DebtFormProps) => { 
    // Campos de texto simples
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Empréstimo Pessoal');
    
    // States para Montantes e Taxas (melhor gerir como strings para inputs numéricos)
    const [initialDebtAmountInput, setInitialDebtAmountInput] = useState('');
    const [currentDebtAmountInput, setCurrentDebtAmountInput] = useState(''); 
    const [interestRateInput, setInterestRateInput] = useState('');
    const [minPaymentInput, setMinPaymentInput] = useState('');
    const [targetDate, setTargetDate] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Conversão e Leitura dos Inputs
        // Substituir vírgula por ponto para garantir que o Number() funciona corretamente
        const initialDebtAmount = Number(initialDebtAmountInput.replace(/,/g, '.'));
        const currentDebtAmount = Number(currentDebtAmountInput.replace(/,/g, '.')); 
        const interestRatePercent = Number(interestRateInput.replace(/,/g, '.'));
        const minPayment = Number(minPaymentInput.replace(/,/g, '.'));

        // 2. Validação dos Campos
        if (
            !name.trim() || // Valida nome (e remove espaços em branco)
            !category.trim() || // Valida categoria
            isNaN(initialDebtAmount) || initialDebtAmount <= 0 ||
            isNaN(currentDebtAmount) || currentDebtAmount < 0 || // Saldo pode ser 0 (dívida paga)
            currentDebtAmount > initialDebtAmount || // CRUCIAL: Saldo atual não pode exceder o Montante Inicial
            isNaN(interestRatePercent) ||
            isNaN(minPayment) || minPayment < 0 ||
            !targetDate // Valida data
        ) {
            alert('Preencha todos os campos corretamente. Verifique se: 1) O Montante Inicial é positivo. 2) O Saldo Atual é não negativo e não excede o Montante Inicial. 3) O Nome e a Data estão preenchidos.');
            return;
        }

        // Determinar o status da dívida com base no Saldo Atual
        const statusValue = currentDebtAmount <= 0 ? 'paid' : 'active';

        // 3. Objeto de Dívida com Nomenclatura Sincronizada (Usando AddDebtInput)
        const newDebt: AddDebtInput = {
            name: name.trim(),
            description: description.trim() || null, 
            category: category.trim() || null,
            targetAmount: initialDebtAmount, // Montante Inicial
            currentAmount: currentDebtAmount, // Saldo Atual
            interestRate: interestRatePercent, // Juro
            minimumPayment: minPayment,
            dueDate: targetDate, // Mapeamento para dueDate
            // CORREÇÃO CRÍTICA: Incluímos 'status' que é um campo esperado por AddDebtInput
            status: statusValue, 
        };

        // 4. Envio e Fecho
        onSubmit(newDebt);
        // Opcionalmente, pode fechar o modal aqui se não estiver à espera que o onSubmit trate disso
        // onClose(); 
    };

    // Estilos Tailwind CSS (Apenas Placeholder - Adapte aos seus ficheiros CSS)
    const inputClasses = "w-full p-2 border border-gray-600 bg-gray-700 rounded text-white focus:ring-orange-500 focus:border-orange-500";
    const labelClasses = "block text-sm font-medium text-gray-300 mt-3";
    const buttonClasses = "py-2 px-4 rounded font-bold transition duration-200";

    return (
        // Modal Backdrop e Content (usando classes genéricas para o exemplo)
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 modal-backdrop">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md modal-content">
                <h3 className="text-2xl font-bold text-white mb-4">Adicionar Nova Dívida</h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    <div>
                        <label className={labelClasses}>Nome da Dívida</label>
                        <input className={inputClasses} value={name} onChange={e => setName(e.target.value)} required />
                    </div>

                    <div>
                        <label className={labelClasses}>Descrição (Opcional)</label>
                        <input className={inputClasses} value={description} onChange={e => setDescription(e.target.value)} />
                    </div>

                    <div>
                        <label className={labelClasses}>Categoria</label>
                        <select className={inputClasses} value={category} onChange={e => setCategory(e.target.value)} required>
                            <option>Crédito Habitação</option>
                            <option>Empréstimo Pessoal</option>
                            <option>Cartão de Crédito</option>
                            <option>Outro</option>
                        </select>
                    </div>

                    <div>
                        <label className={labelClasses}>Montante Inicial (Total Emprestado - €)</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            className={inputClasses}
                            value={initialDebtAmountInput} 
                            onChange={e => setInitialDebtAmountInput(e.target.value)} 
                            required 
                            min="0.01"
                        />
                    </div>

                    <div>
                        <label className={labelClasses}>Saldo Atual (€)</label> 
                        <input 
                            type="number" 
                            step="0.01" 
                            className={inputClasses}
                            value={currentDebtAmountInput} 
                            onChange={e => setCurrentDebtAmountInput(e.target.value)} 
                            required 
                            min="0"
                        />
                    </div>

                    <div>
                        <label className={labelClasses}>Taxa de Juro (%)</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            className={inputClasses}
                            value={interestRateInput} 
                            onChange={e => setInterestRateInput(e.target.value)} 
                            required 
                            min="0"
                        />
                    </div>

                    <div>
                        <label className={labelClasses}>Pagamento Mínimo (€)</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            className={inputClasses}
                            value={minPaymentInput} 
                            onChange={e => setMinPaymentInput(e.target.value)} 
                            required 
                            min="0"
                        />
                    </div>

                    <div>
                        <label className={labelClasses}>Data Vencimento (Alvo)</label>
                        <input 
                            type="date" 
                            className={inputClasses}
                            value={targetDate} 
                            onChange={e => setTargetDate(e.target.value)} 
                            required 
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 form-actions">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className={`${buttonClasses} bg-gray-600 hover:bg-gray-500 text-white`}
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className={`${buttonClasses} bg-orange-600 hover:bg-orange-700 text-white primary`}
                        >
                            Registar Dívida
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};