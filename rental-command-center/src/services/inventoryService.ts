import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export interface ItemVariant {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  size?: string;
  style?: string;
  pricePerUnit: number;
  currentStock: number;
  minStockAlert?: number;
  createdAt: Date;
  updatedAt: Date;
}

const itemVariantsCollection = collection(db, 'itemVariants');
const inventoryMovementsCollection = collection(db, 'inventoryMovements');

export const getItemVariants = async (): Promise<ItemVariant[]> => {
  try {
    const snapshot = await getDocs(itemVariantsCollection);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        category: data.category,
        subcategory: data.subcategory,
        size: data.size,
        style: data.style,
        pricePerUnit: Number(data.pricePerUnit) || 0,
        currentStock: Number(data.currentStock) || 0,
        minStockAlert: data.minStockAlert !== undefined ? Number(data.minStockAlert) : undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'itemVariants', auth);
    throw error;
  }
};

export const getItemVariant = async (id: string): Promise<ItemVariant | null> => {
  try {
    const docRef = doc(db, 'itemVariants', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    return {
      id: snapshot.id,
      name: data.name,
      category: data.category,
      subcategory: data.subcategory,
      size: data.size,
      style: data.style,
      pricePerUnit: Number(data.pricePerUnit) || 0,
      currentStock: Number(data.currentStock) || 0,
      minStockAlert: data.minStockAlert !== undefined ? Number(data.minStockAlert) : undefined,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `itemVariants/${id}`, auth);
    throw error;
  }
};

export const addItemVariant = async (data: Omit<ItemVariant, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = new Date();
    const docRef = await addDoc(itemVariantsCollection, {
      ...data,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });
    
    // Log initial procurement/addition movement
    await addDoc(inventoryMovementsCollection, {
      itemVariantId: docRef.id,
      date: Timestamp.fromDate(now),
      fromState: 'Available', // dummy from
      toState: 'Available',
      quantity: data.currentStock,
      referenceType: 'procurement',
      referenceId: docRef.id,
      note: 'Initial stock addition',
      createdAt: Timestamp.fromDate(now)
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'itemVariants', auth);
    throw error;
  }
};

export const updateItemVariant = async (id: string, data: Partial<Omit<ItemVariant, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, 'itemVariants', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.fromDate(new Date())
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `itemVariants/${id}`, auth);
    throw error;
  }
};

export const deleteItemVariant = async (id: string): Promise<void> => {
  try {
    // Check if any bookings or rentals reference this item variant
    const bookingsSnap = await getDocs(collection(db, 'bookings'));
    const bookingsReferencing = bookingsSnap.docs.some(doc => {
      const items = doc.data().items || [];
      return items.some((item: any) => item.itemVariantId === id);
    });

    if (bookingsReferencing) {
      throw new Error('Cannot delete item variant: Referenced in active or past bookings.');
    }

    const rentalsSnap = await getDocs(collection(db, 'rentals'));
    const rentalsReferencing = rentalsSnap.docs.some(doc => {
      const items = doc.data().items || [];
      return items.some((item: any) => item.itemVariantId === id);
    });

    if (rentalsReferencing) {
      throw new Error('Cannot delete item variant: Referenced in active or past rentals.');
    }

    const docRef = doc(db, 'itemVariants', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `itemVariants/${id}`, auth);
    throw error;
  }
};

export const adjustStock = async (id: string, delta: number, reason: string, referenceId?: string): Promise<void> => {
  try {
    const docRef = doc(db, 'itemVariants', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Item variant not found');
    const currentStock = Number(snap.data().currentStock) || 0;
    const newStock = currentStock + delta;
    if (newStock < 0) throw new Error('Stock cannot be adjusted below 0');

    await updateDoc(docRef, {
      currentStock: newStock,
      updatedAt: Timestamp.fromDate(new Date())
    });

    const now = new Date();
    await addDoc(inventoryMovementsCollection, {
      itemVariantId: id,
      date: Timestamp.fromDate(now),
      fromState: 'Available',
      toState: 'Available',
      quantity: delta,
      referenceType: 'adjustment',
      referenceId: referenceId || id,
      note: reason,
      createdAt: Timestamp.fromDate(now)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `itemVariants/${id}/adjustStock`, auth);
    throw error;
  }
};
