import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export interface Worker {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: "driver" | "loader" | "unloader" | "supervisor" | "admin";
  hourlyRate?: number;
  pieceRate?: number;        // per item loaded/unloaded
  isActive: boolean;
  joinDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const workersCollection = collection(db, 'workers');

export const getWorkers = async (): Promise<Worker[]> => {
  try {
    const snapshot = await getDocs(workersCollection);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        role: data.role || 'loader',
        hourlyRate: data.hourlyRate !== undefined ? Number(data.hourlyRate) : undefined,
        pieceRate: data.pieceRate !== undefined ? Number(data.pieceRate) : undefined,
        isActive: data.isActive !== undefined ? data.isActive : true,
        joinDate: data.joinDate?.toDate() || data.createdAt?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'workers', auth);
    throw error;
  }
};

export const getActiveWorkers = async (): Promise<Worker[]> => {
  try {
    const q = query(workersCollection, where('isActive', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        role: data.role || 'loader',
        hourlyRate: data.hourlyRate !== undefined ? Number(data.hourlyRate) : undefined,
        pieceRate: data.pieceRate !== undefined ? Number(data.pieceRate) : undefined,
        isActive: true,
        joinDate: data.joinDate?.toDate() || data.createdAt?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'active-workers', auth);
    throw error;
  }
};

export const getWorker = async (id: string): Promise<Worker | null> => {
  try {
    const docRef = doc(db, 'workers', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    return {
      id: snapshot.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      role: data.role || 'loader',
      hourlyRate: data.hourlyRate !== undefined ? Number(data.hourlyRate) : undefined,
      pieceRate: data.pieceRate !== undefined ? Number(data.pieceRate) : undefined,
      isActive: data.isActive !== undefined ? data.isActive : true,
      joinDate: data.joinDate?.toDate() || data.createdAt?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `workers/${id}`, auth);
    throw error;
  }
};

export const addWorker = async (data: Omit<Worker, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = new Date();
    const docRef = await addDoc(workersCollection, {
      name: data.name,
      phone: data.phone,
      email: data.email || '',
      role: data.role,
      hourlyRate: data.hourlyRate !== undefined ? Number(data.hourlyRate) : 0,
      pieceRate: data.pieceRate !== undefined ? Number(data.pieceRate) : 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
      joinDate: Timestamp.fromDate(data.joinDate || now),
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'workers', auth);
    throw error;
  }
};

export const updateWorker = async (id: string, data: Partial<Omit<Worker, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, 'workers', id);
    const updateData: any = { ...data, updatedAt: Timestamp.fromDate(new Date()) };
    if (data.joinDate) {
      updateData.joinDate = Timestamp.fromDate(data.joinDate);
    }
    await updateDoc(docRef, updateData);
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
