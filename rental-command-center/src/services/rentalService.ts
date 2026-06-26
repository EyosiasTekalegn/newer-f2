import { collection, doc, updateDoc, getDocs, query, where, Timestamp, runTransaction, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export interface Rental {
  id: string;
  rentalType: "reserved" | "walkin";
  customerId: string;
  customerName: string;
  startDate: Date;
  endDate: Date;
  items: Array<{
    itemVariantId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    returnedQty?: number;
    damagedQty?: number;
    missingQty?: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  depositAmount: number;
  depositCollected: boolean;
  depositHoldId?: string;
  advancePayment?: number;
  status: "Delivered" | "Partially Returned" | "Closed";
  contractPartBUrl?: string;
  deliveryLogId?: string;
  returnLogId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const rentalsCollection = collection(db, 'rentals');
const inventoryMovementsCollection = collection(db, 'inventoryMovements');

export const getActiveRentals = async (): Promise<Rental[]> => {
  try {
    const q = query(rentalsCollection, where('status', 'in', ['Delivered', 'Partially Returned']));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Rental;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'rentals', auth);
    throw error;
  }
};

export const getRental = async (id: string): Promise<Rental | null> => {
  try {
    const docRef = doc(db, 'rentals', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    return {
      ...data,
      id: snapshot.id,
      startDate: data.startDate?.toDate() || new Date(),
      endDate: data.endDate?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Rental;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `rentals/${id}`, auth);
    throw error;
  }
};

export const createWalkinRental = async (data: Omit<Rental, 'id' | 'createdAt' | 'updatedAt' | 'depositCollected' | 'rentalType' | 'status'>): Promise<string> => {
  if (data.startDate >= data.endDate) {
    throw new Error('Start date must be before end date.');
  }

  try {
    return await runTransaction(db, async (transaction) => {
      for (const item of data.items) {
        const itemRef = doc(db, 'itemVariants', item.itemVariantId);
        const itemSnap = await transaction.get(itemRef);
        if (!itemSnap.exists()) {
           throw new Error(`Item variant not found: ${item.name}`);
        }
        const onHand = itemSnap.data().currentStock || 0;
        if (onHand < item.quantity) {
          throw new Error(`Insufficient on-hand stock for ${item.name}. Available: ${onHand}`);
        }
      }

      const now = new Date();
      const rentalRef = doc(rentalsCollection);
      
      for (const item of data.items) {
        const itemRef = doc(db, 'itemVariants', item.itemVariantId);
        const itemSnap = await transaction.get(itemRef);
        const newStock = (itemSnap.data()?.currentStock || 0) - item.quantity;
        transaction.update(itemRef, { currentStock: newStock });

        const movementRef = doc(inventoryMovementsCollection);
        transaction.set(movementRef, {
          itemVariantId: item.itemVariantId,
          quantity: item.quantity,
          type: 'OUT',
          reason: 'Walk-in Rental',
          fromState: 'Available',
          toState: 'On Rent',
          date: Timestamp.fromDate(now),
          rentalId: rentalRef.id
        });
      }

      const depositHoldRef = doc(collection(db, 'depositHolds'));
      transaction.set(depositHoldRef, {
        rentalId: rentalRef.id,
        customerId: data.customerId,
        amount: data.depositAmount,
        collectedAt: Timestamp.fromDate(now),
        status: 'Active',
        deductions: []
      });

      transaction.set(rentalRef, {
        ...data,
        rentalType: 'walkin',
        status: 'Delivered',
        depositCollected: true,
        depositHoldId: depositHoldRef.id,
        contractPartBUrl: 'https://dummy-contract-b-url.pdf',
        startDate: Timestamp.fromDate(data.startDate),
        endDate: Timestamp.fromDate(data.endDate),
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });

      return rentalRef.id;
    });
  } catch (error) {
    console.error(error);
    handleFirestoreError(error, OperationType.CREATE, 'rentals', auth);
    throw error;
  }
};

export const convertBookingToRental = async (bookingId: string): Promise<string> => {
   try {
     const bookingRef = doc(db, 'bookings', bookingId);
     const bookingSnap = await getDoc(bookingRef);
     if (!bookingSnap.exists()) throw new Error('Booking not found');
     const bookingData = bookingSnap.data();

     const reservationsQuery = query(collection(db, 'inventoryReservations'), where('rentalId', '==', bookingId));
     const resSnap = await getDocs(reservationsQuery);

     let createdRentalId = '';

     await runTransaction(db, async (transaction) => {
        const itemSnaps: Record<string, any> = {};
        for (const item of bookingData.items) {
           const itemRef = doc(db, 'itemVariants', item.itemVariantId);
           itemSnaps[item.itemVariantId] = await transaction.get(itemRef);
        }

        const now = new Date();
        const rentalRef = doc(rentalsCollection);
        createdRentalId = rentalRef.id;

        resSnap.docs.forEach(resDoc => {
           transaction.delete(resDoc.ref);
        });

        for (const item of bookingData.items) {
           const itemSnap = itemSnaps[item.itemVariantId];
           if(itemSnap && itemSnap.exists()) {
             const newStock = (itemSnap.data()?.currentStock || 0) - item.quantity;
             transaction.update(itemSnap.ref, { currentStock: newStock });
           }

           const movementRef = doc(inventoryMovementsCollection);
           transaction.set(movementRef, {
             itemVariantId: item.itemVariantId,
             quantity: item.quantity,
             type: 'OUT',
             reason: 'Booking Conversion',
             fromState: 'Reserved',
             toState: 'On Rent',
             date: Timestamp.fromDate(now),
             rentalId: rentalRef.id
           });
        }

        const depositHoldRef = doc(collection(db, 'depositHolds'));
        transaction.set(depositHoldRef, {
          rentalId: rentalRef.id,
          customerId: bookingData.customerId,
          amount: bookingData.depositAmount,
          collectedAt: Timestamp.fromDate(now),
          status: 'Active',
          deductions: []
        });

        transaction.set(rentalRef, {
          rentalType: 'reserved',
          customerId: bookingData.customerId,
          customerName: bookingData.customerName,
          startDate: bookingData.startDate,
          endDate: bookingData.endDate,
          items: bookingData.items,
          subtotal: bookingData.subtotal,
          tax: bookingData.tax,
          total: bookingData.total,
          depositAmount: bookingData.depositAmount,
          depositCollected: true,
          depositHoldId: depositHoldRef.id,
          advancePayment: bookingData.advancePayment || 0,
          status: 'Delivered',
          contractPartBUrl: 'https://dummy-contract-b-url.pdf',
          createdAt: Timestamp.fromDate(now),
          updatedAt: Timestamp.fromDate(now)
        });

        transaction.update(bookingRef, { status: 'Delivered', updatedAt: Timestamp.fromDate(now) });
     });

     return createdRentalId;
   } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`, auth);
      throw error;
   }
};

export const updateRental = async (id: string, data: Partial<Rental>): Promise<void> => {
  try {
    const docRef = doc(db, 'rentals', id);
    await updateDoc(docRef, { ...data, updatedAt: Timestamp.fromDate(new Date()) });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `rentals/${id}`, auth);
    throw error;
  }
};

export const getRentalItemsForReturn = async (id: string): Promise<Rental | null> => {
   return getRental(id);
};

export const closeRental = async (id: string): Promise<void> => {
   return updateRental(id, { status: 'Closed' });
};
