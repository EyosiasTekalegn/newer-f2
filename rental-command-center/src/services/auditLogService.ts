import { collection, doc, addDoc, getDoc, getDocs, deleteDoc, query, where, orderBy, limit, Timestamp, writeBatch } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export interface AuditLog {
  id: string;
  userId: string;              // Firebase Auth UID
  userEmail: string;           // denormalized for display
  action: "create" | "update" | "delete" | "view" | "export" | "login" | "logout";
  module: "customers" | "bookings" | "rentals" | "quotations" | "inventory" | "logistics" | "workforce" | "finance" | "procurement" | "contracts" | "issues" | "reports" | "settings" | "auth";
  recordId?: string;           // ID of the affected document
  recordName?: string;         // Human‑readable name (e.g., customer name, rental ID)
  changes?: {                  // For "update" actions: what changed
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: any;              // Additional context (e.g., IP address, user agent)
  timestamp: Date;
}

export interface AuditLogFilters {
  userId?: string;
  userEmail?: string;
  module?: string;
  action?: string;
  recordId?: string;
  startDate?: Date;
  endDate?: Date;
  searchQuery?: string;
}

const auditLogsCollection = collection(db, 'auditLogs');

/**
 * Computes difference between two objects for audit log 'changes' field
 */
export const computeChanges = (oldData: any, newData: any): { field: string; oldValue: any; newValue: any }[] => {
  const changes: { field: string; oldValue: any; newValue: any }[] = [];
  if (!oldData || !newData) return changes;

  const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));
  for (const key of allKeys) {
    if (key === 'updatedAt' || key === 'createdAt' || key === 'id') continue;
    const oldVal = oldData[key];
    const newVal = newData[key];

    // Handle standard Timestamp conversion comparisons
    const oldCompare = oldVal && typeof oldVal.toDate === 'function' ? oldVal.toDate().toISOString() : oldVal;
    const newCompare = newVal && typeof newVal.toDate === 'function' ? newVal.toDate().toISOString() : newVal;

    const oldStr = JSON.stringify(oldCompare);
    const newStr = JSON.stringify(newCompare);

    if (oldStr !== newStr) {
      changes.push({
        field: key,
        oldValue: oldVal === undefined ? null : JSON.parse(JSON.stringify(oldVal)),
        newValue: newVal === undefined ? null : JSON.parse(JSON.stringify(newVal)),
      });
    }
  }
  return changes;
};

/**
 * Log an audit action to Firestore
 */
export const logAction = async (data: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userEmail'> & { userId?: string; userEmail?: string }): Promise<string> => {
  try {
    // Automatically fallback or override with current authenticated user details if not explicitly provided
    const userId = data.userId || auth.currentUser?.uid || 'anonymous';
    const userEmail = data.userEmail || auth.currentUser?.email || 'anonymous@rentalsync.com';

    // Collect default metadata if in browser environment
    const clientMetadata = typeof window !== 'undefined' ? {
      userAgent: window.navigator.userAgent,
      language: window.navigator.language,
      href: window.location.href,
    } : {};

    const docRef = await addDoc(auditLogsCollection, {
      ...data,
      userId,
      userEmail,
      metadata: {
        ...clientMetadata,
        ...(data.metadata || {})
      },
      timestamp: Timestamp.fromDate(new Date())
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'auditLogs', auth);
    throw error;
  }
};

/**
 * Fetch logs with flexible, robust client-side and server-side combined filtering
 */
export const getAuditLogs = async (filters?: AuditLogFilters): Promise<AuditLog[]> => {
  try {
    // Retrieve latest logs ordered by timestamp to allow client-side search across all constraints
    // This bypasses complex index requirements on Firestore
    const q = query(auditLogsCollection, orderBy('timestamp', 'desc'), limit(1000));
    const snapshot = await getDocs(q);

    let logs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId || '',
        userEmail: data.userEmail || '',
        action: data.action,
        module: data.module,
        recordId: data.recordId,
        recordName: data.recordName,
        changes: data.changes || [],
        metadata: data.metadata || {},
        timestamp: data.timestamp?.toDate() || new Date()
      } as AuditLog;
    });

    // Apply filters in-memory to prevent Firestore composite index requirements
    if (filters) {
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
      }
      if (filters.userEmail) {
        const emailLower = filters.userEmail.toLowerCase();
        logs = logs.filter(log => log.userEmail.toLowerCase().includes(emailLower));
      }
      if (filters.module) {
        logs = logs.filter(log => log.module === filters.module);
      }
      if (filters.action) {
        logs = logs.filter(log => log.action === filters.action);
      }
      if (filters.recordId) {
        logs = logs.filter(log => log.recordId === filters.recordId);
      }
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        logs = logs.filter(log => log.timestamp >= start);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        logs = logs.filter(log => log.timestamp <= end);
      }
      if (filters.searchQuery) {
        const search = filters.searchQuery.toLowerCase();
        logs = logs.filter(log => 
          (log.recordId && log.recordId.toLowerCase().includes(search)) ||
          (log.recordName && log.recordName.toLowerCase().includes(search)) ||
          (log.userEmail && log.userEmail.toLowerCase().includes(search))
        );
      }
    }

    return logs;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'auditLogs', auth);
    throw error;
  }
};

/**
 * Fetch a single log entry
 */
export const getAuditLog = async (id: string): Promise<AuditLog | null> => {
  try {
    const docRef = doc(db, 'auditLogs', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: data.userId || '',
      userEmail: data.userEmail || '',
      action: data.action,
      module: data.module,
      recordId: data.recordId,
      recordName: data.recordName,
      changes: data.changes || [],
      metadata: data.metadata || {},
      timestamp: data.timestamp?.toDate() || new Date()
    } as AuditLog;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `auditLogs/${id}`, auth);
    throw error;
  }
};

/**
 * Delete a log (admin only, rarely used)
 */
export const deleteAuditLog = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'auditLogs', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `auditLogs/${id}`, auth);
    throw error;
  }
};

/**
 * Delete logs older than specific days
 */
export const clearOldLogs = async (days: number): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Fetch old logs
    const q = query(auditLogsCollection, where('timestamp', '<', Timestamp.fromDate(cutoffDate)));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return 0;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.size;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'auditLogs', auth);
    throw error;
  }
};
