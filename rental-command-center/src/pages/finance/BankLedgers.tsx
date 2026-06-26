import React, { useState, useEffect } from 'react';
import { getBankLedgers, addBankLedger, updateBankLedger, deleteBankLedger, getBankTransactions, BankLedger, AccountTransaction } from '../../services/bankService';
import { Building2, CreditCard, DollarSign, Edit, Trash2, Plus, X, Search, FileText, CheckCircle, ArrowRightLeft } from 'lucide-react';

export function BankLedgers() {
  const [ledgers, setLedgers] = useState<BankLedger[]>([]);
  const [selectedLedger, setSelectedLedger] = useState<BankLedger | null>(null);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ledgerToEdit, setLedgerToEdit] = useState<BankLedger | null>(null);
  const [ledgerToDelete, setLedgerToDelete] = useState<BankLedger | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLedgers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBankLedgers();
      setLedgers(data);
      if (data.length > 0 && !selectedLedger) {
        setSelectedLedger(data[0]);
      } else if (selectedLedger) {
        const updatedSelected = data.find(l => l.id === selectedLedger.id);
        if (updatedSelected) setSelectedLedger(updatedSelected);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load bank ledgers.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (bankId: string) => {
    try {
      setTxLoading(true);
      setTxError(null);
      const data = await getBankTransactions(bankId);
      setTransactions(data);
    } catch (err: any) {
      setTxError(err.message || "Failed to load ledger transactions.");
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgers();
  }, []);

  useEffect(() => {
    if (selectedLedger) {
      fetchTransactions(selectedLedger.id);
    }
  }, [selectedLedger]);

  const handleOpenAdd = () => {
    setName('');
    setAccountNumber('');
    setInitialBalance(0);
    setIsActive(true);
    setShowAddModal(true);
  };

  const handleOpenEdit = (ledger: BankLedger) => {
    setLedgerToEdit(ledger);
    setName(ledger.name);
    setAccountNumber(ledger.accountNumber || '');
    setIsActive(ledger.isActive);
    setShowEditModal(true);
  };

  const handleOpenDelete = (ledger: BankLedger) => {
    setLedgerToDelete(ledger);
    setShowDeleteModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSubmitting(true);
      await addBankLedger({
        name,
        accountNumber,
        initialBalance: Number(initialBalance),
        isActive
      });
      setShowAddModal(false);
      fetchLedgers();
    } catch (err: any) {
      alert(err.message || "Failed to add ledger.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerToEdit || !name.trim()) return;
    try {
      setSubmitting(true);
      await updateBankLedger(ledgerToEdit.id, {
        name,
        accountNumber,
        isActive
      });
      setShowEditModal(false);
      fetchLedgers();
    } catch (err: any) {
      alert(err.message || "Failed to update ledger.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!ledgerToDelete) return;
    try {
      setSubmitting(true);
      await deleteBankLedger(ledgerToDelete.id);
      setShowDeleteModal(false);
      if (selectedLedger?.id === ledgerToDelete.id) {
        setSelectedLedger(null);
        setTransactions([]);
      }
      fetchLedgers();
    } catch (err: any) {
      alert(err.message || "Failed to delete ledger.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredLedgers = ledgers.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.accountNumber && l.accountNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 bg-[#0D0D0D] text-white p-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span className="w-2.5 h-6 bg-[#DC2626] rounded-full inline-block"></span>
            Bank Ledgers
          </h1>
          <p className="text-zinc-400 mt-1">Manage corporate banking details, cash boxes, and double-entry general ledgers.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-[#DC2626] hover:bg-red-700 text-white font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 transition duration-200"
        >
          <Plus size={18} />
          New Bank Ledger
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-[#DC2626] border-r-transparent border-b-[#DC2626] border-l-transparent"></div>
        </div>
      ) : error ? (
        <div className="bg-red-950/30 border border-[#DC2626] rounded-lg p-5 text-center">
          <p className="text-[#DC2626] font-medium">{error}</p>
          <button onClick={fetchLedgers} className="mt-4 bg-[#DC2626] text-white px-4 py-2 rounded-lg hover:bg-red-700">
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Columns - Banks List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {ledgers.map(l => (
                <div 
                  key={l.id} 
                  onClick={() => setSelectedLedger(l)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                    selectedLedger?.id === l.id 
                    ? 'bg-zinc-900 border-[#DC2626] shadow-md shadow-red-950/20' 
                    : 'bg-[#1A1A1A] border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
                      <Building2 size={18} className={selectedLedger?.id === l.id ? 'text-[#DC2626]' : ''} />
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      l.isActive ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {l.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white mt-3">{l.name}</h3>
                  <p className="text-xs text-zinc-500 truncate mt-1">{l.accountNumber || 'No Acc No.'}</p>
                  <div className="mt-4">
                    <p className="text-[10px] text-zinc-500 uppercase font-semibold">Current Balance</p>
                    <p className="text-lg font-bold text-[#DC2626]">
                      ${Number(l.currentBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Banks Table */}
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-[#141414]">
                <h3 className="font-semibold text-white">All Ledgers Ledger Directory</h3>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search ledgers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-zinc-900 text-white text-sm pl-9 pr-4 py-1.5 rounded-lg border border-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#DC2626]"
                  />
                </div>
              </div>

              {filteredLedgers.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">No bank ledgers found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-900 text-zinc-400 uppercase text-[11px] font-bold tracking-wider border-b border-zinc-800">
                        <th className="p-4">Bank / Ledger Name</th>
                        <th className="p-4">Account Number</th>
                        <th className="p-4">Initial Balance</th>
                        <th className="p-4">Current Balance</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {filteredLedgers.map(l => (
                        <tr 
                          key={l.id} 
                          className="hover:bg-zinc-900/40 cursor-pointer transition duration-150"
                          onClick={() => setSelectedLedger(l)}
                        >
                          <td className="p-4 font-medium text-white flex items-center gap-3">
                            <span className="w-2.5 h-2.5 bg-[#DC2626] rounded-full"></span>
                            {l.name}
                          </td>
                          <td className="p-4 text-zinc-400 font-mono text-sm">{l.accountNumber || '—'}</td>
                          <td className="p-4 text-zinc-300">${l.initialBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className="p-4 font-bold text-[#DC2626]">${l.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              l.isActive ? 'bg-emerald-950/50 text-emerald-400' : 'bg-zinc-950 text-zinc-500'
                            }`}>
                              {l.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleOpenEdit(l)}
                                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded transition duration-150"
                                title="Edit Ledger"
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                onClick={() => handleOpenDelete(l)}
                                className="p-1.5 bg-zinc-800 hover:bg-red-950 hover:text-[#DC2626] text-zinc-400 rounded transition duration-150"
                                title="Delete Ledger"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Ledger Transactions Audit List */}
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-full min-h-[500px]">
            <div className="p-5 border-b border-zinc-800 bg-[#141414] flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <ArrowRightLeft size={16} className="text-[#DC2626]" />
                  Ledger Transactions
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">{selectedLedger ? `Audit trail for ${selectedLedger.name}` : 'Select a ledger to view details'}</p>
              </div>
            </div>

            {selectedLedger ? (
              <div className="flex-1 flex flex-col">
                {txLoading ? (
                  <div className="flex-1 flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-[#DC2626] border-r-transparent border-b-[#DC2626] border-l-transparent"></div>
                  </div>
                ) : txError ? (
                  <p className="text-[#DC2626] text-center p-6">{txError}</p>
                ) : transactions.length === 0 ? (
                  <div className="flex-1 flex flex-col justify-center items-center text-center p-8 text-zinc-500">
                    <FileText size={40} className="text-zinc-700 mb-2" />
                    <p className="font-medium">No transactions on ledger</p>
                    <p className="text-xs text-zinc-600 mt-1">Double-entry journals will populate here upon bookings or procurements.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto max-h-[550px] divide-y divide-zinc-800">
                    {transactions.map(tx => {
                      const isExpense = ['procurement', 'expense', 'refund'].includes(tx.referenceType);
                      return (
                        <div key={tx.id} className="p-4 hover:bg-zinc-900/30 transition duration-150">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <p className="text-xs text-zinc-500">{tx.date.toLocaleDateString()}</p>
                              <p className="text-sm font-semibold text-white mt-1 leading-snug">{tx.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] uppercase font-bold text-[#DC2626] bg-red-950/20 px-1.5 py-0.5 rounded border border-red-900/30">
                                  {tx.referenceType}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-500">ID: {tx.referenceId}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold text-sm ${isExpense ? 'text-zinc-300' : 'text-[#DC2626]'}`}>
                                {isExpense ? '-' : '+'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </p>
                              <span className="text-[10px] font-semibold text-zinc-500 uppercase">{tx.entryType}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-zinc-500 p-8 text-center">
                <Building2 size={48} className="text-zinc-800 mb-3" />
                <p>No Ledger Selected</p>
                <p className="text-xs text-zinc-600 max-w-xs mt-1">Select or click a ledger card or table row on the left to review its dynamic cash journals.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Bank Ledger Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#141414] px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="w-2 h-4 bg-[#DC2626] inline-block rounded-sm"></span>
                Add New Bank Ledger
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white transition duration-150">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Bank / Ledger Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. CBE, Awash, Telebirr, Cash"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 1000123456789 or Wallet"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Initial Balance</label>
                <input
                  type="number"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(Number(e.target.value))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                />
              </div>
              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-zinc-800 text-[#DC2626] focus:ring-0 focus:ring-offset-0 accent-[#DC2626] h-4 w-4 bg-zinc-900"
                />
                <label htmlFor="isActive" className="text-sm text-zinc-300 font-medium select-none cursor-pointer">
                  Mark Ledger as Active
                </label>
              </div>
              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 py-2 rounded-lg transition duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#DC2626] hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition duration-150 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Bank Ledger Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#141414] px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="w-2 h-4 bg-[#DC2626] inline-block rounded-sm"></span>
                Edit Bank Ledger Details
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-zinc-500 hover:text-white transition duration-150">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Bank / Ledger Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                />
              </div>
              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-zinc-800 text-[#DC2626] focus:ring-0 focus:ring-offset-0 accent-[#DC2626] h-4 w-4 bg-zinc-900"
                />
                <label htmlFor="editIsActive" className="text-sm text-zinc-300 font-medium select-none cursor-pointer">
                  Mark Ledger as Active
                </label>
              </div>
              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 py-2 rounded-lg transition duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#DC2626] hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition duration-150 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-950/40 border border-[#DC2626] flex justify-center items-center mb-4">
                <Trash2 size={24} className="text-[#DC2626]" />
              </div>
              <h3 className="font-bold text-white text-lg mb-2">Delete Bank Ledger?</h3>
              <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                Are you sure you want to delete <span className="text-white font-semibold">"{ledgerToDelete?.name}"</span>? 
                This action is irreversible and can only succeed if there are absolutely no transaction histories associated with this bank ledger.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 py-2 rounded-lg transition duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={submitting}
                  className="flex-1 bg-[#DC2626] hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition duration-150"
                >
                  {submitting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
