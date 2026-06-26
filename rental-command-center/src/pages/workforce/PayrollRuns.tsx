import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Calendar, Search, X, CheckCircle, AlertTriangle, FileText, ChevronRight, Check, DollarSign, ArrowRight, Settings, Eye, Trash2 } from 'lucide-react';
import { getPayrollRuns, getPayrollRun, createPayrollRun, updatePayrollRun, approvePayrollRun, processPayrollRun, deletePayrollRun, PayrollRun, WorkerPayment } from '../../services/payrollService';

export function PayrollRuns() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Wizard state for new run
  const [isNewRunOpen, setIsNewRunOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Default to start of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0]; // Default to today
  });
  const [runNotes, setRunNotes] = useState('');

  // Detailed view / edit state
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingPaymentIndex, setEditingPaymentIndex] = useState<number | null>(null);
  const [editPaymentData, setEditPaymentData] = useState({
    baseSalary: 0,
    bonus: 0,
    deductions: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPayrollRuns();
      setRuns(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payroll historical runs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        alert('End date cannot precede start date.');
        setLoading(false);
        return;
      }

      await createPayrollRun(start, end, runNotes);
      setIsNewRunOpen(false);
      setRunNotes('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error generating draft payroll run. Make sure workers have hours or approved commissions in this period.');
      setLoading(false);
    }
  };

  const handleOpenDetails = async (id: string) => {
    try {
      setLoading(true);
      const run = await getPayrollRun(id);
      if (run) {
        setSelectedRun(run);
        setIsDetailsOpen(true);
      }
    } catch (err: any) {
      alert('Failed to load payroll details');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRun = async (id: string) => {
    try {
      setLoading(true);
      await approvePayrollRun(id);
      setIsDetailsOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Failed to approve payroll run');
      setLoading(false);
    }
  };

  const handleProcessRun = async (id: string) => {
    if (!window.confirm('Process payouts? This will mark all approved commissions in the period as Paid.')) return;
    try {
      setLoading(true);
      await processPayrollRun(id);
      setIsDetailsOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Failed to process and pay payroll run');
      setLoading(false);
    }
  };

  const handleDeleteRun = async (id: string) => {
    if (!window.confirm('Delete this payroll run draft?')) return;
    try {
      setLoading(true);
      await deletePayrollRun(id);
      setIsDetailsOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Failed to delete payroll run');
      setLoading(false);
    }
  };

  const startEditPayment = (idx: number, wp: WorkerPayment) => {
    setEditingPaymentIndex(idx);
    setEditPaymentData({
      baseSalary: wp.baseSalary || 0,
      bonus: wp.bonus || 0,
      deductions: wp.deductions || 0
    });
  };

  const saveEditPayment = async () => {
    if (!selectedRun || editingPaymentIndex === null) return;

    try {
      setLoading(true);
      const updatedPayments = [...selectedRun.workerPayments];
      const wp = updatedPayments[editingPaymentIndex];

      const baseSalary = Number(editPaymentData.baseSalary) || 0;
      const bonus = Number(editPaymentData.bonus) || 0;
      const deductions = Number(editPaymentData.deductions) || 0;
      const netPay = (wp.hourlyWages || 0) + wp.commissionTotal + baseSalary + bonus - deductions;

      updatedPayments[editingPaymentIndex] = {
        ...wp,
        baseSalary,
        bonus,
        deductions,
        netPay
      };

      await updatePayrollRun(selectedRun.id, { workerPayments: updatedPayments });
      
      // Reload details
      const reloaded = await getPayrollRun(selectedRun.id);
      if (reloaded) setSelectedRun(reloaded);
      
      setEditingPaymentIndex(null);
    } catch (err: any) {
      alert('Failed to update worker payroll fields');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h2 className="font-bold text-lg text-[#1A1A1A] flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[#DC2626]" /> Workforce Payroll Runs
        </h2>
        <button 
          onClick={() => setIsNewRunOpen(true)}
          className="bg-[#DC2626] hover:bg-red-700 text-white font-bold px-4 py-2 rounded text-sm flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Calculate New Payroll Run
        </button>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto">
        {loading && runs.length === 0 ? (
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
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <CreditCard className="w-12 h-12 text-gray-300 mb-4" />
            <p className="font-medium text-gray-600">No payroll historical runs found.</p>
            <p className="text-sm text-gray-400">Generate a payroll calculation for current period to start.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Payroll period</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Calculated At</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Staff Count</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Gross Payroll Pay</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Run Status</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {runs.map(run => (
                <tr key={run.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-semibold text-[#1A1A1A]">
                    {run.period.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {run.period.end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="p-4 text-gray-500">
                    {run.createdAt.toLocaleString()}
                  </td>
                  <td className="p-4 font-mono text-center font-bold text-gray-700">
                    {run.workerPayments.length} workers
                  </td>
                  <td className="p-4 font-mono font-bold text-[#1A1A1A]">
                    ${run.totalAmount.toFixed(2)}
                  </td>
                  <td className="p-4">
                    {run.status === 'Draft' && (
                      <span className="inline-flex items-center text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
                        Draft
                      </span>
                    )}
                    {run.status === 'Approved' && (
                      <span className="inline-flex items-center text-xs font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded border border-green-200 uppercase tracking-wider">
                        Approved
                      </span>
                    )}
                    {run.status === 'Paid' && (
                      <span className="inline-flex items-center text-xs font-bold text-gray-600 bg-gray-50 px-2.5 py-0.5 rounded border border-gray-200 uppercase tracking-wider">
                        Paid
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleOpenDetails(run.id)}
                      className="bg-[#1A1A1A] hover:bg-black text-white px-3.5 py-1.5 rounded font-bold text-xs flex items-center gap-1 ml-auto cursor-pointer"
                    >
                      Audit Details <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New Run Wizard Modal */}
      {isNewRunOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-md overflow-hidden border-t-4 border-[#DC2626]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-lg text-[#1A1A1A] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#DC2626]" /> Payroll Calculator
              </h3>
              <button onClick={() => setIsNewRunOpen(false)} className="text-gray-400 hover:text-[#1A1A1A] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRun} className="p-6 space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Aggregates all clock-in shifts (hourly rates) and approved commissions (piece rates) that fall within the selected dates.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">From Date *</label>
                  <input 
                    type="date" required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">To Date *</label>
                  <input 
                    type="date" required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Run Notes</label>
                <textarea 
                  placeholder="e.g. June First Biweekly Run, added extra delivery allowances..."
                  value={runNotes}
                  onChange={(e) => setRunNotes(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] h-20 resize-none"
                />
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 -mx-6 -mb-6">
                <button 
                  type="button"
                  onClick={() => setIsNewRunOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded text-sm font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#DC2626] text-white px-6 py-2 rounded text-sm font-bold hover:bg-red-700 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  Confirm Run <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details / Adjustments Modal */}
      {isDetailsOpen && selectedRun && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-4xl h-[90vh] flex flex-col border-t-4 border-[#DC2626]">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-[#1A1A1A]">
                  Payroll Run Audit Summary
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Period: {selectedRun.period.start.toLocaleDateString()} - {selectedRun.period.end.toLocaleDateString()} | Run Status: <span className="font-bold text-red-600">{selectedRun.status}</span>
                </p>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="text-gray-400 hover:text-[#1A1A1A] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Run Overview Metrics */}
            <div className="grid grid-cols-4 gap-4 p-4 border-b border-gray-100 shrink-0 bg-red-50/20">
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400">Total Run Amount</span>
                <p className="text-lg font-mono font-bold text-gray-900">${selectedRun.totalAmount.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400">Staff Payouts Count</span>
                <p className="text-lg font-mono font-bold text-gray-900">{selectedRun.workerPayments.length} staff</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400">Approved Period Commissions</span>
                <p className="text-lg font-mono font-bold text-green-600">
                  ${selectedRun.workerPayments.reduce((acc, wp) => acc + wp.commissionTotal, 0).toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400">Base & Hourly Wages</span>
                <p className="text-lg font-mono font-bold text-gray-700">
                  ${selectedRun.workerPayments.reduce((acc, wp) => acc + (wp.hourlyWages || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Main scrollable grid of payouts */}
            <div className="flex-1 overflow-auto p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 block">Roster Payments Ledger</h4>
              <div className="border border-gray-200 rounded divide-y divide-gray-100">
                {selectedRun.workerPayments.map((wp, idx) => (
                  <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/40">
                    <div className="min-w-[160px]">
                      <p className="font-bold text-gray-900 text-sm">{wp.workerName}</p>
                      <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Worker Reference</p>
                    </div>

                    <div className="grid grid-cols-5 gap-2 flex-1 text-xs">
                      <div>
                        <span className="text-gray-400">Hourly Wage</span>
                        <p className="font-mono text-gray-900 mt-0.5">${(wp.hourlyWages || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 font-medium text-green-600">Commissions</span>
                        <p className="font-mono text-green-600 font-bold mt-0.5">${wp.commissionTotal.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Base Salary</span>
                        <p className="font-mono text-gray-900 mt-0.5">${(wp.baseSalary || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Bonus</span>
                        <p className="font-mono text-green-600 mt-0.5">+${(wp.bonus || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Deductions</span>
                        <p className="font-mono text-red-600 mt-0.5">-${(wp.deductions || 0).toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-gray-400">Net Pay</span>
                        <p className="font-mono text-sm font-bold text-gray-900">${wp.netPay.toFixed(2)}</p>
                      </div>

                      {selectedRun.status === 'Draft' && (
                        <div className="flex gap-1">
                          {editingPaymentIndex === idx ? (
                            <div className="flex items-center gap-2 bg-gray-50 border p-2 rounded shadow-lg absolute right-4 z-10 max-w-xs">
                              <div className="space-y-1 text-left text-xs">
                                <label className="font-bold">Base Pay</label>
                                <input 
                                  type="number" className="w-full border p-1 rounded"
                                  value={editPaymentData.baseSalary}
                                  onChange={(e) => setEditPaymentData({...editPaymentData, baseSalary: Number(e.target.value)})}
                                />
                                <label className="font-bold">Bonus</label>
                                <input 
                                  type="number" className="w-full border p-1 rounded"
                                  value={editPaymentData.bonus}
                                  onChange={(e) => setEditPaymentData({...editPaymentData, bonus: Number(e.target.value)})}
                                />
                                <label className="font-bold">Deductions</label>
                                <input 
                                  type="number" className="w-full border p-1 rounded"
                                  value={editPaymentData.deductions}
                                  onChange={(e) => setEditPaymentData({...editPaymentData, deductions: Number(e.target.value)})}
                                />
                                <div className="flex gap-1 pt-1.5 justify-end">
                                  <button type="button" onClick={() => setEditingPaymentIndex(null)} className="text-gray-500 font-bold">Cancel</button>
                                  <button type="button" onClick={saveEditPayment} className="text-[#DC2626] font-bold">Save</button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => startEditPayment(idx, wp)}
                              className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded cursor-pointer"
                              title="Modify Pay fields"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer with actions depending on state */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
              <div>
                {selectedRun.status === 'Draft' && (
                  <button 
                    onClick={() => handleDeleteRun(selectedRun.id)}
                    className="text-red-600 hover:text-red-700 font-bold text-sm flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Draft
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsDetailsOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded text-sm font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Close Audit
                </button>
                {selectedRun.status === 'Draft' && (
                  <button 
                    onClick={() => handleApproveRun(selectedRun.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded font-bold text-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Approve Payroll
                  </button>
                )}
                {selectedRun.status === 'Approved' && (
                  <button 
                    onClick={() => handleProcessRun(selectedRun.id)}
                    className="bg-black hover:bg-gray-900 text-white px-5 py-2 rounded font-bold text-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <DollarSign className="w-4 h-4" /> Process & Pay Out
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
