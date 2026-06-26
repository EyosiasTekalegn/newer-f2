import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { adjustStock } from './inventoryService';
import { recordExpense } from './incomeExpenseService';

export interface POItem {
  itemVariantId: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  receivedQty: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: Date;
  expectedDeliveryDate: Date;
  items: POItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: "Draft" | "Sent" | "Received" | "Closed" | "Cancelled";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseOrdersCollection = collection(db, 'purchaseOrders');

export const getPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  try {
    const snapshot = await getDocs(purchaseOrdersCollection);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      const items = Array.isArray(data.items) ? data.items : [];
      return {
        id: doc.id,
        poNumber: data.poNumber || '',
        supplierId: data.supplierId || '',
        supplierName: data.supplierName || 'Unknown Supplier',
        orderDate: data.orderDate?.toDate() || new Date(),
        expectedDeliveryDate: data.expectedDeliveryDate?.toDate() || new Date(),
        items: items.map((it: any) => ({
          itemVariantId: it.itemVariantId || '',
          name: it.name || '',
          quantity: Number(it.quantity || 0),
          unitCost: Number(it.unitCost || 0),
          totalCost: Number(it.totalCost || 0),
          receivedQty: Number(it.receivedQty || 0)
        })),
        subtotal: Number(data.subtotal || 0),
        tax: Number(data.tax || 0),
        total: Number(data.total || 0),
        status: (data.status || 'Draft') as any,
        notes: data.notes || '',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'purchaseOrders', auth);
    throw error;
  }
};

export const generatePONumber = async (): Promise<string> => {
  try {
    const pos = await getPurchaseOrders();
    const currentYear = new Date().getFullYear();
    const seq = String(pos.length + 1).padStart(4, '0');
    return `PO-${currentYear}-${seq}`;
  } catch (error) {
    console.error("Error generating PO number:", error);
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `PO-${new Date().getFullYear()}-${rand}`;
  }
};

export const addPurchaseOrder = async (data: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(purchaseOrdersCollection, {
      ...data,
      orderDate: Timestamp.fromDate(data.orderDate),
      expectedDeliveryDate: Timestamp.fromDate(data.expectedDeliveryDate),
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'purchaseOrders', auth);
    throw error;
  }
};

export const updatePurchaseOrder = async (id: string, data: Partial<Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, 'purchaseOrders', id);
    const updateData: any = { ...data };
    if (data.orderDate) updateData.orderDate = Timestamp.fromDate(data.orderDate);
    if (data.expectedDeliveryDate) updateData.expectedDeliveryDate = Timestamp.fromDate(data.expectedDeliveryDate);
    updateData.updatedAt = Timestamp.fromDate(new Date());

    await updateDoc(docRef, updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `purchaseOrders/${id}`, auth);
    throw error;
  }
};

export const deletePurchaseOrder = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'purchaseOrders', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `purchaseOrders/${id}`, auth);
    throw error;
  }
};

export const receivePurchaseOrder = async (
  id: string,
  receivedItems: Array<{ itemVariantId: string; receivedQty: number }>,
  bankId?: string
): Promise<void> => {
  try {
    const docRef = doc(db, 'purchaseOrders', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Purchase order not found");

    const data = snap.data();
    const items = Array.isArray(data.items) ? [...data.items] : [];
    
    let receivedSubtotal = 0;

    // Update quantities and adjust inventory stocks
    for (const rx of receivedItems) {
      if (rx.receivedQty <= 0) continue;
      
      const itemIdx = items.findIndex(it => it.itemVariantId === rx.itemVariantId);
      if (itemIdx !== -1) {
        const item = items[itemIdx];
        const prevRx = Number(item.receivedQty || 0);
        const nextRx = prevRx + rx.receivedQty;
        
        // Ensure we don't over-receive beyond ordered qty
        if (nextRx > item.quantity) {
          throw new Error(`Cannot receive ${rx.receivedQty} for variant ${item.name} as it exceeds the remaining ordered quantity of ${item.quantity - prevRx}`);
        }

        items[itemIdx] = {
          ...item,
          receivedQty: nextRx
        };

        receivedSubtotal += rx.receivedQty * Number(item.unitCost || 0);

        // Adjust stock in inventory service
        await adjustStock(rx.itemVariantId, rx.receivedQty, `PO Receipt: ${data.poNumber}`, id);
      }
    }

    // Determine new status
    // If all items are fully received: Closed. Otherwise, Received.
    const allReceived = items.every(it => Number(it.receivedQty || 0) >= Number(it.quantity || 0));
    const status = allReceived ? "Closed" : "Received";

    // If bankId is supplied, record a double-entry operating expense transaction
    if (bankId && receivedSubtotal > 0) {
      const tax = receivedSubtotal * 0.15;
      const totalCostForReceipt = receivedSubtotal + tax;

      // Fetch bank details to get bank name
      const bankSnap = await getDoc(doc(db, 'bankLedgers', bankId));
      if (!bankSnap.exists()) throw new Error("Selected bank ledger does not exist.");
      const bankName = bankSnap.data().name;

      await recordExpense({
        bankId,
        bankName,
        amount: totalCostForReceipt,
        description: `Procurement payment to Supplier: ${data.supplierName || 'Unknown Vendor'} for PO: ${data.poNumber}`,
        referenceType: 'procurement',
        referenceId: id,
        date: new Date()
      });
    }

    await updateDoc(docRef, {
      items,
      status,
      updatedAt: Timestamp.fromDate(new Date())
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `purchaseOrders/${id}/receive`, auth);
    throw error;
  }
};
