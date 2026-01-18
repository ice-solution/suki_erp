import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Tag } from 'antd';
import CrudModule from '@/modules/CrudModule/CrudModule';
import { fields } from './WinchList/config';
import WinchForm from './WinchList/WinchForm';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';
import { useDate, useMoney } from '@/settings';
import dayjs from 'dayjs';

export default function WinchList() {
  const translate = useLanguage();
  const { dateFormat } = useDate();
  const { moneyFormatter } = useMoney();
  const entity = 'winch';
  const searchConfig = {
    displayLabels: ['name'],
    searchFields: 'name',
  };
  const deleteModalLabels = ['name'];

  // 存儲supplierNumber到SupplierQuote _id的映射
  const [supplierQuoteMap, setSupplierQuoteMap] = useState({});

  // 根據supplierNumber查找SupplierQuote的_id
  const findSupplierQuoteId = async (supplierNumber) => {
    if (!supplierNumber) return null;
    if (supplierQuoteMap[supplierNumber]) return supplierQuoteMap[supplierNumber];

    try {
      const response = await request.search({
        entity: 'supplierquote',
        options: { q: supplierNumber, fields: 'numberPrefix,number' }
      });

      if (response.success && response.result && response.result.length > 0) {
        // 精確匹配supplierNumber（格式：numberPrefix-number）
        const matchedQuote = response.result.find(quote => {
          const quoteNumber = `${quote.numberPrefix || 'S'}-${quote.number}`;
          return quoteNumber === supplierNumber;
        });

        if (matchedQuote) {
          setSupplierQuoteMap(prev => ({ ...prev, [supplierNumber]: matchedQuote._id }));
          return matchedQuote._id;
        }
      }
    } catch (error) {
      console.error('查找SupplierQuote失敗:', error);
    }
    return null;
  };

  // 從fields生成基本的列定義
  const getBaseColumns = () => {
    const baseColumns = [];
    
    // Name列
    baseColumns.push({
      title: translate('name') || '名稱',
      dataIndex: 'name',
      key: 'name',
    });

    // Serial Number列
    baseColumns.push({
      title: translate('serialNumber') || '序列號',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
      render: (text) => text || '-',
    });

    // Status列
    baseColumns.push({
      title: translate('status') || '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusOptions = fields.status.options;
        const selectedOption = statusOptions.find(opt => opt.value === status);
        return (
          <Tag bordered={false} color={selectedOption?.color}>
            {selectedOption?.label || status}
          </Tag>
        );
      },
    });

    // Supplier Number列（可點擊）
    baseColumns.push({
      title: translate('Supplier Quote Number') || 'Supplier Quote Number',
      dataIndex: 'supplierNumber',
      key: 'supplierNumber',
      render: (supplierNumber, record) => {
        if (!supplierNumber || record.status !== 'in_use') {
          return '-';
        }
        
        // 使用useState存儲的映射，或異步查找
        const quoteId = supplierQuoteMap[supplierNumber];
        
        if (quoteId) {
          return (
            <Link
              to={`/supplierquote/read/${quoteId}`}
              style={{ color: '#1890ff', textDecoration: 'none' }}
            >
              {supplierNumber}
            </Link>
          );
        } else {
          // 如果還沒有映射，異步查找
          findSupplierQuoteId(supplierNumber);
          return (
            <span style={{ color: '#1890ff', cursor: 'pointer' }}>
              {supplierNumber}
            </span>
          );
        }
      },
    });

    // Expired Date列（到期日）
    baseColumns.push({
      title: translate('expired Date') || '到期日',
      dataIndex: 'expiredDate',
      key: 'expiredDate',
      render: (date) => {
        return date ? dayjs(date).format(dateFormat) : '-';
      },
    });

    // Description列
    baseColumns.push({
      title: translate('description') || '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || '-',
    });

    return baseColumns;
  };

  const dataTableColumns = getBaseColumns();

  const Labels = {
    PANEL_TITLE: translate('winch') || '爬攬器管理',
    DATATABLE_TITLE: translate('winch_list') || '爬攬器列表',
    ADD_NEW_ENTITY: translate('add_new_winch') || '添加新爬攬器',
    ENTITY_NAME: translate('winch') || '爬攬器',
  };
  const configPage = {
    entity,
    ...Labels,
  };
  const config = {
    ...configPage,
    dataTableColumns, // 使用自定義列
    searchConfig,
    deleteModalLabels,
  };
  return (
    <CrudModule
      createForm={<WinchForm isUpdateForm={false} />}
      updateForm={<WinchForm isUpdateForm={true} />}
      config={config}
    />
  );
}





