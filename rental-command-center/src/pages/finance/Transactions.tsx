import React, { useState, useEffect } from 'react';
import { getTransactionsFiltered, getTransactionByReference } from '../../services/transactionService';
import { getBankLedgers, BankLedger, getAllTransactions, AccountTransaction } from '../../services/bankService';
import { Search, Filter, Calendar, FileText, Download, X, Eye, ArrowRightLeft, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

export function Transactions() {
  const [ledgers, setLedgers] = useState<BankLedger[]>([]);
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('all');
  const [selectedEntryType, setSelectedEntryType] = useState<'all' | 'debit' | 'credit'>('all');
  const [selectedRefType, setSelectedRefType] = useState('all');
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');

  // Modals state
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<AccountTransaction | null>(null);
  const [groupedEntries, setGroupedEntries] = useState<AccountTransaction[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [bankList, txsList] = await Promise.all([
        getBankLedgers(),
        getTransactionsFiltered({
          startDate: startDateStr ? new Date(startDateStr) : undefined,
          endDate: endDateStr ? new Date(endDateStr) : undefined,
          bankId: selectedBankId,
          entryType: selectedEntryType === 'all' ? undefined : selectedEntryType,
          referenceType: selectedRefType === 'all' ? undefined : selectedRefType
        })
      ]);

      setLedgers(bankList);
      setTransactions(txsList);
      setCurrentPage(1); // Reset pagination on filter change
    } catch (err: any) {
      setError(err.message || "Failed to load transactions audit log.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBankId, selectedEntryType, selectedRefType, startDateStr, endDateStr]);

  const handleOpenView = async (tx: AccountTransaction) => {
    setSelectedTx(tx);
    setShowViewModal(true);
    try {
      setGroupLoading(true);
      // Group related entries with the same transactionId
      const all = await getAllTransactions();
      const grouped = all.filter(t => t.transactionId === tx.transactionId);
      setGroupedEntries(grouped);
    } catch (err) {
      console.error("Error fetching grouped entries:", err);
    } finally {
      setGroupLoading(false);
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ['Date', 'Transaction ID', 'Entry Type', 'Account ID', 'Account Name', 'Amount', 'Description', 'Reference Type', 'Reference ID'];
      const rows = filteredTransactions.map(tx => [
        tx.date.toLocaleDateString(),
        tx.transactionId,
        tx.entryType,
        tx.accountId,
        tx.accountName,
        tx.amount.toString(),
        `"${tx.description.replace(/"/g, '""')}"`,
        tx.referenceType,
        tx.referenceId
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `ERP_Transactions_Audit_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      alert("Failed to export: " + err.message);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const q = searchQuery.toLowerCase();
    return (
      tx.description.toLowerCase().includes(q) ||
      tx.transactionId.toLowerCase().includes(q) ||
      tx.referenceId.toLowerCase().includes(q) ||
      tx.accountName.toLowerCase().includes(q)
    );
  });

  // Pagination maths
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 bg-[#0D0D0D] text-white p-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span className="w-2.5 h-6 bg-[#DC2626] rounded-full inline-block"></span>
            Transactions Journal
          </h1>
          <p className="text-zinc-400 mt-1">Unified general ledger, double-entry audit trials, and transactional reporting exports.</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="bg-[#DC2626] hover:bg-red-700 text-white font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 transition duration-200"
        >
          <Download size={16} />
          Export Ledger (CSV)
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#1A1A1A] border border-zinc-800 p-5 rounded-xl space-y-4">
        <h3 className="font-semibold text-zinc-300 text-sm flex items-center gap-2">
          <Filter size={16} className="text-[#DC2626]" />
          Filter & Query Parameters
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
          {/* Search Box */}
          <div className="md:col-span-2">
            <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1.5">Free Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search memo, TX ID, Ref ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 text-sm text-white rounded-lg border border-zinc-800 pl-9 pr-3 py-2 focus:outline-none focus:border-[#DC2626]"
              />
            </div>
          </div>

          {/* Ledger Selector */}
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1.5">Bank / Ledger</label>
            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="w-full bg-zinc-900 text-sm text-white rounded-lg border border-zinc-800 px-3 py-2 focus:outline-none focus:border-[#DC2626]"
            >
              <option value="all">All Ledgers</option>
              {ledgers.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1.5">Entry Type</label>
            <select
              value={selectedEntryType}
              onChange={(e: any) => setSelectedEntryType(e.target.value)}
              className="w-full bg-zinc-900 text-sm text-white rounded-lg border border-zinc-800 px-3 py-2 focus:outline-none focus:border-[#DC2626]"
            >
              <option value="all">All Postings</option>
              <option value="debit">Debits (Outflow)</option>
              <option value="credit">Credits (Inflow)</option>
            </select>
          </div>

          {/* Reference Selector */}
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1.5">Ref Scope</label>
            <select
              value={selectedRefType}
              onChange={(e) => setSelectedRefType(e.target.value)}
              className="w-full bg-zinc-900 text-sm text-white rounded-lg border border-zinc-800 px-3 py-2 focus:outline-none focus:border-[#DC2626]"
            >
              <option value="all">All References</option>
              <option value="booking">Booking</option>
              <option value="rental">Rental</option>
              <option value="procurement">Procurement</option>
              <option value="expense">Expense</option>
              <option value="refund">Refund</option>
              <option value="deposit">Deposit</option>
            </select>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1.5">Starting Date</label>
            <input
              type="date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="w-full bg-zinc-900 text-sm text-white rounded-lg border border-zinc-800 px-3 py-2 focus:outline-none focus:border-[#DC2626]"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-[#DC2626] border-r-transparent border-b-[#DC2626] border-l-transparent"></div>
          </div>
        ) : error ? (
          <p className="p-6 text-center text-[#DC2626]">{error}</p>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-16 text-center text-zinc-500">
            <FileText size={48} className="text-zinc-800 mx-auto mb-3" />
            <p className="font-semibold text-zinc-400">No Journal Logs Found</p>
            <p className="text-xs text-zinc-600 mt-1">Try relaxing some query filters or posting initial booking contracts.</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-zinc-900 text-zinc-400 uppercase text-[10px] font-bold tracking-wider border-b border-zinc-800">
                    <th className="p-4">Post Date</th>
                    <th className="p-4">Transaction ID</th>
                    <th className="p-4">Ledger Account</th>
                    <th className="p-4">Posting Narrative</th>
                    <th className="p-4">Scope</th>
                    <th className="p-4 text-right">Debit (Out)</th>
                    <th className="p-4 text-right">Credit (In)</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {paginatedTransactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-zinc-900/30 transition duration-150">
                      <td className="p-4 text-zinc-400 font-mono text-xs">{tx.date.toLocaleDateString()}</td>
                      <td className="p-4 text-zinc-400 font-mono text-xs">{tx.transactionId}</td>
                      <td className="p-4 font-medium text-white">{tx.accountName}</td>
                      <td className="p-4 text-zinc-300 max-w-[280px] truncate">{tx.description}</td>
                      <td className="p-4">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">
                          {tx.referenceType}
                        </span>
                      </td>
                      <td className="p-4 text-right text-zinc-300 font-bold">
                        {tx.entryType === 'debit' ? `$${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="p-4 text-right text-[#DC2626] font-bold">
                        {tx.entryType === 'credit' ? `$${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleOpenView(tx)}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded"
                          title="Audit Double Entry Match"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex justify-between items-center text-sm">
                <span className="text-zinc-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} logs
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(c => c - 1)}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(c => c + 1)}
                    className="px-3 py-1.5 bg-[#DC2626] hover:bg-red-700 rounded-lg text-white disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Double-Entry Match Modal */}
      {showViewModal && selectedTx && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="bg-[#141414] px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-[#DC2626]" />
                Journal Balance Ledger Matching
              </h3>
              <button onClick={() => setShowViewModal(false)} className="text-zinc-500 hover:text-white transition duration-150">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/60 text-center">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Matching Transaction ID</p>
                  <p className="text-sm font-mono font-bold text-white mt-1">{selectedTx.transactionId}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Posting Date</p>
                  <p className="text-sm font-semibold text-white mt-1">{selectedTx.date.toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1.5">Posting Memo</p>
                <p className="text-sm text-zinc-200 leading-relaxed bg-zinc-900/80 p-3.5 rounded-lg border border-zinc-800">{selectedTx.description}</p>
              </div>

              {/* Both debit and credit legs */}
              <div>
                <p className="text-xs uppercase font-bold tracking-wider text-zinc-400 mb-2">Double-Entry Posting Details</p>
                {groupLoading ? (
                  <div className="flex justify-center items-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-[#DC2626] border-r-transparent"></div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groupedEntries.map((leg, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800">
                        <div>
                          <p className="text-sm font-bold text-white">{leg.accountName}</p>
                          <span className={`text-[10px] uppercase font-mono tracking-wider font-bold ${leg.entryType === 'debit' ? 'text-zinc-400' : 'text-[#DC2626]'}`}>
                            {leg.entryType}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className={`text-base font-black ${leg.entryType === 'credit' ? 'text-emerald-400' : 'text-[#DC2626]'}`}>
                            {leg.entryType === 'credit' ? '+' : '-'}${leg.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4 text-xs text-zinc-500">
                <p>Auditor reference type: <span className="font-semibold text-zinc-400 uppercase">{selectedTx.referenceType}</span></p>
                <p className="text-right">Reference ID: <span className="font-semibold text-zinc-400 font-mono">{selectedTx.referenceId}</span></p>
              </div>

              <button
                onClick={() => setShowViewModal(false)}
                className="w-full bg-[#DC2626] hover:bg-red-700 text-white py-2.5 rounded-lg font-semibold transition duration-150"
              >
                Close Audit Matching
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
