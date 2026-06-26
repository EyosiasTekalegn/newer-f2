import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X, Phone, Mail, DollarSign, Calendar, Users, Briefcase, CheckCircle, XCircle } from 'lucide-react';
import { getWorkers, addWorker, updateWorker, deleteWorker, Worker } from '../../services/workerService';

export function Workers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'loader' as "driver" | "loader" | "unloader" | "supervisor" | "admin",
    hourlyRate: 0,
    pieceRate: 0,
    isActive: true,
    joinDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWorkers();
      setWorkers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch workers list');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingWorker(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      role: 'loader',
      hourlyRate: 0,
      pieceRate: 0,
      isActive: true,
      joinDate: new Date().toISOString().split('T')[0]
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData({
      name: worker.name,
      phone: worker.phone,
      email: worker.email || '',
      role: worker.role,
      hourlyRate: worker.hourlyRate || 0,
      pieceRate: worker.pieceRate || 0,
      isActive: worker.isActive,
      joinDate: new Date(worker.joinDate).toISOString().split('T')[0]
    });
    setIsFormModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert('Name and Phone are required');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        joinDate: new Date(formData.joinDate),
        hourlyRate: Number(formData.hourlyRate) || 0,
        pieceRate: Number(formData.pieceRate) || 0
      };

      if (editingWorker) {
        await updateWorker(editingWorker.id, payload);
      } else {
        await addWorker(payload);
      }
      setIsFormModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to save worker');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this worker from records?')) return;
    try {
      setLoading(true);
      await deleteWorker(id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete worker');
      setLoading(false);
    }
  };

  const filteredWorkers = workers.filter(w => 
    w.name.toLowerCase().includes(search.toLowerCase()) || 
    w.phone.includes(search) || 
    w.role.toLowerCase().includes(search.toLowerCase()) ||
    (w.email && w.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <h2 className="font-bold text-lg text-[#1A1A1A] flex items-center gap-2">
          <Users className="w-5 h-5 text-[#DC2626]" /> Workforce Management
        </h2>
        <button 
          onClick={handleOpenAddModal}
          className="bg-[#DC2626] hover:bg-red-700 text-white font-bold px-4 py-2 rounded text-sm flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Worker
        </button>
      </div>

      {/* Filter and Search */}
      <div className="p-4 border-b border-gray-100 flex gap-4 bg-gray-50/50 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search workers by name, email, role or phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#DC2626]"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <XCircle className="w-12 h-12 text-[#DC2626] mb-4" />
            <p className="text-[#DC2626] font-medium mb-4">{error}</p>
            <button onClick={fetchData} className="bg-[#1A1A1A] text-white px-4 py-2 rounded font-bold hover:bg-black cursor-pointer">
              Retry
            </button>
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <Users className="w-12 h-12 text-gray-300 mb-4" />
            <p className="font-medium text-gray-600">No workforce personnel found.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Worker Details</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Role</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Hourly Rate</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Piece Rate</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider">Join Date</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-center">Status</th>
                <th className="p-4 text-xs font-bold uppercase text-gray-500 tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredWorkers.map(worker => (
                <tr key={worker.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-[#1A1A1A]">{worker.name}</div>
                    <div className="text-xs text-gray-500 flex flex-col gap-0.5 mt-1">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {worker.phone}</span>
                      {worker.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {worker.email}</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center bg-gray-100 text-gray-800 text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded">
                      {worker.role}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-sm text-[#1A1A1A]">
                    ${worker.hourlyRate !== undefined ? worker.hourlyRate.toFixed(2) : '0.00'}/hr
                  </td>
                  <td className="p-4 font-mono text-sm text-[#1A1A1A]">
                    ${worker.pieceRate !== undefined ? worker.pieceRate.toFixed(2) : '0.00'}/item
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {new Date(worker.joinDate).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {worker.isActive ? (
                      <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2.5 py-0.5 rounded text-xs font-bold">
                        <CheckCircle className="w-3.5 h-3.5 text-green-600" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-50 px-2.5 py-0.5 rounded text-xs font-bold">
                        <XCircle className="w-3.5 h-3.5 text-gray-400" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-1 whitespace-nowrap">
                    <button 
                      onClick={() => handleOpenEditModal(worker)}
                      className="p-2 text-gray-600 hover:text-blue-600 rounded-md hover:bg-gray-100 transition-colors inline-flex items-center justify-center cursor-pointer"
                      title="Edit details"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(worker.id)}
                      className="p-2 text-gray-600 hover:text-red-600 rounded-md hover:bg-gray-100 transition-colors inline-flex items-center justify-center cursor-pointer"
                      title="Delete profile"
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

      {/* Worker Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow-xl w-full max-w-md overflow-hidden border-t-4 border-[#DC2626]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-lg text-[#1A1A1A]">{editingWorker ? 'Edit Worker Profile' : 'Add New Worker'}</h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-gray-400 hover:text-[#1A1A1A] transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Full Name *</label>
                <input 
                  type="text" required
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Phone Number *</label>
                  <input 
                    type="text" required
                    placeholder="e.g. +1 555-0199"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</label>
                  <input 
                    type="email"
                    placeholder="e.g. john@rentals.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Hourly Rate ($) *</label>
                  <input 
                    type="number" min="0" step="0.01" required
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({...formData, hourlyRate: Number(e.target.value)})}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Piece Rate ($/item) *</label>
                  <input 
                    type="number" min="0" step="0.01" required
                    value={formData.pieceRate}
                    onChange={(e) => setFormData({...formData, pieceRate: Number(e.target.value)})}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Workforce Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e: any) => setFormData({...formData, role: e.target.value})}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                  >
                    <option value="driver">Driver</option>
                    <option value="loader">Loader / Offloader</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Join Date *</label>
                  <input 
                    type="date" required
                    value={formData.joinDate}
                    onChange={(e) => setFormData({...formData, joinDate: e.target.value})}
                    className="w-full p-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Status</label>
                <div className="flex items-center gap-4 py-2">
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                      className="rounded border-gray-300 text-[#DC2626] focus:ring-[#DC2626]"
                    />
                    Active for Assignments
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 -mx-6 -mb-6">
                <button 
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#DC2626] text-white px-6 py-2 rounded text-sm font-bold hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
