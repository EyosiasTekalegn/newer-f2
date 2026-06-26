import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit, X, Truck, RotateCcw, AlertTriangle, Users, ClipboardCheck, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { getAllLogistics, createLogistics, deleteLogistics, getWorkers, Logistics as LogisticsData, Worker } from '../services/logisticsService';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { format } from 'date-fns';

export function Logistics() {
  const [logs, setLogs] = useState<LogisticsData[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'delivery' | 'return'>('delivery');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'delivery' | 'return'>('delivery');

  // New Log Form State
  const [selectedRentalId, setSelectedRentalId] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [logItems, setLogItems] = useState<Array<{ itemVariantId: string; name: string; quantity: number }>>([]);
  const [logNotes, setLogNotes] = useState('');

  // Additional Item List helper for dropdown
  const [variants, setVariants] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [logsData, workersData, variantsSnap, rentalsSnap] = await Promise.all([
        getAllLogistics(),
        getWorkers(),
        getDocs(collection(db, 'itemVariants')),
        getDocs(collection(db, 'rentals'))
      ]);

      setLogs(logsData);
      setWorkers(workersData.filter(w => w.isActive));
      
      setVariants(variantsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setRentals(rentalsSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          startDate: data.startDate?.toDate(),
          endDate: data.endDate?.toDate(),
        };
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch logistics data');
    } finally {
      setLoading(false);
    }
  };

  // Pre-populate items when a rental is selected
  const handleRentalSelection = (rentalId: string) => {
    setSelectedRentalId(rentalId);
    if (!rentalId) {
      setLogItems([]);
      return;
    }

    const rental = rentals.find(r => r.id === rentalId);
    if (rental && rental.items) {
      setLogItems(rental.items.map((item: any) => ({
        itemVariantId: item.itemVariantId,
        name: item.name,
        quantity: item.quantity
      })));
    } else {
      setLogItems([]);
    }
  };

  const handleOpenModal = (type: 'delivery' | 'return') => {
    setModalType(type);
    setSelectedRentalId('');
    setSelectedWorkers([]);
    setLogItems([]);
    setLogNotes('');
    setIsModalOpen(true);
  };

  const handleWorkerToggle = (workerId: string) => {
    if (selectedWorkers.includes(workerId)) {
      setSelectedWorkers(selectedWorkers.filter(id => id !== workerId));
    } else {
      setSelectedWorkers([...selectedWorkers, workerId]);
    }
  };

  const handleQtyChange = (index: number, qty: number) => {
    const updated = [...logItems];
    updated[index].quantity = Math.max(0, qty);
    setLogItems(updated);
  };

  const handleAddExtraItem = () => {
    setLogItems([...logItems, { itemVariantId: '', name: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setLogItems(logItems.filter((_, i) => i !== index));
  };

  const handleItemVariantSelect = (index: number, variantId: string) => {
    const v = variants.find(item => item.id === variantId);
    if (!v) return;
    const updated = [...logItems];
    updated[index].itemVariantId = variantId;
    updated[index].name = v.name || 'Unknown Variant';
    setLogItems(updated);
  };

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRentalId) {
      alert('Please select a Rental reference');
      return;
    }
    if (selectedWorkers.length === 0) {
      alert('Please select at least one worker');
      return;
    }
    const filteredItems = logItems.filter(i => i.itemVariantId && i.quantity > 0);
    if (filteredItems.length === 0) {
      alert('Log must contain at least one item with quantity greater than zero');
      return;
    }

    try {
      setLoading(true);
      await createLogistics({
        rentalId: selectedRentalId,
        type: modalType,
        workers: selectedWorkers,
        items: filteredItems,
        notes: logNotes
      });

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create logistics log');
      setLoading(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this logistics record?')) return;
    try {
      setLoading(true);
      await deleteLogistics(id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete logistics log');
      setLoading(false);
    }
  };

  // Filtering logs
  const filteredLogs = logs.filter(l => l.type === activeTab);

  const getCustomerName = (rentalId: string) => {
    const rental = rentals.find(r => r.id === rentalId);
    return rental ? rental.customerName : 'Unknown Customer';
  };

  const getWorkerNames = (workerIds: string[]) => {
    return workerIds.map(id => {
      const w = workers.find(work => work.id === id);
      return w ? w.name : 'Unknown Worker';
    }).join(', ');
  };

  // Rental filtering for dropdown selection
  const eligibleRentals = rentals.filter(r => {
    if (modalType === 'delivery') {
      // Any rental can have delivery logs
      return true;
    } else {
      // Return logs are for Delivered or Partially Returned
      return r.status === 'Delivered' || r.status === 'Partially Returned';
    }
  });

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between shrink-0 gap-4">
        <h2 className="font-bold text-lg text-[#1A1A1A] flex items-center gap-2">
          <Truck className="w-5 h-5 text-[#DC2626]" /> Logistics & Loading Logs
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => handleOpenModal('delivery')}
            className="bg-[#DC2626] hover:bg-red-700 text-white font-bold px-4 py-2 rounded text-xs flex items-center gap-1.5 transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" /> Log Delivery Load
          </button>
          <button 
            onClick={() => handleOpenModal('return')}
            className="bg-[#1A1A1A] hover:bg-black text-white font-bold px-4 py-2 rounded text-xs flex items-center gap-1.5 transition-colors"
          >
            <ArrowDownLeft className="w-4 h-4" /> Log Return Unload
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100 flex bg-gray-50/50 shrink-0">
        <button
          onClick={() => setActiveTab('delivery')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'delivery' ? 'border-[#DC2626] text-[#DC2626] bg-white' : 'border-transparent text-gray-500 hover:text-[#1A1A1A]'}`}
        >
          Delivery Loading Logs ({logs.filter(l => l.type === 'delivery').length})
        </button>
        <button
          onClick={() => setActiveTab('return')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'return' ? 'border-[#DC2626] text-[#DC2626] bg-white' : 'border-transparent text-gray-500 hover:text-[#1A1A1A]'}`}
        >
          Return Offloading Logs ({logs.filter(l => l.type === 'return').length})
        </button>
      </div>

      {/* Log Contents */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#DC2626]"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <AlertTriangle className="w-12 h-12 text-[#DC2626] mb-4" />
            <p className="text-[#DC2626] font-medium mb-4">{error}</p>
            <button onClick={fetchData} className="bg-[#1A1A1A] text-white px-4 py-2 rounded font-bold hover:bg-black flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <ClipboardCheck className="w-12 h-12 text-gray-300 mb-4" />
            <p className="font-medium text-gray-600">No {activeTab} logs recorded yet.</p>
            <p className="text-sm text-gray-400">Log worker loading actions to manage piece-rate calculations.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Date/Time</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Rental ID</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Customer</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Workers Assigned</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Items Loaded/Unloaded</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 text-sm text-gray-500">
                    {format(log.timestamp, 'MMM d, yyyy HH:mm')}
                  </td>
                  <td className="p-4 font-mono text-xs">{log.rentalId.slice(0, 8)}</td>
                  <td className="p-4 text-sm font-medium text-[#1A1A1A]">{getCustomerName(log.rentalId)}</td>
                  <td className="p-4 text-sm text-[#1A1A1A]">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-medium">{getWorkerNames(log.workers) || <span className="text-gray-400 italic">None</span>}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1 max-w-sm">
                      {log.items.map((item, idx) => (
                        <span key={idx} className="bg-gray-100 text-[#1A1A1A] px-2 py-0.5 rounded text-xs font-medium">
                          {item.name} ({item.quantity}x)
                        </span>
                      ))}
                    </div>
                    {log.notes && <p className="text-[11px] text-gray-400 italic mt-1">Notes: {log.notes}</p>}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDeleteLog(log.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-50 transition-colors"
                      title="Delete Log"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Logistics Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-3xl overflow-hidden border-t-4 border-[#DC2626] flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <h3 className="font-bold text-lg text-[#1A1A1A]">
                {modalType === 'delivery' ? 'Log New Delivery Load' : 'Log New Return Unload'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-[#1A1A1A] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitLog} className="p-6 space-y-4 overflow-auto flex-1">
              {/* Select Rental */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Rental Reference *</label>
                <select
                  required
                  value={selectedRentalId}
                  onChange={(e) => handleRentalSelection(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                >
                  <option value="">Select Rental...</option>
                  {eligibleRentals.map(r => (
                    <option key={r.id} value={r.id}>
                      #{r.id.slice(0, 8)} • {r.customerName} (Contract end: {r.endDate ? format(r.endDate, 'MMM d, yyyy') : 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Multi-select Workers */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Assign Logistics Workers * (Click to Select)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {workers.map(worker => {
                    const isSelected = selectedWorkers.includes(worker.id);
                    return (
                      <button
                        type="button"
                        key={worker.id}
                        onClick={() => handleWorkerToggle(worker.id)}
                        className={`p-2 border rounded text-xs font-bold transition-all text-left flex flex-col ${isSelected ? 'border-[#DC2626] bg-red-50 text-[#DC2626]' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                      >
                        <span>{worker.name}</span>
                        <span className="text-[10px] font-medium text-gray-400 lowercase">{worker.role}</span>
                      </button>
                    );
                  })}
                  {workers.length === 0 && (
                    <p className="text-xs text-red-500 col-span-full italic">No active workers found. Please add workers in the Workforce module first.</p>
                  )}
                </div>
              </div>

              {/* Items Pre-populated */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#DC2626]">Items Logged for Logistics</label>
                  <button 
                    type="button"
                    onClick={handleAddExtraItem}
                    className="text-xs font-bold text-[#DC2626] hover:text-red-700 hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Extra Item
                  </button>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {logItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center bg-gray-50 p-2 border border-gray-100 rounded">
                      <div className="flex-1 min-w-[200px]">
                        {item.itemVariantId && !variants.some(v => v.id === item.itemVariantId) ? (
                          // Item was pre-populated
                          <div className="p-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-100 rounded">
                            {item.name}
                          </div>
                        ) : (
                          // Customizable dropdown
                          <select
                            required
                            value={item.itemVariantId}
                            onChange={(e) => handleItemVariantSelect(index, e.target.value)}
                            className="w-full p-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                          >
                            <option value="">Select Variant...</option>
                            {variants.map(v => (
                              <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="w-24">
                        <input 
                          type="number" required min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleQtyChange(index, Number(e.target.value))}
                          className="w-full p-1.5 border border-gray-200 rounded text-sm text-center focus:outline-none focus:border-[#DC2626]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-gray-400 hover:text-red-600 p-1"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {logItems.length === 0 && (
                    <p className="text-xs text-gray-400 italic text-center p-4">Select a rental to load items, or add manually.</p>
                  )}
                </div>
              </div>

              {/* Note */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Log Notes / Discrepancies</label>
                <textarea 
                  rows={2}
                  placeholder="e.g. Driver noted heavy rain during delivery, all loaded safely..."
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 -mx-6 -mb-6 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#DC2626] text-white px-6 py-2 rounded text-sm font-bold hover:bg-red-700 transition-colors"
                >
                  Submit Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
