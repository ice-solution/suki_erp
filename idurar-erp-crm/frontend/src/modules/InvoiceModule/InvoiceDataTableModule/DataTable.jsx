import { useEffect, useState } from 'react';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  RedoOutlined,
  PlusOutlined,
  EllipsisOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Dropdown, Table, Button, Input } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';

import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import { useSelector, useDispatch } from 'react-redux';
import useLanguage from '@/locale/useLanguage';
import { erp } from '@/redux/erp/actions';
import { selectListItems } from '@/redux/erp/selectors';
import { useErpContext } from '@/context/erp';
import { generate as uniqueId } from 'shortid';
import { useNavigate } from 'react-router-dom';

import { DOWNLOAD_BASE_URL } from '@/config/serverApiConfig';

function AddNewItem({ config }) {
  const navigate = useNavigate();
  const { entity, ADD_NEW_ENTITY } = config;

  const handelClick = () => {
    navigate(`/${entity.toLowerCase()}/table/create`);
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
  const { result: searchResult, isLoading: searchIsLoading } = useSelector(state => state.erp.search);

  const [searchValue, setSearchValue] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  
  // 根據是否在搜索模式決定使用哪個數據源
  const currentData = isSearchMode ? 
    { pagination: {}, items: Array.isArray(searchResult) ? searchResult : [] } : 
    (listResult || { pagination: {}, items: [] });
  
  const { pagination, items: dataSource } = currentData;

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
    {
      label: translate('Download'),
      key: 'download',
      icon: <FilePdfOutlined />,
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
    navigate(`/${entity}/table/update/${record._id}`);
  };

  const handleDownload = (record) => {
    window.open(`${DOWNLOAD_BASE_URL}${entity}/${entity}-${record._id}.pdf`, '_blank');
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
      width: 1,
      render: (_, record) => (
        <Dropdown
          menu={{
            items,
            onClick: ({ key }) => {
              switch (key) {
                case 'read':
                  handleRead(record);
                  break;
                case 'edit':
                  handleEdit(record);
                  break;
                case 'download':
                  handleDownload(record);
                  break;
                case 'delete':
                  handleDelete(record);
                  break;
                default:
                  break;
              }
            },
          }}
          trigger={['click']}
        >
          <EllipsisOutlined
            style={{
              cursor: 'pointer',
              fontSize: '24px',
            }}
            onClick={(e) => e.preventDefault()}
          />
        </Dropdown>
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

  const handleSearchInput = (e) => {
    setSearchValue(e.target.value);
  };

  const handleSearchSubmit = (value) => {
    // 立即搜索（當用戶按Enter或點擊搜索按鈕時）
    if (value && value.trim()) {
      setIsSearchMode(true);
      const options = { 
        q: value.trim(), 
        fields: 'address,number,numberPrefix,invoiceNumber' 
      };
      dispatch(erp.search({ entity, options }));
    } else {
      setIsSearchMode(false);
      dispatch(erp.list({ entity }));
    }
  };

  const handleClearSearch = () => {
    setSearchValue('');
    setIsSearchMode(false);
    dispatch(erp.list({ entity }));
  };

  const filterTable = (value) => {
    // 保持舊的邏輯以防其他地方調用
    setSearchValue(value || '');
    handleSearchSubmit(value);
  };

  return (
    <>
      <PageHeader
        title={DATATABLE_TITLE}
        ghost={true}
        onBack={() => window.history.back()}
        backIcon={<ArrowLeftOutlined />}
        extra={[
          <Button onClick={handelDataTableLoad} key="refresh-button" icon={<RedoOutlined />}>
            {translate('Refresh')}
          </Button>,

          !disableAdd && <AddNewItem config={config} key="add-new-button" />,
        ]}
        style={{
          padding: '20px 0px',
        }}
      ></PageHeader>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Input.Search
          placeholder="搜索地址、Invoice號碼或P.O Number"
          value={searchValue}
          onChange={handleSearchInput}
          onSearch={handleSearchSubmit}
          onPressEnter={(e) => handleSearchSubmit(e.target.value)}
          style={{ width: 350 }}
          allowClear
          onClear={handleClearSearch}
        />
      </div>

      <Table
        columns={dataTableColumns}
        rowKey={(item) => item._id}
        dataSource={Array.isArray(dataSource) ? dataSource : []}
        pagination={isSearchMode ? false : (pagination || {})}
        loading={isSearchMode ? searchIsLoading : listIsLoading}
        onChange={isSearchMode ? undefined : handelDataTableLoad}
        scroll={{ x: true }}
      />
    </>
  );
}
