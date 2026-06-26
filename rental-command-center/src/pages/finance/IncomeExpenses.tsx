import React, { useState, useEffect } from 'react';
import { getIncomeTransactions, getExpenseTransactions, getIncomeExpenseSummary, recordIncome, recordExpense, generateIncomeStatement, IncomeExpenseSummary } from '../../services/incomeExpenseService';
import { getBankLedgers, BankLedger, AccountTransaction } from '../../services/bankService';
import { DollarSign, TrendingUp, TrendingDown, ArrowRightLeft, Plus, Calendar, FileText, Download, X, Search, Eye } from 'lucide-react';

export function IncomeExpenses() {
  const [ledgers, setLedgers] = useState<BankLedger[]>([]);
  const [incomes, setIncomes] = useState<AccountTransaction[]>([]);
  const [expenses, setExpenses] = useState<AccountTransaction[]>([]);
  const [summary, setSummary] = useState<IncomeExpenseSummary>({ totalIncome: 0, totalExpenses: 0, netProfit: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date Filters (default: start of current month to end of current month)
  const [startDateStr, setStartDateStr] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10);
  });
  const [endDateStr, setEndDateStr] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().substring(0, 10);
  });

  // Modal states
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<AccountTransaction | null>(null);

  // Form states
  const [dateStr, setDateStr] = useState(new Date().toISOString().substring(0, 10));
  const [bankId, setBankId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [refType, setRefType] = useState<'booking' | 'rental' | 'procurement' | 'expense' | 'refund' | 'deposit'>('rental');
  const [refId, setRefId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const start = new Date(startDateStr);
      const end = new Date(endDateStr);

      const [ledgersList, incomeList, expenseList, summ] = await Promise.all([
        getBankLedgers(),
        getIncomeTransactions(start, end),
        getExpenseTransactions(start, end),
        getIncomeExpenseSummary(start, end)
      ]);

      setLedgers(ledgersList);
      setIncomes(incomeList);
      setExpenses(expenseList);
      setSummary(summ);

      if (ledgersList.length > 0 && !bankId) {
        setBankId(ledgersList[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load financial records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDateStr, endDateStr]);

  const handleOpenIncome = () => {
    setDateStr(new Date().toISOString().substring(0, 10));
    setAmount('');
    setDescription('');
    setRefType('rental');
    setRefId('');
    if (ledgers.length > 0) setBankId(ledgers[0].id);
    setShowIncomeModal(true);
  };

  const handleOpenExpense = () => {
    setDateStr(new Date().toISOString().substring(0, 10));
    setAmount('');
    setDescription('');
    setRefType('expense');
    setRefId('');
    if (ledgers.length > 0) setBankId(ledgers[0].id);
    setShowExpenseModal(true);
  };

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankId || !amount || Number(amount) <= 0 || !description.trim()) return;
    try {
      setSubmitting(true);
      const selectedBank = ledgers.find(l => l.id === bankId);
      if (!selectedBank) throw new Error("Bank ledger not found");

      await recordIncome({
        bankId,
        bankName: selectedBank.name,
        amount: Number(amount),
        description,
        referenceType: refType,
        referenceId: refId || 'N/A',
        date: new Date(dateStr)
      });

      setShowIncomeModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Error saving income.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankId || !amount || Number(amount) <= 0 || !description.trim()) return;
    try {
      setSubmitting(true);
      const selectedBank = ledgers.find(l => l.id === bankId);
      if (!selectedBank) throw new Error("Bank ledger not found");

      await recordExpense({
        bankId,
        bankName: selectedBank.name,
        amount: Number(amount),
        description,
        referenceType: refType,
        referenceId: refId || 'N/A',
        date: new Date(dateStr)
      });

      setShowExpenseModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Error saving expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportStatement = async () => {
    try {
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      const statement = await generateIncomeStatement(start, end);
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(statement, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `Income_Statement_${startDateStr}_to_${endDateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      alert("Failed to export statement: " + err.message);
    }
  };

  return (
    <div className="space-y-6 bg-[#0D0D0D] text-white p-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span className="w-2.5 h-6 bg-[#DC2626] rounded-full inline-block"></span>
            Income & Expenses
          </h1>
          <p className="text-zinc-400 mt-1">Book income, post cash expenditures, and monitor profit and loss statements dynamically.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportStatement}
            className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 transition duration-200"
          >
            <Download size={16} />
            Export Statement
          </button>
          <button
            onClick={handleOpenIncome}
            className="bg-[#DC2626] hover:bg-red-700 text-white font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 transition duration-200"
          >
            <Plus size={16} />
            New Income
          </button>
          <button
            onClick={handleOpenExpense}
            className="bg-zinc-900 border border-[#DC2626] hover:bg-zinc-800 text-white font-medium px-4 py-2.5 rounded-lg flex items-center gap-2 transition duration-200"
          >
            <Plus size={16} className="text-[#DC2626]" />
            New Expense
          </button>
        </div>
      </div>

      {/* Date Filters & Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
        {/* Date Filters */}
        <div className="md:col-span-1 bg-[#1A1A1A] border border-zinc-800 p-4 rounded-xl space-y-3">
          <h4 className="text-xs uppercase font-bold tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Calendar size={14} className="text-[#DC2626]" />
            Period Filtering
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
            <div>
              <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Start Date</label>
              <input
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="w-full bg-zinc-900 text-sm text-white rounded border border-zinc-800 px-2 py-1.5 focus:outline-none focus:border-[#DC2626]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">End Date</label>
              <input
                type="date"
                value={endDateStr}
                onChange={(e) => setEndDateStr(e.target.value)}
                className="w-full bg-zinc-900 text-sm text-white rounded border border-zinc-800 px-2 py-1.5 focus:outline-none focus:border-[#DC2626]"
              />
            </div>
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-[#1A1A1A] border border-zinc-800 p-5 rounded-xl">
          <div className="flex justify-between items-center">
            <p className="text-xs uppercase text-zinc-500 font-bold tracking-wider">Total Revenue / Income</p>
            <span className="p-1.5 bg-emerald-950/40 rounded border border-emerald-900/30 text-emerald-400">
              <TrendingUp size={16} />
            </span>
          </div>
          <p className="text-2xl font-black text-white mt-3">
            ${summary.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Sum of all credit journals in range</p>
        </div>

        {/* Total Expenses */}
        <div className="bg-[#1A1A1A] border border-zinc-800 p-5 rounded-xl">
          <div className="flex justify-between items-center">
            <p className="text-xs uppercase text-zinc-500 font-bold tracking-wider">Total Expenses / Outflow</p>
            <span className="p-1.5 bg-red-950/40 rounded border border-red-900/30 text-[#DC2626]">
              <TrendingDown size={16} />
            </span>
          </div>
          <p className="text-2xl font-black text-white mt-3 text-zinc-300">
            ${summary.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Sum of all debit journals in range</p>
        </div>

        {/* Net Profit */}
        <div className="bg-[#1A1A1A] border border-[#DC2626] p-5 rounded-xl bg-gradient-to-br from-[#0D0D0D] to-[#240a0a]">
          <div className="flex justify-between items-center">
            <p className="text-xs uppercase text-red-400 font-bold tracking-wider">Net profit margin</p>
            <span className="p-1.5 bg-red-900/30 rounded text-red-500 border border-red-800/20">
              <DollarSign size={16} />
            </span>
          </div>
          <p className={`text-3xl font-extrabold mt-3 ${summary.netProfit >= 0 ? 'text-[#DC2626]' : 'text-zinc-400'}`}>
            ${summary.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Pre-tax consolidated margins</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-[#DC2626] border-r-transparent border-b-[#DC2626] border-l-transparent"></div>
        </div>
      ) : error ? (
        <div className="bg-red-950/30 border border-[#DC2626] rounded-lg p-5 text-center">
          <p className="text-[#DC2626] font-medium">{error}</p>
          <button onClick={loadData} className="mt-4 bg-[#DC2626] text-white px-4 py-2 rounded-lg hover:bg-red-700">
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income Side */}
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="w-2 h-4 bg-emerald-500 inline-block rounded-sm"></span>
                Income Journal Entries
              </h3>
              <span className="text-xs text-zinc-400 font-mono">{incomes.length} Entries</span>
            </div>

            {incomes.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">
                <TrendingUp size={36} className="text-zinc-700 mx-auto mb-2" />
                <p className="font-medium">No Income Entries Recorded</p>
                <p className="text-xs text-zinc-600 mt-1">Record manual income or process rental bookings to generate.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 text-zinc-400 uppercase text-[10px] font-bold tracking-wider border-b border-zinc-800">
                      <th className="p-3">Date</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Ledger Bank</th>
                      <th className="p-3">Reference</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {incomes.map(tx => (
                      <tr key={tx.id} className="hover:bg-zinc-900/30 transition duration-150">
                        <td className="p-3 text-zinc-400">{tx.date.toLocaleDateString()}</td>
                        <td className="p-3 text-white font-medium max-w-[200px] truncate">{tx.description}</td>
                        <td className="p-3 text-zinc-300">{tx.accountName}</td>
                        <td className="p-3">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 px-1.5 py-0.5 rounded">
                            {tx.referenceType}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-400">
                          +${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => { setSelectedTx(tx); setShowViewModal(true); }}
                            className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Expense Side */}
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="w-2 h-4 bg-[#DC2626] inline-block rounded-sm"></span>
                Expense Journal Entries
              </h3>
              <span className="text-xs text-zinc-400 font-mono">{expenses.length} Entries</span>
            </div>

            {expenses.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">
                <TrendingDown size={36} className="text-zinc-700 mx-auto mb-2" />
                <p className="font-medium">No Expense Entries Recorded</p>
                <p className="text-xs text-zinc-600 mt-1">Record manual operating costs or receive PO goods to generate.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 text-zinc-400 uppercase text-[10px] font-bold tracking-wider border-b border-zinc-800">
                      <th className="p-3">Date</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Ledger Bank</th>
                      <th className="p-3">Reference</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {expenses.map(tx => (
                      <tr key={tx.id} className="hover:bg-zinc-900/30 transition duration-150">
                        <td className="p-3 text-zinc-400">{tx.date.toLocaleDateString()}</td>
                        <td className="p-3 text-white font-medium max-w-[200px] truncate">{tx.description}</td>
                        <td className="p-3 text-zinc-300">{tx.accountName}</td>
                        <td className="p-3">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded">
                            {tx.referenceType}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-[#DC2626]">
                          -${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => { setSelectedTx(tx); setShowViewModal(true); }}
                            className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Record Income Modal */}
      {showIncomeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#141414] px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="w-2 h-4 bg-emerald-500 inline-block rounded-sm"></span>
                Record Manual Income
              </h3>
              <button onClick={() => setShowIncomeModal(false)} className="text-zinc-500 hover:text-white transition duration-150">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleIncomeSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Posting Date</label>
                <input
                  type="date"
                  required
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Bank / Ledger Destination</label>
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
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Amount ($)</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Description</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Booking deposit payment received"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Reference Type</label>
                  <select
                    value={refType}
                    onChange={(e: any) => setRefType(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                  >
                    <option value="booking">Booking</option>
                    <option value="rental">Rental</option>
                    <option value="deposit">Deposit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Reference ID (Optional)</label>
                  <input
                    type="text"
                    value={refId}
                    onChange={(e) => setRefId(e.target.value)}
                    placeholder="e.g. BOK-10293"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowIncomeModal(false)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 py-2 rounded-lg transition duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-semibold transition duration-150"
                >
                  {submitting ? 'Posting...' : 'Post Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#141414] px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="w-2 h-4 bg-[#DC2626] inline-block rounded-sm"></span>
                Record Manual Expense
              </h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-zinc-500 hover:text-white transition duration-150">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleExpenseSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Posting Date</label>
                <input
                  type="date"
                  required
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Bank / Ledger Source</label>
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
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Amount ($)</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Description</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Purchased new chairs procurement"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Reference Type</label>
                  <select
                    value={refType}
                    onChange={(e: any) => setRefType(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                  >
                    <option value="expense">General Expense</option>
                    <option value="procurement">Procurement</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1.5">Reference ID (Optional)</label>
                  <input
                    type="text"
                    value={refId}
                    onChange={(e) => setRefId(e.target.value)}
                    placeholder="e.g. PO-2026-0034"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 py-2 rounded-lg transition duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#DC2626] hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition duration-150"
                >
                  {submitting ? 'Posting...' : 'Post Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Transaction Details Modal */}
      {showViewModal && selectedTx && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#141414] px-6 py-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2">
                <span className="w-2 h-4 bg-[#DC2626] inline-block rounded-sm"></span>
                Double-Entry Details
              </h3>
              <button onClick={() => setShowViewModal(false)} className="text-zinc-500 hover:text-white transition duration-150">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Transaction ID</p>
                  <p className="text-sm font-mono font-bold text-white">{selectedTx.transactionId}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Date Posted</p>
                  <p className="text-sm font-medium text-white">{selectedTx.date.toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Journal Description</p>
                <p className="text-sm font-medium text-white leading-relaxed bg-zinc-900/60 p-3 rounded-lg border border-zinc-800/60">{selectedTx.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Account Name</p>
                  <p className="text-sm font-medium text-zinc-200">{selectedTx.accountName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Entry Posting Type</p>
                  <p className="text-sm font-bold uppercase text-[#DC2626]">{selectedTx.entryType}</p>
                </div>
              </div>

              <div className="flex justify-between items-center bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/80">
                <div>
                  <span className="text-xs text-zinc-500 block uppercase font-semibold">Consolidated Amount</span>
                  <span className="text-xs text-zinc-400 font-mono">Reference Type: {selectedTx.referenceType}</span>
                </div>
                <div className="text-right">
                  <span className={`text-xl font-extrabold ${selectedTx.entryType === 'credit' ? 'text-emerald-400' : 'text-[#DC2626]'}`}>
                    {selectedTx.entryType === 'credit' ? '+' : '-'}${selectedTx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowViewModal(false)}
                className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 py-2 rounded-lg transition duration-150"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
