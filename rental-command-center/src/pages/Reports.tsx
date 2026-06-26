import React, { useState, useEffect, useMemo } from 'react';
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  RefreshCw, 
  Calendar, 
  TrendingUp, 
  Briefcase, 
  Users, 
  BarChart2, 
  DollarSign, 
  Package, 
  Clock, 
  AlertTriangle,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react';
import { 
  getFinancialReport, 
  getOperationalReport, 
  getInventoryReport, 
  getWorkforceReport, 
  getCustomerReport, 
  exportReportToExcel, 
  exportReportToPDF,
  FinancialReport,
  OperationalReport,
  InventoryReport,
  WorkforceReport,
  CustomerReport
} from '../services/reportService';
import { BarChart } from '../components/charts/BarChart';
import { LineChart } from '../components/charts/LineChart';
import { PieChart } from '../components/charts/PieChart';
import { format, subDays, startOfMonth, startOfQuarter, startOfYear, endOfDay } from 'date-fns';

type ReportTab = 'financial' | 'operational' | 'inventory' | 'workforce' | 'customer';

export function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('financial');
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfDay(new Date()));
  const [datePreset, setDatePreset] = useState<string>('this-month');
  
  // Data States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [financialData, setFinancialData] = useState<FinancialReport | null>(null);
  const [operationalData, setOperationalData] = useState<OperationalReport | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryReport | null>(null);
  const [workforceData, setWorkforceData] = useState<WorkforceReport | null>(null);
  const [customerData, setCustomerData] = useState<CustomerReport | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<string>('');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Change preset handler
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      setStartDate(subDays(now, 0));
      setEndDate(endOfDay(now));
    } else if (preset === 'this-week') {
      setStartDate(subDays(now, 7));
      setEndDate(endOfDay(now));
    } else if (preset === 'this-month') {
      setStartDate(startOfMonth(now));
      setEndDate(endOfDay(now));
    } else if (preset === 'this-quarter') {
      setStartDate(startOfQuarter(now));
      setEndDate(endOfDay(now));
    } else if (preset === 'this-year') {
      setStartDate(startOfYear(now));
      setEndDate(endOfDay(now));
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'financial') {
        const data = await getFinancialReport(startDate, endDate);
        setFinancialData(data);
      } else if (activeTab === 'operational') {
        const data = await getOperationalReport(startDate, endDate);
        setOperationalData(data);
      } else if (activeTab === 'inventory') {
        const data = await getInventoryReport();
        setInventoryData(data);
      } else if (activeTab === 'workforce') {
        const data = await getWorkforceReport(startDate, endDate);
        setWorkforceData(data);
      } else if (activeTab === 'customer') {
        const data = await getCustomerReport(startDate, endDate);
        setCustomerData(data);
      }
    } catch (err: any) {
      console.error("Error loading report data:", err);
      setError("Failed to fetch report metrics. Check your database connections.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, startDate, endDate]);

  // Exports
  const handleExportExcel = () => {
    let dataToExport = null;
    if (activeTab === 'financial') dataToExport = financialData;
    else if (activeTab === 'operational') dataToExport = operationalData;
    else if (activeTab === 'inventory') dataToExport = inventoryData;
    else if (activeTab === 'workforce') dataToExport = workforceData;
    else if (activeTab === 'customer') dataToExport = customerData;

    if (!dataToExport) return;
    exportReportToExcel(dataToExport, activeTab);
  };

  const handleExportPDF = async () => {
    await exportReportToPDF('report-print-container', activeTab);
  };

  // Dynamic sorting function
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold font-sans text-gray-900 uppercase tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">Generate on-the-fly business summaries, utilization rates, and financial reports.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData} 
            className="p-2 border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel</span>
          </button>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#DC2626] text-white rounded text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>PDF Report</span>
          </button>
        </div>
      </div>

      {/* Control Filters */}
      <div className="bg-white border border-gray-100 rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        {/* Module Selector Tabs */}
        <div className="flex flex-wrap gap-1">
          {(['financial', 'operational', 'inventory', 'workforce', 'customer'] as ReportTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSortField('');
              }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded transition-all duration-150 ${
                activeTab === tab
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Date Filters (Disabled for Inventory since inventory is instantaneous) */}
        {activeTab !== 'inventory' ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-gray-100 rounded p-0.5 text-xs font-medium">
              {(['today', 'this-week', 'this-month', 'this-quarter', 'this-year'] as const).map(preset => (
                <button
                  key={preset}
                  onClick={() => handlePresetChange(preset)}
                  className={`px-2.5 py-1 rounded capitalize ${datePreset === preset ? 'bg-white shadow text-[#DC2626] font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  {preset.replace('-', ' ')}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-600 ml-2">
              <Calendar className="w-3.5 h-3.5 text-[#DC2626]" />
              <input 
                type="date" 
                value={format(startDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  setDatePreset('custom');
                  setStartDate(new Date(e.target.value));
                }}
                className="border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-[#DC2626] outline-none"
              />
              <span>to</span>
              <input 
                type="date" 
                value={format(endDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  setDatePreset('custom');
                  setEndDate(endOfDay(new Date(e.target.value)));
                }}
                className="border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-[#DC2626] outline-none"
              />
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-400 font-mono italic">
            * Inventory is a real-time snapshot of current levels.
          </div>
        )}
      </div>

      {/* Main Print Container for PDF generation */}
      <div id="report-print-container" className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-lg shadow-sm">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#DC2626] rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-semibold text-gray-500">Aggregating records and compiling report...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-lg shadow-sm p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-[#DC2626] mb-4" />
            <h3 className="text-lg font-bold text-gray-900">Query Failed</h3>
            <p className="text-sm text-gray-500 max-w-md mt-1">{error}</p>
            <button onClick={fetchData} className="mt-4 px-4 py-2 bg-[#DC2626] text-white rounded text-sm font-bold hover:bg-red-700 transition-colors">
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            {/* TAB: FINANCIAL */}
            {activeTab === 'financial' && financialData && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border-t-4 border-[#DC2626] border-x border-b border-gray-100 rounded-lg p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Income (Period)</p>
                    <p className="text-3xl font-extrabold text-gray-900 mt-1 font-mono">ETB {financialData.totalIncome.toLocaleString()}</p>
                    <p className="text-[11px] text-emerald-600 font-medium mt-1">▲ Total in-flow credits</p>
                  </div>
                  <div className="bg-white border-t-4 border-[#1A1A1A] border-x border-b border-gray-100 rounded-lg p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Expenses (Period)</p>
                    <p className="text-3xl font-extrabold text-gray-900 mt-1 font-mono">ETB {financialData.totalExpenses.toLocaleString()}</p>
                    <p className="text-[11px] text-rose-600 font-medium mt-1">▼ Total out-flow debits</p>
                  </div>
                  <div className={`bg-white border-t-4 ${financialData.netProfit >= 0 ? 'border-emerald-600' : 'border-rose-600'} border-x border-b border-gray-100 rounded-lg p-5 shadow-sm`}>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Net Profit / Loss</p>
                    <p className={`text-3xl font-extrabold mt-1 font-mono ${financialData.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ETB {financialData.netProfit.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-gray-500 font-medium mt-1">Margin: {financialData.totalIncome > 0 ? Math.round((financialData.netProfit / financialData.totalIncome) * 100) : 0}%</p>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
                    <BarChart 
                      data={financialData.revenueByCategory} 
                      xKey="category" 
                      yKey="amount" 
                      title="Revenue by Category (Rental Items)" 
                      color="#DC2626"
                    />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
                    <PieChart 
                      data={financialData.revenueByCustomer} 
                      nameKey="customerName" 
                      valueKey="amount" 
                      title="Revenue Distribution by Customer" 
                    />
                  </div>
                  <div className="lg:col-span-2 bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
                    <LineChart 
                      data={financialData.cashFlow.slice(-20)} 
                      xKey="date" 
                      yKey="inflow" 
                      title="Cash Inflow Trends (ETB)" 
                      color="#10B981"
                    />
                  </div>
                </div>

                {/* Detailed Cash Flow Table */}
                <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">Period Transactions Ledger</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-xs font-bold uppercase text-gray-500 tracking-wider">
                          <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')}>Date <ArrowUpDown className="inline w-3 h-3 ml-1" /></th>
                          <th className="p-4">Description</th>
                          <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('type')}>Type <ArrowUpDown className="inline w-3 h-3 ml-1" /></th>
                          <th className="p-4 text-right">Inflow (Credit)</th>
                          <th className="p-4 text-right">Outflow (Debit)</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-gray-100">
                        {financialData.cashFlow.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-gray-400">No cash flow movements found within selected period.</td>
                          </tr>
                        ) : (
                          financialData.cashFlow.map((tx, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="p-4 font-medium text-gray-900">{tx.date}</td>
                              <td className="p-4 text-gray-600">{tx.description}</td>
                              <td className="p-4 font-semibold uppercase text-xs tracking-wider text-gray-500">{tx.type}</td>
                              <td className="p-4 text-right font-mono text-emerald-600 font-bold">{tx.inflow > 0 ? `+ETB ${tx.inflow.toLocaleString()}` : '-'}</td>
                              <td className="p-4 text-right font-mono text-rose-600 font-bold">{tx.outflow > 0 ? `-ETB ${tx.outflow.toLocaleString()}` : '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: OPERATIONAL */}
            {activeTab === 'operational' && operationalData && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white border-t-4 border-[#DC2626] border-x border-b border-gray-100 rounded-lg p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Quote-to-Booking</p>
                    <p className="text-2xl font-extrabold text-gray-900 mt-1 font-mono">{operationalData.conversionRates.quotationConversionRate}%</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">{operationalData.conversionRates.convertedQuotations} of {operationalData.conversionRates.totalQuotations} converted</p>
                  </div>
                  <div className="bg-white border-t-4 border-[#1A1A1A] border-x border-b border-gray-100 rounded-lg p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Booking Fulfilled</p>
                    <p className="text-2xl font-extrabold text-gray-900 mt-1 font-mono">{operationalData.conversionRates.bookingConversionRate}%</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">{operationalData.conversionRates.completedBookings} of {operationalData.conversionRates.totalBookings} rentals delivered</p>
                  </div>
                  <div className="bg-white border-t-4 border-amber-500 border-x border-b border-gray-100 rounded-lg p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Damaged & Missing Items</p>
                    <p className="text-2xl font-extrabold text-rose-600 mt-1 font-mono">{operationalData.returnDamageReport.totalDamaged + operationalData.returnDamageReport.totalMissing}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">{operationalData.returnDamageReport.totalDamaged} damaged, {operationalData.returnDamageReport.totalMissing} missing logged</p>
                  </div>
                  <div className="bg-white border-t-4 border-indigo-600 border-x border-b border-gray-100 rounded-lg p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Active Maintenance</p>
                    <p className="text-2xl font-extrabold text-indigo-600 mt-1 font-mono">{operationalData.maintenanceReport.pendingOrders}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">Est. period repairs cost: ETB {operationalData.maintenanceReport.totalCost.toLocaleString()}</p>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
                    <BarChart 
                      data={operationalData.rentalUtilization} 
                      xKey="itemName" 
                      yKey="utilizationRate" 
                      title="Rental Utilization Rates % (Top Items)" 
                      color="#DC2626"
                    />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
                    <BarChart 
                      data={operationalData.returnDamageReport.damagesByItem} 
                      xKey="itemName" 
                      yKey="damagedQty" 
                      title="Item Damage Counts" 
                      color="#F59E0B"
                    />
                  </div>
                </div>

                {/* Table of Damaged/Lost Assets */}
                <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">Loss & Damages Valuation Ledger</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-xs font-bold uppercase text-gray-500 tracking-wider">
                          <th className="p-4">Item Name</th>
                          <th className="p-4 text-center">Damaged Qty</th>
                          <th className="p-4 text-right">Estimated Restoration Cost</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-gray-100">
                        {operationalData.returnDamageReport.damagesByItem.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-8 text-center text-gray-400">No damage entries logged for this period. Pristine returns!</td>
                          </tr>
                        ) : (
                          operationalData.returnDamageReport.damagesByItem.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="p-4 font-medium text-gray-900">{item.itemName}</td>
                              <td className="p-4 text-center font-bold font-mono text-amber-600">{item.damagedQty}</td>
                              <td className="p-4 text-right font-bold font-mono text-gray-900">ETB {item.cost.toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: INVENTORY */}
            {activeTab === 'inventory' && inventoryData && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border-t-4 border-[#DC2626] border-x border-b border-gray-100 rounded-lg p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Unique Items</p>
                    <p className="text-3xl font-extrabold text-gray-900 mt-1 font-mono">{inventoryData.stockLevels.length}</p>
                    <p className="text-[11px] text-gray-500 font-medium mt-1">In active rental inventory directory</p>
                  </div>
                  <div className="bg-white border-t-4 border-[#1A1A1A] border-x border-b border-gray-100 rounded-lg p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Physical Assets</p>
                    <p className="text-3xl font-extrabold text-gray-900 mt-1 font-mono">
                      {inventoryData.stockLevels.reduce((sum, s) => sum + s.currentStock, 0)}
                    </p>
                    <p className="text-[11px] text-gray-500 font-medium mt-1">Total count of items owned</p>
                  </div>
                  <div className="bg-white border-t-4 border-rose-600 border-x border-b border-gray-100 rounded-lg p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Low Stock Warnings</p>
                    <p className="text-3xl font-extrabold text-rose-600 mt-1 font-mono">{inventoryData.lowStockAlerts.length}</p>
                    <p className="text-[11px] text-rose-500 font-medium mt-1">Below required alert threshold</p>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
                    <BarChart 
                      data={inventoryData.stockLevels} 
                      xKey="name" 
                      yKey="currentStock" 
                      title="Available Stock Levels by Item Variant" 
                      color="#DC2626"
                    />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
                    <PieChart 
                      data={inventoryData.stockLevels} 
                      nameKey="name" 
                      valueKey="onRentStock" 
                      title="Physical Assets Currently On Rent Distribution" 
                    />
                  </div>
                </div>

                {/* Table of Inventory Snapshot */}
                <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">Current Warehouse Stock Ledger</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-xs font-bold uppercase text-gray-500 tracking-wider">
                          <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>Item Variant <ArrowUpDown className="inline w-3 h-3 ml-1" /></th>
                          <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('category')}>Category <ArrowUpDown className="inline w-3 h-3 ml-1" /></th>
                          <th className="p-4 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('currentStock')}>Total Stock <ArrowUpDown className="inline w-3 h-3 ml-1" /></th>
                          <th className="p-4 text-center">Reserved</th>
                          <th className="p-4 text-center">On Rent</th>
                          <th className="p-4 text-center">Damaged / Missing</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-gray-100">
                        {inventoryData.stockLevels.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-400">No inventory items found. Add items to inventory.</td>
                          </tr>
                        ) : (
                          inventoryData.stockLevels.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="p-4 font-medium text-gray-900">{item.name}</td>
                              <td className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{item.category}</td>
                              <td className="p-4 text-center font-mono font-bold text-gray-900">{item.currentStock}</td>
                              <td className="p-4 text-center font-mono text-gray-600">{item.reservedStock}</td>
                              <td className="p-4 text-center font-mono text-blue-600 font-semibold">{item.onRentStock}</td>
                              <td className="p-4 text-center font-mono text-rose-600 font-semibold">{item.damagedStock + item.missingStock}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: WORKFORCE */}
            {activeTab === 'workforce' && workforceData && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border-t-4 border-[#DC2626] border-x border-b border-gray-100 rounded-lg p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Logistics Items Handled</p>
                    <p className="text-3xl font-extrabold text-gray-900 mt-1 font-mono">
                      {workforceData.productivity.reduce((sum, p) => sum + p.totalItemsHandled, 0)}
                    </p>
                    <p className="text-[11px] text-gray-500 font-medium mt-1">Total assets loaded / unloaded</p>
                  </div>
                  <div className="bg-white border-t-4 border-[#1A1A1A] border-x border-b border-gray-100 rounded-lg p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Hours Logged</p>
                    <p className="text-3xl font-extrabold text-gray-900 mt-1 font-mono">
                      {workforceData.attendance.reduce((sum, a) => sum + a.hoursWorked, 0)} hrs
                    </p>
                    <p className="text-[11px] text-gray-500 font-medium mt-1">From clock-in timestamp cards</p>
                  </div>
                  <div className="bg-white border-t-4 border-emerald-600 border-x border-b border-gray-100 rounded-lg p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Worker Commission Paid</p>
                    <p className="text-3xl font-extrabold text-emerald-600 mt-1 font-mono">
                      ETB {workforceData.productivity.reduce((sum, p) => sum + p.totalCommissions, 0).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-emerald-500 font-medium mt-1">Under piece-rate dispatch commissions</p>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
                    <BarChart 
                      data={workforceData.productivity} 
                      xKey="workerName" 
                      yKey="totalItemsHandled" 
                      title="Productivity - Assets Handled" 
                      color="#DC2626"
                    />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
                    <BarChart 
                      data={workforceData.attendance} 
                      xKey="workerName" 
                      yKey="hoursWorked" 
                      title="Accumulated Hours Logged" 
                      color="#1A1A1A"
                    />
                  </div>
                </div>

                {/* Table of Worker Summary */}
                <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">Workforce Compensation Summary</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-xs font-bold uppercase text-gray-500 tracking-wider">
                          <th className="p-4">Staff Member</th>
                          <th className="p-4 text-center">Base Salary</th>
                          <th className="p-4 text-center">Piece-Rate Commission</th>
                          <th className="p-4 text-center">Deductions</th>
                          <th className="p-4 text-right">Net Compensation</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-gray-100">
                        {workforceData.payrollSummary.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-gray-400">No active workforce registers or timesheets.</td>
                          </tr>
                        ) : (
                          workforceData.payrollSummary.map((wp, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="p-4 font-medium text-gray-900">{wp.workerName}</td>
                              <td className="p-4 text-center font-mono">ETB {wp.baseSalary.toLocaleString()}</td>
                              <td className="p-4 text-center font-mono text-emerald-600">+ETB {wp.commissions.toLocaleString()}</td>
                              <td className="p-4 text-center font-mono text-rose-600">-ETB {wp.deductions.toLocaleString()}</td>
                              <td className="p-4 text-right font-mono font-bold text-gray-900">ETB {wp.netPay.toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CUSTOMER */}
            {activeTab === 'customer' && customerData && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border-t-4 border-[#DC2626] border-x border-b border-gray-100 rounded-lg p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Customer Count</p>
                    <p className="text-3xl font-extrabold text-gray-900 mt-1 font-mono">{customerData.retention.totalCustomers}</p>
                    <p className="text-[11px] text-gray-500 font-medium mt-1">Registered customer accounts</p>
                  </div>
                  <div className="bg-white border-t-4 border-[#1A1A1A] border-x border-b border-gray-100 rounded-lg p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Repeat Customers</p>
                    <p className="text-3xl font-extrabold text-gray-900 mt-1 font-mono">{customerData.retention.repeatCustomers}</p>
                    <p className="text-[11px] text-emerald-600 font-medium mt-1">▲ Multi-rental clients</p>
                  </div>
                  <div className="bg-white border-t-4 border-emerald-600 border-x border-b border-gray-100 rounded-lg p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Customer Retention Rate</p>
                    <p className="text-3xl font-extrabold text-emerald-600 mt-1 font-mono">{customerData.retention.retentionRate}%</p>
                    <p className="text-[11px] text-emerald-500 font-medium mt-1">Proportion of recurring accounts</p>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
                    <BarChart 
                      data={customerData.topCustomers} 
                      xKey="customerName" 
                      yKey="totalSpend" 
                      title="Top Customers by Accumulated spend (ETB)" 
                      color="#DC2626"
                    />
                  </div>
                  <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
                    <PieChart 
                      data={customerData.issuesSummary} 
                      nameKey="category" 
                      valueKey="totalCount" 
                      title="Customer Disputes Categories Distribution" 
                    />
                  </div>
                </div>

                {/* Table of Top Customers */}
                <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">Customer Lifetime Value (LTV) Ledger</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-xs font-bold uppercase text-gray-500 tracking-wider">
                          <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('customerName')}>Customer <ArrowUpDown className="inline w-3 h-3 ml-1" /></th>
                          <th className="p-4 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('rentalCount')}>Rentals Fulfilled <ArrowUpDown className="inline w-3 h-3 ml-1" /></th>
                          <th className="p-4 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('avgOrderValue')}>Average Order Value <ArrowUpDown className="inline w-3 h-3 ml-1" /></th>
                          <th className="p-4 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('totalSpend')}>Cumulative Lifetime Spend <ArrowUpDown className="inline w-3 h-3 ml-1" /></th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-gray-100">
                        {customerData.topCustomers.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-gray-400">No customer transactions registered.</td>
                          </tr>
                        ) : (
                          customerData.topCustomers.map((c, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="p-4 font-medium text-gray-900">{c.customerName}</td>
                              <td className="p-4 text-center font-mono">{c.rentalCount}</td>
                              <td className="p-4 text-right font-mono">ETB {c.avgOrderValue.toLocaleString()}</td>
                              <td className="p-4 text-right font-mono font-bold text-emerald-600">ETB {c.totalSpend.toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
