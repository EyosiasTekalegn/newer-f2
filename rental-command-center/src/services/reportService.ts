import { collection, getDocs, doc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Types
export interface FinancialReport {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  cashFlow: Array<{
    date: string;
    inflow: number;
    outflow: number;
    description: string;
    type: string;
  }>;
  revenueByCategory: Array<{
    category: string;
    amount: number;
  }>;
  revenueByCustomer: Array<{
    customerId: string;
    customerName: string;
    amount: number;
  }>;
}

export interface OperationalReport {
  rentalUtilization: Array<{
    itemName: string;
    totalStock: number;
    onRent: number;
    utilizationRate: number;
  }>;
  conversionRates: {
    totalQuotations: number;
    convertedQuotations: number;
    quotationConversionRate: number;
    totalBookings: number;
    completedBookings: number;
    bookingConversionRate: number;
  };
  returnDamageReport: {
    totalReturned: number;
    totalDamaged: number;
    totalMissing: number;
    damagesByItem: Array<{ itemName: string; damagedQty: number; cost: number }>;
  };
  maintenanceReport: {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalCost: number;
  };
}

export interface InventoryReport {
  stockLevels: Array<{
    itemId: string;
    name: string;
    category: string;
    currentStock: number;
    reservedStock: number;
    onRentStock: number;
    damagedStock: number;
    missingStock: number;
  }>;
  movementHistory: Array<{
    id: string;
    date: string;
    itemName: string;
    fromState: string;
    toState: string;
    quantity: number;
    referenceType: string;
    referenceId: string;
  }>;
  lowStockAlerts: Array<{
    itemId: string;
    name: string;
    category: string;
    currentStock: number;
    minStockAlert: number;
  }>;
}

export interface WorkforceReport {
  productivity: Array<{
    workerId: string;
    workerName: string;
    totalItemsHandled: number;
    loadingJobs: number;
    unloadingJobs: number;
    totalCommissions: number;
  }>;
  attendance: Array<{
    workerId: string;
    workerName: string;
    hoursWorked: number;
    daysPresent: number;
    daysLate: number;
    daysAbsent: number;
  }>;
  payrollSummary: Array<{
    workerId: string;
    workerName: string;
    baseSalary: number;
    commissions: number;
    bonuses: number;
    deductions: number;
    netPay: number;
    status: string;
  }>;
}

export interface CustomerReport {
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    totalSpend: number;
    rentalCount: number;
    avgOrderValue: number;
  }>;
  retention: {
    newCustomers: number;
    repeatCustomers: number;
    totalCustomers: number;
    retentionRate: number;
  };
  issuesSummary: Array<{
    category: string;
    openCount: number;
    resolvedCount: number;
    totalCount: number;
  }>;
}

export interface DashboardSummary {
  totalRevenueThisMonth: number;
  activeRentalsCount: number;
  pendingReturnsCount: number;
  lowStockCount: number;
  openIssuesCount: number;
}

// Collections Helper
const getCollectionData = async (collectionName: string): Promise<any[]> => {
  try {
    const snap = await getDocs(collection(db, collectionName));
    return snap.docs.map(doc => {
      const data = doc.data();
      // recursively map Timestamps to Dates
      const mapped: any = { id: doc.id };
      for (const key of Object.keys(data)) {
        const val = data[key];
        if (val && typeof val === 'object' && val.toDate && typeof val.toDate === 'function') {
          mapped[key] = val.toDate();
        } else if (Array.isArray(val)) {
          mapped[key] = val.map(item => {
            if (item && typeof item === 'object') {
              const itemMapped: any = {};
              for (const k of Object.keys(item)) {
                const v = item[k];
                if (v && typeof v === 'object' && v.toDate && typeof v.toDate === 'function') {
                  itemMapped[k] = v.toDate();
                } else {
                  itemMapped[k] = v;
                }
              }
              return itemMapped;
            }
            return item;
          });
        } else {
          mapped[key] = val;
        }
      }
      return mapped;
    });
  } catch (err) {
    console.warn(`Could not fetch collection ${collectionName}, returning empty array.`, err);
    return [];
  }
};

// REPORT AGGREGATION SERVICES
export const getFinancialReport = async (startDate: Date, endDate: Date): Promise<FinancialReport> => {
  const [transactions, rentals, itemVariants] = await Promise.all([
    getCollectionData('accountTransactions'),
    getCollectionData('rentals'),
    getCollectionData('itemVariants'),
  ]);

  const start = startDate.getTime();
  const end = endDate.getTime();

  // 1. Filter Transactions within Date Range
  const filteredTx = transactions.filter(tx => {
    const txTime = tx.date instanceof Date ? tx.date.getTime() : new Date(tx.date).getTime();
    return txTime >= start && txTime <= end;
  });

  let totalIncome = 0;
  let totalExpenses = 0;

  filteredTx.forEach(tx => {
    const amt = Number(tx.amount) || 0;
    if (tx.entryType === 'credit') {
      totalIncome += amt;
    } else if (tx.entryType === 'debit') {
      totalExpenses += amt;
    }
  });

  const netProfit = totalIncome - totalExpenses;

  // 2. Cash Flow over time (list)
  const cashFlow = filteredTx.map(tx => ({
    date: tx.date instanceof Date ? tx.date.toLocaleDateString() : new Date(tx.date).toLocaleDateString(),
    inflow: tx.entryType === 'credit' ? Number(tx.amount) : 0,
    outflow: tx.entryType === 'debit' ? Number(tx.amount) : 0,
    description: tx.description || 'Transaction',
    type: tx.referenceType || 'System',
  }));

  // 3. Revenue By Item Category (Map rental items to variant category)
  const revenueByCategoryMap: Record<string, number> = {};
  rentals.forEach(r => {
    const rTime = r.createdAt instanceof Date ? r.createdAt.getTime() : new Date(r.createdAt).getTime();
    if (rTime >= start && rTime <= end && Array.isArray(r.items)) {
      r.items.forEach((item: any) => {
        // Find variant to get category
        const variant = itemVariants.find(v => v.id === item.itemVariantId);
        const category = variant?.category || 'Uncategorized';
        revenueByCategoryMap[category] = (revenueByCategoryMap[category] || 0) + (Number(item.total) || 0);
      });
    }
  });

  const revenueByCategory = Object.entries(revenueByCategoryMap).map(([category, amount]) => ({
    category,
    amount,
  }));

  // 4. Revenue By Customer
  const revenueByCustomerMap: Record<string, { name: string; amount: number }> = {};
  rentals.forEach(r => {
    const rTime = r.createdAt instanceof Date ? r.createdAt.getTime() : new Date(r.createdAt).getTime();
    if (rTime >= start && rTime <= end) {
      const cid = r.customerId;
      const cname = r.customerName || 'Unknown Customer';
      if (!revenueByCustomerMap[cid]) {
        revenueByCustomerMap[cid] = { name: cname, amount: 0 };
      }
      revenueByCustomerMap[cid].amount += Number(r.total) || 0;
    }
  });

  const revenueByCustomer = Object.entries(revenueByCustomerMap).map(([customerId, info]) => ({
    customerId,
    customerName: info.name,
    amount: info.amount,
  })).sort((a, b) => b.amount - a.amount).slice(0, 10);

  return {
    totalIncome,
    totalExpenses,
    netProfit,
    cashFlow,
    revenueByCategory,
    revenueByCustomer,
  };
};

export const getOperationalReport = async (startDate: Date, endDate: Date): Promise<OperationalReport> => {
  const [rentals, quotations, bookings, maintenanceOrders, itemVariants] = await Promise.all([
    getCollectionData('rentals'),
    getCollectionData('quotations'),
    getCollectionData('bookings'),
    getCollectionData('maintenanceOrders'),
    getCollectionData('itemVariants'),
  ]);

  const start = startDate.getTime();
  const end = endDate.getTime();

  // 1. Rental Utilization
  // Group item quantities on rent right now
  const activeRentals = rentals.filter(r => r.status !== 'Closed');
  const itemsOnRent: Record<string, number> = {};
  activeRentals.forEach(r => {
    if (Array.isArray(r.items)) {
      r.items.forEach((it: any) => {
        const qtyOnRent = (Number(it.quantity) || 0) - (Number(it.returnedQty) || 0);
        itemsOnRent[it.itemVariantId] = (itemsOnRent[it.itemVariantId] || 0) + Math.max(0, qtyOnRent);
      });
    }
  });

  const rentalUtilization = itemVariants.map(v => {
    const onRent = itemsOnRent[v.id] || 0;
    const totalStock = Number(v.currentStock) || 0;
    const utilizationRate = totalStock > 0 ? Math.round((onRent / totalStock) * 100) : 0;
    return {
      itemName: v.name,
      totalStock,
      onRent,
      utilizationRate,
    };
  }).slice(0, 10); // top 10 utilized/tracked variants

  // 2. Conversion Rates
  const totalQuotations = quotations.length;
  const convertedQuotations = quotations.filter(q => q.status === 'Converted' || q.status === 'Accepted').length;
  const quotationConversionRate = totalQuotations > 0 ? Math.round((convertedQuotations / totalQuotations) * 100) : 0;

  const totalBookings = bookings.length;
  const completedBookings = bookings.filter(b => b.status === 'Closed' || b.status === 'Delivered').length;
  const bookingConversionRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;

  // 3. Return & Damage Report
  let totalReturned = 0;
  let totalDamaged = 0;
  let totalMissing = 0;
  const damagesByItemMap: Record<string, { qty: number; cost: number }> = {};

  rentals.forEach(r => {
    const rTime = r.updatedAt instanceof Date ? r.updatedAt.getTime() : new Date(r.updatedAt).getTime();
    if (rTime >= start && rTime <= end && Array.isArray(r.items)) {
      r.items.forEach((it: any) => {
        totalReturned += Number(it.returnedQty) || 0;
        totalDamaged += Number(it.damagedQty) || 0;
        totalMissing += Number(it.missingQty) || 0;

        if (Number(it.damagedQty) > 0) {
          const variant = itemVariants.find(v => v.id === it.itemVariantId);
          const price = variant?.pricePerUnit || 100; // fallback cost
          const estCost = Number(it.damagedQty) * price;
          if (!damagesByItemMap[it.name]) {
            damagesByItemMap[it.name] = { qty: 0, cost: 0 };
          }
          damagesByItemMap[it.name].qty += Number(it.damagedQty);
          damagesByItemMap[it.name].cost += estCost;
        }
      });
    }
  });

  const damagesByItem = Object.entries(damagesByItemMap).map(([itemName, d]) => ({
    itemName,
    damagedQty: d.qty,
    cost: d.cost,
  }));

  // 4. Maintenance Report
  const filteredMaint = maintenanceOrders.filter(mo => {
    const moTime = mo.createdAt instanceof Date ? mo.createdAt.getTime() : new Date(mo.createdAt).getTime();
    return moTime >= start && moTime <= end;
  });

  const totalOrders = filteredMaint.length;
  const pendingOrders = filteredMaint.filter(mo => mo.status === 'Pending' || mo.status === 'In Progress').length;
  const completedOrders = filteredMaint.filter(mo => mo.status === 'Completed').length;
  const totalCost = filteredMaint.reduce((sum, mo) => sum + (Number(mo.damageCost) || 0), 0);

  return {
    rentalUtilization,
    conversionRates: {
      totalQuotations,
      convertedQuotations,
      quotationConversionRate,
      totalBookings,
      completedBookings,
      bookingConversionRate,
    },
    returnDamageReport: {
      totalReturned,
      totalDamaged,
      totalMissing,
      damagesByItem,
    },
    maintenanceReport: {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalCost,
    },
  };
};

export const getInventoryReport = async (): Promise<InventoryReport> => {
  const [itemVariants, bookings, rentals, movements] = await Promise.all([
    getCollectionData('itemVariants'),
    getCollectionData('bookings'),
    getCollectionData('rentals'),
    getCollectionData('inventoryMovements'),
  ]);

  // Reserved quantities from non-cancelled/non-closed bookings
  const activeBookings = bookings.filter(b => b.status === 'Reserved' || b.status === 'Confirmed');
  const itemsReserved: Record<string, number> = {};
  activeBookings.forEach(b => {
    if (Array.isArray(b.items)) {
      b.items.forEach((it: any) => {
        itemsReserved[it.itemVariantId] = (itemsReserved[it.itemVariantId] || 0) + (Number(it.quantity) || 0);
      });
    }
  });

  // On Rent quantities
  const activeRentals = rentals.filter(r => r.status !== 'Closed');
  const itemsOnRent: Record<string, number> = {};
  const itemsDamaged: Record<string, number> = {};
  const itemsMissing: Record<string, number> = {};

  activeRentals.forEach(r => {
    if (Array.isArray(r.items)) {
      r.items.forEach((it: any) => {
        const onRentQty = (Number(it.quantity) || 0) - (Number(it.returnedQty) || 0);
        itemsOnRent[it.itemVariantId] = (itemsOnRent[it.itemVariantId] || 0) + Math.max(0, onRentQty);
        itemsDamaged[it.itemVariantId] = (itemsDamaged[it.itemVariantId] || 0) + (Number(it.damagedQty) || 0);
        itemsMissing[it.itemVariantId] = (itemsMissing[it.itemVariantId] || 0) + (Number(it.missingQty) || 0);
      });
    }
  });

  // Stock levels
  const stockLevels = itemVariants.map(v => ({
    itemId: v.id,
    name: v.name,
    category: v.category,
    currentStock: Number(v.currentStock) || 0,
    reservedStock: itemsReserved[v.id] || 0,
    onRentStock: itemsOnRent[v.id] || 0,
    damagedStock: itemsDamaged[v.id] || 0,
    missingStock: itemsMissing[v.id] || 0,
  }));

  // Movement history (map dates to readable strings)
  const movementHistory = movements.map(m => {
    const variant = itemVariants.find(v => v.id === m.itemVariantId);
    return {
      id: m.id,
      date: m.date instanceof Date ? m.date.toLocaleDateString() : new Date(m.date).toLocaleDateString(),
      itemName: variant?.name || m.itemName || 'Unknown Item',
      fromState: m.fromState || '',
      toState: m.toState || '',
      quantity: Number(m.quantity) || 0,
      referenceType: m.referenceType || '',
      referenceId: m.referenceId || '',
    };
  }).slice(0, 50); // limit to recent 50

  // Low stock alerts
  const lowStockAlerts = itemVariants
    .filter(v => v.minStockAlert !== undefined && (Number(v.currentStock) || 0) < Number(v.minStockAlert))
    .map(v => ({
      itemId: v.id,
      name: v.name,
      category: v.category,
      currentStock: Number(v.currentStock) || 0,
      minStockAlert: Number(v.minStockAlert) || 0,
    }));

  return {
    stockLevels,
    movementHistory,
    lowStockAlerts,
  };
};

export const getWorkforceReport = async (startDate: Date, endDate: Date): Promise<WorkforceReport> => {
  const [workers, attendance, workerCommissions, payrollRuns] = await Promise.all([
    getCollectionData('workers'),
    getCollectionData('attendance'),
    getCollectionData('workerCommissions'),
    getCollectionData('payrollRuns'),
  ]);

  const start = startDate.getTime();
  const end = endDate.getTime();

  // 1. Productivity
  const filteredCommissions = workerCommissions.filter(wc => {
    const wcTime = wc.createdAt instanceof Date ? wc.createdAt.getTime() : new Date(wc.createdAt).getTime();
    return wcTime >= start && wcTime <= end;
  });

  const productivity = workers.map(w => {
    const workerComms = filteredCommissions.filter(c => c.workerId === w.id);
    const loadingJobs = workerComms.filter(c => c.type === 'loading').length;
    const unloadingJobs = workerComms.filter(c => c.type === 'unloading').length;
    const totalItemsHandled = workerComms.reduce((sum, c) => sum + (Number(c.totalItems) || 0), 0);
    const totalCommissions = workerComms.reduce((sum, c) => sum + (Number(c.totalAmount) || 0), 0);

    return {
      workerId: w.id,
      workerName: w.name || 'Unknown Worker',
      totalItemsHandled,
      loadingJobs,
      unloadingJobs,
      totalCommissions,
    };
  });

  // 2. Attendance Summary
  const filteredAttendance = attendance.filter(a => {
    const aTime = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
    return aTime >= start && aTime <= end;
  });

  const attendanceSummary = workers.map(w => {
    const workerRecords = filteredAttendance.filter(a => a.workerId === w.id);
    const hoursWorked = workerRecords.reduce((sum, a) => sum + (Number(a.hoursWorked) || 0), 0);
    const daysPresent = workerRecords.filter(a => a.status === 'Present' || a.status === 'Late' || a.status === 'Half Day').length;
    const daysLate = workerRecords.filter(a => a.status === 'Late').length;
    const daysAbsent = workerRecords.filter(a => a.status === 'Absent').length;

    return {
      workerId: w.id,
      workerName: w.name || 'Unknown Worker',
      hoursWorked,
      daysPresent,
      daysLate,
      daysAbsent,
    };
  });

  // 3. Payroll Summary
  const filteredPayroll = payrollRuns.filter(p => {
    const pTime = p.createdAt instanceof Date ? p.createdAt.getTime() : new Date(p.createdAt).getTime();
    return pTime >= start && pTime <= end;
  });

  const payrollSummary: any[] = [];
  filteredPayroll.forEach(p => {
    if (Array.isArray(p.workerPayments)) {
      p.workerPayments.forEach((wp: any) => {
        payrollSummary.push({
          workerId: wp.workerId,
          workerName: wp.workerName,
          baseSalary: Number(wp.baseSalary) || 0,
          commissions: Number(wp.commissionTotal) || 0,
          bonuses: Number(wp.bonus) || 0,
          deductions: Number(wp.deductions) || 0,
          netPay: Number(wp.netPay) || 0,
          status: p.status,
        });
      });
    }
  });

  // Default worker entries if no payroll runs
  if (payrollSummary.length === 0) {
    workers.forEach(w => {
      payrollSummary.push({
        workerId: w.id,
        workerName: w.name,
        baseSalary: Number(w.baseSalary) || 0,
        commissions: 0,
        bonuses: 0,
        deductions: 0,
        netPay: Number(w.baseSalary) || 0,
        status: 'N/A',
      });
    });
  }

  return {
    productivity,
    attendance: attendanceSummary,
    payrollSummary,
  };
};

export const getCustomerReport = async (startDate: Date, endDate: Date): Promise<CustomerReport> => {
  const [customers, rentals, issues] = await Promise.all([
    getCollectionData('customers'),
    getCollectionData('rentals'),
    getCollectionData('issues'),
  ]);

  const start = startDate.getTime();
  const end = endDate.getTime();

  // 1. Top Customers
  const customerStats: Record<string, { name: string; totalSpend: number; rentalCount: number }> = {};
  rentals.forEach(r => {
    const rTime = r.createdAt instanceof Date ? r.createdAt.getTime() : new Date(r.createdAt).getTime();
    if (rTime >= start && rTime <= end) {
      const cid = r.customerId;
      if (!customerStats[cid]) {
        customerStats[cid] = { name: r.customerName || 'Unknown Customer', totalSpend: 0, rentalCount: 0 };
      }
      customerStats[cid].totalSpend += Number(r.total) || 0;
      customerStats[cid].rentalCount += 1;
    }
  });

  const topCustomers = Object.entries(customerStats).map(([customerId, stat]) => ({
    customerId,
    customerName: stat.name,
    totalSpend: stat.totalSpend,
    rentalCount: stat.rentalCount,
    avgOrderValue: stat.rentalCount > 0 ? Math.round(stat.totalSpend / stat.rentalCount) : 0,
  })).sort((a, b) => b.totalSpend - a.totalSpend);

  // 2. Retention Summary
  const totalCustomers = customers.length || 1;
  const customerRentalCounts: Record<string, number> = {};
  rentals.forEach(r => {
    customerRentalCounts[r.customerId] = (customerRentalCounts[r.customerId] || 0) + 1;
  });

  let repeatCustomersCount = 0;
  customers.forEach(c => {
    if ((customerRentalCounts[c.id] || 0) > 1) {
      repeatCustomersCount += 1;
    }
  });

  const newCustomersCount = Math.max(0, customers.length - repeatCustomersCount);
  const retentionRate = Math.round((repeatCustomersCount / totalCustomers) * 100);

  // 3. Issues Summary
  const issuesSummaryMap: Record<string, { open: number; resolved: number; total: number }> = {};
  issues.forEach(i => {
    const category = i.category || 'other';
    if (!issuesSummaryMap[category]) {
      issuesSummaryMap[category] = { open: 0, resolved: 0, total: 0 };
    }
    issuesSummaryMap[category].total += 1;
    if (i.status === 'resolved' || i.status === 'closed') {
      issuesSummaryMap[category].resolved += 1;
    } else {
      issuesSummaryMap[category].open += 1;
    }
  });

  const issuesSummary = Object.entries(issuesSummaryMap).map(([category, s]) => ({
    category,
    openCount: s.open,
    resolvedCount: s.resolved,
    totalCount: s.total,
  }));

  return {
    topCustomers,
    retention: {
      newCustomers: newCustomersCount,
      repeatCustomers: repeatCustomersCount,
      totalCustomers: customers.length,
      retentionRate,
    },
    issuesSummary,
  };
};

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const [rentals, itemVariants, issues] = await Promise.all([
    getCollectionData('rentals'),
    getCollectionData('itemVariants'),
    getCollectionData('issues'),
  ]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  // 1. Total revenue this month
  const totalRevenueThisMonth = rentals
    .filter(r => {
      const rTime = r.createdAt instanceof Date ? r.createdAt.getTime() : new Date(r.createdAt).getTime();
      return rTime >= startOfMonth;
    })
    .reduce((sum, r) => sum + (Number(r.total) || 0), 0);

  // 2. Active rentals count
  const activeRentalsCount = rentals.filter(r => r.status === 'Delivered' || r.status === 'Partially Returned').length;

  // 3. Pending returns (overdue active rentals or standard active rentals)
  const pendingReturnsCount = rentals.filter(r => {
    if (r.status === 'Closed') return false;
    const end = r.endDate instanceof Date ? r.endDate.getTime() : new Date(r.endDate).getTime();
    return end < now.getTime(); // overdue
  }).length || activeRentalsCount; // fallback to active rentals count if none overdue

  // 4. Low stock variants
  const lowStockCount = itemVariants.filter(v => v.minStockAlert !== undefined && (Number(v.currentStock) || 0) < Number(v.minStockAlert)).length;

  // 5. Open issues count
  const openIssuesCount = issues.filter(i => i.status !== 'resolved' && i.status !== 'closed').length;

  return {
    totalRevenueThisMonth,
    activeRentalsCount,
    pendingReturnsCount,
    lowStockCount,
    openIssuesCount,
  };
};

// REPORT EXPORT UTILS
export const exportReportToExcel = (data: any, type: string) => {
  const wb = XLSX.utils.book_new();

  // Standardize based on type
  if (type === 'financial') {
    const summary = [
      { Metric: 'Total Revenue/Income', Value: data.totalIncome },
      { Metric: 'Total Expenses', Value: data.totalExpenses },
      { Metric: 'Net Profit/Loss', Value: data.netProfit },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Financial Overview');

    const wsCashflow = XLSX.utils.json_to_sheet(data.cashFlow);
    XLSX.utils.book_append_sheet(wb, wsCashflow, 'Cash Flow Ledger');

    const wsCategories = XLSX.utils.json_to_sheet(data.revenueByCategory);
    XLSX.utils.book_append_sheet(wb, wsCategories, 'Revenue by Category');
  } else if (type === 'operational') {
    const wsUtil = XLSX.utils.json_to_sheet(data.rentalUtilization);
    XLSX.utils.book_append_sheet(wb, wsUtil, 'Rental Utilization');

    const conversion = [
      { Phase: 'Total Quotations', Count: data.conversionRates.totalQuotations },
      { Phase: 'Converted Quotations', Count: data.conversionRates.convertedQuotations },
      { Phase: 'Quotation Conversion Rate %', Count: data.conversionRates.quotationConversionRate },
      { Phase: 'Total Bookings', Count: data.conversionRates.totalBookings },
      { Phase: 'Completed Bookings', Count: data.conversionRates.completedBookings },
      { Phase: 'Booking Conversion Rate %', Count: data.conversionRates.bookingConversionRate },
    ];
    const wsConv = XLSX.utils.json_to_sheet(conversion);
    XLSX.utils.book_append_sheet(wb, wsConv, 'Funnel Conversions');

    const wsReturns = XLSX.utils.json_to_sheet([data.returnDamageReport]);
    XLSX.utils.book_append_sheet(wb, wsReturns, 'Returns and Damages');
  } else if (type === 'inventory') {
    const wsStock = XLSX.utils.json_to_sheet(data.stockLevels);
    XLSX.utils.book_append_sheet(wb, wsStock, 'Stock Levels');

    const wsMovements = XLSX.utils.json_to_sheet(data.movementHistory);
    XLSX.utils.book_append_sheet(wb, wsMovements, 'Stock Movement History');

    const wsLow = XLSX.utils.json_to_sheet(data.lowStockAlerts);
    XLSX.utils.book_append_sheet(wb, wsLow, 'Low Stock Alerts');
  } else if (type === 'workforce') {
    const wsProd = XLSX.utils.json_to_sheet(data.productivity);
    XLSX.utils.book_append_sheet(wb, wsProd, 'Worker Productivity');

    const wsAtt = XLSX.utils.json_to_sheet(data.attendance);
    XLSX.utils.book_append_sheet(wb, wsAtt, 'Worker Attendance');

    const wsPay = XLSX.utils.json_to_sheet(data.payrollSummary);
    XLSX.utils.book_append_sheet(wb, wsPay, 'Payroll Summary');
  } else if (type === 'customer') {
    const wsCust = XLSX.utils.json_to_sheet(data.topCustomers);
    XLSX.utils.book_append_sheet(wb, wsCust, 'Top Customers');

    const wsRet = XLSX.utils.json_to_sheet([data.retention]);
    XLSX.utils.book_append_sheet(wb, wsRet, 'Retention Stats');

    const wsIssues = XLSX.utils.json_to_sheet(data.issuesSummary);
    XLSX.utils.book_append_sheet(wb, wsIssues, 'Disputes and Issues');
  }

  XLSX.writeFile(wb, `${type}_report_${Date.now()}.xlsx`);
};

function parsePercentOrFloat(val: string, maxVal: number = 1): number {
  if (val.endsWith('%')) {
    return (parseFloat(val) / 100) * maxVal;
  }
  return parseFloat(val);
}

export function oklchToRgba(oklchStr: string): string {
  return oklchStr.replace(/oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/g, (match, lStr, cStr, hStr, aStr) => {
    try {
      const L = parsePercentOrFloat(lStr, 1);
      const C = parseFloat(cStr);
      const H = parseFloat(hStr);
      const A = aStr ? parsePercentOrFloat(aStr, 1) : 1;

      const hRad = (H * Math.PI) / 180;
      const aCoord = C * Math.cos(hRad);
      const bCoord = C * Math.sin(hRad);

      const l_ = L + 0.3963377774 * aCoord + 0.2158037573 * bCoord;
      const m_ = L - 0.1055613458 * aCoord - 0.0638541728 * bCoord;
      const s_ = L - 0.0894841775 * aCoord - 1.2914855480 * bCoord;

      const l = l_ * l_ * l_;
      const m = m_ * m_ * m_;
      const s = s_ * s_ * s_;

      let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
      let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
      let b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

      const gamma = (c: number) => {
        return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
      };

      const R = Math.max(0, Math.min(255, Math.round(gamma(r) * 255)));
      const G = Math.max(0, Math.min(255, Math.round(gamma(g) * 255)));
      const B = Math.max(0, Math.min(255, Math.round(gamma(b) * 255)));

      return A === 1 ? `rgb(${R}, ${G}, ${B})` : `rgba(${R}, ${G}, ${B}, ${A})`;
    } catch (e) {
      return 'rgb(0, 0, 0)';
    }
  });
}

export const exportReportToPDF = async (elementId: string, type: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    // Failover if element isn't present
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(220, 38, 38);
    doc.text(`${type.toUpperCase()} REPORT`, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
    doc.save(`${type}_report_${Date.now()}.pdf`);
    return;
  }

  // Temporary monkey-patch to prevent html2canvas oklch parsing error
  const originalGetPropertyValue = window.CSSStyleDeclaration.prototype.getPropertyValue;
  window.CSSStyleDeclaration.prototype.getPropertyValue = function(this: any, property: string) {
    const value = originalGetPropertyValue.call(this, property);
    if (value && typeof value === 'string' && value.includes('oklch')) {
      return oklchToRgba(value);
    }
    return value;
  };

  let canvas;
  try {
    canvas = await html2canvas(element, { scale: 2, useCORS: true });
  } finally {
    window.CSSStyleDeclaration.prototype.getPropertyValue = originalGetPropertyValue;
  }

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgWidth = 210; // A4 size width
  const pageHeight = 295; // A4 size height
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(`${type}_report_${Date.now()}.pdf`);
};
