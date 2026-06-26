import { collection, doc, addDoc, updateDoc, getDocs, getDoc, query, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { createTransaction } from './bankService';

export interface DepositDeduction {
  reason: string;
  amount: number;
  itemVariantId?: string;
  description?: string;
}

export interface DepositHold {
  id: string;
  rentalId: string;
  customerId: string;
  customerName: string;       // denormalized
  amount: number;             // original deposit amount
  collectedAt: Date;          // when deposit was collected (at delivery)
  deductions: DepositDeduction[];
  refundAmount: number;       // calculated: amount - sum(deductions)
  refundedAt?: Date;          // when refund was processed
  status: "Active" | "Refunded" | "Forfeited";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const depositHoldsCollection = collection(db, 'depositHolds');

export const getDepositHolds = async (): Promise<DepositHold[]> => {
  try {
    const snapshot = await getDocs(depositHoldsCollection);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      const deductions = Array.isArray(data.deductions) ? data.deductions : [];
      const amount = Number(data.amount || 0);
      const totalDeductions = deductions.reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0);
      const refundAmount = Math.max(0, amount - totalDeductions);

      return {
        id: doc.id,
        rentalId: data.rentalId || '',
        customerId: data.customerId || '',
        customerName: data.customerName || 'Unknown Customer',
        amount,
        collectedAt: data.collectedAt?.toDate() || new Date(),
        deductions,
        refundAmount: data.refundAmount !== undefined ? Number(data.refundAmount) : refundAmount,
        refundedAt: data.refundedAt?.toDate(),
        status: (data.status || 'Active') as "Active" | "Refunded" | "Forfeited",
        notes: data.notes || '',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'depositHolds', auth);
    throw error;
  }
};

export const getDepositHoldForRental = async (rentalId: string): Promise<DepositHold | null> => {
  try {
    const q = query(depositHoldsCollection, where('rentalId', '==', rentalId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const data = doc.data();
    const deductions = Array.isArray(data.deductions) ? data.deductions : [];
    const amount = Number(data.amount || 0);
    const totalDeductions = deductions.reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0);
    const refundAmount = Math.max(0, amount - totalDeductions);

    return {
      id: doc.id,
      rentalId: data.rentalId || '',
      customerId: data.customerId || '',
      customerName: data.customerName || 'Unknown Customer',
      amount,
      collectedAt: data.collectedAt?.toDate() || new Date(),
      deductions,
      refundAmount: data.refundAmount !== undefined ? Number(data.refundAmount) : refundAmount,
      refundedAt: data.refundedAt?.toDate(),
      status: (data.status || 'Active') as "Active" | "Refunded" | "Forfeited",
      notes: data.notes || '',
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'depositHolds', auth);
    throw error;
  }
};

export const createDepositHold = async (data: {
  rentalId: string;
  customerId: string;
  customerName: string;
  amount: number;
  notes?: string;
}): Promise<string> => {
  try {
    const docRef = await addDoc(depositHoldsCollection, {
      rentalId: data.rentalId,
      customerId: data.customerId,
      customerName: data.customerName,
      amount: Number(data.amount),
      collectedAt: Timestamp.fromDate(new Date()),
      deductions: [],
      refundAmount: Number(data.amount),
      status: 'Active',
      notes: data.notes || '',
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'depositHolds', auth);
    throw error;
  }
};

export const addDeduction = async (
  depositId: string,
  deduction: { reason: string; amount: number; itemVariantId?: string; description?: string }
): Promise<void> => {
  try {
    const docRef = doc(db, 'depositHolds', depositId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Deposit hold record not found");

    const data = snap.data();
    const currentDeductions = Array.isArray(data.deductions) ? data.deductions : [];
    const updatedDeductions = [...currentDeductions, deduction];
    
    const amount = Number(data.amount || 0);
    const totalDeductions = updatedDeductions.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const refundAmount = Math.max(0, amount - totalDeductions);

    await updateDoc(docRef, {
      deductions: updatedDeductions,
      refundAmount,
      updatedAt: Timestamp.fromDate(new Date())
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `depositHolds/${depositId}`, auth);
    throw error;
  }
};

export const calculateRefund = async (depositId: string): Promise<number> => {
  try {
    const docRef = doc(db, 'depositHolds', depositId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return 0;
    const data = snap.data();
    const amount = Number(data.amount || 0);
    const deductions = Array.isArray(data.deductions) ? data.deductions : [];
    const totalDeductions = deductions.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    return Math.max(0, amount - totalDeductions);
  } catch (error) {
    console.error("Error calculating refund:", error);
    return 0;
  }
};

export const processRefund = async (depositId: string, bankId: string, notes?: string): Promise<void> => {
  try {
    const docRef = doc(db, 'depositHolds', depositId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Deposit hold record not found");

    const data = snap.data();
    if (data.status !== 'Active') {
      throw new Error("Only Active deposit holds can be refunded.");
    }

    const amount = Number(data.amount || 0);
    const deductions = Array.isArray(data.deductions) ? data.deductions : [];
    const totalDeductions = deductions.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const refundAmount = Math.max(0, amount - totalDeductions);

    // Fetch bank ledger details to get accountName
    const bankSnap = await getDoc(doc(db, 'bankLedgers', bankId));
    if (!bankSnap.exists()) throw new Error("Bank ledger not found");
    const bankName = bankSnap.data().name;

    // Create refund transaction: Debit Customer Deposits liability, Credit Selected Bank Ledger
    await createTransaction({
      debitAccountId: 'CUSTOMER_DEPOSITS_LIABILITY',
      debitAccountName: 'Customer Deposits Liability',
      creditAccountId: bankId,
      creditAccountName: bankName,
      amount: refundAmount,
      description: `Security deposit refund for Customer: ${data.customerName || 'Unknown'}, Rental ID: ${data.rentalId || 'N/A'}${notes ? ' - ' + notes : ''}`,
      referenceType: 'refund',
      referenceId: data.rentalId || depositId,
      date: new Date()
    });

    await updateDoc(docRef, {
      status: 'Refunded',
      refundAmount,
      refundedAt: Timestamp.fromDate(new Date()),
      notes: notes ? (data.notes ? data.notes + '\n' + notes : notes) : data.notes,
      updatedAt: Timestamp.fromDate(new Date())
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `depositHolds/${depositId}`, auth);
    throw error;
  }
};

export const forfeitDeposit = async (depositId: string, notes?: string): Promise<void> => {
  try {
    const docRef = doc(db, 'depositHolds', depositId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Deposit hold record not found");

    const data = snap.data();
    if (data.status !== 'Active') {
      throw new Error("Only Active deposit holds can be forfeited.");
    }

    await updateDoc(docRef, {
      status: 'Forfeited',
      refundAmount: 0,
      refundedAt: Timestamp.fromDate(new Date()),
      notes: notes ? (data.notes ? data.notes + '\n' + notes : notes) : data.notes,
      updatedAt: Timestamp.fromDate(new Date())
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `depositHolds/${depositId}`, auth);
    throw error;
  }
};

export interface DepositSummary {
  totalActive: number;
  totalRefunded: number;
  totalForfeited: number;
  totalDeductions: number;
}

export const getDepositSummary = async (): Promise<DepositSummary> => {
  try {
    const holds = await getDepositHolds();
    let totalActive = 0;
    let totalRefunded = 0;
    let totalForfeited = 0;
    let totalDeductions = 0;

    for (const h of holds) {
      const activeDeductionsSum = h.deductions.reduce((sum, d) => sum + Number(d.amount || 0), 0);
      totalDeductions += activeDeductionsSum;

      if (h.status === 'Active') {
        totalActive += h.amount;
      } else if (h.status === 'Refunded') {
        totalRefunded += h.refundAmount;
      } else if (h.status === 'Forfeited') {
        totalForfeited += h.amount;
      }
    }

    return {
      totalActive,
      totalRefunded,
      totalForfeited,
      totalDeductions
    };
  } catch (error) {
    console.error("Error computing deposit summary:", error);
    throw error;
  }
};
