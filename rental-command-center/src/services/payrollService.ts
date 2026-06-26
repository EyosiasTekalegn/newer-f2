import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { getWorkers } from './workerService';
import { getAttendance } from './attendanceService';
import { getCommissions, updateCommission } from './commissionService';

export interface WorkerPayment {
  workerId: string;
  workerName: string;
  baseSalary?: number;      // if salaried
  hourlyWages?: number;     // hours * hourlyRate
  commissionTotal: number;  // sum of approved commissions
  bonus?: number;           // optional
  deductions?: number;      // optional
  netPay: number;           // total payable
  status: "Pending" | "Approved" | "Paid";
}

export interface PayrollRun {
  id: string;
  period: { start: Date; end: Date };  // pay period
  processedAt?: Date;
  workerPayments: WorkerPayment[];
  totalAmount: number;
  status: "Draft" | "Approved" | "Paid";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const payrollCollection = collection(db, 'payrollRuns');

export const getPayrollRuns = async (): Promise<PayrollRun[]> => {
  try {
    const snapshot = await getDocs(payrollCollection);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        period: {
          start: data.period?.start?.toDate() || new Date(),
          end: data.period?.end?.toDate() || new Date()
        },
        processedAt: data.processedAt?.toDate(),
        workerPayments: data.workerPayments || [],
        totalAmount: Number(data.totalAmount) || 0,
        status: data.status || 'Draft',
        notes: data.notes,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as PayrollRun;
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'payrollRuns', auth);
    throw error;
  }
};

export const getPayrollRun = async (id: string): Promise<PayrollRun | null> => {
  try {
    const docRef = doc(db, 'payrollRuns', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    return {
      id: snapshot.id,
      period: {
        start: data.period?.start?.toDate() || new Date(),
        end: data.period?.end?.toDate() || new Date()
      },
      processedAt: data.processedAt?.toDate(),
      workerPayments: data.workerPayments || [],
      totalAmount: Number(data.totalAmount) || 0,
      status: data.status || 'Draft',
      notes: data.notes,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    } as PayrollRun;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `payrollRuns/${id}`, auth);
    throw error;
  }
};

export const createPayrollRun = async (periodStart: Date, periodEnd: Date, notes?: string): Promise<string> => {
  try {
    const [workers, attendanceList, commissionsList] = await Promise.all([
      getWorkers(),
      getAttendance(),
      getCommissions()
    ]);

    // Align dates to cover start day from 00:00:00 and end day to 23:59:59
    const startBoundary = new Date(periodStart);
    startBoundary.setHours(0, 0, 0, 0);
    const endBoundary = new Date(periodEnd);
    endBoundary.setHours(23, 59, 59, 999);

    const workerPayments: WorkerPayment[] = workers.map(worker => {
      // 1. Calculate hourly wages from attendance
      const workerAttendance = attendanceList.filter(att => 
        att.workerId === worker.id && 
        att.date.getTime() >= startBoundary.getTime() && 
        att.date.getTime() <= endBoundary.getTime()
      );

      const totalHours = workerAttendance.reduce((acc, att) => acc + (att.hoursWorked || 0), 0);
      const hourlyRate = worker.hourlyRate || 0;
      const hourlyWages = totalHours * hourlyRate;

      // 2. Sum approved commissions in period
      const workerCommissions = commissionsList.filter(comm => 
        comm.workerId === worker.id && 
        comm.status === 'Approved' && 
        comm.createdAt.getTime() >= startBoundary.getTime() && 
        comm.createdAt.getTime() <= endBoundary.getTime()
      );

      const commissionTotal = workerCommissions.reduce((acc, comm) => acc + comm.totalAmount, 0);

      // 3. Base salary for admin / supervisor if applicable (we default to 0, let users adjust manually in UI)
      const baseSalary = 0;

      // 4. Totals
      const bonus = 0;
      const deductions = 0;
      const netPay = hourlyWages + commissionTotal + baseSalary + bonus - deductions;

      return {
        workerId: worker.id,
        workerName: worker.name,
        baseSalary,
        hourlyWages,
        commissionTotal,
        bonus,
        deductions,
        netPay,
        status: 'Pending' as const
      };
    }).filter(payment => payment.hourlyWages > 0 || payment.commissionTotal > 0 || payment.baseSalary > 0);

    const totalAmount = workerPayments.reduce((acc, wp) => acc + wp.netPay, 0);
    const now = new Date();

    const docRef = await addDoc(payrollCollection, {
      period: {
        start: Timestamp.fromDate(startBoundary),
        end: Timestamp.fromDate(endBoundary)
      },
      workerPayments,
      totalAmount,
      status: 'Draft',
      notes: notes || '',
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'payrollRuns/generate', auth);
    throw error;
  }
};

export const updatePayrollRun = async (id: string, data: Partial<Omit<PayrollRun, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, 'payrollRuns', id);
    const updateData: any = { ...data, updatedAt: Timestamp.fromDate(new Date()) };
    
    if (data.period) {
      updateData.period = {
        start: Timestamp.fromDate(data.period.start),
        end: Timestamp.fromDate(data.period.end)
      };
    }
    if (data.processedAt) {
      updateData.processedAt = Timestamp.fromDate(data.processedAt);
    }
    if (data.workerPayments) {
      updateData.totalAmount = data.workerPayments.reduce((acc, wp) => acc + (wp.netPay || 0), 0);
    }

    await updateDoc(docRef, updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `payrollRuns/${id}`, auth);
    throw error;
  }
};

export const approvePayrollRun = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'payrollRuns', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Payroll run not found');
    const run = snap.data();

    const updatedPayments = (run.workerPayments || []).map((wp: any) => ({
      ...wp,
      status: 'Approved'
    }));

    await updateDoc(docRef, {
      status: 'Approved',
      workerPayments: updatedPayments,
      updatedAt: Timestamp.fromDate(new Date())
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `payrollRuns/${id}/approve`, auth);
    throw error;
  }
};

export const processPayrollRun = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'payrollRuns', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Payroll run not found');
    const run = snap.data();

    const updatedPayments = (run.workerPayments || []).map((wp: any) => ({
      ...wp,
      status: 'Paid'
    }));

    const now = new Date();
    await updateDoc(docRef, {
      status: 'Paid',
      workerPayments: updatedPayments,
      processedAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });

    // Update commissions processed in this payroll run to "Paid"
    const periodStart = run.period?.start?.toDate();
    const periodEnd = run.period?.end?.toDate();
    if (periodStart && periodEnd) {
      const commissions = await getCommissions();
      const relevantCommissions = commissions.filter(comm => 
        comm.status === 'Approved' && 
        comm.createdAt.getTime() >= periodStart.getTime() && 
        comm.createdAt.getTime() <= periodEnd.getTime()
      );

      for (const comm of relevantCommissions) {
        await updateCommission(comm.id, { status: 'Paid' });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `payrollRuns/${id}/process`, auth);
    throw error;
  }
};

export const deletePayrollRun = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'payrollRuns', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `payrollRuns/${id}`, auth);
    throw error;
  }
};
