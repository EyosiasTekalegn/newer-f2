import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, ListFilter, ShieldAlert, Package, CheckCircle, RefreshCw, BarChart4, TrendingDown, ArrowRight } from 'lucide-react';
import { getStockOverview, StockOverviewItem } from '../../services/stockService';

export function StockOverview() {
  const [stock, setStock] = useState<StockOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStockOverview();
      setStock(data);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate real-time stock matrix');
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(stock.map(s => s.category)));

  // Filter lists
  const filteredStock = stock.filter(item => {
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // KPI Calculations
  const totalStockCount = stock.reduce((sum, item) => sum + item.totalOnHand, 0);
  const totalAvailable = stock.reduce((sum, item) => sum + item.available, 0);
  const totalReserved = stock.reduce((sum, item) => sum + item.reserved, 0);
  const totalOnRent = stock.reduce((sum, item) => sum + item.onRent, 0);
  const totalInMaintenance = stock.reduce((sum, item) => sum + item.inMaintenance, 0);
  const totalDamagedMissing = stock.reduce((sum, item) => sum + item.damaged + item.missing, 0);

  const alertItems = stock.filter(item => item.minStockAlert !== undefined && item.available <= item.minStockAlert);

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded shadow-sm text-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h2 className="font-bold text-lg text-[#1A1A1A] flex items-center gap-2">
          <BarChart4 className="w-5 h-5 text-[#DC2626]" /> Real-Time Stock Overview
        </h2>
        <button 
          onClick={loadData}
          className="border border-[#DC2626] hover:bg-red-50 text-[#DC2626] font-bold px-4 py-2 rounded text-sm flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Recalculate Matrix
        </button>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-6 gap-4 p-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
        <div className="bg-white p-3 border border-gray-200 rounded shadow-2xs text-center">
          <p className="text-[10px] font-bold uppercase text-gray-400">Total Catalog Holdings</p>
          <p className="text-xl font-mono font-bold text-gray-900 mt-1">{totalStockCount}</p>
        </div>
        <div className="bg-white p-3 border border-gray-200 rounded shadow-2xs text-center">
          <p className="text-[10px] font-bold uppercase text-green-600">Available Now</p>
          <p className="text-xl font-mono font-bold text-green-600 mt-1">{totalAvailable}</p>
        </div>
        <div className="bg-white p-3 border border-gray-200 rounded shadow-2xs text-center">
          <p className="text-[10px] font-bold uppercase text-blue-600">Reserved (Bookings)</p>
          <p className="text-xl font-mono font-bold text-blue-600 mt-1">{totalReserved}</p>
        </div>
        <div className="bg-white p-3 border border-gray-200 rounded shadow-2xs text-center">
          <p className="text-[10px] font-bold uppercase text-indigo-600">Active Rentals (On Rent)</p>
          <p className="text-xl font-mono font-bold text-indigo-600 mt-1">{totalOnRent}</p>
        </div>
        <div className="bg-white p-3 border border-gray-200 rounded shadow-2xs text-center">
          <p className="text-[10px] font-bold uppercase text-amber-600">In Maintenance</p>
          <p className="text-xl font-mono font-bold text-amber-600 mt-1">{totalInMaintenance}</p>
        </div>
        <div className="bg-white p-3 border border-gray-200 rounded shadow-2xs text-center">
          <p className="text-[10px] font-bold uppercase text-red-600">Damaged / Missing</p>
          <p className="text-xl font-mono font-bold text-red-600 mt-1">{totalDamagedMissing}</p>
        </div>
      </div>

      {/* Low Stock Banner Warning */}
      {alertItems.length > 0 && (
        <div className="bg-red-50 p-3 px-4 border-b border-red-100 shrink-0 flex items-center justify-between text-red-700 animate-pulse">
          <div className="flex items-center gap-2 font-bold text-xs">
            <ShieldAlert className="w-4 h-4 text-[#DC2626]" />
            CRITICAL WARNING: {alertItems.length} inventory lines are at or below minimum reorder alert levels!
          </div>
          <span className="text-[10px] font-bold bg-[#DC2626] text-white px-2 py-0.5 rounded uppercase">Action Required</span>
        </div>
      )}

      {/* Search & Filter */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 bg-gray-50/50 shrink-0">
        <div className="relative flex-1 min-w-[240px] max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search active stock..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
          />
        </div>

        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-gray-400" />
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] bg-white"
          >
            <option value="All">All Categories</option>
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Matrix Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#DC2626]"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <AlertTriangle className="w-12 h-12 text-[#DC2626] mb-4" />
            <p className="text-[#DC2626] font-medium mb-4">{error}</p>
            <button onClick={loadData} className="bg-[#1A1A1A] text-white px-4 py-2 rounded font-bold hover:bg-black cursor-pointer">
              Retry
            </button>
          </div>
        ) : filteredStock.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <Package className="w-12 h-12 text-gray-300 mb-4" />
            <p className="font-medium text-gray-600">No matching stock items found.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Item Name</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Category</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-center bg-green-50/30">Available</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-center">Reserved</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-center">On Rent</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-center">In Maintenance</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-center">Damaged / Missing</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-center bg-gray-100/40">Total Holdings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredStock.map((item, idx) => {
                const isUnderStock = item.minStockAlert !== undefined && item.available <= item.minStockAlert;
                return (
                  <tr key={idx} className={`hover:bg-gray-50/50 transition-colors ${isUnderStock ? 'bg-red-50/10' : ''}`}>
                    <td className="p-4">
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      {isUnderStock && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-red-600 uppercase tracking-wide mt-1 animate-pulse">
                          <TrendingDown className="w-3 h-3" /> Below alert threshold of {item.minStockAlert}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-gray-600 font-medium">{item.category}</td>
                    
                    {/* Available */}
                    <td className="p-4 text-center bg-green-50/10">
                      <span className={`font-mono font-bold text-sm ${isUnderStock ? 'text-red-600' : 'text-green-600'}`}>
                        {item.available}
                      </span>
                    </td>

                    {/* Reserved */}
                    <td className="p-4 text-center font-mono font-bold text-blue-600">
                      {item.reserved > 0 ? item.reserved : <span className="text-gray-300">-</span>}
                    </td>

                    {/* On Rent */}
                    <td className="p-4 text-center font-mono font-bold text-indigo-600">
                      {item.onRent > 0 ? item.onRent : <span className="text-gray-300">-</span>}
                    </td>

                    {/* In Maintenance */}
                    <td className="p-4 text-center font-mono font-bold text-amber-600">
                      {item.inMaintenance > 0 ? item.inMaintenance : <span className="text-gray-300">-</span>}
                    </td>

                    {/* Damaged / Missing */}
                    <td className="p-4 text-center font-mono font-bold text-red-500">
                      {item.damaged + item.missing > 0 ? (
                        item.damaged + item.missing
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    {/* Total Holdings */}
                    <td className="p-4 text-center bg-gray-100/20 font-mono font-bold text-gray-900 text-sm">
                      {item.totalOnHand}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
