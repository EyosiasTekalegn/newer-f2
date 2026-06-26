import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, X, AlertTriangle } from 'lucide-react';
import { Customer, getCustomers, addCustomer, updateCustomer, deleteCustomer } from '../services/customerService';
import { getIssues } from '../services/issueService';
import { useNavigate } from 'react-router-dom';

export function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const [data, issuesData] = await Promise.all([
        getCustomers(),
        getIssues()
      ]);
      setCustomers(data);
      setIssues(issuesData || []);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching customers:", err);
      setError(err.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', email: '', address: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, formData);
      } else {
        await addCustomer(formData);
      }
      await fetchCustomers();
      closeModal();
    } catch (err: any) {
      console.error("Error saving customer:", err);
      alert('Failed to save customer. Please check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await deleteCustomer(id);
        await fetchCustomers();
      } catch (err) {
        console.error("Error deleting customer:", err);
        alert('Failed to delete customer.');
      }
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white border border-gray-200 rounded shadow-sm">
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gray-50/50">
        <h2 className="font-bold text-lg text-gray-800">Customers</h2>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search customers..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] transition-colors"
            />
          </div>
          <button 
            onClick={openAddModal}
            className="flex items-center gap-2 bg-[#DC2626] text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-red-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            New Customer
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DC2626]"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-600 font-medium">
            {error}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>No customers found.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-white sticky top-0 z-10 shadow-sm">
              <tr className="border-b border-gray-200">
                <th className="p-4 text-xs uppercase font-bold text-gray-500 tracking-wider">Name</th>
                <th className="p-4 text-xs uppercase font-bold text-gray-500 tracking-wider">Contact Details</th>
                <th className="p-4 text-xs uppercase font-bold text-gray-500 tracking-wider">Address</th>
                <th className="p-4 text-xs uppercase font-bold text-gray-500 tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{customer.name}</span>
                      {issues.filter(i => i.customerId === customer.id && i.status !== 'closed' && i.status !== 'resolved').length > 0 && (
                        <span 
                          onClick={() => navigate('/issues')}
                          className="cursor-pointer inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-mono font-bold animate-pulse"
                          title="Active outstanding dispute logged! Click to navigate to review."
                        >
                          <AlertTriangle className="w-2.5 h-2.5" /> DISPUTE
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">
                    <div>{customer.email}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{customer.phone}</div>
                  </td>
                  <td className="p-4 text-gray-600 truncate max-w-[200px]" title={customer.address}>
                    {customer.address || '-'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openEditModal(customer)}
                        className="p-1.5 text-gray-400 hover:text-[#DC2626] hover:bg-red-50 rounded transition-colors"
                        title="Edit Customer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(customer.id, customer.name)}
                        className="p-1.5 text-gray-400 hover:text-[#DC2626] hover:bg-red-50 rounded transition-colors"
                        title="Delete Customer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-lg text-gray-900">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button 
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input 
                  type="text" 
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                  placeholder="John Doe"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <input 
                    type="email" 
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Phone
                  </label>
                  <input 
                    type="tel" 
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                    placeholder="+1 234 567 890"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Address
                </label>
                <textarea 
                  name="address"
                  rows={3}
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] resize-none"
                  placeholder="123 Main St, City, Country"
                />
              </div>
              
              <div className="mt-4 flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#DC2626] text-white px-6 py-2 rounded text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
