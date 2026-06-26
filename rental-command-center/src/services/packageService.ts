import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { getItemVariant } from './inventoryService';

export interface RentalPackage {
  id: string;
  name: string;
  description?: string;
  items: Array<{
    itemVariantId: string;
    name?: string; // Denormalized or fetched later for display
    quantity: number;
  }>;
  packagePrice: number;      // bundle price
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const packagesCollection = collection(db, 'packages');

export const getPackages = async (): Promise<RentalPackage[]> => {
  try {
    const snapshot = await getDocs(packagesCollection);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        items: data.items || [],
        packagePrice: Number(data.packagePrice) || 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'packages', auth);
    throw error;
  }
};

export const getPackage = async (id: string): Promise<RentalPackage | null> => {
  try {
    const docRef = doc(db, 'packages', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    return {
      id: snapshot.id,
      name: data.name,
      description: data.description,
      items: data.items || [],
      packagePrice: Number(data.packagePrice) || 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `packages/${id}`, auth);
    throw error;
  }
};

export const addPackage = async (data: Omit<RentalPackage, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = new Date();
    const docRef = await addDoc(packagesCollection, {
      name: data.name,
      description: data.description || '',
      items: data.items || [],
      packagePrice: Number(data.packagePrice) || 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'packages', auth);
    throw error;
  }
};

export const updatePackage = async (id: string, data: Partial<Omit<RentalPackage, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, 'packages', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.fromDate(new Date())
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `packages/${id}`, auth);
    throw error;
  }
};

export const deletePackage = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'packages', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `packages/${id}`, auth);
    throw error;
  }
};

export const expandPackage = async (packageId: string): Promise<Array<{
  itemVariantId: string;
  name: string;
  quantity: number;
  pricePerUnit: number;
}>> => {
  try {
    const pkg = await getPackage(packageId);
    if (!pkg) throw new Error('Package not found');

    const expandedItems = [];
    for (const item of pkg.items) {
      const variant = await getItemVariant(item.itemVariantId);
      if (variant) {
        expandedItems.push({
          itemVariantId: item.itemVariantId,
          name: variant.name,
          quantity: item.quantity,
          pricePerUnit: variant.pricePerUnit
        });
      } else {
        expandedItems.push({
          itemVariantId: item.itemVariantId,
          name: item.name || `Unknown Variant (${item.itemVariantId})`,
          quantity: item.quantity,
          pricePerUnit: 0
        });
      }
    }
    return expandedItems;
  } catch (error) {
    console.error('Failed to expand package', error);
    throw error;
  }
};
