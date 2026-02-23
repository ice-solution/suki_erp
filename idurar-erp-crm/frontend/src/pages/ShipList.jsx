import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tag } from 'antd';
import CrudModule from '@/modules/CrudModule/CrudModule';
import { fields } from './ShipList/config';
import ShipForm from './ShipList/ShipForm';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';
import { useDate, useMoney } from '@/settings';
import dayjs from 'dayjs';

export default function ShipList() {
  const translate = useLanguage();
  const { dateFormat } = useDate();
  const { moneyFormatter } = useMoney();
  const entity = 'ship';
  const searchConfig = {
    displayLabels: ['registrationNumber'],
    searchFields: 'registrationNumber',
  };
  const deleteModalLabels = ['registrationNumber'];

  // 存儲 supplierNumber -> { id, address } 的映射
  const [supplierQuoteMap, setSupplierQuoteMap] = useState({});

  // 根據 supplierNumber 查找 SupplierQuote 的 _id 和 address（Project Address）
  const findSupplierQuoteInfo = async (supplierNumber) => {
    if (!supplierNumber) return null;
    const cached = supplierQuoteMap[supplierNumber];
    if (cached) return typeof cached === 'object' ? cached : { id: cached, address: null };

    try {
      const response = await request.search({
        entity: 'supplierquote',
        options: { q: supplierNumber, fields: 'numberPrefix,number' }
      });

      if (response.success && response.result && response.result.length > 0) {
        const matchedQuote = response.result.find(quote => {
          const quoteNumber = `${quote.numberPrefix || 'S'}-${quote.number}`;
          return quoteNumber === supplierNumber;
        });

        if (matchedQuote) {
          const info = { id: matchedQuote._id, address: matchedQuote.address || null };
          setSupplierQuoteMap(prev => ({ ...prev, [supplierNumber]: info }));
          return info;
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
    
    // 登記號碼列（唯一識別）
    baseColumns.push({
      title: translate('registrationNumber') || '登記號碼',
      dataIndex: 'registrationNumber',
      key: 'registrationNumber',
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
        const info = supplierQuoteMap[supplierNumber];
        const quoteId = typeof info === 'object' ? info?.id : info;
        if (quoteId) {
          return (
            <Link
              to={`/supplierquote/read/${quoteId}`}
              style={{ color: '#1890ff', textDecoration: 'none' }}
            >
              {supplierNumber}
            </Link>
          );
        }
        findSupplierQuoteInfo(supplierNumber);
        return (
          <span style={{ color: '#1890ff', cursor: 'pointer' }}>
            {supplierNumber}
          </span>
        );
      },
    });

    // Project Address列（對應 Supplier Quote 的 address）
    baseColumns.push({
      title: translate('Project Address') || 'Project Address',
      dataIndex: 'supplierNumber',
      key: 'projectAddress',
      render: (supplierNumber, record) => {
        if (!supplierNumber || record.status !== 'in_use') {
          return '-';
        }
        const info = supplierQuoteMap[supplierNumber];
        const address = typeof info === 'object' ? info?.address : null;
        if (address) return address;
        findSupplierQuoteInfo(supplierNumber);
        return '-';
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
    PANEL_TITLE: translate('ship') || '船隻管理',
    DATATABLE_TITLE: translate('ship_list') || '船隻列表',
    ADD_NEW_ENTITY: translate('add_new_ship') || '添加新船隻',
    ENTITY_NAME: translate('ship') || '船隻',
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
      createForm={<ShipForm isUpdateForm={false} />}
      updateForm={<ShipForm isUpdateForm={true} />}
      config={config}
    />
  );
}




