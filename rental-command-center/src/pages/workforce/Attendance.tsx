import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X, Clock, Calendar, Users, Filter, CheckCircle, AlertTriangle, HelpCircle, FileText } from 'lucide-react';
import { getAttendance, getTodayAttendance, addAttendance, updateAttendance, deleteAttendance, Attendance as AttendanceData } from '../../services/attendanceService';
import { getWorkers, Worker } from '../../services/workerService';

export function Attendance() {
  const [attendance, setAttendance] = useState<AttendanceData[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering states
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('All');
  const [search, setSearch] = useState('');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<AttendanceData | null>(null);

  // Single record Form state
  const [formData, setFormData] = useState({
    workerId: '',
    date: new Date().toISOString().split('T')[0],
    checkInTime: '08:00',
    checkOutTime: '',
    status: 'Present' as "Present" | "Absent" | "Late" | "Half Day",
    notes: ''
  });

  // Bulk clock-in state
  const [bulkWorkers, setBulkWorkers] = useState<Record<string, boolean>>({});
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkCheckIn, setBulkCheckIn] = useState('08:00');
  const [bulkStatus, setBulkStatus] = useState<'Present' | 'Late'>('Present');

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [attData, workersData] = await Promise.all([
        getAttendance(selectedMonth),
        getWorkers()
      ]);
      setAttendance(attData);
      setWorkers(workersData.filter(w => w.isActive));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch attendance logs');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingAttendance(null);
    setFormData({
      workerId: workers[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      checkInTime: '08:00',
      checkOutTime: '',
      status: 'Present',
      notes: ''
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (att: AttendanceData) => {
    setEditingAttendance(att);
    
    // Format times for HTML inputs
    const pad = (n: number) => String(n).padStart(2, '0');
    const inTime = `${pad(att.checkIn.getHours())}:${pad(att.checkIn.getMinutes())}`;
    const outTime = att.checkOut ? `${pad(att.checkOut.getHours())}:${pad(att.checkOut.getMinutes())}` : '';

    setFormData({
      workerId: att.workerId,
      date: new Date(att.date).toISOString().split('T')[0],
      checkInTime: inTime,
      checkOutTime: outTime,
      status: att.status,
      notes: att.notes || ''
    });
    setIsFormModalOpen(true);
  };

  const handleOpenBulkModal = () => {
    // Select all active loaders/drivers by default
    const initialSelection: Record<string, boolean> = {};
    workers.forEach(w => {
      initialSelection[w.id] = true;
    });
    setBulkWorkers(initialSelection);
    setBulkDate(new Date().toISOString().split('T')[0]);
    setBulkCheckIn('08:00');
    setBulkStatus('Present');
    setIsBulkModalOpen(true);
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.workerId) {
      alert('Please select a worker');
      return;
    }

    try {
      setLoading(true);
      const worker = workers.find(w => w.id === formData.workerId) || workers.find(w => w.name);
      const workerName = worker ? worker.name : 'Unknown';

      const recordDate = new Date(formData.date);
      
      const [inH, inM] = formData.checkInTime.split(':').map(Number);
      const checkInDate = new Date(recordDate);
      checkInDate.setHours(inH, inM, 0, 0);

      let checkOutDate: Date | undefined = undefined;
      if (formData.checkOutTime) {
        const [outH, outM] = formData.checkOutTime.split(':').map(Number);
        checkOutDate = new Date(recordDate);
        checkOutDate.setHours(outH, outM, 0, 0);
      }

      const payload = {
        workerId: formData.workerId,
        workerName,
        date: recordDate,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        status: formData.status,
        notes: formData.notes
      };

      if (editingAttendance) {
        await updateAttendance(editingAttendance.id, payload);
      } else {
        await addAttendance(payload);
      }
      
      setIsFormModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error saving attendance record');
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedIds = Object.keys(bulkWorkers).filter(id => bulkWorkers[id]);
    if (selectedIds.length === 0) {
      alert('Select at least one worker for bulk clock-in');
      return;
    }

    try {
      setLoading(true);
      const recordDate = new Date(bulkDate);
      const [inH, inM] = bulkCheckIn.split(':').map(Number);
      const checkInDate = new Date(recordDate);
      checkInDate.setHours(inH, inM, 0, 0);

      for (const id of selectedIds) {
        const worker = workers.find(w => w.id === id);
        if (worker) {
          await addAttendance({
            workerId: id,
            workerName: worker.name,
            date: recordDate,
            checkIn: checkInDate,
            status: bulkStatus,
            notes: 'Bulk Checked In'
          });
        }
      }

      setIsBulkModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error processing bulk roster clock-in');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this attendance entry?')) return;
    try {
      setLoading(true);
      await deleteAttendance(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error deleting record');
      setLoading(false);
    }
  };

  // Filter local records list
  const filteredAttendance = attendance.filter(att => {
    const matchesWorker = selectedWorkerId === 'All' || att.workerId === selectedWorkerId;
    const matchesSearch = att.workerName.toLowerCase().includes(search.toLowerCase()) || 
      att.status.toLowerCase().includes(search.toLowerCase()) ||
      (att.notes && att.notes.toLowerCase().includes(search.toLowerCase()));
    return matchesWorker && matchesSearch;
  });

  // Color mappings for different status
  const statusConfig = {
    Present: { bg: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle },
    Late: { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    'Half Day': { bg: 'bg-orange-50 text-orange-700 border-orange-200', icon: AlertTriangle },
    Absent: { bg: 'bg-red-50 text-red-700 border-red-200', icon: HelpCircle }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h2 className="font-bold text-lg text-[#1A1A1A] flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#DC2626]" /> Clock-Ins & Attendance
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={handleOpenBulkModal}
            className="border border-[#DC2626] hover:bg-red-50 text-[#DC2626] font-bold px-4 py-2 rounded text-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4" /> Bulk Clock-In
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="bg-[#DC2626] hover:bg-red-700 text-white font-bold px-4 py-2 rounded text-sm flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Clock In Individual
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 bg-gray-50/50 shrink-0">
        <div className="relative flex-1 min-w-[240px] max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search logs by name, notes..." 
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
            <option value="All">All Workers</option>
            {workers.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table & Body */}
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
        ) : filteredAttendance.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <Clock className="w-12 h-12 text-gray-300 mb-4" />
            <p className="font-medium text-gray-600">No attendance logs found.</p>
            <p className="text-sm text-gray-400">Clock in workers for {selectedMonth} to see reports.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Date</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Worker Name</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Clock In</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Clock Out</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Hours Worked</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Notes</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAttendance.map(att => {
                const config = statusConfig[att.status] || statusConfig.Present;
                const StatusIcon = config.icon;
                return (
                  <tr key={att.id} className="hover:bg-gray-50/50 transition-colors text-sm">
                    <td className="p-4 font-medium text-[#1A1A1A]">
                      {new Date(att.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="p-4 font-semibold text-[#1A1A1A]">{att.workerName}</td>
                    <td className="p-4 font-mono text-[#1A1A1A]">
                      {new Date(att.checkIn).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4 font-mono text-[#1A1A1A]">
                      {att.checkOut ? (
                        new Date(att.checkOut).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                      ) : (
                        <span className="text-amber-600 font-semibold text-xs bg-amber-50 px-2 py-0.5 rounded animate-pulse">On Shift</span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-center">
                      {att.hoursWorked !== undefined ? (
                        <span className="font-bold text-[#1A1A1A]">{att.hoursWorked} hrs</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold border ${config.bg}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {att.status}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 max-w-xs truncate">{att.notes || '-'}</td>
                    <td className="p-4 text-right space-x-1 whitespace-nowrap">
                      <button 
                        onClick={() => handleOpenEditModal(att)}
                        className="p-2 text-gray-600 hover:text-blue-600 rounded-md hover:bg-gray-100 transition-colors inline-flex items-center justify-center cursor-pointer"
                        title="Edit Details"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(att.id)}
                        className="p-2 text-gray-600 hover:text-red-600 rounded-md hover:bg-gray-100 transition-colors inline-flex items-center justify-center cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Manual Add/Edit Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-md overflow-hidden border-t-4 border-[#DC2626]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-lg text-[#1A1A1A]">{editingAttendance ? 'Edit Attendance' : 'Manual Clock In'}</h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-gray-400 hover:text-[#1A1A1A] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSingleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Worker *</label>
                <select
                  disabled={!!editingAttendance}
                  value={formData.workerId}
                  onChange={(e) => setFormData({...formData, workerId: e.target.value})}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] bg-white disabled:bg-gray-100"
                >
                  <option value="" disabled>Select worker</option>
                  {workers.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Date *</label>
                  <input 
                    type="date" required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e: any) => setFormData({...formData, status: e.target.value})}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                  >
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Clock In Time *</label>
                  <input 
                    type="time" required
                    value={formData.checkInTime}
                    onChange={(e) => setFormData({...formData, checkInTime: e.target.value})}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Clock Out Time</label>
                  <input 
                    type="time"
                    value={formData.checkOutTime}
                    onChange={(e) => setFormData({...formData, checkOutTime: e.target.value})}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Shift Notes</label>
                <textarea 
                  placeholder="e.g. Completed delivery crew lead role, traffic delays..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] h-20 resize-none"
                />
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 -mx-6 -mb-6">
                <button 
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded text-sm font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#DC2626] text-white px-6 py-2 rounded text-sm font-bold hover:bg-red-700 cursor-pointer"
                >
                  Confirm Clock-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk clock-in modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-lg overflow-hidden border-t-4 border-[#DC2626]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-lg text-[#1A1A1A] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#DC2626]" /> Bulk Crew Clock-In
              </h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-gray-400 hover:text-[#1A1A1A] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleBulkSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Assignment Date *</label>
                  <input 
                    type="date" required
                    value={bulkDate}
                    onChange={(e) => setBulkDate(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">In Time *</label>
                  <input 
                    type="time" required
                    value={bulkCheckIn}
                    onChange={(e) => setBulkCheckIn(e.target.value)}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-1">Select Personnel on Duty today:</label>
                <div className="border border-gray-200 rounded max-h-48 overflow-auto divide-y divide-gray-150">
                  {workers.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500">No active workers found in system.</p>
                  ) : (
                    workers.map(w => (
                      <label key={w.id} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 cursor-pointer select-none text-sm font-medium">
                        <input 
                          type="checkbox"
                          checked={!!bulkWorkers[w.id]}
                          onChange={(e) => setBulkWorkers({...bulkWorkers, [w.id]: e.target.checked})}
                          className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{w.name}</div>
                          <div className="text-xs text-gray-500 uppercase tracking-wide">{w.role}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Initial Roster Status</label>
                <select
                  value={bulkStatus}
                  onChange={(e: any) => setBulkStatus(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                >
                  <option value="Present">Present (Standard Check-In)</option>
                  <option value="Late">Late Check-In</option>
                </select>
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 -mx-6 -mb-6">
                <button 
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded text-sm font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#DC2626] text-white px-6 py-2 rounded text-sm font-bold hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Execute Bulk Clock-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
