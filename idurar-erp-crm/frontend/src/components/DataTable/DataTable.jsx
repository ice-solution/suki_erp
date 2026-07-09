import { useCallback, useEffect, useState, cloneElement, isValidElement } from 'react';

import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  RedoOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { Table, Button, Input, Space, Select } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';

import { useSelector, useDispatch } from 'react-redux';
import { crud } from '@/redux/crud/actions';
import { selectListItems, selectListItemsByEntity } from '@/redux/crud/selectors';
import useLanguage from '@/locale/useLanguage';
import { dataForTable } from '@/utils/dataStructure';
import { useMoney, useDate } from '@/settings';

import { generate as uniqueId } from 'shortid';

import { useCrudContext } from '@/context/crud';
import { useCanDeleteRecords } from '@/hooks/useCanDeleteRecords';

function AddNewItem({ config }) {
  const { crudContextAction } = useCrudContext();
  const { collapsedBox, panel } = crudContextAction;
  const { ADD_NEW_ENTITY } = config;

  const handelClick = () => {
    panel.open();
    collapsedBox.close();
  };

  return (
    <Button onClick={handelClick} type="primary">
      {ADD_NEW_ENTITY}
    </Button>
  );
}
export default function DataTable({ config, extra = [] }) {
  let { entity, dataTableColumns, DATATABLE_TITLE, fields, searchConfig, listSummary } = config;
  const { crudContextAction } = useCrudContext();
  const { panel, collapsedBox, modal, readBox, editBox, advancedBox } = crudContextAction;
  const translate = useLanguage();
  const showDelete = useCanDeleteRecords();
  const { moneyFormatter } = useMoney();
  const { dateFormat } = useDate();

  const items = [
    {
      label: translate('Show'),
      key: 'read',
      icon: <EyeOutlined />,
    },
    {
      label: translate('Edit'),
      key: 'edit',
      icon: <EditOutlined />,
    },
    ...extra,
    {
      type: 'divider',
    },

    {
      label: translate('Delete'),
      key: 'delete',
      icon: <DeleteOutlined />,
    },
  ];

  const handleRead = (record) => {
    dispatch(crud.currentItem({ data: record }));
    panel.open();
    collapsedBox.open();
    readBox.open();
  };
  function handleEdit(record) {
    dispatch(crud.currentItem({ data: record }));
    dispatch(crud.currentAction({ actionType: 'update', data: record }));
    editBox.open();
    panel.open();
    collapsedBox.open();
  }
  function handleDelete(record) {
    dispatch(crud.currentAction({ actionType: 'delete', data: record }));
    modal.open();
  }

  function handleUpdatePassword(record) {
    dispatch(crud.currentItem({ data: record }));
    dispatch(crud.currentAction({ actionType: 'update', data: record }));
    advancedBox.open();
    panel.open();
    collapsedBox.open();
  }

  let dispatchColumns = [];
  if (Array.isArray(dataTableColumns) && dataTableColumns.length > 0) {
    dispatchColumns = [...dataTableColumns];
  } else if (fields) {
    dispatchColumns = [...dataForTable({ fields, translate, moneyFormatter, dateFormat })];
  } else {
    dispatchColumns = Array.isArray(dataTableColumns) ? [...dataTableColumns] : [];
  }

  dataTableColumns = [
    ...dispatchColumns,
    {
      title: '',
      key: 'action',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleRead(record)}>
            {translate('show')}
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            {translate('edit')}
          </Button>
          {showDelete ? (
            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
              {translate('delete')}
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  // 使用按 entity 分離的 selector
  const selectListByEntity = selectListItemsByEntity(entity);
  const { result: listResult, isLoading: listIsLoading } = useSelector(selectListByEntity);

  const { pagination, items: dataSource } = listResult;

  const dispatch = useDispatch();
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [listSearchOptions, setListSearchOptions] = useState({});

  const buildListOptions = useCallback(
    (q, status) => {
      const options = {};
      const trimmed = String(q || '').trim();
      if (trimmed) {
        options.q = trimmed;
        options.fields = searchConfig?.searchFields || '';
      }
      const statusField = searchConfig?.statusFilter?.field || 'status';
      if (status) {
        options.filter = statusField;
        options.equal = status;
      }
      return options;
    },
    [searchConfig]
  );

  const applyListFilters = useCallback(
    (q, status) => {
      const options = buildListOptions(q, status);
      setListSearchOptions(options);
      dispatch(crud.list({ entity, options }));
    },
    [entity, dispatch, buildListOptions]
  );

  const handelDataTableLoad = useCallback((pagination) => {
    const options = {
      page: pagination.current || 1,
      items: pagination.pageSize || 10,
      ...listSearchOptions,
    };
    dispatch(crud.list({ entity, options }));
  }, [entity, dispatch, listSearchOptions]);

  const filterTable = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    applyListFilters(value, statusFilter);
  };

  const STATUS_FILTER_ALL = '__all__';

  const handleStatusFilterChange = (value) => {
    const next = value && value !== STATUS_FILTER_ALL ? value : undefined;
    setStatusFilter(next);
    applyListFilters(searchQuery, next);
  };

  useEffect(() => {
    setSearchQuery('');
    setStatusFilter(undefined);
    setListSearchOptions({});
    dispatch(crud.list({ entity }));
  }, [entity, dispatch]);

  useEffect(() => {
    if (!listIsLoading) {
      setSummaryRefreshKey((k) => k + 1);
    }
  }, [listIsLoading, pagination?.total, entity]);

  return (
    <>
      <PageHeader
        onBack={() => window.history.back()}
        backIcon={<ArrowLeftOutlined />}
        title={DATATABLE_TITLE}
        ghost={false}
        extra={[
          <Input
            key={`searchFilterDataTable}`}
            onChange={filterTable}
            placeholder={translate('search')}
            allowClear
            value={searchQuery}
            style={{ width: 200 }}
          />,
          searchConfig?.statusFilter?.options?.length ? (
            <Select
              key="statusFilterDataTable"
              placeholder={searchConfig.statusFilter.placeholder || translate('status')}
              value={statusFilter ?? STATUS_FILTER_ALL}
              onChange={handleStatusFilterChange}
              style={{ width: 140 }}
              options={[
                { value: STATUS_FILTER_ALL, label: '全部' },
                ...searchConfig.statusFilter.options.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                })),
              ]}
            />
          ) : null,
          <Button
            onClick={() => {
              handelDataTableLoad(pagination);
              if (listSummary) setSummaryRefreshKey((k) => k + 1);
            }}
            key={`${uniqueId()}`}
            icon={<RedoOutlined />}
          >
            {translate('Refresh')}
          </Button>,

          <AddNewItem key={`${uniqueId()}`} config={config} />,
        ]}
        style={{
          padding: '20px 0px',
        }}
      ></PageHeader>

      {listSummary && isValidElement(listSummary)
        ? cloneElement(listSummary, {
            refreshKey: summaryRefreshKey,
            searchQuery,
            searchFields: searchConfig?.searchFields || '',
            statusFilter,
            statusFilterField: searchConfig?.statusFilter?.field || 'status',
          })
        : null}

      <Table
        columns={dataTableColumns}
        rowKey={(item) => item._id}
        dataSource={dataSource}
        pagination={pagination}
        loading={listIsLoading}
        onChange={handelDataTableLoad}
        scroll={{ x: true }}
      />
    </>
  );
}
