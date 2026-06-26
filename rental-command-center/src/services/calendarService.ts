import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  resource: {
    id: string;
    customerId: string;
    customerName: string;
    status: string;
    totalPrice: number;
    rentalType: string;
  };
}

export const getCalendarEvents = async (): Promise<CalendarEvent[]> => {
  const rentalsCollection = collection(db, 'rentals');
  const customersCollection = collection(db, 'customers');

  const [rentalsSnapshot, customersSnapshot] = await Promise.all([
    getDocs(rentalsCollection),
    getDocs(customersCollection)
  ]);

  const customersMap = new Map<string, string>();
  customersSnapshot.forEach(doc => {
    customersMap.set(doc.id, doc.data().name || 'Unknown Customer');
  });

  const events: CalendarEvent[] = [];

  rentalsSnapshot.forEach(doc => {
    const data = doc.data();
    const customerName = customersMap.get(data.customerId) || 'Unknown Customer';
    const rentalType = data.rentalType || 'reserved';
    const title = `${customerName} (${rentalType === 'walkin' ? 'Walk-in' : 'Reserved'})`;
    
    // Only map events with valid start/end dates
    if (data.startDate && data.endDate) {
      events.push({
        title,
        start: data.startDate.toDate(),
        end: data.endDate.toDate(),
        resource: {
          id: doc.id,
          customerId: data.customerId,
          customerName,
          status: data.status || 'Draft',
          totalPrice: data.totalPrice || 0,
          rentalType
        }
      });
    }
  });

  return events;
};
