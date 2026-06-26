import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  taxId?: string;
  paymentTerms?: string;      // e.g., "Net 30"
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const suppliersCollection = collection(db, 'suppliers');

export const getSuppliers = async (): Promise<Supplier[]> => {
  try {
    const snapshot = await getDocs(suppliersCollection);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        contactPerson: data.contactPerson || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        taxId: data.taxId || '',
        paymentTerms: data.paymentTerms || '',
        isActive: !!data.isActive,
        notes: data.notes || '',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'suppliers', auth);
    throw error;
  }
};

export const getSupplier = async (id: string): Promise<Supplier | null> => {
  try {
    const docRef = doc(db, 'suppliers', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      name: data.name || '',
      contactPerson: data.contactPerson || '',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      taxId: data.taxId || '',
      paymentTerms: data.paymentTerms || '',
      isActive: !!data.isActive,
      notes: data.notes || '',
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `suppliers/${id}`, auth);
    throw error;
  }
};

export const addSupplier = async (data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(suppliersCollection, {
      ...data,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'suppliers', auth);
    throw error;
  }
};

export const updateSupplier = async (id: string, data: Partial<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, 'suppliers', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.fromDate(new Date())
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `suppliers/${id}`, auth);
    throw error;
  }
};

export const deleteSupplier = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'suppliers', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `suppliers/${id}`, auth);
    throw error;
  }
};
