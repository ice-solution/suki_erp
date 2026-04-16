import { lazy, useEffect } from 'react';

import {} from 'react-router-dom';
import {} from 'react-router-dom';
import { Navigate, useLocation, useRoutes } from 'react-router-dom';
import { useAppContext } from '@/context/appContext';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { hasPermission } from '@/utils/pagePermissions';

import routes from './routes';

export default function AppRouter() {
  let location = useLocation();
  const { state: stateApp, appContextAction } = useAppContext();
  const { app } = appContextAction;
  const currentAdmin = useSelector(selectCurrentAdmin) || {};

  const routesList = [];

  Object.entries(routes).forEach(([key, value]) => {
    routesList.push(...value);
  });

  function getAppNameByPath(path) {
    for (let key in routes) {
      for (let i = 0; i < routes[key].length; i++) {
        if (routes[key][i].path === path) {
          return key;
        }
      }
    }
    // Return 'default' app  if the path is not found
    return 'default';
  }
  useEffect(() => {
    if (location.pathname === '/') {
      app.default();
    } else {
      const path = getAppNameByPath(location.pathname);
      app.open(path);
    }
  }, [location]);

  let element = useRoutes(routesList);

  const pathname = location.pathname || '/';
  const role = currentAdmin.role;
  const perms = currentAdmin.permissions;

  const permissionKeyForPath = (p) => {
    if (p === '/' || p === '') return 'dashboard';
    if (p.startsWith('/invoice/xero-export')) return 'xero-invoice';
    if (p.startsWith('/supplierquote/xero-po-export')) return 'xero-po';
    if (p.startsWith('/project/xero-eo-export')) return 'xero-eo';

    if (p.startsWith('/customer')) return 'customer';
    if (p.startsWith('/supplier')) return 'supplier';
    if (p.startsWith('/invoice')) return 'invoice';
    if (p.startsWith('/quote/operational-report')) return 'quote-operational-report';
    if (p.startsWith('/quote')) return 'quote';
    if (p.startsWith('/supplierquote')) return 'supplierquote';
    if (p.startsWith('/shipquote')) return 'shipquote';
    if (p.startsWith('/warehouse')) return 'warehouse';

    if (p.startsWith('/project/report')) return 'project-report';
    if (p.startsWith('/project/contractor-report')) return 'project-contractor-report';
    if (p.startsWith('/project/contractor-employee-report')) return 'project-contractor-employee-report';
    if (p.startsWith('/project')) return 'project-list';

    if (p.startsWith('/contractor-employee')) return 'contractor-employee';
    if (p.startsWith('/contractor')) return 'contractor-list';
    if (p.startsWith('/ship')) return 'ship';
    if (p.startsWith('/winch')) return 'winch';
    if (p.startsWith('/settings')) return 'settings';
    return null;
  };

  const requiredKey = permissionKeyForPath(pathname);
  if (requiredKey && !hasPermission({ perms, key: requiredKey, role })) {
    return <Navigate to="/" replace />;
  }

  return element;
}
