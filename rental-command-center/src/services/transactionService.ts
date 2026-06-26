import { collection, doc, getDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getAllTransactions, AccountTransaction } from './bankService';

export const getTransactionsFiltered = async (filters?: {
  startDate?: Date;
  endDate?: Date;
  bankId?: string;
  entryType?: 'debit' | 'credit';
  referenceType?: string;
}): Promise<AccountTransaction[]> => {
  try {
    let txs = await getAllTransactions();

    if (filters) {
      if (filters.bankId && filters.bankId !== 'all') {
        txs = txs.filter(tx => tx.accountId === filters.bankId);
      }
      if (filters.entryType) {
        txs = txs.filter(tx => tx.entryType === filters.entryType);
      }
      if (filters.referenceType && filters.referenceType !== 'all') {
        txs = txs.filter(tx => tx.referenceType === filters.referenceType);
      }
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        txs = txs.filter(tx => tx.date.getTime() >= start.getTime());
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        txs = txs.filter(tx => tx.date.getTime() <= end.getTime());
      }
    }

    return txs;
  } catch (error) {
    console.error("Error filtering transactions:", error);
    throw error;
  }
};

export const getTransaction = async (id: string): Promise<AccountTransaction | null> => {
  try {
    const docRef = doc(db, 'accountTransactions', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      transactionId: data.transactionId,
      entryType: data.entryType as "debit" | "credit",
      accountId: data.accountId,
      accountName: data.accountName,
      amount: Number(data.amount || 0),
      description: data.description || '',
      referenceType: data.referenceType as any,
      referenceId: data.referenceId || '',
      date: data.date?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date()
    };
  } catch (error) {
    console.error("Error fetching single transaction:", error);
    throw error;
  }
};

export const getTransactionByReference = async (referenceId: string): Promise<AccountTransaction[]> => {
  try {
    const txsCollection = collection(db, 'accountTransactions');
    const q = query(txsCollection, where('referenceId', '==', referenceId));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        transactionId: data.transactionId,
        entryType: data.entryType as "debit" | "credit",
        accountId: data.accountId,
        accountName: data.accountName,
        amount: Number(data.amount || 0),
        description: data.description || '',
        referenceType: data.referenceType as any,
        referenceId: data.referenceId || '',
        date: data.date?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date()
      };
    });
  } catch (error) {
    console.error("Error fetching transaction by reference:", error);
    throw error;
  }
};
