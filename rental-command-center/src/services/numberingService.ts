import { collection, doc, runTransaction, getDoc, getDocs, setDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export interface NumberingRule {
  id: string;                 // Same as module name (e.g., "customers")
  module: string;             // e.g. "customers", "bookings", "rentals", "quotations", "inventory", "logistics", "issues", "finance"
  prefix: string;             // e.g. "QT-", "RENT-"
  nextNumber: number;         // e.g. 45
  digitCount: number;         // e.g. 5 (pads like 00045)
  suffix: string;             // e.g. "-2026", or empty
  updatedAt: Date;
}

const numberingRulesCollection = collection(db, 'numberingRules');

const defaultRules: Record<string, Omit<NumberingRule, 'id' | 'updatedAt'>> = {
  customers: { module: 'customers', prefix: 'CUST-', nextNumber: 1, digitCount: 5, suffix: '' },
  bookings: { module: 'bookings', prefix: 'BK-', nextNumber: 1, digitCount: 5, suffix: '' },
  rentals: { module: 'rentals', prefix: 'RENT-', nextNumber: 1, digitCount: 5, suffix: '' },
  quotations: { module: 'quotations', prefix: 'QT-', nextNumber: 1, digitCount: 5, suffix: '' },
  inventory: { module: 'inventory', prefix: 'ITEM-', nextNumber: 1, digitCount: 5, suffix: '' },
  logistics: { module: 'logistics', prefix: 'LOG-', nextNumber: 1, digitCount: 5, suffix: '' },
  issues: { module: 'issues', prefix: 'ISS-', nextNumber: 1, digitCount: 5, suffix: '' },
  finance: { module: 'finance', prefix: 'TX-', nextNumber: 1, digitCount: 5, suffix: '' }
};

/**
 * Seed missing numbering rules
 */
export const seedNumberingRules = async (): Promise<void> => {
  try {
    const snap = await getDocs(numberingRulesCollection);
    if (snap.empty) {
      for (const [key, rule] of Object.entries(defaultRules)) {
        await setDoc(doc(db, 'numberingRules', key), {
          ...rule,
          updatedAt: Timestamp.fromDate(new Date())
        });
      }
    }
  } catch (error) {
    console.error("Failed to seed default numbering rules:", error);
  }
};

/**
 * Fetch all numbering rules
 */
export const getNumberingRules = async (): Promise<NumberingRule[]> => {
  try {
    await seedNumberingRules();
    const snap = await getDocs(numberingRulesCollection);
    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        module: data.module,
        prefix: data.prefix || '',
        nextNumber: Number(data.nextNumber) || 1,
        digitCount: Number(data.digitCount) || 5,
        suffix: data.suffix || '',
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'numberingRules', auth);
    throw error;
  }
};

/**
 * Update numbering rules
 */
export const updateNumberingRule = async (id: string, data: Partial<Omit<NumberingRule, 'id' | 'updatedAt' | 'module'>>): Promise<void> => {
  try {
    const docRef = doc(db, 'numberingRules', id);
    await setDoc(docRef, {
      ...data,
      updatedAt: Timestamp.fromDate(new Date())
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `numberingRules/${id}`, auth);
    throw error;
  }
};

/**
 * Generates the next concurrent-safe custom formatted serial number for a specific module,
 * incrementing it transactionally in Firestore.
 */
export const getNextNumber = async (moduleName: string): Promise<string> => {
  const docRef = doc(db, 'numberingRules', moduleName);
  try {
    return await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      
      let rule: Omit<NumberingRule, 'id' | 'updatedAt'>;
      
      if (!snap.exists()) {
        // Fallback or self-healing to default if not seeded
        rule = defaultRules[moduleName] || {
          module: moduleName,
          prefix: `${moduleName.substring(0, 3).toUpperCase()}-`,
          nextNumber: 1,
          digitCount: 5,
          suffix: ''
        };
      } else {
        const data = snap.data();
        rule = {
          module: data.module || moduleName,
          prefix: data.prefix || '',
          nextNumber: Number(data.nextNumber) || 1,
          digitCount: Number(data.digitCount) || 5,
          suffix: data.suffix || ''
        };
      }

      const currentNumber = rule.nextNumber;
      const paddedNumber = String(currentNumber).padStart(rule.digitCount, '0');
      const formattedValue = `${rule.prefix}${paddedNumber}${rule.suffix}`;

      // Update next number transactionally
      transaction.set(docRef, {
        ...rule,
        nextNumber: currentNumber + 1,
        updatedAt: Timestamp.fromDate(new Date())
      }, { merge: true });

      return formattedValue;
    });
  } catch (error) {
    console.error(`Failed to generate next number for module ${moduleName}:`, error);
    // In case transaction fails completely, fallback to timestamp-based unique code to avoid blocking user operations
    const rand = Math.floor(100 + Math.random() * 900);
    const fallbackPrefix = defaultRules[moduleName]?.prefix || `${moduleName.substring(0,3).toUpperCase()}-`;
    return `${fallbackPrefix}F-${Date.now().toString().slice(-5)}-${rand}`;
  }
};
