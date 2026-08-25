import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectFollowUpPersonList } from '@/redux/settings/selectors';
import {
  followUpDisplayName as followUpDisplayNameBase,
  projectFollowUpDisplayName as projectFollowUpDisplayNameBase,
} from '@/utils/adminDisplayName';

/** 帶入設定中的自訂跟單人名稱 */
export function useFollowUpDisplayName() {
  const followUpPersonList = useSelector(selectFollowUpPersonList);
  const followUpDisplayName = useCallback(
    (record) => followUpDisplayNameBase(record, followUpPersonList),
    [followUpPersonList]
  );
  const projectFollowUpDisplayName = useCallback(
    (record) => projectFollowUpDisplayNameBase(record, followUpPersonList),
    [followUpPersonList]
  );
  return { followUpDisplayName, projectFollowUpDisplayName, followUpPersonList };
}
