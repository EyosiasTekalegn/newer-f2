import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy, getDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  priority: "low" | "medium" | "high";
  category: "rental" | "booking" | "inventory" | "finance" | "workforce" | "maintenance" | "issue" | "system";
  link?: string;
  referenceId?: string;
  referenceType?: string;
  isRead: boolean;
  isSystemGenerated: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

const notificationsCollection = collection(db, 'notifications');

export const getNotifications = async (): Promise<Notification[]> => {
  try {
    const q = query(notificationsCollection, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        message: data.message || '',
        type: data.type || 'info',
        priority: data.priority || 'low',
        category: data.category || 'system',
        link: data.link,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
        isRead: !!data.isRead,
        isSystemGenerated: !!data.isSystemGenerated,
        createdAt: data.createdAt?.toDate() || new Date(),
        expiresAt: data.expiresAt?.toDate(),
      } as Notification;
    });
  } catch (err) {
    console.error("Error loading notifications:", err);
    // Return empty array on permission error or non-indexed DB
    return [];
  }
};

export const getUnreadCount = async (): Promise<number> => {
  try {
    const q = query(notificationsCollection, where('isRead', '==', false));
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (err) {
    console.error("Error loading unread notifications count:", err);
    return 0;
  }
};

export const markAsRead = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'notifications', id);
    await updateDoc(docRef, {
      isRead: true,
      updatedAt: Timestamp.fromDate(new Date())
    });
  } catch (err) {
    console.error(`Error marking notification ${id} as read:`, err);
    throw err;
  }
};

export const markAllAsRead = async (): Promise<void> => {
  try {
    const q = query(notificationsCollection, where('isRead', '==', false));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => {
      batch.update(doc(db, 'notifications', d.id), {
        isRead: true,
        updatedAt: Timestamp.fromDate(new Date())
      });
    });
    await batch.commit();
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    throw err;
  }
};

export const deleteNotification = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'notifications', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Error deleting notification ${id}:`, err);
    throw err;
  }
};

export const createNotification = async (data: Omit<Notification, 'id' | 'createdAt' | 'isRead'> & { isRead?: boolean }): Promise<string> => {
  try {
    const docRef = await addDoc(notificationsCollection, {
      ...data,
      isRead: data.isRead !== undefined ? data.isRead : false,
      createdAt: Timestamp.fromDate(new Date())
    });
    return docRef.id;
  } catch (err) {
    console.error("Error creating notification:", err);
    throw err;
  }
};

// Check for existing notifications of same type and reference to avoid spamming
const hasNotificationEver = async (referenceId: string, type: string, category: string): Promise<boolean> => {
  try {
    const q = query(
      notificationsCollection, 
      where('referenceId', '==', referenceId),
      where('type', '==', type),
      where('category', '==', category)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (err) {
    return false;
  }
};

export const generateSystemNotifications = async (): Promise<void> => {
  try {
    const now = new Date();
    const today = now.getTime();

    // 1. Fetch data required for scans
    const [rentalsSnap, itemVariantsSnap, maintenanceSnap, issuesSnap] = await Promise.all([
      getDocs(collection(db, 'rentals')),
      getDocs(collection(db, 'itemVariants')),
      getDocs(collection(db, 'maintenanceOrders')),
      getDocs(collection(db, 'issues'))
    ]);

    const rentals = rentalsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    const variants = itemVariantsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    const maintenance = maintenanceSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    const issues = issuesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    // A. Scan: Overdue Rentals (endDate < today and status is not "Closed")
    for (const r of rentals) {
      if (r.status !== 'Closed' && r.endDate) {
        const end = r.endDate instanceof Timestamp ? r.endDate.toDate() : new Date(r.endDate);
        if (end.getTime() < today) {
          const alreadyCreated = await hasNotificationEver(r.id, 'error', 'rental');
          if (!alreadyCreated) {
            await createNotification({
              title: "Rental Overdue!",
              message: `Rental #${r.id.slice(0, 8)} for ${r.customerName || 'Customer'} is overdue (End Date: ${end.toLocaleDateString()}).`,
              type: "error",
              priority: "high",
              category: "rental",
              referenceId: r.id,
              referenceType: "rental",
              link: "/active-rentals",
              isSystemGenerated: true
            });
          }
        }
      }
    }

    // B. Scan: Low Stock (currentStock < minStockAlert)
    for (const v of variants) {
      const current = Number(v.currentStock) || 0;
      const minAlert = Number(v.minStockAlert);
      if (v.minStockAlert !== undefined && current < minAlert) {
        const alreadyCreated = await hasNotificationEver(v.id, 'warning', 'inventory');
        if (!alreadyCreated) {
          await createNotification({
            title: "Low Stock Alert!",
            message: `Item Variant "${v.name}" is running low. Current Stock: ${current} (Alert threshold: ${minAlert}).`,
            type: "warning",
            priority: "medium",
            category: "inventory",
            referenceId: v.id,
            referenceType: "itemVariant",
            link: "/inventory",
            isSystemGenerated: true
          });
        }
      }
    }

    // C. Scan: Pending Returns approaching (within 2 days)
    for (const r of rentals) {
      if (r.status !== 'Closed' && r.endDate) {
        const end = r.endDate instanceof Timestamp ? r.endDate.toDate() : new Date(r.endDate);
        const diffDays = (end.getTime() - today) / (1000 * 60 * 60 * 24);
        if (diffDays > 0 && diffDays <= 2) {
          const alreadyCreated = await hasNotificationEver(r.id, 'warning', 'rental');
          if (!alreadyCreated) {
            await createNotification({
              title: "Rental Return Approaching",
              message: `Rental #${r.id.slice(0, 8)} for ${r.customerName} is scheduled to return on ${end.toLocaleDateString()} (within 48 hours).`,
              type: "warning",
              priority: "medium",
              category: "rental",
              referenceId: r.id,
              referenceType: "rental",
              link: "/returns-inspections",
              isSystemGenerated: true
            });
          }
        }
      }
    }

    // D. Scan: Maintenance Pending for > 7 days
    for (const m of maintenance) {
      if (m.status === 'Pending' && m.createdAt) {
        const created = m.createdAt instanceof Timestamp ? m.createdAt.toDate() : new Date(m.createdAt);
        const ageDays = (today - created.getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays >= 7) {
          const alreadyCreated = await hasNotificationEver(m.id, 'warning', 'maintenance');
          if (!alreadyCreated) {
            await createNotification({
              title: "Stale Maintenance Order",
              message: `Maintenance order for "${m.itemName || 'Item'}" has been pending for over 7 days.`,
              type: "warning",
              priority: "low",
              category: "maintenance",
              referenceId: m.id,
              referenceType: "maintenanceOrder",
              link: "/maintenance",
              isSystemGenerated: true
            });
          }
        }
      }
    }

    // E. Scan: Issues Escalated (urgent + open)
    for (const i of issues) {
      if (i.priority === 'urgent' && (i.status === 'open' || i.status === 'escalated')) {
        const alreadyCreated = await hasNotificationEver(i.id, 'error', 'issue');
        if (!alreadyCreated) {
          await createNotification({
            title: "Urgent Dispute Pending",
            message: `Dispute Issue #${i.issueNumber || i.id.slice(0, 8)} for ${i.customerName} requires urgent attention.`,
            type: "error",
            priority: "high",
            category: "issue",
            referenceId: i.id,
            referenceType: "issue",
            link: "/issues",
            isSystemGenerated: true
          });
        }
      }
    }

  } catch (err) {
    console.error("Failed to run system notifications scan:", err);
  }
};
