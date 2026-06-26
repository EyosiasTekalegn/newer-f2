import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  FileText,
  Bookmark,
  PlayCircle,
  Undo2,
  PackageSearch,
  Truck,
  HardHat,
  Landmark,
  ShoppingCart,
  FileSignature,
  AlertOctagon,
  BarChart3,
  Bell,
  History,
  Settings,
  ChevronDown,
  ChevronRight,
  Package,
  Boxes,
  Wrench,
  Clock,
  UserCheck,
  Percent,
  Banknote,
  TrendingUpDown,
  Lock,
  Wallet,
  ShieldAlert,
  Tags,
  LayoutTemplate,
  Binary,
  type LucideIcon
} from 'lucide-react';

interface SubMenuItem {
  name: string;
  path: string;
  icon?: LucideIcon;
}

interface MenuItem {
  name: string;
  path?: string;
  icon: LucideIcon;
  subItems?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Calendar', path: '/calendar', icon: CalendarDays },
  { name: 'Customers', path: '/customers', icon: Users },
  { name: 'Quotations', path: '/quotations', icon: FileText },
  { name: 'Bookings', path: '/bookings', icon: Bookmark },
  { name: 'Active Rentals', path: '/active-rentals', icon: PlayCircle },
  { name: 'Returns & Inspection', path: '/returns-inspection', icon: Undo2 },
  {
    name: 'Inventory',
    icon: PackageSearch,
    subItems: [
      { name: 'Items & Variants', path: '/inventory/items', icon: Package },
      { name: 'Packages / Bundles', path: '/inventory/packages', icon: Boxes },
      { name: 'Stock Overview', path: '/inventory/stock', icon: BarChart3 },
      { name: 'Maintenance', path: '/inventory/maintenance', icon: Wrench },
      { name: 'Asset History', path: '/inventory/history', icon: Clock },
    ],
  },
  { name: 'Logistics', path: '/logistics', icon: Truck },
  {
    name: 'Workforce',
    icon: HardHat,
    subItems: [
      { name: 'Workers', path: '/workforce/workers', icon: Users },
      { name: 'Attendance', path: '/workforce/attendance', icon: UserCheck },
      { name: 'Commissions', path: '/workforce/commissions', icon: Percent },
      { name: 'Payroll Runs', path: '/workforce/payroll', icon: Banknote },
    ],
  },
  {
    name: 'Finance & Banking',
    icon: Landmark,
    subItems: [
      { name: 'Bank Ledgers', path: '/finance/ledgers', icon: Landmark },
      { name: 'Income & Expenses', path: '/finance/income-expenses', icon: TrendingUpDown },
      { name: 'Deposit Holding', path: '/finance/deposit-holding', icon: Lock },
      { name: 'Transactions', path: '/finance/transactions', icon: Wallet },
    ],
  },
  { name: 'Procurement & Suppliers', path: '/procurement', icon: ShoppingCart },
  { name: 'Contracts', path: '/contracts', icon: FileSignature },
  { name: 'Issues / Disputes', path: '/issues', icon: AlertOctagon },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
  { name: 'Notifications', path: '/notifications', icon: Bell },
  { name: 'Audit Log', path: '/audit-log', icon: History },
  {
    name: 'Settings',
    icon: Settings,
    subItems: [
      { name: 'Roles & Permissions', path: '/settings/roles', icon: ShieldAlert },
      { name: 'Pricing & Price Lists', path: '/settings/pricing', icon: Tags },
      { name: 'Templates', path: '/settings/templates', icon: LayoutTemplate },
      { name: 'Banks', path: '/settings/banks', icon: Landmark },
      { name: 'Numbering Rules', path: '/settings/numbering-rules', icon: Binary },
    ],
  },
];

export function Sidebar() {
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (name: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  return (
    <aside className="w-64 bg-[#0D0D0D] border-r border-[#2A2A2A] flex flex-col shrink-0 h-screen text-white">
      <div className="p-4 border-b border-[#2A2A2A] flex items-center gap-3">
        <div className="w-8 h-8 bg-[#DC2626] rounded flex items-center justify-center font-bold text-lg">
          R
        </div>
        <span className="font-bold tracking-tight text-xl">
          Rental<span className="text-[#DC2626]">Sync</span>
        </span>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => (
          <div key={item.name} className="flex flex-col">
            {item.subItems ? (
              // Expandable Item
              <>
                <button
                  onClick={() => toggleMenu(item.name)}
                  className="flex items-center justify-between px-3 py-2 text-[#A3A3A3] hover:bg-[#1A1A1A] hover:text-white rounded text-sm transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 group-hover:text-white transition-colors" />
                    <span>{item.name}</span>
                  </div>
                  {expandedMenus[item.name] ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {expandedMenus[item.name] && (
                  <div className="pl-10 space-y-1 mt-1 flex flex-col">
                    {item.subItems.map((subItem) => (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        className={({ isActive }) =>
                          `flex items-center py-1 text-xs transition-colors ${
                            isActive
                              ? 'text-white border-l border-[#DC2626] pl-3'
                              : 'text-[#A3A3A3] hover:text-white pl-3'
                          }`
                        }
                      >
                        {subItem.name}
                      </NavLink>
                    ))}
                  </div>
                )}
              </>
            ) : (
              // Regular Item
              <NavLink
                to={item.path!}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors group ${
                    isActive
                      ? 'bg-[#DC2626] text-white border-l-4 border-white'
                      : 'text-[#A3A3A3] hover:bg-[#1A1A1A] hover:text-white'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </NavLink>
            )}
          </div>
        ))}
      </nav>
      
      <div className="p-4 border-t border-[#2A2A2A] flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center font-bold text-xs">
          JD
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate">John Doe</p>
          <p className="text-[10px] text-[#A3A3A3] truncate">Administrator</p>
        </div>
      </div>
    </aside>
  );
}
