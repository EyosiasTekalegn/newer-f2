import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { getItemVariants, ItemVariant } from './inventoryService';

export interface StockOverviewItem {
  itemVariantId: string;
  name: string;
  category: string;
  totalOnHand: number;
  available: number;
  reserved: number;
  onRent: number;
  damaged: number;
  inMaintenance: number;
  missing: number;
  minStockAlert?: number;
}

export const getStockOverview = async (): Promise<StockOverviewItem[]> => {
  try {
    const variants = await getItemVariants();
    
    // Fetch all inventory movements to calculate states
    const movementsSnap = await getDocs(collection(db, 'inventoryMovements'));
    const movements = movementsSnap.docs.map(doc => doc.data());

    // Fetch active reservations to verify Reserved count
    const reservationsSnap = await getDocs(collection(db, 'inventoryReservations'));
    const reservations = reservationsSnap.docs.map(doc => doc.data());

    return variants.map(variant => {
      const states: Record<string, number> = {
        Available: 0,
        Reserved: 0,
        'On Rent': 0,
        Damaged: 0,
        'In Maintenance': 0,
        Missing: 0
      };

      // Filter movements for this variant
      const variantMovements = movements.filter(m => m.itemVariantId === variant.id);

      variantMovements.forEach(m => {
        const qty = Number(m.quantity) || 0;
        const from = m.fromState;
        const to = m.toState;

        if (from === to) {
          states[to] = (states[to] || 0) + qty;
        } else {
          states[from] = (states[from] || 0) - qty;
          states[to] = (states[to] || 0) + qty;
        }
      });

      // Let's fallback or adjust based on active collections for extra robustness
      // Reserved: sum of active inventory reservations
      const activeReserved = reservations
        .filter(r => r.itemVariantId === variant.id)
        .reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

      // If movements didn't capture some reserved state, we use activeReserved
      const finalReserved = activeReserved > 0 ? activeReserved : Math.max(0, states['Reserved'] || 0);
      const finalOnRent = Math.max(0, states['On Rent'] || 0);
      const finalDamaged = Math.max(0, states['Damaged'] || 0);
      const finalInMaintenance = Math.max(0, states['In Maintenance'] || 0);
      const finalMissing = Math.max(0, states['Missing'] || 0);

      // Available = totalOnHand - reserved - onRent - damaged - inMaintenance - missing
      // Let's make sure available is never negative
      const totalOnHand = variant.currentStock;
      const computedAvailable = totalOnHand - finalReserved - finalOnRent - finalDamaged - finalInMaintenance - finalMissing;
      const finalAvailable = Math.max(0, computedAvailable);

      return {
        itemVariantId: variant.id,
        name: variant.name,
        category: variant.category,
        totalOnHand,
        available: finalAvailable,
        reserved: finalReserved,
        onRent: finalOnRent,
        damaged: finalDamaged,
        inMaintenance: finalInMaintenance,
        missing: finalMissing,
        minStockAlert: variant.minStockAlert,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'stockOverview', auth);
    throw error;
  }
};
