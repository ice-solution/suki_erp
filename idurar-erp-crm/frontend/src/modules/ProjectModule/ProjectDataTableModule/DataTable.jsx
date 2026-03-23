import { useEffect, useMemo, useState } from 'react';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  RedoOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { Table, Button, Space, Input, message } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';

import { useSelector, useDispatch } from 'react-redux';
import useLanguage from '@/locale/useLanguage';
import { erp } from '@/redux/erp/actions';
import { selectListItems } from '@/redux/erp/selectors';
import { useErpContext } from '@/context/erp';
import { generate as uniqueId } from 'shortid';
import { useNavigate } from 'react-router-dom';
import { request } from '@/request';

function AddNewItem({ config }) {
  const navigate = useNavigate();
  const { entity, ADD_NEW_ENTITY } = config;

  const handelClick = () => {
    navigate(`/${entity.toLowerCase()}/create`);
  };

  return (
    <Button onClick={handelClick} type="primary" icon={<PlusOutlined />}>
      {ADD_NEW_ENTITY}
    </Button>
  );
}

export default function DataTable({ config, extra = [] }) {
  const translate = useLanguage();
  let { entity, dataTableColumns, disableAdd = false, searchConfig } = config;

  const { DATATABLE_TITLE } = config;

  const { result: listResult, isLoading: listIsLoading } = useSelector(selectListItems);

  const { pagination, items: dataSource } = listResult || { pagination: {}, items: [] };

  const { erpContextAction } = useErpContext();
  const { modal } = erpContextAction;

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

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleRead = (record) => {
    dispatch(erp.currentItem({ data: record }));
    navigate(`/${entity}/read/${record._id}`);
  };
  
  const handleEdit = (record) => {
    const data = { ...record };
    dispatch(erp.currentAction({ actionType: 'update', data }));
    navigate(`/${entity}/update/${record._id}`);
  };

  const handleDelete = (record) => {
    dispatch(erp.currentAction({ actionType: 'delete', data: record }));
    modal.open();
  };

  dataTableColumns = [
    ...dataTableColumns,
    {
      title: '',
      key: 'action',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleRead(record)}>
            {translate('show')}
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            {translate('edit')}
          </Button>
        </Space>
      ),
    },
  ];

  const handelDataTableLoad = (pagination) => {
    const options = { page: pagination.current || 1, items: pagination.pageSize || 10 };
    dispatch(erp.list({ entity, options }));
  };

  const dispatcher = () => {
    dispatch(erp.list({ entity }));
  };

  useEffect(() => {
    const controller = new AbortController();
    dispatcher();
    return () => {
      controller.abort();
    };
  }, []);

  // Project list：支援真正的文字搜尋（後端 project/search）
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const searchFields = useMemo(() => {
    return searchConfig?.searchFields || 'name';
  }, [searchConfig]);

  const handleSearch = async (keyword) => {
    const q = (keyword || '').trim();
    setSearchKeyword(keyword);

    if (!q) {
      setSearching(false);
      setSearchResults([]);
      dispatcher();
      return;
    }

    setSearching(true);
    try {
      const res = await request.search({
        entity: searchConfig?.entity || entity,
        options: { q, fields: searchFields },
      });
      setSearchResults((res && res.success && Array.isArray(res.result) ? res.result : []) || []);
    } catch (err) {
      console.error('Project list search failed:', err);
      message.error('搜尋失敗');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <PageHeader
        title={DATATABLE_TITLE}
        ghost={true}
        onBack={() => window.history.back()}
        backIcon={<ArrowLeftOutlined />}
        extra={[
          searchConfig ? (
            <Input.Search
              key={`${uniqueId()}`}
              allowClear
              placeholder={translate('Search')}
              style={{ minWidth: 240 }}
              value={searchKeyword}
              loading={searching}
              onChange={(e) => {
                const v = e.target.value;
                setSearchKeyword(v);
                if (!v.trim()) {
                  setSearchResults([]);
                  dispatcher();
                }
              }}
              onSearch={(value) => handleSearch(value)}
              enterButton
            />
          ) : null,
          <Button onClick={handelDataTableLoad} key={`${uniqueId()}`} icon={<RedoOutlined />}>
            {translate('Refresh')}
          </Button>,

          !disableAdd && <AddNewItem config={config} key={`${uniqueId()}`} />,
        ]}
        style={{
          padding: '20px 0px',
        }}
      ></PageHeader>

      <Table
        columns={dataTableColumns}
        rowKey={(item) => item._id}
        dataSource={Array.isArray(searchResults) && searchKeyword.trim() ? searchResults : Array.isArray(dataSource) ? dataSource : []}
        pagination={searchKeyword.trim() ? false : pagination || {}}
        loading={listIsLoading}
        onChange={searchKeyword.trim() ? undefined : handelDataTableLoad}
        scroll={{ x: true }}
      />
    </>
  );
}
