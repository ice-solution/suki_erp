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
const InvoiceTableCreate = lazy(() => import('@/pages/Invoice/InvoiceTableCreate'));
const InvoiceTableUpdate = lazy(() => import('@/pages/Invoice/InvoiceTableUpdate'));
const Quote = lazy(() => import('@/pages/Quote/index'));
const QuoteCreate = lazy(() => import('@/pages/Quote/QuoteCreate'));
const QuoteRead = lazy(() => import('@/pages/Quote/QuoteRead'));
const QuoteUpdate = lazy(() => import('@/pages/Quote/QuoteUpdate'));
const QuoteTableCreate = lazy(() => import('@/pages/Quote/QuoteTableCreate'));
const QuoteTableUpdate = lazy(() => import('@/pages/Quote/QuoteTableUpdate'));
const SupplierQuote = lazy(() => import('@/pages/SupplierQuote/index'));
const SupplierQuoteRead = lazy(() => import('@/pages/SupplierQuote/SupplierQuoteRead'));
const SupplierQuoteTableCreate = lazy(() => import('@/pages/SupplierQuote/SupplierQuoteTableCreate'));
const SupplierQuoteTableUpdate = lazy(() => import('@/pages/SupplierQuote/SupplierQuoteTableUpdate'));
const ShipQuote = lazy(() => import('@/pages/ShipQuote/index'));
const ShipQuoteRead = lazy(() => import('@/pages/ShipQuote/ShipQuoteRead'));
const ShipQuoteTableCreate = lazy(() => import('@/pages/ShipQuote/ShipQuoteTableCreate'));
const ShipQuoteTableUpdate = lazy(() => import('@/pages/ShipQuote/ShipQuoteTableUpdate'));
const Warehouse = lazy(() => import('@/pages/Warehouse/index'));
const Project = lazy(() => import('@/pages/Project/index'));
const ProjectCreate = lazy(() => import('@/pages/Project/ProjectCreate'));
const ProjectRead = lazy(() => import('@/pages/Project/ProjectRead'));
const ProjectUpdate = lazy(() => import('@/pages/Project/ProjectUpdate'));
const WorkProgressCreate = lazy(() => import('@/pages/WorkProgress/WorkProgressCreate'));
const WorkProgressRead = lazy(() => import('@/pages/WorkProgress/WorkProgressRead'));
const WorkProgressUpdate = lazy(() => import('@/pages/WorkProgress/WorkProgressUpdate'));
const ProjectItem = lazy(() => import('@/pages/ProjectItem'));
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
const ContractorList = lazy(() => import('@/pages/ContractorList.jsx'));
const ContractorEmployeeList = lazy(() => import('@/pages/ContractorEmployeeList.jsx'));
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
      path: '/invoice/table/create',
      element: <InvoiceTableCreate />,
    },
    {
      path: '/invoice/table/update/:id',
      element: <InvoiceTableUpdate />,
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
      path: '/quote/table/create',
      element: <QuoteTableCreate />,
    },
    {
      path: '/quote/table/update/:id',
      element: <QuoteTableUpdate />,
    },
    {
      path: '/supplierquote',
      element: <SupplierQuote />,
    },
    {
      path: '/supplierquote/read/:id',
      element: <SupplierQuoteRead />,
    },
    {
      path: '/supplierquote/table/create',
      element: <SupplierQuoteTableCreate />,
    },
    {
      path: '/supplierquote/table/update/:id',
      element: <SupplierQuoteTableUpdate />,
    },
    {
      path: '/shipquote',
      element: <ShipQuote />,
    },
    {
      path: '/shipquote/read/:id',
      element: <ShipQuoteRead />,
    },
    {
      path: '/shipquote/table/create',
      element: <ShipQuoteTableCreate />,
    },
    {
      path: '/shipquote/table/update/:id',
      element: <ShipQuoteTableUpdate />,
    },
    {
      path: '/warehouse',
      element: <Warehouse />,
    },
    {
      path: '/project',
      element: <Project />,
    },
    {
      path: '/project/create',
      element: <ProjectCreate />,
    },
    {
      path: '/project/read/:id',
      element: <ProjectRead />,
    },
    {
      path: '/project/update/:id',
      element: <ProjectUpdate />,
    },
    {
      path: '/workprogress/create',
      element: <WorkProgressCreate />,
    },
    {
      path: '/workprogress/read/:id',
      element: <WorkProgressRead />,
    },
    {
      path: '/workprogress/update/:id',
      element: <WorkProgressUpdate />,
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
      path: '/contractor',
      element: <ContractorList />,
    },
    {
      path: '/contractor-employee',
      element: <ContractorEmployeeList />,
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
      path: '/projectitem',
      element: <ProjectItem />,
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
