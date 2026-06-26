import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth, storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export interface Issue {
  id: string;
  issueNumber: string;        // auto-generated, e.g., "ISS-2026-0001"
  customerId: string;
  customerName: string;       // denormalized
  rentalId?: string;          // optional
  bookingId?: string;         // optional
  contractId?: string;        // optional
  category: "damage" | "missing" | "payment" | "delivery" | "return" | "customer_complaint" | "other";
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed" | "escalated";
  description: string;
  resolution?: string;
  resolutionDate?: Date;
  resolvedBy?: string;        // user ID
  attachments: string[];      // Firebase Storage URLs (photos, documents)
  createdAt: Date;
  updatedAt: Date;
}

export interface IssueComment {
  id: string;
  userId: string;
  userName: string;           // denormalized
  comment: string;
  isInternal: boolean;        // if true, only staff can see
  createdAt: Date;
}

const issuesCollection = collection(db, 'issues');

// Helper to upload attachment to Firebase Storage
export const uploadIssueAttachment = async (file: Blob, fileName: string): Promise<string> => {
  try {
    const tempName = `${Date.now()}_${fileName}`;
    const storageRef = ref(storage, `issues/attachments/${tempName}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Error uploading issue attachment:", error);
    throw new Error("Failed to upload attachment to storage.");
  }
};

export const getIssues = async (): Promise<Issue[]> => {
  try {
    const snapshot = await getDocs(issuesCollection);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        resolutionDate: data.resolutionDate?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Issue;
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error: any) {
    handleFirestoreError(error, OperationType.LIST, 'issues', auth);
    throw error;
  }
};

export const getIssue = async (id: string): Promise<Issue | null> => {
  try {
    const docRef = doc(db, 'issues', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    return {
      ...data,
      id: snapshot.id,
      resolutionDate: data.resolutionDate?.toDate(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    } as Issue;
  } catch (error: any) {
    handleFirestoreError(error, OperationType.GET, `issues/${id}`, auth);
    throw error;
  }
};

export const addIssue = async (issueData: Omit<Issue, 'id' | 'issueNumber' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const snapshot = await getDocs(issuesCollection);
    const year = new Date().getFullYear();
    const count = snapshot.size;
    const issueNumber = `ISS-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const now = new Date();
    const docRef = await addDoc(issuesCollection, {
      ...issueData,
      issueNumber,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });

    return docRef.id;
  } catch (error: any) {
    handleFirestoreError(error, OperationType.CREATE, 'issues', auth);
    throw error;
  }
};

export const updateIssue = async (id: string, issueData: Partial<Omit<Issue, 'id' | 'issueNumber' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, 'issues', id);
    const updates: any = {
      ...issueData,
      updatedAt: Timestamp.fromDate(new Date())
    };
    if (issueData.resolutionDate) {
      updates.resolutionDate = Timestamp.fromDate(issueData.resolutionDate);
    }
    await updateDoc(docRef, updates);
  } catch (error: any) {
    handleFirestoreError(error, OperationType.UPDATE, `issues/${id}`, auth);
    throw error;
  }
};

export const deleteIssue = async (id: string): Promise<void> => {
  try {
    // Delete comments subcollection first if needed, though client-side can delete directly
    const commentsRef = collection(db, 'issues', id, 'issueComments');
    const commentsSnap = await getDocs(commentsRef);
    for (const cDoc of commentsSnap.docs) {
      await deleteDoc(doc(db, 'issues', id, 'issueComments', cDoc.id));
    }
    
    const docRef = doc(db, 'issues', id);
    await deleteDoc(docRef);
  } catch (error: any) {
    handleFirestoreError(error, OperationType.DELETE, `issues/${id}`, auth);
    throw error;
  }
};

// Comments subcollection logic
export const getComments = async (issueId: string): Promise<IssueComment[]> => {
  try {
    const commentsRef = collection(db, 'issues', issueId, 'issueComments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        comment: data.comment,
        isInternal: data.isInternal || false,
        createdAt: data.createdAt?.toDate() || new Date()
      };
    });
  } catch (error: any) {
    handleFirestoreError(error, OperationType.LIST, `issues/${issueId}/issueComments`, auth);
    throw error;
  }
};

export const addComment = async (issueId: string, commentData: Omit<IssueComment, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const commentsRef = collection(db, 'issues', issueId, 'issueComments');
    const now = new Date();
    const docRef = await addDoc(commentsRef, {
      ...commentData,
      createdAt: Timestamp.fromDate(now)
    });
    
    // Also touch the issue's updatedAt timestamp
    const issueRef = doc(db, 'issues', issueId);
    await updateDoc(issueRef, {
      updatedAt: Timestamp.fromDate(now)
    });

    return docRef.id;
  } catch (error: any) {
    handleFirestoreError(error, OperationType.CREATE, `issues/${issueId}/issueComments`, auth);
    throw error;
  }
};

export const deleteComment = async (issueId: string, commentId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'issues', issueId, 'issueComments', commentId);
    await deleteDoc(docRef);
  } catch (error: any) {
    handleFirestoreError(error, OperationType.DELETE, `issues/${issueId}/issueComments/${commentId}`, auth);
    throw error;
  }
};

export const resolveIssue = async (id: string, resolution: string): Promise<void> => {
  try {
    const docRef = doc(db, 'issues', id);
    const now = new Date();
    const userEmail = auth.currentUser?.email || 'Staff';
    await updateDoc(docRef, {
      status: "resolved",
      resolution,
      resolutionDate: Timestamp.fromDate(now),
      resolvedBy: userEmail,
      updatedAt: Timestamp.fromDate(now)
    });
  } catch (error: any) {
    handleFirestoreError(error, OperationType.UPDATE, `issues/${id}`, auth);
    throw error;
  }
};

export const closeIssue = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'issues', id);
    const now = new Date();
    await updateDoc(docRef, {
      status: "closed",
      updatedAt: Timestamp.fromDate(now)
    });
  } catch (error: any) {
    handleFirestoreError(error, OperationType.UPDATE, `issues/${id}`, auth);
    throw error;
  }
};

export const escalateIssue = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'issues', id);
    const now = new Date();
    await updateDoc(docRef, {
      status: "escalated",
      updatedAt: Timestamp.fromDate(now)
    });
  } catch (error: any) {
    handleFirestoreError(error, OperationType.UPDATE, `issues/${id}`, auth);
    throw error;
  }
};
