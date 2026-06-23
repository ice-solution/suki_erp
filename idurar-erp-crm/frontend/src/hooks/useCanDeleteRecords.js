import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { canDeleteRecords } from '@/utils/pagePermissions';

export function useCanDeleteRecords() {
  const currentAdmin = useSelector(selectCurrentAdmin) || {};
  const role = String(currentAdmin.role || '').trim();
  return canDeleteRecords(role);
}
