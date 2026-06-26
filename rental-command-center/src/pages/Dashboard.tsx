import React, { useState, useEffect } from 'react';
import { 
  getDashboardSummary, 
  DashboardSummary 
} from '../services/reportService';
import { 
  getActiveRentals, 
  Rental 
} from '../services/rentalService';
import { 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  Package, 
  HelpCircle,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Compass,
  FileSpreadsheet,
  Settings,
  Calendar,
  Users,
  Wrench
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activeRentals, setActiveRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [sumData, rentalsData] = await Promise.all([
          getDashboardSummary(),
          getActiveRentals()
        ]);
        setSummary(sumData);
        setActiveRentals(rentalsData.slice(0, 5)); // show top 5 active rentals
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#DC2626] rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold text-gray-500 font-mono tracking-wider">LOADING OPERATIONS CONTROL...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#1A1A1A] text-white p-6 rounded-lg shadow-sm border border-neutral-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-sans tracking-tight uppercase">Equipment Rental Hub</h2>
          <p className="text-xs text-neutral-400 mt-1">Operational command center showing real-time stocks, commissions, and rental dispatches.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => navigate('/bookings')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#DC2626] text-white rounded text-xs font-bold hover:bg-red-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Booking</span>
          </button>
          <button 
            onClick={() => navigate('/reports')}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-800 text-neutral-200 rounded text-xs font-bold hover:bg-neutral-800 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>View Reports</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-4 border border-gray-100 rounded-lg shadow-sm border-l-4 border-l-[#DC2626]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold text-gray-400">Total Revenue (Month)</p>
            <TrendingUp className="w-4 h-4 text-[#DC2626]" />
          </div>
          <h3 className="text-2xl font-extrabold mt-1 font-mono text-gray-900">
            ETB {summary?.totalRevenueThisMonth.toLocaleString() || '0'}
          </h3>
          <p className="text-[10px] text-emerald-600 font-medium mt-1">▲ Aggregated from rentals</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 border border-gray-100 rounded-lg shadow-sm border-l-4 border-l-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold text-gray-400">Active Rentals</p>
            <Package className="w-4 h-4 text-gray-600" />
          </div>
          <h3 className="text-2xl font-extrabold mt-1 font-mono text-gray-900">
            {summary?.activeRentalsCount || '0'}
          </h3>
          <p className="text-[10px] text-[#DC2626] font-bold mt-1">● Currently deployed on site</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 border border-gray-100 rounded-lg shadow-sm border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold text-gray-400">Pending Returns</p>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-2xl font-extrabold mt-1 font-mono text-gray-900">
            {summary?.pendingReturnsCount || '0'}
          </h3>
          <p className="text-[10px] text-amber-600 font-medium mt-1">⚠️ Overdue or approaching return</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 border border-gray-100 rounded-lg shadow-sm border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold text-gray-400">Low Stock Warnings</p>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <h3 className="text-2xl font-extrabold mt-1 font-mono text-[#DC2626]">
            {summary?.lowStockCount || '0'}
          </h3>
          <p className="text-[10px] text-rose-500 font-medium mt-1">▼ Below alert threshold</p>
        </div>

        {/* Metric 5 */}
        <div className="bg-white p-4 border border-gray-100 rounded-lg shadow-sm border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase font-bold text-gray-400">Open Disputes</p>
            <HelpCircle className="w-4 h-4 text-indigo-500" />
          </div>
          <h3 className="text-2xl font-extrabold mt-1 font-mono text-indigo-600">
            {summary?.openIssuesCount || '0'}
          </h3>
          <p className="text-[10px] text-indigo-500 font-medium mt-1">● Escalated customer cases</p>
        </div>
      </div>

      {/* Layout Grid: Quick Links & Recent Active Rentals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Quick Links Navigation */}
        <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-sm text-gray-900 uppercase tracking-wider">Hub Explorer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
            {[
              { label: 'Active Rentals Directory', link: '/active-rentals', icon: <Package className="w-4 h-4" /> },
              { label: 'Quotations Generator', link: '/quotations', icon: <Compass className="w-4 h-4" /> },
              { label: 'Contracts Dashboard', link: '/contracts', icon: <FileSpreadsheet className="w-4 h-4" /> },
              { label: 'Customer Dispute Center', link: '/issues', icon: <HelpCircle className="w-4 h-4" /> },
              { label: 'Maintenance Schedule', link: '/maintenance', icon: <Wrench className="w-4 h-4" /> },
              { label: 'Staff Attendance & Payroll', link: '/workforce/attendance', icon: <Users className="w-4 h-4" /> },
            ].map((route, i) => (
              <button 
                key={i}
                onClick={() => navigate(route.link)}
                className="flex items-center justify-between p-3 border border-gray-100 rounded-lg text-left hover:border-red-200 hover:bg-red-50/10 transition-all text-xs font-semibold text-gray-700 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[#DC2626]">{route.icon}</span>
                  <span>{route.label}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Right 2 Columns: Active Rentals table */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-lg shadow-sm flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h2 className="font-bold text-xs uppercase tracking-wider text-gray-800">Current active rental dispatches</h2>
            <Link to="/active-rentals" className="text-[10px] text-[#DC2626] font-bold hover:underline flex items-center gap-1">
              <span>View All</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] uppercase text-gray-400 font-bold tracking-wider">
                  <th className="p-4">Reference</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4 text-center">Items count</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-50">
                {activeRentals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">No active rental agreements right now.</td>
                  </tr>
                ) : (
                  activeRentals.map((rental) => {
                    const totalQty = Array.isArray(rental.items) ? rental.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) : 0;
                    return (
                      <tr key={rental.id} className="hover:bg-gray-50/50">
                        <td className="p-4 font-mono font-bold text-gray-900">#{rental.id.slice(0, 8)}</td>
                        <td className="p-4 font-semibold text-gray-700">{rental.customerName}</td>
                        <td className="p-4 text-center font-mono font-medium text-gray-600">{totalQty} units</td>
                        <td className="p-4 text-gray-500">
                          {rental.endDate instanceof Date ? rental.endDate.toLocaleDateString() : new Date(rental.endDate).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[9px] uppercase tracking-wide ${
                            rental.status === 'Delivered' 
                              ? 'bg-red-50 text-[#DC2626]' 
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {rental.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
