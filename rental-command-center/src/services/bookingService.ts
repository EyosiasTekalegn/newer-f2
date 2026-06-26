import { collection, getDocs, doc, query, where, Timestamp, runTransaction, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export interface BookingItem {
  itemVariantId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  startDate: Date;
  endDate: Date;
  items: BookingItem[];
  subtotal: number;
  tax: number;
  total: number;
  depositAmount: number;
  advancePayment?: number;
  status: 'Reserved' | 'Confirmed' | 'Delivered' | 'Closed' | 'Cancelled';
  contractPartAUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  rentalType: 'reserved';
}

const bookingsCollection = collection(db, 'bookings');
const inventoryReservationsCollection = collection(db, 'inventoryReservations');
const itemVariantsCollection = collection(db, 'itemVariants');

export const getBookings = async (): Promise<Booking[]> => {
  try {
    const snapshot = await getDocs(bookingsCollection);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        customerId: data.customerId,
        customerName: data.customerName,
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || new Date(),
        items: data.items || [],
        subtotal: data.subtotal || 0,
        tax: data.tax || 0,
        total: data.total || 0,
        depositAmount: data.depositAmount || 0,
        advancePayment: data.advancePayment,
        status: data.status || 'Reserved',
        contractPartAUrl: data.contractPartAUrl,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        rentalType: data.rentalType || 'reserved',
      };
    });
  } catch (error: any) {
    handleFirestoreError(error, OperationType.LIST, 'bookings', auth);
  }
};

export const getBooking = async (id: string): Promise<Booking | null> => {
  try {
    const docRef = doc(db, 'bookings', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    return {
      id: snapshot.id,
      customerId: data.customerId,
      customerName: data.customerName,
      startDate: data.startDate?.toDate() || new Date(),
      endDate: data.endDate?.toDate() || new Date(),
      items: data.items || [],
      subtotal: data.subtotal || 0,
      tax: data.tax || 0,
      total: data.total || 0,
      depositAmount: data.depositAmount || 0,
      advancePayment: data.advancePayment,
      status: data.status || 'Reserved',
      contractPartAUrl: data.contractPartAUrl,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      rentalType: data.rentalType || 'reserved',
    };
  } catch (error: any) {
    console.error('Error fetching booking:', error);
    throw new Error(error.message || 'Failed to load booking.');
  }
};

// Returns dates in the range inclusive
const getDatesInRange = (startDate: Date, endDate: Date) => {
  const dates: string[] = [];
  let currentDate = new Date(startDate);
  // Reset time to start of day
  currentDate.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  while (currentDate <= end) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

export const checkAvailability = async (itemVariantId: string, startDate: Date, endDate: Date, excludeBookingId?: string): Promise<number> => {
  try {
    // 1. Get total stock for item
    const itemRef = doc(db, 'itemVariants', itemVariantId);
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) return 0;
    const totalStock = itemSnap.data().currentStock || 0;

    // 2. Query reservations for this item
    const reservationsQuery = query(
      inventoryReservationsCollection,
      where('itemVariantId', '==', itemVariantId)
    );
    const reservationsSnap = await getDocs(reservationsQuery);
    
    // 3. Find max reserved quantity on any single day within range
    const dates = getDatesInRange(startDate, endDate);
    let maxReserved = 0;
    
    const dailyReserved: Record<string, number> = {};
    for (const date of dates) {
      dailyReserved[date] = 0;
    }

    reservationsSnap.docs.forEach(doc => {
      const res = doc.data();
      if (excludeBookingId && res.rentalId === excludeBookingId) return;
      if (dates.includes(res.date)) {
        dailyReserved[res.date] += (res.qty || 0);
      }
    });

    for (const date of dates) {
      if (dailyReserved[date] > maxReserved) {
        maxReserved = dailyReserved[date];
      }
    }

    return Math.max(0, totalStock - maxReserved);
  } catch (error: any) {
    console.error('Error checking availability:', error);
    throw new Error('Failed to check availability.');
  }
};

export const addBooking = async (data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  if (data.startDate >= data.endDate) {
    throw new Error('Start date must be before end date.');
  }

  try {
    return await runTransaction(db, async (transaction) => {
      // 1. Check availability for all items inside transaction
      for (const item of data.items) {
        // Technically checkAvailability is a read, we should do it in the transaction if possible, 
        // but for simplicity and since we can't easily query within transactions without limits, 
        // we'll do an optimistic check here.
        // In a strictly correct Firestore transaction, we would read the item stock,
        // but reservations are queried. Transactions limit queries.
        // We will do a non-transactional availability check first.
        const available = await checkAvailability(item.itemVariantId, data.startDate, data.endDate);
        if (available < item.quantity) {
          throw new Error(`Insufficient availability for ${item.name}. Available: ${available}`);
        }
      }

      // 2. Create the booking document
      const bookingRef = doc(bookingsCollection);
      const now = new Date();
      transaction.set(bookingRef, {
        ...data,
        startDate: Timestamp.fromDate(data.startDate),
        endDate: Timestamp.fromDate(data.endDate),
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        rentalType: 'reserved'
      });

      // 3. Create reservation documents
      const dates = getDatesInRange(data.startDate, data.endDate);
      for (const item of data.items) {
        for (const date of dates) {
          const resRef = doc(inventoryReservationsCollection);
          transaction.set(resRef, {
            itemVariantId: item.itemVariantId,
            date: date,
            rentalId: bookingRef.id,
            qty: item.quantity
          });
        }
      }

      return bookingRef.id;
    });
  } catch (error: any) {
    console.error('Error adding booking:', error);
    throw new Error(error.message || 'Failed to add booking.');
  }
};

export const updateBooking = async (id: string, data: Partial<Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    await runTransaction(db, async (transaction) => {
      const bookingRef = doc(db, 'bookings', id);
      const bookingSnap = await transaction.get(bookingRef);
      if (!bookingSnap.exists()) {
        throw new Error("Booking does not exist!");
      }
      
      const oldData = bookingSnap.data();
      const newStartDate = data.startDate || oldData.startDate.toDate();
      const newEndDate = data.endDate || oldData.endDate.toDate();
      const newItems = data.items || oldData.items;

      if (newStartDate >= newEndDate) {
        throw new Error('Start date must be before end date.');
      }

      // 1. Check availability for all items (excluding this booking)
      if (data.startDate || data.endDate || data.items) {
         for (const item of newItems) {
            const available = await checkAvailability(item.itemVariantId, newStartDate, newEndDate, id);
            if (available < item.quantity) {
              throw new Error(`Insufficient availability for ${item.name}. Available: ${available}`);
            }
         }
      }

      // 2. Delete old reservations
      const oldReservationsQuery = query(inventoryReservationsCollection, where('rentalId', '==', id));
      const oldReservationsSnap = await getDocs(oldReservationsQuery);
      oldReservationsSnap.docs.forEach(docSnap => {
        transaction.delete(docSnap.ref);
      });

      // 3. Create new reservations
      const dates = getDatesInRange(newStartDate, newEndDate);
      for (const item of newItems) {
        for (const date of dates) {
          const resRef = doc(inventoryReservationsCollection);
          transaction.set(resRef, {
            itemVariantId: item.itemVariantId,
            date: date,
            rentalId: id,
            qty: item.quantity
          });
        }
      }

      // 4. Update booking
      const updateData: any = {
        ...data,
        updatedAt: Timestamp.fromDate(new Date()),
      };
      if (data.startDate) updateData.startDate = Timestamp.fromDate(data.startDate);
      if (data.endDate) updateData.endDate = Timestamp.fromDate(data.endDate);

      transaction.update(bookingRef, updateData);
    });
  } catch (error: any) {
    console.error('Error updating booking:', error);
    throw new Error(error.message || 'Failed to update booking.');
  }
};

export const deleteBooking = async (id: string): Promise<void> => {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Delete reservations
      const oldReservationsQuery = query(inventoryReservationsCollection, where('rentalId', '==', id));
      const oldReservationsSnap = await getDocs(oldReservationsQuery);
      oldReservationsSnap.docs.forEach(docSnap => {
        transaction.delete(docSnap.ref);
      });

      // 2. Delete booking
      const bookingRef = doc(db, 'bookings', id);
      transaction.delete(bookingRef);
    });
  } catch (error: any) {
    console.error('Error deleting booking:', error);
    throw new Error(error.message || 'Failed to delete booking.');
  }
};

export const convertBookingToRental = async (id: string): Promise<void> => {
  try {
    const bookingRef = doc(db, 'bookings', id);
    await updateDoc(bookingRef, { status: 'Delivered', updatedAt: Timestamp.fromDate(new Date()) });
  } catch (error: any) {
    console.error('Error converting booking to rental:', error);
    throw new Error(error.message || 'Failed to convert booking to rental.');
  }
};
