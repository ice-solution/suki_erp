import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { canRestoreDeletedRecords } from '@/utils/pagePermissions';

export function useCanRestoreDeletedRecords() {
  const currentAdmin = useSelector(selectCurrentAdmin) || {};
  const role = String(currentAdmin.role || '').trim();
  return canRestoreDeletedRecords(role);
}
