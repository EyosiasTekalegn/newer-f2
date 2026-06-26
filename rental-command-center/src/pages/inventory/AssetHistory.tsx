import React, { useState, useEffect } from 'react';
import { Search, History, ArrowRight, Clock, Filter, AlertTriangle, RotateCcw } from 'lucide-react';
import { getAllMovements, getMovementsForItem, InventoryMovement } from '../../services/assetHistoryService';
import { getItemVariants, ItemVariant } from '../../services/inventoryService';
import { format } from 'date-fns';

export function AssetHistory() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [variants, setVariants] = useState<ItemVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedVariantId, setSelectedVariantId] = useState<string>('All');
  const [referenceFilter, setReferenceFilter] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchMovements();
  }, [selectedVariantId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const variantsData = await getItemVariants();
      setVariants(variantsData);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize asset history');
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      setLoading(true);
      if (selectedVariantId === 'All') {
        const data = await getAllMovements();
        setMovements(data);
      } else {
        const data = await getMovementsForItem(selectedVariantId);
        setMovements(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stock movements');
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = movements.filter(m => {
    if (!referenceFilter) return true;
    return m.referenceId.toLowerCase().includes(referenceFilter.toLowerCase()) || 
           m.referenceType.toLowerCase().includes(referenceFilter.toLowerCase());
  });

  const getVariantName = (id: string) => {
    const v = variants.find(item => item.id === id);
    return v ? v.name : 'Unknown Item';
  };

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h2 className="font-bold text-lg text-[#1A1A1A] flex items-center gap-2">
          <History className="w-5 h-5 text-[#DC2626]" /> Stock Ledger & Asset History
        </h2>
      </div>

      {/* Filter and Selection header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4 shrink-0">
        <div className="flex-1 max-w-sm space-y-1">
          <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Select Item Variant</label>
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:border-[#DC2626]"
            >
              <option value="All">All Items & Variants</option>
              {variants.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 max-w-sm space-y-1">
          <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Filter by Ref Type or Ref ID</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="e.g. procurement, rental ID..."
              value={referenceFilter}
              onChange={(e) => setReferenceFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:border-[#DC2626]"
            />
          </div>
        </div>
      </div>

      {/* Movement List Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#DC2626]"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <AlertTriangle className="w-12 h-12 text-[#DC2626] mb-4" />
            <p className="text-[#DC2626] font-medium mb-4">{error}</p>
            <button onClick={fetchData} className="bg-[#1A1A1A] text-white px-4 py-2 rounded font-bold hover:bg-black">
              Retry
            </button>
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <Clock className="w-12 h-12 text-gray-300 mb-4" />
            <p className="font-medium text-gray-600">No stock movements logged yet.</p>
            <p className="text-sm text-gray-400">Perform adjustments or process rentals to see movements here.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Date/Time</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Item Name</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-center">Movement Loop</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-center">Qty Shift</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Ref Type & ID</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Journal Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMovements.map(mov => {
                const isPositive = mov.quantity >= 0;
                let referenceBadgeColor = 'bg-gray-100 text-gray-800';
                if (mov.referenceType === 'procurement') referenceBadgeColor = 'bg-green-100 text-green-800';
                if (mov.referenceType === 'rental') referenceBadgeColor = 'bg-blue-100 text-blue-800';
                if (mov.referenceType === 'booking') referenceBadgeColor = 'bg-yellow-100 text-yellow-800';
                if (mov.referenceType === 'return') referenceBadgeColor = 'bg-emerald-100 text-emerald-800';
                if (mov.referenceType === 'maintenance') referenceBadgeColor = 'bg-orange-100 text-orange-800';

                return (
                  <tr key={mov.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-sm text-gray-500">
                      {format(mov.date, 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-[#1A1A1A]">{getVariantName(mov.itemVariantId)}</div>
                      <div className="text-[10px] text-gray-400 font-mono">ID: {mov.itemVariantId.slice(0, 8)}</div>
                    </td>
                    <td className="p-4 text-center">
                      {mov.fromState === mov.toState ? (
                        <span className="text-xs bg-gray-50 px-2 py-1 rounded text-gray-600 font-semibold border border-gray-100">
                          {mov.toState} (Adjustment)
                        </span>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs">
                          <span className="font-semibold text-gray-500 bg-gray-100/50 px-2 py-0.5 rounded">{mov.fromState}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{mov.toState}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center text-sm font-black rounded-full px-2.5 py-0.5 ${isPositive ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                        {isPositive ? `+${mov.quantity}` : mov.quantity}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex self-start px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${referenceBadgeColor}`}>
                          {mov.referenceType}
                        </span>
                        <span className="font-mono text-xs text-gray-400">{mov.referenceId.slice(0, 12)}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 max-w-xs truncate" title={mov.note}>
                      {mov.note || <span className="text-gray-300">-</span>}
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
