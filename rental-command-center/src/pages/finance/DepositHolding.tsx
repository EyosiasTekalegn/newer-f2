import React, { useState, useEffect } from 'react';
import { getDepositHolds, addDeduction, processRefund, forfeitDeposit, getDepositSummary, DepositHold, DepositSummary } from '../../services/depositHoldingService';
import { getBankLedgers, BankLedger } from '../../services/bankService';
import { Wallet, CheckCircle, AlertTriangle, Trash2, Calendar, FileText, ArrowRight, Eye, RefreshCw, X, HelpCircle, Search, Filter } from 'lucide-react';

export function DepositHolding() {
  const [deposits, setDeposits] = useState<DepositHold[]>([]);
  const [summary, setSummary] = useState<DepositSummary>({ totalActive: 0, totalRefunded: 0, totalForfeited: 0, totalDeductions: 0 });
  const [ledgers, setLedgers] = useState<BankLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Refunded' | 'Forfeited'>('All');

  // Modals state
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showForfeitModal, setShowForfeitModal] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  
  const [selectedDeposit, setSelectedDeposit] = useState<DepositHold | null>(null);
  
  // Forms state
  const [bankId, setBankId] = useState('');
  const [notes, setNotes] = useState('');
  const [deductionReason, setDeductionReason] = useState('');
  const [deductionAmount, setDeductionAmount] = useState('');
  const [deductionItemVariantId, setDeductionItemVariantId] = useState('');
  const [deductionDesc, setDeductionDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [depList, summ, bankList] = await Promise.all([
        getDepositHolds(),
        getDepositSummary(),
        getBankLedgers()
      ]);
      setDeposits(depList);
      setSummary(summ);
      setLedgers(bankList);
      if (bankList.length > 0 && !bankId) {
        setBankId(bankList[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load security deposit holds.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenRefund = (deposit: DepositHold) => {
    setSelectedDeposit(deposit);
    setNotes('');
    if (ledgers.length > 0) setBankId(ledgers[0].id);
    setShowRefundModal(true);
  };

  const handleOpenForfeit = (deposit: DepositHold) => {
    setSelectedDeposit(deposit);
    setNotes('');
    setShowForfeitModal(true);
  };

  const handleOpenDeduction = (deposit: DepositHold) => {
    setSelectedDeposit(deposit);
    setDeductionReason('');
    setDeductionAmount('');
    setDeductionItemVariantId('');
    setDeductionDesc('');
    setShowDeductionModal(true);
  };

  const handleRefundConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeposit || !bankId) return;
    try {
      setSubmitting(true);
      await processRefund(selectedDeposit.id, bankId, notes);
      setShowRefundModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to process security deposit refund.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForfeitConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeposit) return;
    try {
      setSubmitting(true);
      await forfeitDeposit(selectedDeposit.id, notes);
      setShowForfeitModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to forfeit security deposit.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeductionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeposit || !deductionReason || Number(deductionAmount) <= 0) return;
    try {
      setSubmitting(true);
      await addDeduction(selectedDeposit.id, {
        reason: deductionReason,
        amount: Number(deductionAmount),
        itemVariantId: deductionItemVariantId || undefined,
        description: deductionDesc || undefined
      });
      setShowDeductionModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to add security deposit deduction.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDeposits = deposits.filter(d => {
    const matchesSearch = d.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || d.rentalId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 bg-[#0D0D0D] text-white p-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span className="w-2.5 h-6 bg-[#DC2626] rounded-full inline-block"></span>
            Deposit Holding
          </h1>
          <p className="text-zinc-400 mt-1">Track customer safety deposits, process return inspection deductions, and authorize bank refunds.</p>
        </div>
        <button
          onClick={loadData}
          className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 transition duration-200"
        >
          <RefreshCw size={16} />
          Reload Database
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {/* Total Active Deposits */}
        <div className="bg-[#1A1A1A] border border-zinc-800 p-5 rounded-xl">
          <div className="flex justify-between items-center">
            <p className="text-xs uppercase text-zinc-500 font-bold tracking-wider">Active Held Liability</p>
            <span className="p-1.5 bg-yellow-950/40 rounded border border-yellow-900/30 text-yellow-500">
              <Wallet size={16} />
            </span>
          </div>
          <p className="text-2xl font-black text-white mt-3">
            ${summary.totalActive.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Held securely, awaiting return checks</p>
        </div>

        {/* Total Deductions */}
        <div className="bg-[#1A1A1A] border border-zinc-800 p-5 rounded-xl">
          <div className="flex justify-between items-center">
            <p className="text-xs uppercase text-zinc-500 font-bold tracking-wider">Accumulated Deductions</p>
            <span className="p-1.5 bg-orange-950/40 rounded border border-orange-900/30 text-orange-400">
              <AlertTriangle size={16} />
            </span>
          </div>
          <p className="text-2xl font-black text-white mt-3">
            ${summary.totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Withheld for damages or late fees</p>
        </div>

        {/* Total Refunded */}
        <div className="bg-[#1A1A1A] border border-zinc-800 p-5 rounded-xl">
          <div className="flex justify-between items-center">
            <p className="text-xs uppercase text-zinc-500 font-bold tracking-wider">Total Bank Refunded</p>
            <span className="p-1.5 bg-emerald-950/40 rounded border border-emerald-900/30 text-emerald-400">
              <CheckCircle size={16} />
            </span>
          </div>
          <p className="text-2xl font-black text-white mt-3 text-zinc-300">
            ${summary.totalRefunded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Returned to customer bank accounts</p>
        </div>

        {/* Total Forfeited */}
        <div className="bg-[#1A1A1A] border border-[#DC2626] p-5 rounded-xl bg-gradient-to-br from-[#0D0D0D] to-[#240a0a]">
          <div className="flex justify-between items-center">
            <p className="text-xs uppercase text-red-400 font-bold tracking-wider">Total Forfeited Funds</p>
            <span className="p-1.5 bg-red-900/30 rounded text-red-500 border border-red-800/20">
              <Trash2 size={16} />
            </span>
          </div>
          <p className="text-2xl font-black text-[#DC2626] mt-3">
            ${summary.totalForfeited.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Fully retained due to extreme damages</p>
        </div>
      </div>

      {/* Filters and Table */}
      <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-[#141414]">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-white">Active Deposit Registers</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search Customer/Rental..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-900 text-white text-sm pl-9 pr-4 py-1.5 rounded-lg border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#DC2626]"
              />
            </div>
            <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
              <Filter size={14} className="text-zinc-500" />
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="bg-transparent text-sm text-white focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Holds</option>
                <option value="Refunded">Refunded</option>
                <option value="Forfeited">Forfeited</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-[#DC2626] border-r-transparent border-b-[#DC2626] border-l-transparent"></div>
          </div>
        ) : error ? (
          <p className="p-6 text-center text-[#DC2626]">{error}</p>
        ) : filteredDeposits.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Wallet size={40} className="text-zinc-700 mx-auto mb-2" />
            <p className="font-medium">No Deposits Registers Found</p>
            <p className="text-xs text-zinc-600 mt-1">Try relaxing filters or log initial customer safety holds during delivery check-ins.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-900 text-zinc-400 uppercase text-[10px] font-bold tracking-wider border-b border-zinc-800">
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Rental Reference ID</th>
                  <th className="p-4">Collected At</th>
                  <th className="p-4 text-right">Original Deposit</th>
                  <th className="p-4 text-right">Total Deductions</th>
                  <th className="p-4 text-right">Refund Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredDeposits.map(d => {
                  const dedSum = d.deductions.reduce((s, dc) => s + Number(dc.amount || 0), 0);
                  return (
                    <tr key={d.id} className="hover:bg-zinc-900/30 transition duration-150">
                      <td className="p-4 font-semibold text-white">{d.customerName}</td>
                      <td className="p-4 text-zinc-400 font-mono text-xs">{d.rentalId}</td>
                      <td className="p-4 text-zinc-400">{d.collectedAt.toLocaleDateString()}</td>
                      <td className="p-4 text-right font-medium text-white">${d.amount.toLocaleString()}</td>
                      <td className="p-4 text-right">
                        {dedSum > 0 ? (
                          <span className="text-amber-500 font-bold hover:underline cursor-pointer" onClick={() => { setSelectedDeposit(d); setShowViewModal(true); }}>
                            -${dedSum.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="p-4 text-right font-bold text-[#DC2626]">${d.refundAmount.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          d.status === 'Active' ? 'bg-yellow-950/50 text-yellow-400 border border-yellow-900/30' :
                          d.status === 'Refunded' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30' :
                          'bg-red-950/50 text-red-400 border border-red-900/30'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { setSelectedDeposit(d); setShowViewModal(true); }}
                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded transition"
                            title="View Detail Timeline"
                          >
                            <Eye size={14} />
                          </button>
                          {d.status === 'Active' && (
                            <>
                              <button
                                onClick={() => handleOpenDeduction(d)}
                                className="p-1.5 bg-zinc-800 text-yellow-500 hover:bg-yellow-950 hover:text-yellow-400 rounded transition"
                                title="Add Inspection Deduction"
                              >
                                <AlertTriangle size={14} />
                              </button>
                              <button
                                onClick={() => handleOpenRefund(d)}
                                className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded transition"
                              >
                                Refund
                              </button>
                              <button
                                onClick={() => handleOpenForfeit(d)}
                                className="px-2.5 py-1 text-xs bg-red-950 text-[#DC2626] hover:bg-red-900 border border-red-900/30 hover:text-white font-semibold rounded transition"
                              >
                                Forfeit
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Detail Timeline Modal */}
      {showViewModal && selectedDeposit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-[#141414] px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="w-2 h-4 bg-[#DC2626] inline-block rounded-sm"></span>
                Deposit Ledger: {selectedDeposit.customerName}
              </h3>
              <button onClick={() => setShowViewModal(false)} className="text-zinc-500 hover:text-white transition duration-150">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Core Details */}
              <div className="grid grid-cols-2 gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Rental Reference ID</p>
                  <p className="text-sm font-mono font-bold text-white">{selectedDeposit.rentalId}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Original Collection Date</p>
                  <p className="text-sm font-medium text-white">{selectedDeposit.collectedAt.toLocaleDateString()}</p>
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/40">
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Total Deposit</span>
                  <p className="font-bold text-white text-sm mt-1">${selectedDeposit.amount.toLocaleString()}</p>
                </div>
                <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/40">
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Deductions</span>
                  <p className="font-bold text-amber-500 text-sm mt-1">
                    -${selectedDeposit.deductions.reduce((s, dc) => s + Number(dc.amount || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-[#DC2626]/20">
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Calculated Refund</span>
                  <p className="font-bold text-[#DC2626] text-sm mt-1">${selectedDeposit.refundAmount.toLocaleString()}</p>
                </div>
              </div>

              {/* Deductions breakdown */}
              <div>
                <p className="text-xs uppercase font-bold tracking-wider text-zinc-400 mb-2">Itemized Return Deductions</p>
                {selectedDeposit.deductions.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic p-3 bg-zinc-900/40 rounded-lg border border-zinc-800/40">No deductions logged on return inspection.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedDeposit.deductions.map((ded, i) => (
                      <div key={i} className="flex justify-between items-start bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
                        <div>
                          <p className="text-sm font-semibold text-white">{ded.reason}</p>
                          {ded.description && <p className="text-xs text-zinc-400 mt-0.5">{ded.description}</p>}
                          {ded.itemVariantId && <p className="text-[10px] text-zinc-500 font-mono mt-1">Item SKU: {ded.itemVariantId}</p>}
                        </div>
                        <p className="text-sm font-bold text-amber-500">-${ded.amount.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Event Timeline / Notes */}
              <div>
                <p className="text-xs uppercase font-bold tracking-wider text-zinc-400 mb-1.5">Posting History & Notes</p>
                <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-xs text-zinc-300 space-y-1.5 whitespace-pre-line leading-relaxed">
                  {selectedDeposit.notes ? selectedDeposit.notes : "No manual notes logged."}
                  {selectedDeposit.refundedAt && (
                    <div className="text-emerald-400 mt-2 font-mono text-[10px] uppercase font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                      Refund completed on {selectedDeposit.refundedAt.toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowViewModal(false)}
                className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 py-2.5 rounded-lg transition duration-150"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Deduction Modal */}
      {showDeductionModal && selectedDeposit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#141414] px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="w-2 h-4 bg-yellow-500 inline-block rounded-sm"></span>
                Record Inspection Deduction
              </h3>
              <button onClick={() => setShowDeductionModal(false)} className="text-zinc-500 hover:text-white transition duration-150">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleDeductionSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Core Reason / Title</label>
                <input
                  type="text"
                  required
                  value={deductionReason}
                  onChange={(e) => setDeductionReason(e.target.value)}
                  placeholder="e.g. Broken Wine Glasses, Late Offloading fee"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Withheld Amount ($)</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={deductionAmount}
                    onChange={(e) => setDeductionAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Item Variant ID (Optional)</label>
                  <input
                    type="text"
                    value={deductionItemVariantId}
                    onChange={(e) => setDeductionItemVariantId(e.target.value)}
                    placeholder="SKU Variant ID"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Full Narrative Description</label>
                <textarea
                  value={deductionDesc}
                  onChange={(e) => setDeductionDesc(e.target.value)}
                  placeholder="Provide precise details of the item damage or late return conditions..."
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowDeductionModal(false)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 py-2 rounded-lg transition duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg font-semibold transition duration-150"
                >
                  {submitting ? 'Applying...' : 'Apply Deduction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Process Refund Modal */}
      {showRefundModal && selectedDeposit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#141414] px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="w-2 h-4 bg-emerald-500 inline-block rounded-sm"></span>
                Process Deposit Bank Refund
              </h3>
              <button onClick={() => setShowRefundModal(false)} className="text-zinc-500 hover:text-white transition duration-150">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRefundConfirm} className="p-6 space-y-4">
              <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 text-center">
                <p className="text-xs uppercase text-zinc-500 font-bold">Auto-calculated Refund Amount</p>
                <p className="text-3xl font-black text-emerald-400 mt-2">${selectedDeposit.refundAmount.toLocaleString()}</p>
                <p className="text-[10px] text-zinc-500 mt-1">Calculated as: Deposit (${selectedDeposit.amount}) - Deductions (-${selectedDeposit.deductions.reduce((s, dc) => s + Number(dc.amount || 0), 0)})</p>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Refund From Bank Ledger</label>
                <select
                  required
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                >
                  <option value="" disabled>Select Bank Ledger...</option>
                  {ledgers.filter(l => l.isActive).map(l => (
                    <option key={l.id} value={l.id}>{l.name} (${l.currentBalance.toLocaleString()})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Internal Memo / Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Provide details about the banking transaction reference..."
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 py-2 rounded-lg transition duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-semibold transition duration-150"
                >
                  {submitting ? 'Refunding...' : 'Confirm Bank Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forfeit Confirmation Modal */}
      {showForfeitModal && selectedDeposit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[#1A1A1A] border border-[#DC2626] rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#141414] px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="w-2 h-4 bg-red-600 inline-block rounded-sm"></span>
                Forfeit Security Deposit
              </h3>
              <button onClick={() => setShowForfeitModal(false)} className="text-zinc-500 hover:text-white transition duration-150">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleForfeitConfirm} className="p-6 space-y-4">
              <div className="bg-red-950/20 border border-red-900/30 p-4 rounded-xl text-center">
                <p className="text-xs uppercase text-[#DC2626] font-bold">Security Deposit Forfeiture</p>
                <p className="text-3xl font-black text-white mt-2">${selectedDeposit.amount.toLocaleString()}</p>
                <p className="text-[10px] text-zinc-500 mt-1">This action forfeits the entire deposit amount. No refunds will ever be returned.</p>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Forfeit Reason / Explanation</label>
                <textarea
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Provide strict explanation as to why the deposit is fully forfeited (e.g. complete total loss of rental materials)..."
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowForfeitModal(false)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 py-2 rounded-lg transition duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#DC2626] hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition duration-150"
                >
                  {submitting ? 'Forfeiting...' : 'Confirm Forfeit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
