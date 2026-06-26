import { collection, doc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export interface InventoryMovement {
  id: string;
  itemVariantId: string;
  itemName?: string; // Denormalized or fetched later for UI
  date: Date;
  fromState: "Available" | "Reserved" | "On Rent" | "Damaged" | "In Maintenance" | "Missing";
  toState: "Available" | "Reserved" | "On Rent" | "Damaged" | "In Maintenance" | "Missing";
  quantity: number;
  referenceType: "booking" | "rental" | "return" | "maintenance" | "procurement" | "adjustment";
  referenceId: string;
  note?: string;
  createdAt: Date;
}

const movementsCollection = collection(db, 'inventoryMovements');

export const getAllMovements = async (): Promise<InventoryMovement[]> => {
  try {
    const snapshot = await getDocs(movementsCollection);
    const movements = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        itemVariantId: data.itemVariantId,
        date: data.date?.toDate() || new Date(),
        fromState: data.fromState,
        toState: data.toState,
        quantity: Number(data.quantity) || 0,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        note: data.note,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as InventoryMovement;
    });

    // Sort by date descending
    return movements.sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'inventoryMovements', auth);
    throw error;
  }
};

export const getMovementsForItem = async (itemVariantId: string): Promise<InventoryMovement[]> => {
  try {
    const q = query(movementsCollection, where('itemVariantId', '==', itemVariantId));
    const snapshot = await getDocs(q);
    const movements = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        itemVariantId: data.itemVariantId,
        date: data.date?.toDate() || new Date(),
        fromState: data.fromState,
        toState: data.toState,
        quantity: Number(data.quantity) || 0,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        note: data.note,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as InventoryMovement;
    });

    return movements.sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `inventoryMovements/filter/${itemVariantId}`, auth);
    throw error;
  }
};
