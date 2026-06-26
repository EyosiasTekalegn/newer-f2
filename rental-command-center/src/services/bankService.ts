import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, orderBy, Timestamp, writeBatch } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export interface BankLedger {
  id: string;
  name: string;               // "CBE", "Awash", "Telebirr", "Cash"
  accountNumber?: string;
  initialBalance: number;     // starting balance when ledger was created
  currentBalance: number;     // running balance (updated via transactions)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountTransaction {
  id: string;
  transactionId: string;      // grouping ID for related debits/credits
  entryType: "debit" | "credit";
  accountId: string;          // bank ledger ID or other account ID
  accountName: string;        // denormalized
  amount: number;
  description: string;        // e.g., "Payment from customer"
  referenceType: "booking" | "rental" | "procurement" | "expense" | "refund" | "deposit";
  referenceId: string;        // ID of the related document
  date: Date;
  createdAt: Date;
}

const bankLedgersCollection = collection(db, 'bankLedgers');
const accountTransactionsCollection = collection(db, 'accountTransactions');

// Auto-seed default bank ledgers if none exist
const seedDefaultLedgers = async (): Promise<void> => {
  try {
    const snapshot = await getDocs(bankLedgersCollection);
    if (snapshot.empty) {
      const defaults = [
        { name: 'CBE', accountNumber: '1000123456789', initialBalance: 50000, currentBalance: 50000, isActive: true },
        { name: 'Awash', accountNumber: '0132098765432', initialBalance: 30000, currentBalance: 30000, isActive: true },
        { name: 'Telebirr', accountNumber: '0911000000', initialBalance: 15000, currentBalance: 15000, isActive: true },
        { name: 'Cash', accountNumber: 'Physical Wallet', initialBalance: 5000, currentBalance: 5000, isActive: true }
      ];

      for (const item of defaults) {
        await addDoc(bankLedgersCollection, {
          ...item,
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date())
        });
      }
    }
  } catch (error) {
    console.error("Failed to seed default bank ledgers:", error);
  }
};

export const getBankLedgers = async (): Promise<BankLedger[]> => {
  try {
    await seedDefaultLedgers();
    const snapshot = await getDocs(bankLedgersCollection);
    const ledgers = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        accountNumber: data.accountNumber,
        initialBalance: Number(data.initialBalance || 0),
        currentBalance: Number(data.currentBalance || 0),
        isActive: !!data.isActive,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    });
    return ledgers;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'bankLedgers', auth);
    throw error;
  }
};

export const addBankLedger = async (data: Omit<BankLedger, 'id' | 'createdAt' | 'updatedAt' | 'currentBalance'>): Promise<string> => {
  try {
    const docRef = await addDoc(bankLedgersCollection, {
      ...data,
      currentBalance: data.initialBalance,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'bankLedgers', auth);
    throw error;
  }
};

export const updateBankLedger = async (id: string, data: Partial<Omit<BankLedger, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, 'bankLedgers', id);
    const updateData: any = {
      ...data,
      updatedAt: Timestamp.fromDate(new Date())
    };
    await updateDoc(docRef, updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bankLedgers/${id}`, auth);
    throw error;
  }
};

export const deleteBankLedger = async (id: string): Promise<void> => {
  try {
    // Check if transactions exist
    const q = query(accountTransactionsCollection, where('accountId', '==', id));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      throw new Error("Cannot delete bank ledger because transactions exist on it.");
    }

    const docRef = doc(db, 'bankLedgers', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `bankLedgers/${id}`, auth);
    throw error;
  }
};

export const getBankTransactions = async (bankId: string): Promise<AccountTransaction[]> => {
  try {
    const q = query(accountTransactionsCollection, where('accountId', '==', bankId));
    const snapshot = await getDocs(q);
    const txs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
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
    // Sort client side to bypass missing composite index in firestore
    return txs.sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'accountTransactions', auth);
    throw error;
  }
};

export const getAllTransactions = async (): Promise<AccountTransaction[]> => {
  try {
    const snapshot = await getDocs(accountTransactionsCollection);
    const txs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
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
    return txs.sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'accountTransactions', auth);
    throw error;
  }
};

export interface DoubleEntryData {
  debitAccountId: string;
  debitAccountName: string;
  creditAccountId: string;
  creditAccountName: string;
  amount: number;
  description: string;
  referenceType: "booking" | "rental" | "procurement" | "expense" | "refund" | "deposit";
  referenceId: string;
  date: Date;
}

export const createTransaction = async (data: DoubleEntryData): Promise<string> => {
  try {
    const transactionId = 'TX-' + Math.random().toString(36).substring(2, 11).toUpperCase();
    const batch = writeBatch(db);

    const debitDocRef = doc(accountTransactionsCollection);
    const creditDocRef = doc(accountTransactionsCollection);

    const debitEntry = {
      transactionId,
      entryType: 'debit',
      accountId: data.debitAccountId,
      accountName: data.debitAccountName,
      amount: data.amount,
      description: data.description,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      date: Timestamp.fromDate(data.date),
      createdAt: Timestamp.fromDate(new Date())
    };

    const creditEntry = {
      transactionId,
      entryType: 'credit',
      accountId: data.creditAccountId,
      accountName: data.creditAccountName,
      amount: data.amount,
      description: data.description,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      date: Timestamp.fromDate(data.date),
      createdAt: Timestamp.fromDate(new Date())
    };

    batch.set(debitDocRef, debitEntry);
    batch.set(creditDocRef, creditEntry);

    // Update balances of the ledgers if they are valid ledger IDs
    // Standard rule: Debit decreases bank ledger, Credit increases bank ledger, matching prompt description
    const ledgerRefs = [data.debitAccountId, data.creditAccountId];
    for (const lid of ledgerRefs) {
      const ledgerDocRef = doc(db, 'bankLedgers', lid);
      const ledgerSnap = await getDoc(ledgerDocRef);
      if (ledgerSnap.exists()) {
        const currentBal = Number(ledgerSnap.data().currentBalance || 0);
        let updatedBal = currentBal;

        if (lid === data.creditAccountId) {
          // Income or credit entry increases the ledger balance
          // Except if referenceType is "refund" or "expense" or "procurement"
          if (["expense", "procurement", "refund"].includes(data.referenceType)) {
            updatedBal -= data.amount;
          } else {
            updatedBal += data.amount;
          }
        } else if (lid === data.debitAccountId) {
          // Debit entry decreases the ledger balance
          // Except if referenceType is "booking" or "rental" or "deposit"
          if (["booking", "rental", "deposit"].includes(data.referenceType)) {
            updatedBal += data.amount;
          } else {
            updatedBal -= data.amount;
          }
        }

        batch.update(ledgerDocRef, {
          currentBalance: updatedBal,
          updatedAt: Timestamp.fromDate(new Date())
        });
      }
    }

    await batch.commit();
    return transactionId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'accountTransactions', auth);
    throw error;
  }
};

export const getRunningBalance = async (bankId: string): Promise<number> => {
  try {
    const ledgerRef = doc(db, 'bankLedgers', bankId);
    const ledgerSnap = await getDoc(ledgerRef);
    if (!ledgerSnap.exists()) return 0;
    
    const initial = Number(ledgerSnap.data().initialBalance || 0);
    const txs = await getBankTransactions(bankId);

    let running = initial;
    // Walk from oldest to newest to compute running balance
    const sortedTxs = [...txs].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    for (const tx of sortedTxs) {
      const isIncoming = ["booking", "rental", "deposit"].includes(tx.referenceType);
      const isOutgoing = ["procurement", "expense", "refund"].includes(tx.referenceType);
      
      if (isIncoming) {
        running += tx.amount;
      } else if (isOutgoing) {
        running -= tx.amount;
      } else {
        // Fallback to entryType
        if (tx.entryType === 'credit') {
          running += tx.amount;
        } else {
          running -= tx.amount;
        }
      }
    }
    return running;
  } catch (error) {
    console.error("Error computing running balance:", error);
    return 0;
  }
};
