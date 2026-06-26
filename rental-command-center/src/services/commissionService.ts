import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { getWorker } from './workerService';
import { getAllLogistics } from './logisticsService';

export interface WorkerCommission {
  id: string;
  workerId: string;
  workerName: string;        // denormalized
  rentalId: string;          // reference to the rental
  rentalReference: string;   // e.g., rental ID or customer name
  type: "loading" | "unloading";
  itemsHandled: Array<{
    itemVariantId: string;
    name: string;
    quantity: number;
  }>;
  totalItems: number;        // sum of all item quantities
  pieceRate: number;         // rate per item at time of commission
  totalAmount: number;       // totalItems * pieceRate
  status: "Pending" | "Approved" | "Paid";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const commissionsCollection = collection(db, 'workerCommissions');

export const getCommissions = async (workerId?: string, month?: string): Promise<WorkerCommission[]> => {
  try {
    const snapshot = await getDocs(commissionsCollection);
    let records = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        workerId: data.workerId,
        workerName: data.workerName,
        rentalId: data.rentalId,
        rentalReference: data.rentalReference || data.rentalId || '',
        type: data.type,
        itemsHandled: data.itemsHandled || [],
        totalItems: Number(data.totalItems) || 0,
        pieceRate: Number(data.pieceRate) || 0,
        totalAmount: Number(data.totalAmount) || 0,
        status: data.status || 'Pending',
        notes: data.notes,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as WorkerCommission;
    });

    if (workerId && workerId !== 'All') {
      records = records.filter(r => r.workerId === workerId);
    }

    if (month) {
      records = records.filter(r => {
        const year = r.createdAt.getFullYear();
        const m = String(r.createdAt.getMonth() + 1).padStart(2, '0');
        return `${year}-${m}` === month;
      });
    }

    return records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'workerCommissions', auth);
    throw error;
  }
};

export const getCommissionsForRental = async (rentalId: string): Promise<WorkerCommission[]> => {
  try {
    const q = query(commissionsCollection, where('rentalId', '==', rentalId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        workerId: data.workerId,
        workerName: data.workerName,
        rentalId: data.rentalId,
        rentalReference: data.rentalReference || data.rentalId || '',
        type: data.type,
        itemsHandled: data.itemsHandled || [],
        totalItems: Number(data.totalItems) || 0,
        pieceRate: Number(data.pieceRate) || 0,
        totalAmount: Number(data.totalAmount) || 0,
        status: data.status || 'Pending',
        notes: data.notes,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as WorkerCommission;
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `workerCommissions/rental/${rentalId}`, auth);
    throw error;
  }
};

export const calculateTotalItems = async (rentalId: string, workerId: string, type: "loading" | "unloading"): Promise<{
  items: Array<{ itemVariantId: string; name: string; quantity: number }>;
  totalItems: number;
}> => {
  try {
    const logs = await getAllLogistics();
    const logisticsType = type === 'loading' ? 'delivery' : 'return';
    const relevantLogs = logs.filter(log => log.rentalId === rentalId && log.type === logisticsType && log.workers.includes(workerId));

    const itemMap = new Map<string, { itemVariantId: string; name: string; quantity: number }>();
    let totalItems = 0;

    relevantLogs.forEach(log => {
      log.items.forEach(it => {
        const existing = itemMap.get(it.itemVariantId);
        if (existing) {
          existing.quantity += it.quantity;
        } else {
          itemMap.set(it.itemVariantId, { itemVariantId: it.itemVariantId, name: it.name, quantity: it.quantity });
        }
        totalItems += it.quantity;
      });
    });

    return {
      items: Array.from(itemMap.values()),
      totalItems
    };
  } catch (error) {
    console.error('Failed to calculate items from logistics', error);
    return { items: [], totalItems: 0 };
  }
};

export const generateCommission = async (
  rentalId: string,
  type: "loading" | "unloading",
  workerId: string,
  customItems?: Array<{ itemVariantId: string; name: string; quantity: number }>,
  customPieceRate?: number
): Promise<string> => {
  try {
    const worker = await getWorker(workerId);
    if (!worker) throw new Error('Worker profile not found');

    let itemsHandled = customItems;
    let totalItems = 0;

    if (!itemsHandled) {
      const calculation = await calculateTotalItems(rentalId, workerId, type);
      itemsHandled = calculation.items;
      totalItems = calculation.totalItems;
    } else {
      totalItems = itemsHandled.reduce((acc, current) => acc + current.quantity, 0);
    }

    const pieceRate = customPieceRate !== undefined ? customPieceRate : (worker.pieceRate || 0);
    const totalAmount = totalItems * pieceRate;

    // Fetch rental or use a placeholder name
    let rentalReference = `Rental ${rentalId.slice(0, 8)}`;
    try {
      const rentalSnap = await getDoc(doc(db, 'rentals', rentalId));
      if (rentalSnap.exists()) {
        rentalReference = rentalSnap.data().customerName || rentalReference;
      }
    } catch {
      // Ignored, fallback to placeholder
    }

    const now = new Date();
    const docRef = await addDoc(commissionsCollection, {
      workerId,
      workerName: worker.name,
      rentalId,
      rentalReference,
      type,
      itemsHandled,
      totalItems,
      pieceRate,
      totalAmount,
      status: 'Pending',
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'workerCommissions/generate', auth);
    throw error;
  }
};

export const updateCommission = async (id: string, data: Partial<Omit<WorkerCommission, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, 'workerCommissions', id);
    const updateData: any = { ...data, updatedAt: Timestamp.fromDate(new Date()) };
    
    // Recalculate total if items or pieceRate changes
    if (data.itemsHandled !== undefined || data.pieceRate !== undefined) {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const current = snap.data();
        const items = data.itemsHandled !== undefined ? data.itemsHandled : (current.itemsHandled || []);
        const totalItems = items.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0);
        const pieceRate = data.pieceRate !== undefined ? Number(data.pieceRate) : (Number(current.pieceRate) || 0);
        
        updateData.itemsHandled = items;
        updateData.totalItems = totalItems;
        updateData.pieceRate = pieceRate;
        updateData.totalAmount = totalItems * pieceRate;
      }
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `workerCommissions/${id}`, auth);
    throw error;
  }
};

export const deleteCommission = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'workerCommissions', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `workerCommissions/${id}`, auth);
    throw error;
  }
};

export const approveCommission = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'workerCommissions', id);
    await updateDoc(docRef, {
      status: 'Approved',
      updatedAt: Timestamp.fromDate(new Date())
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `workerCommissions/${id}/approve`, auth);
    throw error;
  }
};

export const payCommission = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'workerCommissions', id);
    await updateDoc(docRef, {
      status: 'Paid',
      updatedAt: Timestamp.fromDate(new Date())
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `workerCommissions/${id}/pay`, auth);
    throw error;
  }
};
