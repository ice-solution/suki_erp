import { lazy } from 'react';

import { Navigate } from 'react-router-dom';

const Logout = lazy(() => import('@/pages/Logout.jsx'));
const NotFound = lazy(() => import('@/pages/NotFound.jsx'));

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Customer = lazy(() => import('@/pages/Customer'));
const Invoice = lazy(() => import('@/pages/Invoice'));
const InvoiceCreate = lazy(() => import('@/pages/Invoice/InvoiceCreate'));

const InvoiceRead = lazy(() => import('@/pages/Invoice/InvoiceRead'));
const InvoiceUpdate = lazy(() => import('@/pages/Invoice/InvoiceUpdate'));
const InvoiceRecordPayment = lazy(() => import('@/pages/Invoice/InvoiceRecordPayment'));
const Quote = lazy(() => import('@/pages/Quote/index'));
const QuoteCreate = lazy(() => import('@/pages/Quote/QuoteCreate'));
const QuoteRead = lazy(() => import('@/pages/Quote/QuoteRead'));
const QuoteUpdate = lazy(() => import('@/pages/Quote/QuoteUpdate'));
const Payment = lazy(() => import('@/pages/Payment/index'));
const PaymentRead = lazy(() => import('@/pages/Payment/PaymentRead'));
const PaymentUpdate = lazy(() => import('@/pages/Payment/PaymentUpdate'));

const InventoryList = lazy(() => import('@/pages/InventoryList.jsx'));
const InventoryInbound = lazy(() => import('@/pages/InventoryInbound.jsx'));
const InventoryRecordList = lazy(() => import('@/pages/InventoryRecordList.jsx'));

const Settings = lazy(() => import('@/pages/Settings/Settings'));
const PaymentMode = lazy(() => import('@/pages/PaymentMode'));
const Taxes = lazy(() => import('@/pages/Taxes'));

const Profile = lazy(() => import('@/pages/Profile'));
const AdminUserList = lazy(() => import('@/pages/AdminUserList.jsx'));

const About = lazy(() => import('@/pages/About'));
const ProjectItemList = lazy(() => import('@/pages/ProjectItemList.jsx'));
const ContractorList = lazy(() => import('@/pages/ContractorList.jsx'));
const ContractorEmployeeList = lazy(() => import('@/pages/ContractorEmployeeList.jsx'));
const ProjectList = lazy(() => import('@/pages/ProjectList.jsx'));
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail.jsx'));
const WorkProcessList = lazy(() => import('@/pages/WorkProcessList.jsx'));
const ChartOfAccounts = lazy(() => import('@/pages/ChartOfAccounts.jsx'));
const JournalEntries = lazy(() => import('@/pages/JournalEntries.jsx'));
const FinancialReports = lazy(() => import('@/pages/FinancialReports.jsx'));
const AccountingPeriods = lazy(() => import('@/pages/AccountingPeriods.jsx'));
const Accounting = lazy(() => import('@/pages/Accounting.jsx'));

let routes = {
  expense: [],
  default: [
    {
      path: '/login',
      element: <Navigate to="/" />,
    },
    {
      path: '/logout',
      element: <Logout />,
    },
    {
      path: '/about',
      element: <About />,
    },
    {
      path: '/',
      element: <Dashboard />,
    },
    {
      path: '/customer',
      element: <Customer />,
    },

    {
      path: '/invoice',
      element: <Invoice />,
    },
    {
      path: '/invoice/create',
      element: <InvoiceCreate />,
    },
    {
      path: '/invoice/read/:id',
      element: <InvoiceRead />,
    },
    {
      path: '/invoice/update/:id',
      element: <InvoiceUpdate />,
    },
    {
      path: '/invoice/pay/:id',
      element: <InvoiceRecordPayment />,
    },
    {
      path: '/quote',
      element: <Quote />,
    },
    {
      path: '/quote/create',
      element: <QuoteCreate />,
    },
    {
      path: '/quote/read/:id',
      element: <QuoteRead />,
    },
    {
      path: '/quote/update/:id',
      element: <QuoteUpdate />,
    },
    {
      path: '/payment',
      element: <Payment />,
    },
    {
      path: '/payment/read/:id',
      element: <PaymentRead />,
    },
    {
      path: '/payment/update/:id',
      element: <PaymentUpdate />,
    },
    {
      path: '/inventory',
      element: <InventoryList />,
    },
    {
      path: '/inventory/inbound',
      element: <InventoryInbound />,
    },
    {
      path: '/inventory/record',
      element: <InventoryRecordList />,
    },
    {
      path: '/project-items',
      element: <ProjectItemList />,
    },
    {
      path: '/contractor',
      element: <ContractorList />,
    },
    {
      path: '/contractor-employee',
      element: <ContractorEmployeeList />,
    },
    {
      path: '/project',
      element: <ProjectList />,
    },
    {
      path: '/project/detail/:id',
      element: <ProjectDetail />,
    },
    {
      path: '/work-process/:projectId',
      element: <WorkProcessList />,
    },
    {
      path: '/accounting',
      element: <Accounting />,
    },
    {
      path: '/accounting/chart-of-accounts',
      element: <ChartOfAccounts />,
    },
    {
      path: '/accounting/journal-entries',
      element: <JournalEntries />,
    },
    {
      path: '/accounting/reports',
      element: <FinancialReports />,
    },
    {
      path: '/accounting/periods',
      element: <AccountingPeriods />,
    },

    {
      path: '/settings',
      element: <Settings />,
    },
    {
      path: '/settings/edit/:settingsKey',
      element: <Settings />,
    },
    {
      path: '/payment/mode',
      element: <PaymentMode />,
    },
    {
      path: '/taxes',
      element: <Taxes />,
    },

    {
      path: '/profile',
      element: <Profile />,
    },
    {
      path: '/admin-users',
      element: <AdminUserList />,
    },
    {
      path: '*',
      element: <NotFound />,
    },
  ],
};

export default routes;
