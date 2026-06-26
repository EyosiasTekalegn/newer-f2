import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  Notification, 
  markAsRead as serviceMarkAsRead, 
  markAllAsRead as serviceMarkAllAsRead, 
  deleteNotification as serviceDeleteNotification,
  createNotification as serviceCreateNotification,
  generateSystemNotifications
} from '../services/notificationService';
import toast from 'react-hot-toast';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  addManualNotification: (title: string, message: string, type: Notification['type'], priority: Notification['priority'], category: Notification['category'], link?: string) => Promise<void>;
  triggerSystemScan: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Used to prevent showing toasts for historical unread notifications during page load
  const sessionStartTime = React.useRef(Date.now());

  useEffect(() => {
    // 1. Set up real-time listener for notifications
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Notification[] = [];
      let unread = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const createdDate = data.createdAt?.toDate() || new Date();
        const item: Notification = {
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
          createdAt: createdDate,
          expiresAt: data.expiresAt?.toDate(),
        };

        list.push(item);
        if (!item.isRead) {
          unread += 1;
        }
      });

      // Show toast notifications for NEW documents created during this session
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const createdTime = data.createdAt?.toDate()?.getTime() || Date.now();
          // Check if it's new and was created after this component mounted/loaded
          if (createdTime > sessionStartTime.current && !data.isRead) {
            const title = data.title || 'New Alert';
            const message = data.message || '';
            const type = data.type || 'info';

            // Custom styled toast based on type
            if (type === 'success') {
              toast.success(`${title}: ${message}`, { duration: 4000 });
            } else if (type === 'error') {
              toast.error(`${title}: ${message}`, { duration: 5000 });
            } else {
              toast(`${title}: ${message}`, {
                icon: type === 'warning' ? '⚠️' : 'ℹ️',
                duration: 4500,
                style: {
                  border: '1px solid #1A1A1A',
                  padding: '12px',
                  color: '#1A1A1A',
                  fontWeight: 'bold',
                }
              });
            }
          }
        }
      });

      setNotifications(list);
      setUnreadCount(unread);
      setLoading(false);
    }, (error) => {
      console.warn("Real-time notifications sync failed (may require index):", error);
      setLoading(false);
    });

    // 2. Perform initial background system scan
    generateSystemNotifications();

    return () => unsubscribe();
  }, []);

  const markAsRead = async (id: string) => {
    await serviceMarkAsRead(id);
  };

  const markAllAsRead = async () => {
    await serviceMarkAllAsRead();
  };

  const deleteNotification = async (id: string) => {
    await serviceDeleteNotification(id);
  };

  const addManualNotification = async (
    title: string, 
    message: string, 
    type: Notification['type'], 
    priority: Notification['priority'], 
    category: Notification['category'],
    link?: string
  ) => {
    await serviceCreateNotification({
      title,
      message,
      type,
      priority,
      category,
      link,
      isSystemGenerated: false,
    });
  };

  const triggerSystemScan = async () => {
    toast.promise(
      generateSystemNotifications(),
      {
        loading: 'Scanning for updates...',
        success: 'System alert scan complete!',
        error: 'Failed to complete system scan.'
      }
    );
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      addManualNotification,
      triggerSystemScan
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
