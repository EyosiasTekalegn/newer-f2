import React, { useState, useEffect } from 'react';
import {
  getIssues,
  getIssue,
  addIssue,
  updateIssue,
  deleteIssue,
  getComments,
  addComment,
  deleteComment,
  resolveIssue,
  closeIssue,
  escalateIssue,
  uploadIssueAttachment,
  Issue,
  IssueComment
} from '../services/issueService';
import { getCustomers } from '../services/customerService';
import { getActiveRentals, Rental } from '../services/rentalService';
import { getBookings, Booking } from '../services/bookingService';
import { getContracts, Contract } from '../services/contractService';
import {
  Search,
  Filter,
  Plus,
  X,
  AlertTriangle,
  Loader2,
  Paperclip,
  Check,
  TrendingUp,
  MessageSquare,
  User,
  Trash2,
  Wrench,
  Clock,
  Shield,
  FileCheck
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

export function IssuesDisputes() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

  // Selected Issue & Comments
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isCommentInternal, setIsCommentInternal] = useState(true);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);

  // New Issue Form State
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newRentalId, setNewRentalId] = useState('');
  const [newBookingId, setNewBookingId] = useState('');
  const [newContractId, setNewContractId] = useState('');
  const [newCategory, setNewCategory] = useState<Issue['category']>('customer_complaint');
  const [newPriority, setNewPriority] = useState<Issue['priority']>('medium');
  const [newDescription, setNewDescription] = useState('');
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resolution Form State
  const [resolutionText, setResolutionText] = useState('');

  // Edit Form State
  const [editCategory, setEditCategory] = useState<Issue['category']>('customer_complaint');
  const [editPriority, setEditPriority] = useState<Issue['priority']>('medium');
  const [editStatus, setEditStatus] = useState<Issue['status']>('open');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [issuesData, customersData, rentalsData, bookingsData, contractsData] = await Promise.all([
        getIssues(),
        getCustomers() as any,
        getActiveRentals(),
        getBookings(),
        getContracts()
      ]);
      setIssues(issuesData);
      setCustomers(customersData || []);
      setRentals(rentalsData || []);
      setBookings(bookingsData || []);
      setContracts(contractsData || []);
    } catch (err: any) {
      console.error("Error loading issues list:", err);
      setError(err.message || 'Failed to fetch issues database.');
    } finally {
      setIsLoading(false);
    }
  };

  const reloadIssues = async () => {
    try {
      const data = await getIssues();
      setIssues(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Auto-populate customer from selected booking/rental/contract
  const handleBookingChange = (bId: string) => {
    setNewBookingId(bId);
    if (bId) {
      const booking = bookings.find(b => b.id === bId);
      if (booking) setNewCustomerId(booking.customerId);
    }
  };

  const handleRentalChange = (rId: string) => {
    setNewRentalId(rId);
    if (rId) {
      const rental = rentals.find(r => r.id === rId);
      if (rental) setNewCustomerId(rental.customerId);
    }
  };

  const handleContractChange = (cId: string) => {
    setNewContractId(cId);
    if (cId) {
      const contract = contracts.find(c => c.id === cId);
      if (contract) setNewCustomerId(contract.customerId);
    }
  };

  const handleFileUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadFiles(Array.from(e.target.files));
    }
  };

  const handleNewIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerId) {
      alert("Please select a customer.");
      return;
    }
    if (!newDescription.trim()) {
      alert("Please provide a description of the issue.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const customer = customers.find(c => c.id === newCustomerId);
      if (!customer) throw new Error("Selected customer not found in records.");

      // Upload files to Storage if any
      const attachmentUrls: string[] = [];
      for (const file of uploadFiles) {
        const url = await uploadIssueAttachment(file, file.name);
        attachmentUrls.push(url);
      }

      const rawIssue: Omit<Issue, 'id' | 'issueNumber' | 'createdAt' | 'updatedAt'> = {
        customerId: newCustomerId,
        customerName: customer.name,
        bookingId: newBookingId || undefined,
        rentalId: newRentalId || undefined,
        contractId: newContractId || undefined,
        category: newCategory,
        priority: newPriority,
        status: "open",
        description: newDescription,
        attachments: attachmentUrls
      };

      await addIssue(rawIssue);
      await reloadIssues();
      
      // Reset Form and close
      setIsNewModalOpen(false);
      setNewCustomerId('');
      setNewBookingId('');
      setNewRentalId('');
      setNewContractId('');
      setNewDescription('');
      setUploadFiles([]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to log the dispute.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenViewModal = async (issue: Issue) => {
    setSelectedIssue(issue);
    setIsViewModalOpen(true);
    setComments([]);
    
    // Load Comments
    try {
      const commentsList = await getComments(issue.id);
      setComments(commentsList);
    } catch (err) {
      console.error("Error loading issue comments:", err);
    }
  };

  const handleAddCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !newCommentText.trim()) return;

    setIsCommentSubmitting(true);
    try {
      const commentData = {
        userId: 'staff_agent',
        userName: 'Staff Representative',
        comment: newCommentText.trim(),
        isInternal: isCommentInternal
      };

      await addComment(selectedIssue.id, commentData);
      
      // Reload comments
      const updatedComments = await getComments(selectedIssue.id);
      setComments(updatedComments);
      setNewCommentText('');
    } catch (err) {
      console.error("Failed to post comment:", err);
      alert("Failed to submit comment.");
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedIssue) return;
    if (!window.confirm("Delete this comment?")) return;

    try {
      await deleteComment(selectedIssue.id, commentId);
      setComments(comments.filter(c => c.id !== commentId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !resolutionText.trim()) return;

    setIsSubmitting(true);
    try {
      await resolveIssue(selectedIssue.id, resolutionText.trim());
      await reloadIssues();
      
      // Update local view
      const updated = await getIssue(selectedIssue.id);
      if (updated) setSelectedIssue(updated);
      
      setIsResolveModalOpen(false);
      setResolutionText('');
    } catch (err) {
      console.error(err);
      alert("Failed to resolve the issue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseIssue = async () => {
    if (!selectedIssue) return;
    if (!window.confirm("Are you sure you want to CLOSE this issue/dispute?")) return;

    try {
      await closeIssue(selectedIssue.id);
      await reloadIssues();
      const updated = await getIssue(selectedIssue.id);
      if (updated) setSelectedIssue(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEscalateIssue = async () => {
    if (!selectedIssue) return;
    if (!window.confirm("Escalate this dispute to management?")) return;

    try {
      await escalateIssue(selectedIssue.id);
      await reloadIssues();
      const updated = await getIssue(selectedIssue.id);
      if (updated) setSelectedIssue(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEditModal = () => {
    if (!selectedIssue) return;
    setEditCategory(selectedIssue.category);
    setEditPriority(selectedIssue.priority);
    setEditStatus(selectedIssue.status);
    setEditDescription(selectedIssue.description);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;

    setIsSubmitting(true);
    try {
      await updateIssue(selectedIssue.id, {
        category: editCategory,
        priority: editPriority,
        status: editStatus,
        description: editDescription
      });
      await reloadIssues();
      
      const updated = await getIssue(selectedIssue.id);
      if (updated) setSelectedIssue(updated);
      setIsEditModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update dispute information.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteIssue = async (id: string) => {
    if (!window.confirm("Are you absolutely sure you want to delete this dispute? This will clear all comments.")) return;

    try {
      await deleteIssue(id);
      setIssues(issues.filter(i => i.id !== id));
      setIsViewModalOpen(false);
      setSelectedIssue(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete dispute.");
    }
  };

  // Filtering Logic
  const filteredIssues = issues.filter(i => {
    const matchesSearch = 
      i.issueNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.description && i.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || i.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || i.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  return (
    <div className="p-6 bg-zinc-950 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <AlertTriangle className="text-[#DC2626]" /> Issues & Disputes Log
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Track operational errors, damaged variant claims, missing returns, or pricing disputes.
          </p>
        </div>
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition duration-200"
          id="log-issue-btn"
        >
          <Plus size={16} /> Log New Dispute
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
          <div className="text-zinc-500 text-[10px] font-mono uppercase">TOTAL DISPUTES</div>
          <div className="text-xl md:text-2xl font-bold mt-1">{issues.length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
          <div className="text-red-500 text-[10px] font-mono uppercase">OPEN ISSUES</div>
          <div className="text-xl md:text-2xl font-bold mt-1 text-red-500">
            {issues.filter(i => i.status === 'open').length}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
          <div className="text-yellow-500 text-[10px] font-mono uppercase">IN PROGRESS</div>
          <div className="text-xl md:text-2xl font-bold mt-1 text-yellow-500">
            {issues.filter(i => i.status === 'in_progress').length}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
          <div className="text-[#A78BFA] text-[10px] font-mono uppercase">ESCALATED</div>
          <div className="text-xl md:text-2xl font-bold mt-1 text-[#A78BFA]">
            {issues.filter(i => i.status === 'escalated').length}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg col-span-2 md:col-span-1">
          <div className="text-emerald-500 text-[10px] font-mono uppercase">RESOLVED / CLOSED</div>
          <div className="text-xl md:text-2xl font-bold mt-1 text-emerald-500">
            {issues.filter(i => i.status === 'resolved' || i.status === 'closed').length}
          </div>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative col-span-1 md:col-span-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search issue # or customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#DC2626] transition"
            id="issue-search"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-mono">STATUS:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#DC2626]"
            id="issue-status-filter"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-mono">PRIORITY:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#DC2626]"
            id="issue-priority-filter"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-mono">CATEGORY:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#DC2626]"
            id="issue-category-filter"
          >
            <option value="all">All Categories</option>
            <option value="damage">Damage Claim</option>
            <option value="missing">Missing Items</option>
            <option value="payment">Billing / Payment</option>
            <option value="delivery">Logistics / Delivery</option>
            <option value="return">Logistics / Return</option>
            <option value="customer_complaint">Customer Complaint</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Main Table / Logs Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-[#DC2626] mb-4" size={40} />
          <p className="text-zinc-400 text-sm">Synchronizing dispute logs...</p>
        </div>
      ) : error ? (
        <div className="bg-red-950/30 border border-red-900 rounded-lg p-6 text-center max-w-xl mx-auto my-10">
          <AlertTriangle className="text-[#DC2626] mx-auto mb-4" size={36} />
          <h3 className="text-lg font-bold text-white mb-2">Failed to Sync Logs</h3>
          <p className="text-zinc-400 text-sm mb-4">{error}</p>
          <button
            onClick={fetchInitialData}
            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 py-2 rounded-md font-medium text-sm transition"
          >
            Retry Sync
          </button>
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-lg py-20 text-center bg-zinc-900/10">
          <AlertTriangle className="text-zinc-700 mx-auto mb-4" size={48} />
          <h3 className="text-lg font-medium text-white mb-1">No operational disputes logged</h3>
          <p className="text-zinc-500 text-sm max-w-md mx-auto mb-6">
            All services are currently green! Register claims here if items are lost, damaged, or delayed.
          </p>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 py-2 rounded-md font-medium text-sm inline-flex items-center gap-2"
          >
            <Plus size={16} /> Log Dispute
          </button>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 text-xs font-mono">
                <th className="p-4">Issue Number</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Category</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Status</th>
                <th className="p-4">Logged Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-sm">
              {filteredIssues.map((issue) => (
                <tr key={issue.id} className="hover:bg-zinc-900/40 transition">
                  <td className="p-4 font-mono text-zinc-300 font-medium flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      issue.status === 'open' ? 'bg-red-500 animate-pulse' :
                      issue.status === 'in_progress' ? 'bg-yellow-500' :
                      issue.status === 'escalated' ? 'bg-purple-500' :
                      'bg-zinc-600'
                    }`} />
                    {issue.issueNumber}
                  </td>
                  <td className="p-4 font-medium text-white">{issue.customerName}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                      issue.category === 'damage' ? 'bg-red-500/10 text-red-400' :
                      issue.category === 'missing' ? 'bg-orange-500/10 text-orange-400' :
                      issue.category === 'payment' ? 'bg-blue-500/10 text-blue-400' :
                      issue.category === 'delivery' ? 'bg-cyan-500/10 text-cyan-400' :
                      issue.category === 'return' ? 'bg-purple-500/10 text-purple-400' :
                      issue.category === 'customer_complaint' ? 'bg-pink-500/10 text-pink-400' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>
                      {issue.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      issue.priority === 'low' ? 'bg-zinc-800 text-zinc-400' :
                      issue.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                      issue.priority === 'high' ? 'bg-orange-500/10 text-orange-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {issue.priority}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      issue.status === 'open' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      issue.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                      issue.status === 'escalated' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                      issue.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>
                      {issue.status}
                    </span>
                  </td>
                  <td className="p-4 text-zinc-400">{issue.createdAt.toLocaleDateString()}</td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenViewModal(issue)}
                      className="p-1.5 hover:bg-zinc-800 rounded-md text-[#DC2626] hover:text-red-400 font-semibold text-xs flex items-center gap-1 transition"
                    >
                      <MessageSquare size={14} /> Review
                    </button>
                    <button
                      onClick={() => handleDeleteIssue(issue.id)}
                      className="p-1.5 hover:bg-red-950/40 rounded-md text-zinc-500 hover:text-red-400 transition"
                      title="Delete log"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- MODAL 1: LOG NEW DISPUTE --- */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-lg shadow-xl overflow-hidden">
            <div className="border-b border-zinc-800 p-4 flex justify-between items-center bg-zinc-950">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="text-[#DC2626]" /> Log Customer Dispute
              </h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-zinc-500 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleNewIssueSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Optional reference linkage dropdowns */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Booking Link</label>
                  <select
                    value={newBookingId}
                    onChange={(e) => handleBookingChange(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-1.5 text-xs text-white focus:outline-none focus:border-[#DC2626]"
                  >
                    <option value="">-- None --</option>
                    {bookings.map(b => (
                      <option key={b.id} value={b.id}>{b.id.substring(0,6)} ({b.customerName.split(' ')[0]})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Rental Link</label>
                  <select
                    value={newRentalId}
                    onChange={(e) => handleRentalChange(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-1.5 text-xs text-white focus:outline-none focus:border-[#DC2626]"
                  >
                    <option value="">-- None --</option>
                    {rentals.map(r => (
                      <option key={r.id} value={r.id}>{r.id.substring(0,6)} ({r.customerName.split(' ')[0]})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Contract Link</label>
                  <select
                    value={newContractId}
                    onChange={(e) => handleContractChange(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-1.5 text-xs text-white focus:outline-none focus:border-[#DC2626]"
                  >
                    <option value="">-- None --</option>
                    {contracts.map(c => (
                      <option key={c.id} value={c.id}>{c.id.substring(0,6)} ({c.customerName.split(' ')[0]})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Customer Selector */}
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">Target Customer *</label>
                <select
                  value={newCustomerId}
                  onChange={(e) => setNewCustomerId(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#DC2626]"
                  id="issue-customer-select"
                >
                  <option value="">-- Select Customer Account --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                  ))}
                </select>
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="damage">Damage Claim</option>
                    <option value="missing">Missing Return</option>
                    <option value="payment">Billing Dispute</option>
                    <option value="delivery">Logistics / Delivery</option>
                    <option value="return">Logistics / Return</option>
                    <option value="customer_complaint">Customer Complaint</option>
                    <option value="other">Other Incident</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">Dispute Case Details *</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={4}
                  required
                  placeholder="Clearly describe the damage, missing quantity or logistic delays reported..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#DC2626]"
                  id="issue-description-input"
                />
              </div>

              {/* Uploads */}
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">Damage / Incident Photos (Attachments)</label>
                <div className="border border-dashed border-zinc-800 rounded-md p-4 text-center bg-zinc-950 relative hover:border-zinc-700 transition">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUploadChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    id="issue-attachments"
                  />
                  <Paperclip className="mx-auto text-zinc-500 mb-2" size={20} />
                  <span className="text-xs text-zinc-400 block font-semibold">Drag & Drop or Click to Select File</span>
                  <span className="text-[10px] text-zinc-600 font-mono mt-1 block">Maximum upload limits 5MB per file</span>
                </div>
                {uploadFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] text-zinc-500 uppercase font-mono font-bold">Selected files:</p>
                    {uploadFiles.map((f, idx) => (
                      <p key={idx} className="text-xs text-zinc-300 font-mono truncate">{f.name} ({(f.size/1024).toFixed(0)} KB)</p>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-zinc-800 pt-4 flex justify-end gap-2 bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-md text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-50 text-white px-5 py-2 rounded-md text-xs font-semibold flex items-center gap-1 transition"
                  id="save-issue-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> Storing...
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Log Dispute Case
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: VIEW DISPUTE & COMMENTS --- */}
      {isViewModalOpen && selectedIssue && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl rounded-lg shadow-2xl overflow-hidden flex flex-col h-[90vh]">
            <div className="border-b border-zinc-800 p-4 flex justify-between items-center bg-zinc-950">
              <div>
                <h3 className="text-md font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="text-[#DC2626]" /> {selectedIssue.issueNumber} Review Dashboard
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Customer: {selectedIssue.customerName} • Category: {selectedIssue.category.toUpperCase()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleOpenEditModal}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded text-xs font-semibold"
                >
                  Edit details
                </button>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="text-zinc-500 hover:text-white transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-zinc-950">
              {/* Left Column: Issue Parameters & Actions */}
              <div className="w-full md:w-96 border-r border-zinc-800 p-6 space-y-4 overflow-y-auto">
                <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 space-y-3">
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                    <span className="text-xs font-mono text-zinc-500 uppercase">Current Status</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      selectedIssue.status === 'open' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      selectedIssue.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-400' :
                      selectedIssue.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' :
                      selectedIssue.status === 'escalated' ? 'bg-purple-500/10 text-purple-400' :
                      'bg-zinc-800 text-zinc-400'
                    }`}>
                      {selectedIssue.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                    <span className="text-xs font-mono text-zinc-500 uppercase">Case Priority</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      selectedIssue.priority === 'low' ? 'bg-zinc-800 text-zinc-400' :
                      selectedIssue.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                      selectedIssue.priority === 'high' ? 'bg-orange-500/10 text-orange-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {selectedIssue.priority.toUpperCase()}
                    </span>
                  </div>

                  {selectedIssue.rentalId && (
                    <div className="text-xs flex justify-between">
                      <span className="text-zinc-500">Rental Reference:</span>
                      <span className="font-mono text-zinc-300">{selectedIssue.rentalId.substring(0,8)}...</span>
                    </div>
                  )}

                  {selectedIssue.bookingId && (
                    <div className="text-xs flex justify-between">
                      <span className="text-zinc-500">Booking Reference:</span>
                      <span className="font-mono text-zinc-300">{selectedIssue.bookingId.substring(0,8)}...</span>
                    </div>
                  )}

                  {selectedIssue.contractId && (
                    <div className="text-xs flex justify-between">
                      <span className="text-zinc-500">Contract Reference:</span>
                      <span className="font-mono text-zinc-300">{selectedIssue.contractId.substring(0,8)}...</span>
                    </div>
                  )}
                </div>

                {/* Case Description */}
                <div>
                  <h4 className="text-xs font-mono text-zinc-500 uppercase mb-1">Incident Report</h4>
                  <p className="text-sm bg-zinc-900 border border-zinc-800 p-3 rounded text-zinc-300 whitespace-pre-line leading-relaxed">
                    {selectedIssue.description}
                  </p>
                </div>

                {/* Attachments Section */}
                {selectedIssue.attachments && selectedIssue.attachments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-mono text-zinc-500 uppercase mb-2">Logged Attachments ({selectedIssue.attachments.length})</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedIssue.attachments.map((url, idx) => (
                        <a 
                          key={idx} 
                          href={url} 
                          target="_blank" 
                          rel="noreferrer noopener" 
                          className="bg-zinc-900 border border-zinc-800 p-2 rounded hover:border-[#DC2626] transition block text-center"
                        >
                          <Paperclip className="mx-auto text-zinc-500 mb-1" size={16} />
                          <span className="text-[10px] text-zinc-400 truncate block">View File {idx+1}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution info if resolved */}
                {selectedIssue.resolution && (
                  <div className="bg-emerald-950/20 border border-emerald-900 p-4 rounded-lg space-y-1">
                    <h4 className="text-xs font-mono text-emerald-400 font-bold uppercase flex items-center gap-1">
                      <Check size={14} /> Dispute Resolution Confirmed
                    </h4>
                    <p className="text-xs text-zinc-300 italic whitespace-pre-line">
                      "{selectedIssue.resolution}"
                    </p>
                    {selectedIssue.resolutionDate && (
                      <p className="text-[9px] text-zinc-500 pt-2 font-mono uppercase">
                        Resolved By: {selectedIssue.resolvedBy || 'Representative'} on {new Date(selectedIssue.resolutionDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Lifecycle Operations Actions */}
                <div className="pt-4 border-t border-zinc-800 space-y-2">
                  <h4 className="text-xs font-mono text-zinc-500 uppercase mb-2">Dispute Operations</h4>
                  {selectedIssue.status !== 'resolved' && (
                    <button
                      onClick={() => setIsResolveModalOpen(true)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded text-xs flex items-center justify-center gap-1.5"
                      id="resolve-issue-action-btn"
                    >
                      <Check size={14} /> Resolve Case File
                    </button>
                  )}
                  {selectedIssue.status !== 'closed' && (
                    <button
                      onClick={handleCloseIssue}
                      className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-2 rounded text-xs flex items-center justify-center gap-1.5"
                    >
                      <Clock size={14} /> Close Dispute File
                    </button>
                  )}
                  {selectedIssue.status !== 'escalated' && selectedIssue.status !== 'resolved' && selectedIssue.status !== 'closed' && (
                    <button
                      onClick={handleEscalateIssue}
                      className="w-full bg-purple-900 hover:bg-purple-800 text-white font-semibold py-2 rounded text-xs flex items-center justify-center gap-1.5"
                    >
                      <Shield size={14} /> Escalate to Management
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column: Timeline and Staff Conversations (Comments) */}
              <div className="flex-1 flex flex-col h-full bg-zinc-900/40">
                <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
                  <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase">Staff internal logging timeline</h4>
                  <span className="text-[10px] bg-zinc-950 px-2 py-0.5 rounded text-zinc-500 font-mono">STAFF ACCESS ONLY</span>
                </div>

                {/* Comments Stream */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  {comments.length === 0 ? (
                    <div className="text-center py-10 text-zinc-600">
                      <MessageSquare className="mx-auto mb-2 text-zinc-700" size={32} />
                      <p className="text-xs font-semibold">No timeline remarks logged.</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Post incident details or communications here.</p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div 
                        key={comment.id} 
                        className={`p-3 rounded-lg border max-w-[85%] space-y-1 ${
                          comment.isInternal 
                            ? 'bg-[#DC2626]/5 border-[#DC2626]/20 mr-auto' 
                            : 'bg-zinc-900 border-zinc-800 ml-auto'
                        }`}
                      >
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-xs font-bold text-white flex items-center gap-1">
                            <User size={12} className="text-zinc-500" /> {comment.userName}
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          {comment.comment}
                        </p>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-[9px] font-mono font-bold text-[#DC2626]">
                            {comment.isInternal ? 'INTERNAL NOTE' : 'PUBLIC MEMO'}
                          </span>
                          <button 
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-zinc-600 hover:text-red-400 text-[10px]"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Form */}
                <form onSubmit={handleAddCommentSubmit} className="p-4 border-t border-zinc-800 bg-zinc-950 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-zinc-400 font-mono">Add timeline remark:</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={isCommentInternal}
                        onChange={(e) => setIsCommentInternal(e.target.checked)}
                        className="rounded bg-zinc-900 border-zinc-800 text-[#DC2626]"
                        id="comment-internal-checkbox"
                      />
                      <span className="text-[11px] text-zinc-400">Internal Note</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type official update comment here..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      required
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#DC2626]"
                      id="comment-text-input"
                    />
                    <button
                      type="submit"
                      disabled={isCommentSubmitting}
                      className="bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-50 text-white px-4 py-2 rounded text-xs font-semibold"
                      id="comment-submit-btn"
                    >
                      {isCommentSubmitting ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: RESOLVE DISPUTE FORM --- */}
      {isResolveModalOpen && selectedIssue && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-lg shadow-xl overflow-hidden">
            <div className="border-b border-zinc-800 p-4 flex justify-between items-center bg-zinc-950">
              <h3 className="text-md font-bold text-white flex items-center gap-1">
                <FileCheck className="text-emerald-500" /> Resolve Case: {selectedIssue.issueNumber}
              </h3>
              <button
                onClick={() => setIsResolveModalOpen(false)}
                className="text-zinc-500 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleResolveIssue} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1.5">Official Resolution Action Taken *</label>
                <textarea
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  rows={4}
                  required
                  placeholder="Specify resolution. E.g. 'Customer paid $150 replacement fee. Missing variant stock was re-ordered.' or 'Logistic refund approved...'"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-[#DC2626]"
                  id="resolution-textarea"
                />
              </div>

              <div className="border-t border-zinc-800 pt-4 flex justify-end gap-2 bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded text-xs font-bold transition"
                  id="confirm-resolution-btn"
                >
                  {isSubmitting ? 'Saving...' : 'Resolve File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: EDIT CASE FIELDS --- */}
      {isEditModalOpen && selectedIssue && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-lg shadow-xl overflow-hidden">
            <div className="border-b border-zinc-800 p-4 flex justify-between items-center bg-zinc-950">
              <h3 className="text-md font-bold text-white flex items-center gap-1.5">
                <Wrench className="text-[#DC2626]" /> Edit Dispute Parameters
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-zinc-500 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="damage">Damage Claim</option>
                    <option value="missing">Missing Return</option>
                    <option value="payment">Billing Dispute</option>
                    <option value="delivery">Logistics / Delivery</option>
                    <option value="return">Logistics / Return</option>
                    <option value="customer_complaint">Customer Complaint</option>
                    <option value="other">Other Incident</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="escalated">Escalated</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#DC2626] uppercase mb-1">Case Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#DC2626]"
                />
              </div>

              <div className="border-t border-zinc-800 pt-4 flex justify-end gap-2 bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 py-1.5 rounded text-xs font-bold transition"
                  id="save-edit-dispute-btn"
                >
                  {isSubmitting ? 'Saving...' : 'Apply Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
