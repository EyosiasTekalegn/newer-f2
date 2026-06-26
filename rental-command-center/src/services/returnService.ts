import { collection, doc, addDoc, updateDoc, getDocs, Timestamp, runTransaction, getDoc, query, where } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export interface ReturnRecord {
  id: string;
  rentalId: string;
  customerId: string;
  items: Array<{
    itemVariantId: string;
    name: string;
    deliveredQty: number;
    returnedQty: number;
    damagedQty: number;
    missingQty: number;
    damageCost: number;
    photoUrls?: string[];
  }>;
  totalDamages: number;
  depositAmount: number;
  netRefund: number;
  additionalInvoice: number;
  signatureUrl?: string;
  completedAt: Date;
  status: "Draft" | "Completed";
}

const returnsCollection = collection(db, 'returns');
const inventoryMovementsCollection = collection(db, 'inventoryMovements');

export const completeReturn = async (rentalId: string, returnData: Omit<ReturnRecord, 'id' | 'completedAt' | 'status'>): Promise<string> => {
   try {
     return await runTransaction(db, async (transaction) => {
        // Validate items
        for(const item of returnData.items) {
           if(item.returnedQty + item.damagedQty + item.missingQty !== item.deliveredQty) {
              throw new Error(`Quantities do not match for item: ${item.name}`);
           }
        }

        const rentalRef = doc(db, 'rentals', rentalId);
        const rentalSnap = await transaction.get(rentalRef);
        if(!rentalSnap.exists()) throw new Error('Rental not found');
        const rentalData = rentalSnap.data();

        const now = new Date();
        const returnRef = doc(returnsCollection);

        let hasMissing = false;
        const maintenanceOrdersToCreate: any[] = [];
        
        for (const item of returnData.items) {
           if(item.returnedQty > 0) {
              const itemRef = doc(db, 'itemVariants', item.itemVariantId);
              const itemSnap = await transaction.get(itemRef);
              if(itemSnap.exists()) {
                 transaction.update(itemRef, { currentStock: (itemSnap.data().currentStock || 0) + item.returnedQty });
              }
              const movementRef = doc(inventoryMovementsCollection);
              transaction.set(movementRef, {
                 itemVariantId: item.itemVariantId,
                 quantity: item.returnedQty,
                 type: 'IN',
                 reason: 'Return - Good Condition',
                 fromState: 'On Rent',
                 toState: 'Available',
                 date: Timestamp.fromDate(now),
                 rentalId: rentalId
              });
           }
           if(item.damagedQty > 0) {
              const movementRef = doc(inventoryMovementsCollection);
              transaction.set(movementRef, {
                 itemVariantId: item.itemVariantId,
                 quantity: item.damagedQty,
                 type: 'TRANSFER',
                 reason: 'Return - Damaged',
                 fromState: 'On Rent',
                 toState: 'Damaged',
                 date: Timestamp.fromDate(now),
                 rentalId: rentalId
              });
              maintenanceOrdersToCreate.push({
                 itemVariantId: item.itemVariantId,
                 itemName: item.name,
                 rentalId,
                 damageDescription: `Returned damaged (${item.damagedQty} qty)`,
                 damageCost: item.damageCost,
                 photoUrls: item.photoUrls || [],
                 status: 'Pending',
                 createdAt: Timestamp.fromDate(now),
                 updatedAt: Timestamp.fromDate(now)
              });
           }
           if(item.missingQty > 0) {
              hasMissing = true;
              const movementRef = doc(inventoryMovementsCollection);
              transaction.set(movementRef, {
                 itemVariantId: item.itemVariantId,
                 quantity: item.missingQty,
                 type: 'TRANSFER',
                 reason: 'Return - Missing',
                 fromState: 'On Rent',
                 toState: 'Missing',
                 date: Timestamp.fromDate(now),
                 rentalId: rentalId
              });
           }
        }

        // Create Maintenance Orders
        for(const mo of maintenanceOrdersToCreate) {
           const moRef = doc(collection(db, 'maintenanceOrders'));
           transaction.set(moRef, mo);
        }

        const newStatus = hasMissing ? 'Partially Returned' : 'Closed';
        transaction.update(rentalRef, { 
           status: newStatus, 
           updatedAt: Timestamp.fromDate(now),
           returnLogId: returnRef.id,
           items: returnData.items.map(i => ({
             itemVariantId: i.itemVariantId,
             name: i.name,
             quantity: i.deliveredQty,
             returnedQty: i.returnedQty,
             damagedQty: i.damagedQty,
             missingQty: i.missingQty,
             unitPrice: rentalData.items.find((orig: any) => orig.itemVariantId === i.itemVariantId)?.unitPrice || 0,
             total: rentalData.items.find((orig: any) => orig.itemVariantId === i.itemVariantId)?.total || 0,
           }))
        });

        const depositHoldId = rentalData.depositHoldId;
        if(depositHoldId) {
           const depositRef = doc(db, 'depositHolds', depositHoldId);
           const depositSnap = await transaction.get(depositRef);
           if(depositSnap.exists()) {
               const dsStatus = returnData.netRefund > 0 ? 'Refunded' : (returnData.totalDamages > 0 ? 'Forfeited' : 'Active');
               transaction.update(depositRef, {
                  status: dsStatus,
                  refundAmount: returnData.netRefund,
                  refundedAt: Timestamp.fromDate(now),
                  deductions: returnData.totalDamages > 0 ? [{reason: 'Damages and Missing Items', amount: returnData.totalDamages}] : []
               });
           }
        }

        transaction.set(returnRef, {
           ...returnData,
           completedAt: Timestamp.fromDate(now),
           status: 'Completed'
        });

        return returnRef.id;
     });
   } catch(error) {
      handleFirestoreError(error, OperationType.CREATE, 'returns', auth);
      throw error;
   }
};

export const getReturnRecord = async (rentalId: string): Promise<ReturnRecord | null> => {
  try {
    const q = query(returnsCollection, where('rentalId', '==', rentalId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      completedAt: data.completedAt?.toDate() || new Date()
    } as ReturnRecord;
  } catch(error) {
    handleFirestoreError(error, OperationType.GET, 'returns', auth);
    throw error;
  }
};
