import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Inbox, AlertTriangle, Info, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate, Link } from 'react-router-dom';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-[#DC2626]" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const handleNotificationClick = async (id: string, link?: string) => {
    try {
      await markAsRead(id);
      setIsOpen(false);
      if (link) {
        navigate(link);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const recentNotifications = notifications.slice(0, 10);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Trigger */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-[#DC2626] transition-colors rounded-full hover:bg-gray-100 cursor-pointer focus:outline-none"
        aria-label="Toggle notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#DC2626] text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white border border-gray-100 rounded-lg shadow-xl z-50 overflow-hidden transform origin-top-right transition-all animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Dropdown Header */}
          <div className="p-4 bg-[#1A1A1A] text-white flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-[#DC2626]" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Alert Logs</h3>
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-[11px] font-bold text-gray-300 hover:text-white transition-colors cursor-pointer"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All Read</span>
              </button>
            )}
          </div>

          {/* List of Recent Items */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {recentNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
                <Inbox className="w-8 h-8 text-gray-200" />
                <p className="text-xs font-medium">All caught up! No recent alerts.</p>
              </div>
            ) : (
              recentNotifications.map(n => (
                <div 
                  key={n.id}
                  className={`p-3.5 flex gap-3 transition-colors hover:bg-gray-50/70 cursor-pointer ${!n.isRead ? 'bg-red-50/20 font-medium' : ''}`}
                  onClick={() => handleNotificationClick(n.id, n.link)}
                >
                  <div className="pt-0.5">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-bold truncate ${!n.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                        {n.title}
                      </p>
                      <span className="text-[9px] text-gray-400 shrink-0">
                        {formatDistanceToNow(n.createdAt, { addSuffix: false })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{n.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Navigation */}
          <div className="border-t border-gray-100 bg-gray-50/50">
            <Link 
              to="/notifications" 
              onClick={() => setIsOpen(false)}
              className="block p-3 text-center text-xs font-bold text-[#DC2626] hover:text-red-700 hover:bg-gray-50 transition-colors uppercase tracking-wider"
            >
              See All Notifications ({notifications.length})
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
