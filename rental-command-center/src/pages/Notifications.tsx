import React, { useState } from 'react';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Filter, 
  PlusCircle, 
  RefreshCw, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

export function Notifications() {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    addManualNotification,
    triggerSystemScan 
  } = useNotifications();

  // Filter States
  const [statusFilter, setStatusFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'info' | 'warning' | 'success' | 'error'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Test Generator Form State
  const [showTestForm, setShowTestForm] = useState(false);
  const [testTitle, setTestTitle] = useState('Low Stock Warning');
  const [testMessage, setTestMessage] = useState('Chairs (Plastic Red) have dropped below the min stock alert threshold of 10 items.');
  const [testType, setTestType] = useState<'info' | 'warning' | 'success' | 'error'>('warning');
  const [testCategory, setTestCategory] = useState<'rental' | 'booking' | 'inventory' | 'finance' | 'workforce' | 'maintenance' | 'issue' | 'system'>('inventory');

  // Categorize helper icons
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-[#DC2626]" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  // Type color badge helper
  const getTypeBadgeStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const handleCreateTestNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addManualNotification(testTitle, testMessage, testType, 'medium', testCategory);
      setShowTestForm(false);
    } catch (err) {
      console.error("Failed to generate test notification", err);
    }
  };

  // Filter list
  const filteredNotifications = notifications.filter(n => {
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'read' && n.isRead) || 
      (statusFilter === 'unread' && !n.isRead);

    const matchesType = 
      typeFilter === 'all' || 
      n.type === typeFilter;

    const matchesCategory = 
      categoryFilter === 'all' || 
      n.category === categoryFilter;

    return matchesStatus && matchesType && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold font-sans text-gray-900 uppercase tracking-tight">Notification Center</h1>
          <p className="text-sm text-gray-500">View real-time system warnings, pending approvals, and automatic logistics reminders.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={triggerSystemScan}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            title="Scan rentals, stocks, and tasks to generate auto notifications"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Scan Database</span>
          </button>
          <button 
            onClick={() => setShowTestForm(!showTestForm)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-[#DC2626]" />
            <span>Test Alert Generator</span>
          </button>
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#DC2626] text-white rounded text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All Read ({unreadCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Test Form Popup Form */}
      {showTestForm && (
        <form onSubmit={handleCreateTestNotification} className="bg-gray-50 border border-gray-200 rounded-lg p-5 shadow-sm space-y-4 max-w-2xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">Configure Demonstration Alert</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Title</label>
              <input 
                type="text" 
                value={testTitle} 
                onChange={e => setTestTitle(e.target.value)}
                required
                className="w-full text-sm border border-gray-200 rounded p-2 bg-white outline-none focus:border-[#DC2626]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Type</label>
              <select 
                value={testType} 
                onChange={e => setTestType(e.target.value as any)}
                className="w-full text-sm border border-gray-200 rounded p-2 bg-white outline-none focus:border-[#DC2626]"
              >
                <option value="info">Info (Blue)</option>
                <option value="warning">Warning (Amber)</option>
                <option value="success">Success (Green)</option>
                <option value="error">Error (Red)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Message Body</label>
              <input 
                type="text" 
                value={testMessage} 
                onChange={e => setTestMessage(e.target.value)}
                required
                className="w-full text-sm border border-gray-200 rounded p-2 bg-white outline-none focus:border-[#DC2626]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
              <select 
                value={testCategory} 
                onChange={e => setTestCategory(e.target.value as any)}
                className="w-full text-sm border border-gray-200 rounded p-2 bg-white outline-none focus:border-[#DC2626]"
              >
                <option value="inventory">Inventory</option>
                <option value="rental">Rentals</option>
                <option value="booking">Bookings</option>
                <option value="finance">Finance</option>
                <option value="workforce">Workforce</option>
                <option value="maintenance">Maintenance</option>
                <option value="issue">Dispute Issues</option>
                <option value="system">General System</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button 
              type="button" 
              onClick={() => setShowTestForm(false)}
              className="px-3 py-1.5 border border-gray-200 rounded text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-1.5 bg-[#DC2626] text-white rounded text-xs font-bold hover:bg-red-700"
            >
              Trigger Real-Time Alert
            </button>
          </div>
        </form>
      )}

      {/* Filters Shelf */}
      <div className="bg-white border border-gray-100 rounded-lg p-4 flex flex-wrap items-center gap-4 shadow-sm text-sm">
        <div className="flex items-center gap-2 text-gray-500 font-medium">
          <Filter className="w-4 h-4 text-gray-400" />
          <span>Filters:</span>
        </div>

        {/* Read/Unread Filter */}
        <div className="flex rounded border border-gray-200 overflow-hidden text-xs">
          {(['all', 'unread', 'read'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 capitalize font-semibold ${statusFilter === f ? 'bg-[#1A1A1A] text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Alert Type */}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as any)}
          className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded px-3 py-1.5 outline-none text-gray-700"
        >
          <option value="all">All Severity Types</option>
          <option value="info">Info</option>
          <option value="warning">Warnings</option>
          <option value="success">Success logs</option>
          <option value="error">Critical Errors</option>
        </select>

        {/* Category */}
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="text-xs font-semibold bg-gray-50 border border-gray-200 rounded px-3 py-1.5 outline-none text-gray-700"
        >
          <option value="all">All Categories</option>
          <option value="rental">Rentals</option>
          <option value="booking">Bookings</option>
          <option value="inventory">Inventory</option>
          <option value="finance">Finance</option>
          <option value="workforce">Workforce</option>
          <option value="maintenance">Maintenance</option>
          <option value="issue">Issues</option>
          <option value="system">System</option>
        </select>
      </div>

      {/* Notifications Board */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-lg">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-[#DC2626] rounded-full animate-spin mb-3"></div>
          <p className="text-xs text-gray-400">Syncing notification channel...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-lg p-6 text-center shadow-sm">
          <Bell className="w-12 h-12 text-gray-200 mb-3" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">Pristine Notification Desk</h3>
          <p className="text-xs text-gray-400 max-w-sm mt-1">No alerts match your current filters. Tap "Scan Database" or use the generator to test.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-lg shadow-sm divide-y divide-gray-100">
          {filteredNotifications.map((n) => (
            <div 
              key={n.id} 
              className={`p-5 flex items-start gap-4 transition-all duration-150 ${n.isRead ? 'opacity-70 bg-white' : 'bg-gray-50/50 border-l-4 border-l-[#DC2626]'}`}
            >
              {/* Severity Icon */}
              <div className="pt-0.5">{getNotificationIcon(n.type)}</div>

              {/* Message Details */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className={`text-sm font-bold ${n.isRead ? 'text-gray-700 line-through' : 'text-gray-900'}`}>{n.title}</h4>
                  <span className={`text-[10px] font-bold uppercase border px-2 py-0.5 rounded tracking-wider ${getTypeBadgeStyles(n.type)}`}>
                    {n.type}
                  </span>
                  <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded tracking-wider">
                    {n.category}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{n.message}</p>
                <div className="flex items-center gap-3 text-[10px] text-gray-400 pt-1">
                  <span>{formatDistanceToNow(n.createdAt, { addSuffix: true })}</span>
                  {n.isSystemGenerated && <span className="font-mono italic text-red-500 font-semibold">[AUTO_SYSTEM]</span>}
                </div>
              </div>

              {/* Actions panel */}
              <div className="flex items-center gap-2">
                {n.link && (
                  <Link 
                    to={n.link} 
                    className="p-1.5 text-gray-400 hover:text-[#DC2626] border border-gray-100 hover:border-red-200 rounded transition-colors"
                    title="Navigate to related module"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
                {!n.isRead && (
                  <button 
                    onClick={() => markAsRead(n.id)}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 border border-emerald-100 rounded transition-colors"
                    title="Mark as Read"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
                <button 
                  onClick={() => deleteNotification(n.id)}
                  className="p-1.5 text-gray-400 hover:text-[#DC2626] hover:bg-red-50 border border-gray-100 hover:border-red-100 rounded transition-colors"
                  title="Delete Alert"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
