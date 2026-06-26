import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export interface MaintenanceOrder {
  id: string;
  itemVariantId: string;
  itemName: string;
  rentalId?: string;
  damageDescription: string;
  damageCost: number;
  photoUrls?: string[];
  status: "Pending" | "In Progress" | "Completed" | "Cancelled";
  notes?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const maintenanceCollection = collection(db, 'maintenanceOrders');
const inventoryMovementsCollection = collection(db, 'inventoryMovements');

export const createMaintenanceOrder = async (data: Omit<MaintenanceOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = new Date();
    const docRef = await addDoc(maintenanceCollection, {
      ...data,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'maintenanceOrders', auth);
    throw error;
  }
};

// Expose alias to match task naming exactly
export const addMaintenanceOrder = createMaintenanceOrder;

export const updateMaintenanceOrder = async (id: string, data: Partial<Omit<MaintenanceOrder, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, 'maintenanceOrders', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.fromDate(new Date())
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `maintenanceOrders/${id}`, auth);
    throw error;
  }
};

export const getMaintenanceOrders = async (): Promise<MaintenanceOrder[]> => {
  try {
    const snapshot = await getDocs(maintenanceCollection);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        itemVariantId: data.itemVariantId,
        itemName: data.itemName,
        rentalId: data.rentalId,
        damageDescription: data.damageDescription,
        damageCost: Number(data.damageCost) || 0,
        photoUrls: data.photoUrls || [],
        status: data.status,
        notes: data.notes,
        completedAt: data.completedAt?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'maintenanceOrders', auth);
    throw error;
  }
};

export const deleteMaintenanceOrder = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'maintenanceOrders', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `maintenanceOrders/${id}`, auth);
    throw error;
  }
};

export const completeMaintenance = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'maintenanceOrders', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Maintenance order not found');
    const order = snap.data();

    const now = new Date();
    await updateDoc(docRef, {
      status: 'Completed',
      completedAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });

    // Create inventory movement: Damaged -> Available
    await addDoc(inventoryMovementsCollection, {
      itemVariantId: order.itemVariantId,
      date: Timestamp.fromDate(now),
      fromState: 'Damaged',
      toState: 'Available',
      quantity: 1, // Assume 1 quantity for individual order, or we can look up if we want
      referenceType: 'maintenance',
      referenceId: id,
      note: `Maintenance complete: ${order.damageDescription}`,
      createdAt: Timestamp.fromDate(now)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `maintenanceOrders/${id}/complete`, auth);
    throw error;
  }
};
