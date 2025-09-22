import { useLayoutEffect } from 'react';

import DataTable from './DataTable';

import Delete from './DeleteItem';

import { useDispatch } from 'react-redux';
import { erp } from '@/redux/erp/actions';

import { useErpContext } from '@/context/erp';

export default function ErpPanel({ config, extra, DataTableModule }) {
  const dispatch = useDispatch();
  const { state } = useErpContext();
  const { deleteModal } = state;

  const dispatcher = () => {
    dispatch(erp.resetState());
  };

  useLayoutEffect(() => {
    const controller = new AbortController();
    dispatcher();
    return () => {
      controller.abort();
    };
  }, []);

  // 使用自定義DataTable組件或默認的DataTable組件
  const TableComponent = DataTableModule || DataTable;

  return (
    <>
      <TableComponent config={config} extra={extra} />
      <Delete config={config} isOpen={deleteModal.isOpen} />
    </>
  );
}
