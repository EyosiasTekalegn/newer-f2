import { collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, Timestamp, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { getItemVariant } from './inventoryService';

export interface DurationDiscount {
  minDays: number;
  maxDays: number; // Use very large number (e.g., 9999) for "or more"
  discountPercent: number; // e.g., 10 for 10%
}

export interface PricingSettings {
  id: string;
  dailyRateMultiplier: number;  // typically 1.0
  weeklyRateMultiplier: number; // e.g. 5.0 (pay for 5 days instead of 7)
  monthlyRateMultiplier: number; // e.g. 15.0 (pay for 15 days instead of 30)
  durationDiscounts: DurationDiscount[];
  updatedAt: Date;
}

export interface PriceList {
  id: string;
  name: string;               // e.g., "Peak Summer Season", "Winter Holidays", "Spring Promo"
  startDate: Date;            // start of seasonal rate
  endDate: Date;              // end of seasonal rate
  multiplier: number;         // multiplier e.g. 1.25 for 25% surcharge, 0.85 for 15% discount
  targetCategories: string[]; // empty array means applicable to all categories
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceCalculationResult {
  baseRatePerDay: number;
  quantity: number;
  durationDays: number;
  seasonalMultiplier: number;
  seasonalListName?: string;
  discountPercent: number;
  subtotalBeforeDiscounts: number;
  discountAmount: number;
  totalPrice: number;
}

const pricingSettingsDocRef = doc(db, 'pricingSettings', 'default');
const priceListsCollection = collection(db, 'priceLists');

const defaultPricingSettings: Omit<PricingSettings, 'id'> = {
  dailyRateMultiplier: 1.0,
  weeklyRateMultiplier: 5.0,
  monthlyRateMultiplier: 15.0,
  durationDiscounts: [
    { minDays: 3, maxDays: 5, discountPercent: 10 },
    { minDays: 6, maxDays: 12, discountPercent: 15 },
    { minDays: 13, maxDays: 9999, discountPercent: 25 }
  ],
  updatedAt: new Date()
};

/**
 * Seed initial pricing configuration and price lists if none exist
 */
const seedDefaultPricing = async (): Promise<void> => {
  try {
    const settingsSnap = await getDoc(pricingSettingsDocRef);
    if (!settingsSnap.exists()) {
      await setDoc(pricingSettingsDocRef, {
        ...defaultPricingSettings,
        updatedAt: Timestamp.fromDate(new Date())
      });
    }

    const priceListsSnap = await getDocs(priceListsCollection);
    if (priceListsSnap.empty) {
      const initialPriceLists = [
        {
          name: 'Peak Summer Season',
          startDate: Timestamp.fromDate(new Date(new Date().getFullYear(), 5, 1)), // June 1
          endDate: Timestamp.fromDate(new Date(new Date().getFullYear(), 8, 0)),   // Aug 31
          multiplier: 1.25,
          targetCategories: [],
          isActive: true,
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date())
        },
        {
          name: 'Winter Festive Season',
          startDate: Timestamp.fromDate(new Date(new Date().getFullYear(), 11, 15)), // Dec 15
          endDate: Timestamp.fromDate(new Date(new Date().getFullYear() + 1, 0, 5)), // Jan 5
          multiplier: 1.35,
          targetCategories: [],
          isActive: true,
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date())
        },
        {
          name: 'Spring Promotional Discount',
          startDate: Timestamp.fromDate(new Date(new Date().getFullYear(), 2, 1)), // March 1
          endDate: Timestamp.fromDate(new Date(new Date().getFullYear(), 3, 15)),  // April 15
          multiplier: 0.85,
          targetCategories: [],
          isActive: true,
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date())
        }
      ];

      for (const pl of initialPriceLists) {
        await addDoc(priceListsCollection, pl);
      }
    }
  } catch (error) {
    console.error("Failed to seed pricing settings:", error);
  }
};

/**
 * Fetch base pricing settings
 */
export const getPricingSettings = async (): Promise<PricingSettings> => {
  try {
    await seedDefaultPricing();
    const snap = await getDoc(pricingSettingsDocRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        dailyRateMultiplier: Number(data.dailyRateMultiplier || 1),
        weeklyRateMultiplier: Number(data.weeklyRateMultiplier || 5),
        monthlyRateMultiplier: Number(data.monthlyRateMultiplier || 15),
        durationDiscounts: data.durationDiscounts || [],
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    }
    return { id: 'default', ...defaultPricingSettings };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'pricingSettings/default', auth);
    throw error;
  }
};

/**
 * Save pricing settings config
 */
export const updatePricingSettings = async (data: Partial<Omit<PricingSettings, 'id' | 'updatedAt'>>): Promise<void> => {
  try {
    await setDoc(pricingSettingsDocRef, {
      ...data,
      updatedAt: Timestamp.fromDate(new Date())
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'pricingSettings/default', auth);
    throw error;
  }
};

/**
 * Fetch all price lists (seasonal rules)
 */
export const getPriceLists = async (): Promise<PriceList[]> => {
  try {
    await seedDefaultPricing();
    const snapshot = await getDocs(priceListsCollection);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || new Date(),
        multiplier: Number(data.multiplier) || 1.0,
        targetCategories: data.targetCategories || [],
        isActive: !!data.isActive,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'priceLists', auth);
    throw error;
  }
};

/**
 * Add a seasonal price list
 */
export const addPriceList = async (data: Omit<PriceList, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(priceListsCollection, {
      ...data,
      startDate: Timestamp.fromDate(new Date(data.startDate)),
      endDate: Timestamp.fromDate(new Date(data.endDate)),
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'priceLists', auth);
    throw error;
  }
};

/**
 * Update seasonal price list
 */
export const updatePriceList = async (id: string, data: Partial<Omit<PriceList, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, 'priceLists', id);
    const updateData: any = { ...data };
    if (data.startDate) {
      updateData.startDate = Timestamp.fromDate(new Date(data.startDate));
    }
    if (data.endDate) {
      updateData.endDate = Timestamp.fromDate(new Date(data.endDate));
    }
    updateData.updatedAt = Timestamp.fromDate(new Date());

    await updateDoc(docRef, updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `priceLists/${id}`, auth);
    throw error;
  }
};

/**
 * Delete a seasonal price list
 */
export const deletePriceList = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, 'priceLists', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `priceLists/${id}`, auth);
    throw error;
  }
};

/**
 * Calculate dynamic price factoring in base unit rate, seasonal price lists, duration multipliers, and duration bulk discounts
 */
export const calculatePrice = async (
  variantId: string,
  quantity: number,
  startDate: Date,
  endDate: Date
): Promise<PriceCalculationResult> => {
  try {
    const item = await getItemVariant(variantId);
    if (!item) {
      throw new Error(`Item variant with ID ${variantId} not found.`);
    }

    const baseRatePerDay = item.pricePerUnit;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate duration in days, minimum 1 day
    const diffTime = Math.abs(end.getTime() - start.getTime());
    let durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (durationDays <= 0) durationDays = 1;

    // Get pricing settings and price lists
    const settings = await getPricingSettings();
    const seasonalPriceLists = await getPriceLists();

    // 1. Identify if any active seasonal price list applies (overlapping date)
    let seasonalMultiplier = 1.0;
    let seasonalListName = '';

    const activeSeasons = seasonalPriceLists.filter(pl => pl.isActive);
    for (const season of activeSeasons) {
      const seasonStart = new Date(season.startDate);
      const seasonEnd = new Date(season.endDate);

      // Check if start date or end date overlaps with season dates
      const startOverlap = start >= seasonStart && start <= seasonEnd;
      const endOverlap = end >= seasonStart && end <= seasonEnd;
      const spansSeason = start <= seasonStart && end >= seasonEnd;

      if (startOverlap || endOverlap || spansSeason) {
        // If the season is specific to some categories, check item category
        if (season.targetCategories.length === 0 || season.targetCategories.includes(item.category)) {
          seasonalMultiplier = season.multiplier;
          seasonalListName = season.name;
          break; // Use the first matching active seasonal price list
        }
      }
    }

    // Apply seasonal multiplier to base rate
    const adjustedDailyRate = baseRatePerDay * seasonalMultiplier;

    // 2. Apply duration discount
    let discountPercent = 0;
    const discounts = settings.durationDiscounts || [];
    for (const disc of discounts) {
      if (durationDays >= disc.minDays && durationDays <= disc.maxDays) {
        discountPercent = disc.discountPercent;
        break;
      }
    }

    // Subtotal before bulk discounts
    const subtotalBeforeDiscounts = adjustedDailyRate * quantity * durationDays;
    const discountAmount = subtotalBeforeDiscounts * (discountPercent / 100);
    const totalPrice = subtotalBeforeDiscounts - discountAmount;

    return {
      baseRatePerDay,
      quantity,
      durationDays,
      seasonalMultiplier,
      seasonalListName: seasonalListName || undefined,
      discountPercent,
      subtotalBeforeDiscounts,
      discountAmount,
      totalPrice
    };
  } catch (error) {
    console.error("Failed to calculate price:", error);
    throw error;
  }
};
