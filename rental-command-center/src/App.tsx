/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Calendar } from './pages/Calendar';
import { Customers } from './pages/Customers';
import { Quotations } from './pages/Quotations';
import { Bookings } from './pages/Bookings';
import { ActiveRentals } from './pages/ActiveRentals';
import { ReturnsInspection } from './pages/ReturnsInspection';
import { Logistics } from './pages/Logistics';
import { ProcurementSuppliers } from './pages/ProcurementSuppliers';
import { Contracts } from './pages/Contracts';
import { IssuesDisputes } from './pages/IssuesDisputes';
import { Reports } from './pages/Reports';
import { Notifications } from './pages/Notifications';
import { AuditLog } from './pages/AuditLog';

// Inventory
import { ItemsAndVariants } from './pages/inventory/ItemsAndVariants';
import { PackagesBundles } from './pages/inventory/PackagesBundles';
import { StockOverview } from './pages/inventory/StockOverview';
import { Maintenance } from './pages/inventory/Maintenance';
import { AssetHistory } from './pages/inventory/AssetHistory';

// Workforce
import { Workers } from './pages/workforce/Workers';
import { Attendance } from './pages/workforce/Attendance';
import { Commissions } from './pages/workforce/Commissions';
import { PayrollRuns } from './pages/workforce/PayrollRuns';

// Finance
import { BankLedgers } from './pages/finance/BankLedgers';
import { IncomeExpenses } from './pages/finance/IncomeExpenses';
import { DepositHolding } from './pages/finance/DepositHolding';
import { Transactions } from './pages/finance/Transactions';

// Settings
import { RolesPermissions } from './pages/settings/RolesPermissions';
import { PricingPriceLists } from './pages/settings/PricingPriceLists';
import { Templates } from './pages/settings/Templates';
import { Banks } from './pages/settings/Banks';
import { NumberingRules } from './pages/settings/NumberingRules';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'calendar', element: <Calendar /> },
      { path: 'customers', element: <Customers /> },
      { path: 'quotations', element: <Quotations /> },
      { path: 'bookings', element: <Bookings /> },
      { path: 'active-rentals', element: <ActiveRentals /> },
      { path: 'returns-inspection', element: <ReturnsInspection /> },
      {
        path: 'inventory',
        children: [
          { path: 'items', element: <ItemsAndVariants /> },
          { path: 'packages', element: <PackagesBundles /> },
          { path: 'stock', element: <StockOverview /> },
          { path: 'maintenance', element: <Maintenance /> },
          { path: 'history', element: <AssetHistory /> },
        ],
      },
      { path: 'logistics', element: <Logistics /> },
      {
        path: 'workforce',
        children: [
          { path: 'workers', element: <Workers /> },
          { path: 'attendance', element: <Attendance /> },
          { path: 'commissions', element: <Commissions /> },
          { path: 'payroll', element: <PayrollRuns /> },
        ],
      },
      {
        path: 'finance',
        children: [
          { path: 'ledgers', element: <BankLedgers /> },
          { path: 'income-expenses', element: <IncomeExpenses /> },
          { path: 'deposit-holding', element: <DepositHolding /> },
          { path: 'transactions', element: <Transactions /> },
        ],
      },
      { path: 'procurement', element: <ProcurementSuppliers /> },
      { path: 'contracts', element: <Contracts /> },
      { path: 'issues', element: <IssuesDisputes /> },
      { path: 'reports', element: <Reports /> },
      { path: 'notifications', element: <Notifications /> },
      { path: 'audit-log', element: <AuditLog /> },
      {
        path: 'settings',
        children: [
          { path: 'roles', element: <RolesPermissions /> },
          { path: 'pricing', element: <PricingPriceLists /> },
          { path: 'templates', element: <Templates /> },
          { path: 'banks', element: <Banks /> },
          { path: 'numbering-rules', element: <NumberingRules /> },
        ],
      },
    ],
  },
]);

import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" />
      </NotificationProvider>
    </AuthProvider>
  );
}

