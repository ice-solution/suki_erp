import NotFound from '@/components/NotFound';
import { ErpLayout } from '@/layout';
import ProjectReadItem from './ProjectReadItem';

import PageLoader from '@/components/PageLoader';
import { erp } from '@/redux/erp/actions';

import { selectReadItem } from '@/redux/erp/selectors';
import { useLayoutEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useLocation } from 'react-router-dom';

export default function ReadProjectModule({ config }) {
  const dispatch = useDispatch();
  const { id: idFromParams } = useParams();
  const location = useLocation();
  // 從 project 返回時，location.state.projectId 為正確的 project ID，避免 useParams 回傳 quote/invoice ID
  const id = location.state?.projectId || idFromParams;

  useLayoutEffect(() => {
    if (!id) return;
    dispatch(erp.read({ entity: config.entity, id }));
  }, [id]);

  const { result: currentResult, isSuccess, isLoading = true } = useSelector(selectReadItem);

  if (isLoading) {
    return (
      <ErpLayout>
        <PageLoader />
      </ErpLayout>
    );
  } else
    return (
      <ErpLayout>
        {isSuccess ? (
          <ProjectReadItem config={config} selectedItem={currentResult} projectIdFromUrl={id} />
        ) : (
          <NotFound entity={config.entity} />
        )}
      </ErpLayout>
    );
}
