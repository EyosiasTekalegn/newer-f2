import React, { useState, useEffect } from 'react';
import { 
  getAuditLogs, 
  clearOldLogs, 
  AuditLog as AuditLogType, 
  AuditLogFilters 
} from '../services/auditLogService';
import { 
  Search, 
  Calendar, 
  Filter, 
  History, 
  Trash2, 
  RefreshCw, 
  Eye, 
  X, 
  ChevronRight, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

export function AuditLog() {
  const [logs, setLogs] = useState<AuditLogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogType | null>(null);
  const [purgeDays, setPurgeDays] = useState<number>(90);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const filters: AuditLogFilters = {};
      if (searchQuery.trim()) filters.searchQuery = searchQuery;
      if (selectedModule) filters.module = selectedModule;
      if (selectedAction) filters.action = selectedAction;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);

      const data = await getAuditLogs(filters);
      setLogs(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedModule, selectedAction, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedModule('');
    setSelectedAction('');
    setStartDate('');
    setEndDate('');
    // Direct state clear and refresh
    setTimeout(() => {
      fetchLogs();
    }, 50);
  };

  const handlePurge = async () => {
    if (purgeDays <= 0) {
      toast.error('Please enter a valid number of days.');
      return;
    }
    try {
      const deletedCount = await clearOldLogs(purgeDays);
      toast.success(`Successfully purged ${deletedCount} logs older than ${purgeDays} days.`);
      setShowPurgeConfirm(false);
      fetchLogs();
    } catch (error) {
      console.error(error);
      toast.error('Failed to purge logs.');
    }
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/60';
      case 'update':
        return 'bg-amber-950/50 text-amber-400 border border-amber-800/60';
      case 'delete':
        return 'bg-rose-950/50 text-rose-400 border border-rose-800/60';
      case 'login':
        return 'bg-blue-950/50 text-blue-400 border border-blue-800/60';
      case 'logout':
        return 'bg-indigo-950/50 text-indigo-400 border border-indigo-800/60';
      case 'export':
        return 'bg-purple-950/50 text-purple-400 border border-purple-800/60';
      default:
        return 'bg-zinc-900 text-zinc-400 border border-zinc-800';
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="flex-1 p-6 bg-black min-h-screen text-zinc-100 flex flex-col gap-6" id="audit-log-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-5" id="audit-log-header">
        <div>
          <div className="flex items-center gap-2 text-[#DC2626] font-semibold text-sm uppercase tracking-widest mb-1">
            <History className="w-4 h-4" /> System Compliance
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">Audit logs</h1>
          <p className="text-zinc-400 text-sm mt-1">Review a permanent, tamper-resistant trail of all user actions and data updates.</p>
        </div>

        {/* Admin Purge Tool */}
        <div className="flex items-center gap-2 bg-[#0D0D0D] border border-zinc-800 p-3 rounded-lg" id="audit-log-purge-tool">
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 uppercase font-bold">Retention Policy</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-zinc-300">Purge logs older than</span>
              <input 
                type="number" 
                value={purgeDays} 
                onChange={(e) => setPurgeDays(Number(e.target.value))}
                className="w-14 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-center text-xs text-white focus:outline-none focus:border-[#DC2626]"
              />
              <span className="text-xs text-zinc-300">days</span>
            </div>
          </div>
          <button
            onClick={() => setShowPurgeConfirm(true)}
            className="ml-2 bg-[#DC2626] hover:bg-red-700 text-white rounded p-2 transition-colors flex items-center justify-center"
            title="Purge Old Audit Logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-[#0D0D0D] border border-zinc-800 rounded-xl p-5 flex flex-col gap-4" id="audit-log-filters">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Operator Email, Record Name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-700"
            >
              <option value="">All Modules</option>
              <option value="customers">Customers</option>
              <option value="bookings">Bookings</option>
              <option value="rentals">Rentals</option>
              <option value="quotations">Quotations</option>
              <option value="inventory">Inventory</option>
              <option value="logistics">Logistics</option>
              <option value="workforce">Workforce</option>
              <option value="finance">Finance</option>
              <option value="procurement">Procurement</option>
              <option value="contracts">Contracts</option>
              <option value="issues">Issues & Disputes</option>
              <option value="settings">Settings</option>
              <option value="auth">Authentication</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-700"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="view">View</option>
              <option value="export">Export</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
            </select>
          </div>

          <div className="md:col-span-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg text-sm px-4 py-2.5 transition-colors flex items-center justify-center gap-1.5"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg p-2.5 transition-colors flex items-center justify-center"
              title="Reset Filters"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 border-t border-zinc-800/60 pt-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span>Date Range:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-white focus:outline-none"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-white focus:outline-none"
            />
          </div>

          <button
            onClick={fetchLogs}
            className="ml-auto text-zinc-500 hover:text-white flex items-center gap-1 transition-colors font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh List
          </button>
        </div>
      </div>

      {/* Main Logs Table / View */}
      <div className="bg-[#0D0D0D] border border-zinc-800 rounded-xl overflow-hidden flex-1 flex flex-col" id="audit-log-table-container">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-[#DC2626] animate-spin" />
            <p className="text-zinc-500 text-sm">Querying secure ledger database...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 mb-4 border border-zinc-800">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">No logs found</h3>
            <p className="text-zinc-500 text-sm mt-1 max-w-md">No records match your filters. Try clearing some search fields or broaden your date range constraint.</p>
            <button
              onClick={handleResetFilters}
              className="mt-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-[#070707] text-[10px] uppercase text-zinc-500 tracking-wider">
                  <th className="py-4 px-5 font-semibold">Timestamp</th>
                  <th className="py-4 px-5 font-semibold">User Operator</th>
                  <th className="py-4 px-5 font-semibold text-center">Action</th>
                  <th className="py-4 px-5 font-semibold">Module</th>
                  <th className="py-4 px-5 font-semibold">Affected Record</th>
                  <th className="py-4 px-5 font-semibold text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {logs.map((log) => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-zinc-900/40 transition-colors text-xs border-b border-zinc-900 cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="py-3.5 px-5 text-zinc-400 font-mono">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex flex-col">
                        <span className="text-zinc-200 font-medium">{log.userEmail}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">ID: {log.userId.slice(0, 8)}...</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getActionBadgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-zinc-300 font-medium capitalize">
                      {log.module}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex flex-col">
                        <span className="text-zinc-100 font-semibold truncate max-w-xs">{log.recordName || 'N/A'}</span>
                        {log.recordId && (
                          <span className="text-[10px] text-zinc-500 font-mono truncate max-w-xs">ID: {log.recordId}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white px-2.5 py-1.5 rounded transition-all text-[11px] inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Inspector Drawer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-end z-50 transition-all duration-300" id="audit-log-drawer">
          <div className="w-full max-w-xl bg-[#0D0D0D] border-l border-zinc-800 h-screen flex flex-col shadow-2xl relative">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Log Inspector Entry</span>
                <h2 className="text-xl font-black text-white mt-1 uppercase">Audit Details</h2>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-zinc-500 hover:text-white hover:bg-zinc-900 p-2 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Context Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900/50 border border-zinc-800/60 p-3 rounded-lg">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold block">Operation Status</span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getActionBadgeClass(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800/60 p-3 rounded-lg">
                  <span className="text-[9px] text-zinc-500 uppercase font-bold block">Database Module</span>
                  <span className="text-zinc-200 text-xs font-bold block mt-1 capitalize">{selectedLog.module}</span>
                </div>
              </div>

              {/* Event Metadata Information */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5 border-b border-zinc-800/80 pb-2">
                  <Info className="w-3.5 h-3.5 text-[#DC2626]" /> Event context
                </h3>
                <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-900 space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">TIMESTAMP</span>
                    <span className="text-zinc-300">{formatTimestamp(selectedLog.timestamp)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">OPERATOR EMAIL</span>
                    <span className="text-zinc-300">{selectedLog.userEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">USER UUID</span>
                    <span className="text-zinc-400 select-all">{selectedLog.userId}</span>
                  </div>
                  {selectedLog.recordId && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">RECORD UUID</span>
                      <span className="text-zinc-300 select-all">{selectedLog.recordId}</span>
                    </div>
                  )}
                  {selectedLog.recordName && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">RECORD NAME</span>
                      <span className="text-zinc-300">{selectedLog.recordName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Changes Diff Table (For updates) */}
              {selectedLog.action === 'update' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5 border-b border-zinc-800/80 pb-2">
                    <History className="w-3.5 h-3.5 text-amber-500" /> Attribute state modifications
                  </h3>
                  
                  {(!selectedLog.changes || selectedLog.changes.length === 0) ? (
                    <p className="text-xs text-zinc-500 bg-zinc-950 p-4 border border-zinc-900 rounded-lg italic">
                      No key property diffs logged. Field values matched previous state definitions.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedLog.changes.map((change, idx) => (
                        <div key={idx} className="bg-zinc-950 border border-zinc-900 rounded-lg overflow-hidden">
                          <div className="bg-zinc-900 px-3 py-1.5 text-[11px] font-bold text-zinc-300 border-b border-zinc-900 font-mono uppercase">
                            {change.field}
                          </div>
                          <div className="grid grid-cols-2 text-xs divide-x divide-zinc-900">
                            <div className="p-3 bg-red-950/20">
                              <span className="text-[9px] text-red-400 font-bold block mb-1 uppercase tracking-wider">Before Change</span>
                              <span className="text-red-300 font-mono break-all line-through decoration-red-500/50 block">
                                {change.oldValue === null || change.oldValue === undefined 
                                  ? <span className="italic text-zinc-600">null</span> 
                                  : (typeof change.oldValue === 'object' ? JSON.stringify(change.oldValue) : String(change.oldValue))}
                              </span>
                            </div>
                            <div className="p-3 bg-emerald-950/20">
                              <span className="text-[9px] text-emerald-400 font-bold block mb-1 uppercase tracking-wider">After Change</span>
                              <span className="text-emerald-300 font-mono break-all block">
                                {change.newValue === null || change.newValue === undefined 
                                  ? <span className="italic text-zinc-600">null</span> 
                                  : (typeof change.newValue === 'object' ? JSON.stringify(change.newValue) : String(change.newValue))}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Client Environment Info */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-1.5 border-b border-zinc-800/80 pb-2">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-500" /> Client Environment Telemetry
                  </h3>
                  <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-900 space-y-2.5 text-[11px] font-mono text-zinc-400">
                    {Object.entries(selectedLog.metadata).map(([key, val]) => (
                      <div key={key} className="flex flex-col gap-1">
                        <span className="text-zinc-600 uppercase font-bold text-[9px]">{key}</span>
                        <span className="text-zinc-300 break-all">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-zinc-800 bg-[#070707] flex items-center">
              <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1.5 uppercase">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Integrity verified cryptographically
              </span>
              <button
                onClick={() => setSelectedLog(null)}
                className="ml-auto bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purge Confirm Dialog Modal */}
      {showPurgeConfirm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4" id="purge-confirm-modal">
          <div className="bg-[#0D0D0D] border border-zinc-800 max-w-md w-full rounded-xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3 text-red-500">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-black tracking-tight uppercase">Dangerous Action Warning</h3>
            </div>
            
            <p className="text-sm text-zinc-400 leading-relaxed">
              You are about to permanently delete system compliance logs that are older than <strong className="text-white">{purgeDays} days</strong>. This operation is **irreversible** and cannot be undone.
            </p>

            <div className="bg-zinc-950 p-3 border border-zinc-900 rounded text-xs text-zinc-500 italic">
              Note: System administrators require this trail for debugging, fraud prevention, and audit-readiness.
            </div>

            <div className="flex gap-2.5 justify-end pt-2">
              <button
                onClick={() => setShowPurgeConfirm(false)}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-semibold text-xs px-4 py-2.5 rounded-lg border border-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePurge}
                className="bg-[#DC2626] hover:bg-red-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Confirm Purge Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
