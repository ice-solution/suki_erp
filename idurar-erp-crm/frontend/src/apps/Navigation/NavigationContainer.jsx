import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Drawer, Layout, Menu } from 'antd';

import { useAppContext } from '@/context/appContext';

import useLanguage from '@/locale/useLanguage';
import logoIcon from '@/style/images/supermax-logo.svg';
import logoText from '@/style/images/supermax-logo.svg';

import useResponsive from '@/hooks/useResponsive';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { hasPermission } from '@/utils/pagePermissions';

import {
  SettingOutlined,
  CustomerServiceOutlined,
  ContainerOutlined,
  FileSyncOutlined,
  DashboardOutlined,
  TagOutlined,
  TagsOutlined,
  UserOutlined,
  MenuOutlined,
  FileOutlined,
  ShopOutlined,
  TeamOutlined,
  ProjectOutlined,
  BuildOutlined,
  CalculatorOutlined,
  DatabaseOutlined,
  RocketOutlined,
  ToolOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;

export default function Navigation() {
  const { isMobile } = useResponsive();

  return isMobile ? <MobileSidebar /> : <Sidebar collapsible={false} />;
}

function Sidebar({ collapsible, isMobile = false }) {
  let location = useLocation();

  const { state: stateApp, appContextAction } = useAppContext();
  const { isNavMenuClose } = stateApp;
  const { navMenu } = appContextAction;
  const [showLogoApp, setLogoApp] = useState(isNavMenuClose);
  const [currentPath, setCurrentPath] = useState(location.pathname.slice(1));

  const translate = useLanguage();
  const navigate = useNavigate();
  const currentAdmin = useSelector(selectCurrentAdmin) || {};
  const perms = currentAdmin.permissions;
  const role = currentAdmin.role;

  // 左邊 Menu 次序（按需求）
  const items = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link to={'/'}>{translate('dashboard')}</Link>,
    },
    {
      key: 'customer',
      icon: <CustomerServiceOutlined />,
      label: <Link to={'/customer'}>{translate('customers')}</Link>,
    },
    {
      key: 'supplier',
      icon: <ShopOutlined />,
      label: <Link to={'/supplier'}>{translate('suppliers')}</Link>,
    },
    {
      key: 'contractor',
      icon: <BuildOutlined />,
      label: translate('contractor_management'),
      children: [
        {
          key: 'contractor-list',
          label: <Link to={'/contractor'}>{translate('contractors')}</Link>,
        },
        {
          key: 'contractor-employee',
          label: <Link to={'/contractor-employee'}>{translate('contractor_employees')}</Link>,
        },
      ],
    },
    {
      key: 'quote',
      icon: <FileSyncOutlined />,
      label: <Link to={'/quote'}>{translate('quote')}</Link>,
    },
    {
      key: 'shipquote',
      icon: <FileSyncOutlined />,
      label: <Link to={'/shipquote'}>{translate('ship_quote')}</Link>,
    },
    {
      key: 'supplierquote',
      icon: <FileSyncOutlined />,
      label: <Link to={'/supplierquote'}>{translate('supplier_quote')}</Link>,
    },
    {
      key: 'ship',
      icon: <RocketOutlined />,
      label: <Link to={'/ship'}>{translate('ship_management')}</Link>,
    },
    {
      key: 'winch',
      icon: <ToolOutlined />,
      label: <Link to={'/winch'}>{translate('winch_management')}</Link>,
    },
    {
      key: 'invoice',
      icon: <ContainerOutlined />,
      label: <Link to={'/invoice'}>{translate('invoices')}</Link>,
    },
    {
      key: 'project-list',
      icon: <ProjectOutlined />,
      label: <Link to={'/project'}>{translate('project_management')}</Link>,
    },
    {
      key: 'xero-export',
      icon: <FileOutlined />,
      label: 'Xero 匯出',
      children: [
        { key: 'xero-invoice', label: <Link to="/invoice/xero-export">發票滙出</Link> },
        { key: 'xero-po', label: <Link to="/supplierquote/xero-po-export">PO單滙出</Link> },
        { key: 'xero-eo', label: <Link to="/project/xero-eo-export">EO單滙出</Link> },
      ],
    },
    {
      key: 'reports',
      icon: <FileOutlined />,
      label: '報告',
      children: [
        { key: 'project-report', label: <Link to={'/project/report'}>{translate('project_report')}</Link> },
        { key: 'project-contractor-report', label: <Link to={'/project/contractor-report'}>承辦商報告</Link> },
        {
          key: 'project-contractor-employee-report',
          label: <Link to={'/project/contractor-employee-report'}>承辦商員工報告</Link>,
        },
        { key: 'quote-operational-report', label: <Link to={'/quote/operational-report'}>報價／發票營運報告</Link> },
      ],
    },
    {
      key: 'settings',
      label: <Link to={'/settings'}>{translate('settings')}</Link>,
      icon: <SettingOutlined />,
    },
  ];

  const filteredItems = useMemo(() => {
    const allowKey = (key) => hasPermission({ perms, key, role });
    const walk = (arr) =>
      (arr || [])
        .map((it) => {
          if (!it) return null;
          const key = it.key;
          // 沒 key 的 divider 直接保留
          if (!key) return it;

          // container menu：只要 children 有任何可見就保留
          if (Array.isArray(it.children) && it.children.length) {
            const kids = walk(it.children).filter(Boolean);
            if (kids.length === 0) return null;
            return { ...it, children: kids };
          }

          // leaf menu：以 key 作為 permission key
          return allowKey(key) ? it : null;
        })
        .filter(Boolean);
    return walk(items);
  }, [perms, role, items]);

  useEffect(() => {
    if (location)
      if (currentPath !== location.pathname) {
        if (location.pathname === '/') {
          setCurrentPath('dashboard');
        } else {
          const path = location.pathname.slice(1);
          // 處理項目報告路徑
          if (path === 'project/report') {
            setCurrentPath('project-report');
          } else if (path === 'project/contractor-report') {
            setCurrentPath('project-contractor-report');
          } else if (path === 'project/contractor-employee-report') {
            setCurrentPath('project-contractor-employee-report');
          } else if (path === 'quote/operational-report') {
            setCurrentPath('quote-operational-report');
          } else {
            setCurrentPath(path);
          }
        }
      }
  }, [location, currentPath]);

  useEffect(() => {
    if (isNavMenuClose) {
      setLogoApp(isNavMenuClose);
    }
    const timer = setTimeout(() => {
      if (!isNavMenuClose) {
        setLogoApp(isNavMenuClose);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [isNavMenuClose]);
  const onCollapse = () => {
    navMenu.collapse();
  };

  return (
    <Sider
      collapsible={collapsible}
      collapsed={collapsible ? isNavMenuClose : collapsible}
      onCollapse={onCollapse}
      className="navigation"
      width={256}
      style={{
        overflow: 'auto',
        height: '100vh',

        position: isMobile ? 'absolute' : 'relative',
        bottom: '20px',
        ...(!isMobile && {
          // border: 'none',
          ['left']: '20px',
          top: '20px',
          // borderRadius: '8px',
        }),
      }}
      theme={'light'}
    >
      <div
        className="logo"
        onClick={() => navigate('/')}
        style={{
          cursor: 'pointer',
        }}
      >
        <img src={logoIcon} alt="Logo" style={{ marginLeft: '-5px', height: '40px' }} />

        
      </div>
      <Menu
        items={filteredItems}
        mode="inline"
        theme={'light'}
        selectedKeys={[currentPath]}
        style={{
          width: 256,
        }}
      />
    </Sider>
  );
}

function MobileSidebar() {
  const [visible, setVisible] = useState(false);
  const showDrawer = () => {
    setVisible(true);
  };
  const onClose = () => {
    setVisible(false);
  };

  return (
    <>
      <Button
        type="text"
        size="large"
        onClick={showDrawer}
        className="mobile-sidebar-btn"
        style={{ ['marginLeft']: 25 }}
      >
        <MenuOutlined style={{ fontSize: 18 }} />
      </Button>
      <Drawer
        width={250}
        // style={{ backgroundColor: 'rgba(255, 255, 255, 1)' }}
        placement={'left'}
        closable={false}
        onClose={onClose}
        open={visible}
      >
        <Sidebar collapsible={false} isMobile={true} />
      </Drawer>
    </>
  );
}
