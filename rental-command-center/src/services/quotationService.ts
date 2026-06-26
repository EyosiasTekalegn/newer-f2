import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  size?: string;
  style?: string;
  pricePerUnit: number;
  currentStock: number;
}

export interface QuotationItem {
  itemVariantId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quotation {
  id: string;
  customerId: string;
  customerName: string;
  items: QuotationItem[];
  startDate: Date;
  endDate: Date;
  subtotal: number;
  tax: number;
  total: number;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Expired' | 'Converted';
  createdAt: Date;
  updatedAt: Date;
}

const quotationsCollection = collection(db, 'quotations');
const itemVariantsCollection = collection(db, 'itemVariants');

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  try {
    const snapshot = await getDocs(itemVariantsCollection);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        category: data.category || '',
        subcategory: data.subcategory || '',
        size: data.size || '',
        style: data.style || '',
        pricePerUnit: data.pricePerUnit || 0,
        currentStock: data.currentStock || 0,
      };
    });
  } catch (error: any) {
    handleFirestoreError(error, OperationType.LIST, 'itemVariants', auth);
  }
};

export const getQuotations = async (): Promise<Quotation[]> => {
  try {
    const snapshot = await getDocs(quotationsCollection);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        customerId: data.customerId,
        customerName: data.customerName,
        items: data.items || [],
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || new Date(),
        subtotal: data.subtotal || 0,
        tax: data.tax || 0,
        total: data.total || 0,
        status: data.status || 'Draft',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
  } catch (error: any) {
    handleFirestoreError(error, OperationType.LIST, 'quotations', auth);
  }
};

export const addQuotation = async (data: Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = new Date();
    const docRef = await addDoc(quotationsCollection, {
      ...data,
      startDate: Timestamp.fromDate(data.startDate),
      endDate: Timestamp.fromDate(data.endDate),
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });
    return docRef.id;
  } catch (error: any) {
    console.error('Firebase error adding quotation:', error);
    throw new Error(error.message || 'Failed to add quotation.');
  }
};

export const updateQuotation = async (id: string, data: Partial<Omit<Quotation, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, 'quotations', id);
    const updateData: any = {
      ...data,
      updatedAt: Timestamp.fromDate(new Date()),
    };
    if (data.startDate) updateData.startDate = Timestamp.fromDate(data.startDate);
    if (data.endDate) updateData.endDate = Timestamp.fromDate(data.endDate);

    await updateDoc(docRef, updateData);
  } catch (error: any) {
    console.error('Firebase error updating quotation:', error);
    throw new Error(error.message || 'Failed to update quotation.');
  }
};

export const deleteQuotation = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'quotations', id);
    await deleteDoc(docRef);
  } catch (error: any) {
    console.error('Firebase error deleting quotation:', error);
    throw new Error(error.message || 'Failed to delete quotation.');
  }
};

export const convertToBooking = async (id: string): Promise<void> => {
  try {
    await updateQuotation(id, { status: 'Converted' });
  } catch (error: any) {
    console.error('Firebase error converting quotation:', error);
    throw new Error(error.message || 'Failed to convert quotation.');
  }
};
