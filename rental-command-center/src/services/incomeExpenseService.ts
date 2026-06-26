import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getAllTransactions, createTransaction, AccountTransaction } from './bankService';

export interface IncomeExpenseSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}

export interface IncomeExpenseRecord {
  bankId: string;
  bankName: string;
  amount: number;
  description: string;
  referenceType: "booking" | "rental" | "procurement" | "expense" | "refund" | "deposit";
  referenceId?: string;
  date: Date;
}

export const getIncomeTransactions = async (startDate?: Date, endDate?: Date): Promise<AccountTransaction[]> => {
  try {
    const allTxs = await getAllTransactions();
    
    // Filter credit entries where referenceType is booking, rental, deposit, refund, or income
    const incomeTxs = allTxs.filter(tx => 
      tx.entryType === 'credit' && 
      ['booking', 'rental', 'deposit', 'refund'].includes(tx.referenceType)
    );

    return filterByDates(incomeTxs, startDate, endDate);
  } catch (error) {
    console.error("Error fetching income transactions:", error);
    throw error;
  }
};

export const getExpenseTransactions = async (startDate?: Date, endDate?: Date): Promise<AccountTransaction[]> => {
  try {
    const allTxs = await getAllTransactions();
    
    // Filter debit entries where referenceType is procurement, expense, maintenance
    const expenseTxs = allTxs.filter(tx => 
      tx.entryType === 'debit' && 
      ['procurement', 'expense', 'maintenance'].includes(tx.referenceType)
    );

    return filterByDates(expenseTxs, startDate, endDate);
  } catch (error) {
    console.error("Error fetching expense transactions:", error);
    throw error;
  }
};

export const getIncomeExpenseSummary = async (startDate?: Date, endDate?: Date): Promise<IncomeExpenseSummary> => {
  try {
    const incomes = await getIncomeTransactions(startDate, endDate);
    const expenses = await getExpenseTransactions(startDate, endDate);

    const totalIncome = incomes.reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpenses = expenses.reduce((sum, tx) => sum + tx.amount, 0);
    const netProfit = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      netProfit
    };
  } catch (error) {
    console.error("Error computing income/expense summary:", error);
    throw error;
  }
};

export const recordIncome = async (data: IncomeExpenseRecord): Promise<string> => {
  // To record income, we credit the bank ledger and debit the virtual Service Income account
  return createTransaction({
    debitAccountId: 'INCOME_ACCOUNT',
    debitAccountName: 'Service Income',
    creditAccountId: data.bankId,
    creditAccountName: data.bankName,
    amount: data.amount,
    description: data.description,
    referenceType: data.referenceType,
    referenceId: data.referenceId || 'N/A',
    date: data.date
  });
};

export const recordExpense = async (data: IncomeExpenseRecord): Promise<string> => {
  // To record expense, we debit the bank ledger (decrease it) and credit the virtual Operating Expense account
  return createTransaction({
    debitAccountId: data.bankId,
    debitAccountName: data.bankName,
    creditAccountId: 'EXPENSE_ACCOUNT',
    creditAccountName: 'Operating Expense',
    amount: data.amount,
    description: data.description,
    referenceType: data.referenceType,
    referenceId: data.referenceId || 'N/A',
    date: data.date
  });
};

export const generateIncomeStatement = async (startDate: Date, endDate: Date) => {
  try {
    const summary = await getIncomeExpenseSummary(startDate, endDate);
    const incomes = await getIncomeTransactions(startDate, endDate);
    const expenses = await getExpenseTransactions(startDate, endDate);

    // Group income by type
    const incomeByRef: Record<string, number> = {};
    incomes.forEach(tx => {
      incomeByRef[tx.referenceType] = (incomeByRef[tx.referenceType] || 0) + tx.amount;
    });

    // Group expenses by type
    const expenseByRef: Record<string, number> = {};
    expenses.forEach(tx => {
      expenseByRef[tx.referenceType] = (expenseByRef[tx.referenceType] || 0) + tx.amount;
    });

    return {
      period: {
        startDate,
        endDate
      },
      summary,
      incomeBreakdown: Object.entries(incomeByRef).map(([type, amount]) => ({ type, amount })),
      expenseBreakdown: Object.entries(expenseByRef).map(([type, amount]) => ({ type, amount }))
    };
  } catch (error) {
    console.error("Error generating income statement:", error);
    throw error;
  }
};

// Helper filter function
const filterByDates = (txs: AccountTransaction[], startDate?: Date, endDate?: Date): AccountTransaction[] => {
  if (!startDate && !endDate) return txs;
  
  return txs.filter(tx => {
    if (startDate && tx.date.getTime() < startDate.getTime()) return false;
    if (endDate) {
      // Set to end of day
      const endOfToday = new Date(endDate);
      endOfToday.setHours(23, 59, 59, 999);
      if (tx.date.getTime() > endOfToday.getTime()) return false;
    }
    return true;
  });
};
