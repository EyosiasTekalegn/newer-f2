import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export interface Attendance {
  id: string;
  workerId: string;
  workerName: string;        // denormalized
  date: Date;
  checkIn: Date;             // timestamp
  checkOut?: Date;           // timestamp
  hoursWorked?: number;      // calculated from checkIn/checkOut
  status: "Present" | "Absent" | "Late" | "Half Day";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceCollection = collection(db, 'attendance');

export const calculateHours = (checkIn: Date, checkOut: Date): number => {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  if (diffMs <= 0) return 0;
  const hours = diffMs / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100; // round to 2 decimal places
};

export const getAttendance = async (month?: string): Promise<Attendance[]> => {
  try {
    const snapshot = await getDocs(attendanceCollection);
    const records = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        workerId: data.workerId,
        workerName: data.workerName,
        date: data.date?.toDate() || new Date(),
        checkIn: data.checkIn?.toDate() || new Date(),
        checkOut: data.checkOut?.toDate(),
        hoursWorked: data.hoursWorked !== undefined ? Number(data.hoursWorked) : undefined,
        status: data.status,
        notes: data.notes,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Attendance;
    });

    // If month is provided as "YYYY-MM"
    if (month) {
      return records.filter(r => {
        const year = r.date.getFullYear();
        const m = String(r.date.getMonth() + 1).padStart(2, '0');
        return `${year}-${m}` === month;
      }).sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    return records.sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'attendance', auth);
    throw error;
  }
};

export const getAttendanceForWorker = async (workerId: string, month?: string): Promise<Attendance[]> => {
  try {
    const q = query(attendanceCollection, where('workerId', '==', workerId));
    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        workerId: data.workerId,
        workerName: data.workerName,
        date: data.date?.toDate() || new Date(),
        checkIn: data.checkIn?.toDate() || new Date(),
        checkOut: data.checkOut?.toDate(),
        hoursWorked: data.hoursWorked !== undefined ? Number(data.hoursWorked) : undefined,
        status: data.status,
        notes: data.notes,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Attendance;
    });

    if (month) {
      return records.filter(r => {
        const year = r.date.getFullYear();
        const m = String(r.date.getMonth() + 1).padStart(2, '0');
        return `${year}-${m}` === month;
      }).sort((a, b) => b.date.getTime() - a.date.getTime());
    }

    return records.sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `attendance/worker/${workerId}`, auth);
    throw error;
  }
};

export const getTodayAttendance = async (): Promise<Attendance[]> => {
  try {
    const snapshot = await getDocs(attendanceCollection);
    const todayStr = new Date().toDateString();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        workerId: data.workerId,
        workerName: data.workerName,
        date: data.date?.toDate() || new Date(),
        checkIn: data.checkIn?.toDate() || new Date(),
        checkOut: data.checkOut?.toDate(),
        hoursWorked: data.hoursWorked !== undefined ? Number(data.hoursWorked) : undefined,
        status: data.status,
        notes: data.notes,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Attendance;
    }).filter(r => r.date.toDateString() === todayStr);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'attendance/today', auth);
    throw error;
  }
};

export const addAttendance = async (data: Omit<Attendance, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = new Date();
    let hours: number | undefined = undefined;
    if (data.checkIn && data.checkOut) {
      hours = calculateHours(data.checkIn, data.checkOut);
    }

    const docRef = await addDoc(attendanceCollection, {
      workerId: data.workerId,
      workerName: data.workerName,
      date: Timestamp.fromDate(data.date),
      checkIn: Timestamp.fromDate(data.checkIn),
      checkOut: data.checkOut ? Timestamp.fromDate(data.checkOut) : null,
      hoursWorked: hours !== undefined ? hours : (data.hoursWorked || null),
      status: data.status,
      notes: data.notes || '',
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'attendance', auth);
    throw error;
  }
};

export const updateAttendance = async (id: string, data: Partial<Omit<Attendance, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, 'attendance', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Attendance record not found');
    const existing = snap.data();

    const checkInDate = data.checkIn || existing.checkIn?.toDate();
    const checkOutDate = data.checkOut || existing.checkOut?.toDate();

    let hours: number | undefined = undefined;
    if (checkInDate && checkOutDate) {
      hours = calculateHours(checkInDate, checkOutDate);
    }

    const updateData: any = {
      ...data,
      updatedAt: Timestamp.fromDate(new Date())
    };

    if (data.date) updateData.date = Timestamp.fromDate(data.date);
    if (data.checkIn) updateData.checkIn = Timestamp.fromDate(data.checkIn);
    if (data.checkOut) updateData.checkOut = Timestamp.fromDate(data.checkOut);
    if (hours !== undefined) updateData.hoursWorked = hours;

    await updateDoc(docRef, updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `attendance/${id}`, auth);
    throw error;
  }
};

export const deleteAttendance = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'attendance', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `attendance/${id}`, auth);
    throw error;
  }
};
