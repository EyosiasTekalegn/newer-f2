import React, { useState, useEffect } from 'react';
import { Check, Search, Calendar, Users, Filter, CheckCircle, AlertTriangle, HelpCircle, DollarSign, Plus, X, Eye, Play, ArrowRight, Trash2 } from 'lucide-react';
import { getCommissions, generateCommission, approveCommission, payCommission, deleteCommission, WorkerCommission } from '../../services/commissionService';
import { getWorkers, Worker } from '../../services/workerService';
import { getAllLogistics, Logistics } from '../../services/logisticsService';

export function Commissions() {
  const [commissions, setCommissions] = useState<WorkerCommission[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [logistics, setLogistics] = useState<Logistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [search, setSearch] = useState('');

  // Modals state
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<WorkerCommission | null>(null);

  // Generate wizard state
  const [genRentalId, setGenRentalId] = useState('');
  const [genWorkerId, setGenWorkerId] = useState('');
  const [genType, setGenType] = useState<'loading' | 'unloading'>('loading');

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [commData, workersData, logisticsData] = await Promise.all([
        getCommissions(undefined, selectedMonth),
        getWorkers(),
        getAllLogistics()
      ]);
      setCommissions(commData);
      setWorkers(workersData);
      setLogistics(logisticsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load commissions ledger');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGenerate = () => {
    setGenRentalId(logistics[0]?.rentalId || '');
    setGenWorkerId(workers[0]?.id || '');
    setGenType('loading');
    setIsGenerateModalOpen(true);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genRentalId || !genWorkerId) {
      alert('Rental and Worker references are required');
      return;
    }

    try {
      setLoading(true);
      await generateCommission(genRentalId, genType, genWorkerId);
      setIsGenerateModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to generate commission. Check if the worker was assigned to this rental.');
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setLoading(true);
      await approveCommission(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve commission');
      setLoading(false);
    }
  };

  const handlePay = async (id: string) => {
    try {
      setLoading(true);
      await payCommission(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to settle commission payout');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this commission entry?')) return;
    try {
      setLoading(true);
      await deleteCommission(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete commission record');
      setLoading(false);
    }
  };

  const handleView = (comm: WorkerCommission) => {
    setSelectedCommission(comm);
    setIsViewModalOpen(true);
  };

  // Filter commissions list
  const filteredCommissions = commissions.filter(comm => {
    const matchesWorker = selectedWorkerId === 'All' || comm.workerId === selectedWorkerId;
    const matchesSearch = comm.workerName.toLowerCase().includes(search.toLowerCase()) || 
      comm.rentalReference.toLowerCase().includes(search.toLowerCase()) ||
      comm.status.toLowerCase().includes(search.toLowerCase());
    return matchesWorker && matchesSearch;
  });

  const totals = filteredCommissions.reduce((acc, current) => {
    acc.items += current.totalItems;
    acc.payout += current.totalAmount;
    if (current.status === 'Pending') acc.pending += current.totalAmount;
    if (current.status === 'Approved') acc.approved += current.totalAmount;
    if (current.status === 'Paid') acc.paid += current.totalAmount;
    return acc;
  }, { items: 0, payout: 0, pending: 0, approved: 0, paid: 0 });

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h2 className="font-bold text-lg text-[#1A1A1A] flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#DC2626]" /> Worker Commissions ledger
        </h2>
        <button 
          onClick={handleOpenGenerate}
          className="bg-[#DC2626] hover:bg-red-700 text-white font-bold px-4 py-2 rounded text-sm flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Generate From Logistics
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
        <div className="bg-white p-3 border border-gray-200 rounded shadow-2xs">
          <p className="text-xs font-bold uppercase text-gray-400">Total Items Handled</p>
          <p className="text-xl font-mono font-bold text-[#1A1A1A] mt-1">{totals.items}</p>
        </div>
        <div className="bg-white p-3 border border-gray-200 rounded shadow-2xs">
          <p className="text-xs font-bold uppercase text-amber-600">Pending Commissions</p>
          <p className="text-xl font-mono font-bold text-amber-600 mt-1">${totals.pending.toFixed(2)}</p>
        </div>
        <div className="bg-white p-3 border border-gray-200 rounded shadow-2xs">
          <p className="text-xs font-bold uppercase text-green-600">Approved (Unpaid)</p>
          <p className="text-xl font-mono font-bold text-green-600 mt-1">${totals.approved.toFixed(2)}</p>
        </div>
        <div className="bg-white p-3 border border-gray-200 rounded shadow-2xs">
          <p className="text-xs font-bold uppercase text-gray-500">Setted / Paid</p>
          <p className="text-xl font-mono font-bold text-gray-600 mt-1">${totals.paid.toFixed(2)}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 bg-gray-50/50 shrink-0">
        <div className="relative flex-1 min-w-[240px] max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search commissions by worker..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select 
            value={selectedWorkerId}
            onChange={(e) => setSelectedWorkerId(e.target.value)}
            className="p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
          >
            <option value="All">All Personnel</option>
            {workers.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
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
        ) : filteredCommissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <DollarSign className="w-12 h-12 text-gray-300 mb-4" />
            <p className="font-medium text-gray-600">No commissions recorded in {selectedMonth}.</p>
            <p className="text-sm text-gray-400">Scan delivery logs or generate commission ledgers.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Worker Details</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Type</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Client / Rental</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-center">Items</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Rate</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Payout Amount</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredCommissions.map(comm => (
                <tr key={comm.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-semibold text-[#1A1A1A]">{comm.workerName}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                      comm.type === 'loading' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}>
                      {comm.type}
                    </span>
                  </td>
                  <td className="p-4 text-gray-700 font-medium max-w-xs truncate">{comm.rentalReference}</td>
                  <td className="p-4 text-center font-mono font-bold text-[#1A1A1A]">{comm.totalItems}</td>
                  <td className="p-4 font-mono text-[#1A1A1A]">${comm.pieceRate.toFixed(2)}</td>
                  <td className="p-4 font-mono font-bold text-gray-900">${comm.totalAmount.toFixed(2)}</td>
                  <td className="p-4">
                    {comm.status === 'Pending' && (
                      <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded text-xs font-bold border border-amber-200">
                        Pending
                      </span>
                    )}
                    {comm.status === 'Approved' && (
                      <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2.5 py-0.5 rounded text-xs font-bold border border-green-200">
                        Approved
                      </span>
                    )}
                    {comm.status === 'Paid' && (
                      <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-50 px-2.5 py-0.5 rounded text-xs font-bold border border-gray-200">
                        Paid
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-1 whitespace-nowrap">
                    <button 
                      onClick={() => handleView(comm)}
                      className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded cursor-pointer inline-flex items-center"
                      title="View Breakdown"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {comm.status === 'Pending' && (
                      <button 
                        onClick={() => handleApprove(comm.id)}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-2.5 py-1.5 rounded cursor-pointer inline-flex items-center gap-0.5"
                        title="Approve for Payroll"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                    )}
                    {comm.status === 'Approved' && (
                      <button 
                        onClick={() => handlePay(comm.id)}
                        className="bg-[#1A1A1A] hover:bg-black text-white font-bold text-xs px-2.5 py-1.5 rounded cursor-pointer inline-flex items-center gap-0.5"
                        title="Settle Payment"
                      >
                        <DollarSign className="w-3.5 h-3.5" /> Settled
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(comm.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded cursor-pointer inline-flex items-center"
                      title="Delete Record"
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

      {/* View Breakdown Modal */}
      {isViewModalOpen && selectedCommission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-md overflow-hidden border-t-4 border-[#DC2626]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-lg text-[#1A1A1A]">Commission Payout Breakdown</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-[#1A1A1A] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded border border-gray-100">
                <div>
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Worker Name</span>
                  <p className="font-bold text-[#1A1A1A] mt-0.5">{selectedCommission.workerName}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Task Assignment</span>
                  <p className="font-bold text-[#1A1A1A] mt-0.5 uppercase tracking-wide text-xs">{selectedCommission.type}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Job / Rental</span>
                  <p className="font-medium text-[#1A1A1A] mt-0.5">{selectedCommission.rentalReference}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Calculated Rate</span>
                  <p className="font-mono font-bold text-gray-900 mt-0.5">${selectedCommission.pieceRate.toFixed(2)}/item</p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Inventory Items Handled</h4>
                <div className="border border-gray-200 rounded max-h-40 overflow-auto divide-y divide-gray-100">
                  {selectedCommission.itemsHandled.length === 0 ? (
                    <p className="p-3 text-sm text-gray-500">No logged item references.</p>
                  ) : (
                    selectedCommission.itemsHandled.map((item, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">{item.name || `Variant ${item.itemVariantId}`}</span>
                        <span className="font-mono font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded border">x{item.quantity}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <div>
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Handled</span>
                  <p className="font-mono font-bold text-lg">{selectedCommission.totalItems} items</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#DC2626] font-bold uppercase tracking-wider">Total Commission Pay</span>
                  <p className="font-mono text-xl font-bold text-[#DC2626]">${selectedCommission.totalAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate From Logistics Log Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-md overflow-hidden border-t-4 border-[#DC2626]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-lg text-[#1A1A1A] flex items-center gap-2">
                <Play className="w-5 h-5 text-[#DC2626]" /> Scrape Logistics Logs
              </h3>
              <button onClick={() => setIsGenerateModalOpen(false)} className="text-gray-400 hover:text-[#1A1A1A] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleGenerate} className="p-6 space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Scan logistics records of item deliveries or returns to compute and issue commissions automatically.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Logistics Event Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setGenType('loading')}
                    className={`py-2 px-4 rounded text-sm font-bold border transition-colors cursor-pointer ${
                      genType === 'loading' 
                        ? 'bg-[#DC2626] text-white border-[#DC2626]' 
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Delivery (Loading)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setGenType('unloading')}
                    className={`py-2 px-4 rounded text-sm font-bold border transition-colors cursor-pointer ${
                      genType === 'unloading' 
                        ? 'bg-[#DC2626] text-white border-[#DC2626]' 
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Return (Offloading)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Rental Reference *</label>
                <select
                  required
                  value={genRentalId}
                  onChange={(e) => setGenRentalId(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] bg-white"
                >
                  <option value="" disabled>Select Rental</option>
                  {logistics
                    .filter(log => log.type === (genType === 'loading' ? 'delivery' : 'return'))
                    .map((log, idx) => (
                      <option key={idx} value={log.rentalId}>
                        Rental ID: {log.rentalId.slice(0, 8)} ({log.items.length} items logged)
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Worker Reference *</label>
                <select
                  required
                  value={genWorkerId}
                  onChange={(e) => setGenWorkerId(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] bg-white"
                >
                  <option value="" disabled>Select Worker</option>
                  {workers
                    .filter(w => w.isActive && w.role !== 'admin' && w.role !== 'supervisor')
                    .map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.role}) - Piece: ${w.pieceRate || 0}/item</option>
                    ))}
                </select>
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 -mx-6 -mb-6">
                <button 
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded text-sm font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#DC2626] text-white px-6 py-2 rounded text-sm font-bold hover:bg-red-700 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  Confirm & Calculate <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
