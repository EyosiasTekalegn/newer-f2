import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { logAction, computeChanges } from './auditLogService';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdAt: Date;
}

const customersCollection = collection(db, 'customers');

export const getCustomers = async (): Promise<Customer[]> => {
  const snapshot = await getDocs(customersCollection);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || '',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
    };
  });
};

export const addCustomer = async (data: Omit<Customer, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(customersCollection, {
      ...data,
      createdAt: Timestamp.fromDate(new Date()),
    });

    // Log action
    await logAction({
      action: 'create',
      module: 'customers',
      recordId: docRef.id,
      recordName: data.name
    });

    return docRef.id;
  } catch (error: any) {
    console.error('Firebase error adding customer:', error);
    throw new Error(error.message || 'Failed to add customer. Please check your connection and try again.');
  }
};

export const updateCustomer = async (id: string, data: Partial<Omit<Customer, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, 'customers', id);
    const docSnap = await getDoc(docRef);
    let oldData: any = null;
    if (docSnap.exists()) {
      oldData = docSnap.data();
    }

    await updateDoc(docRef, data);

    if (oldData) {
      const changes = computeChanges(oldData, data);
      await logAction({
        action: 'update',
        module: 'customers',
        recordId: id,
        recordName: oldData.name || 'Unknown Customer',
        changes
      });
    }
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
};

export const deleteCustomer = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'customers', id);
    const docSnap = await getDoc(docRef);
    let oldName = 'Unknown Customer';
    if (docSnap.exists()) {
      oldName = docSnap.data().name || 'Unknown Customer';
    }

    await deleteDoc(docRef);

    await logAction({
      action: 'delete',
      module: 'customers',
      recordId: id,
      recordName: oldName
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
};

