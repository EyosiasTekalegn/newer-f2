import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export interface Logistics {
  id: string;
  rentalId: string;
  type: "delivery" | "return";
  workers: string[];          // array of worker IDs
  items: Array<{
    itemVariantId: string;
    name: string;
    quantity: number;
  }>;
  timestamp: Date;
  notes?: string;
}

export interface Worker {
  id: string;
  name: string;
  phone: string;
  role: "driver" | "loader" | "unloader" | "supervisor";
  isActive: boolean;
  createdAt: Date;
}

const logisticsCollection = collection(db, 'logistics');
const workersCollection = collection(db, 'workers');

// --- Logistics CRUD ---
export const getAllLogistics = async (): Promise<Logistics[]> => {
  try {
    const snapshot = await getDocs(logisticsCollection);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        rentalId: data.rentalId,
        type: data.type,
        workers: data.workers || [],
        items: data.items || [],
        timestamp: data.timestamp?.toDate() || new Date(),
        notes: data.notes
      };
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'logistics', auth);
    throw error;
  }
};

export const getLogisticsForRental = async (rentalId: string): Promise<Logistics[]> => {
  try {
    const q = query(logisticsCollection, where('rentalId', '==', rentalId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        rentalId: data.rentalId,
        type: data.type,
        workers: data.workers || [],
        items: data.items || [],
        timestamp: data.timestamp?.toDate() || new Date(),
        notes: data.notes
      };
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `logistics/rental/${rentalId}`, auth);
    throw error;
  }
};

export const createLogistics = async (data: Omit<Logistics, 'id' | 'timestamp'>): Promise<string> => {
  try {
    const now = new Date();
    const docRef = await addDoc(logisticsCollection, {
      ...data,
      timestamp: Timestamp.fromDate(now)
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'logistics', auth);
    throw error;
  }
};

export const updateLogistics = async (id: string, data: Partial<Omit<Logistics, 'id' | 'timestamp'>>): Promise<void> => {
  try {
    const docRef = doc(db, 'logistics', id);
    await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `logistics/${id}`, auth);
    throw error;
  }
};

export const deleteLogistics = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'logistics', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `logistics/${id}`, auth);
    throw error;
  }
};

// --- Workers CRUD ---
export const getWorkers = async (): Promise<Worker[]> => {
  try {
    const snapshot = await getDocs(workersCollection);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        phone: data.phone,
        role: data.role,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'workers', auth);
    throw error;
  }
};

export const addWorker = async (data: Omit<Worker, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const now = new Date();
    const docRef = await addDoc(workersCollection, {
      ...data,
      createdAt: Timestamp.fromDate(now)
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'workers', auth);
    throw error;
  }
};

export const updateWorker = async (id: string, data: Partial<Omit<Worker, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, 'workers', id);
    await updateDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `workers/${id}`, auth);
    throw error;
  }
};

export const deleteWorker = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'workers', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `workers/${id}`, auth);
    throw error;
  }
};
