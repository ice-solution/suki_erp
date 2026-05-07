import React, { useEffect, useState } from 'react';
import { Table, message } from 'antd';
import dayjs from 'dayjs';
import { request } from '@/request';

const InventoryRecordList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await request.list({ entity: 'warehousetransaction', options: { page: 1, items: 50 } });
      setData(res?.result || []);
    } catch (err) {
      message.error('獲取庫存記錄失敗');
    }
    setLoading(false);
  };

  const columns = [
    {
      title: '日期',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 160,
      render: (v) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '類型',
      dataIndex: 'transactionTypeDisplay',
      key: 'transactionTypeDisplay',
      width: 100,
      render: (_, r) => r.transactionTypeDisplay || r.transactionType || '-',
    },
    {
      title: '貨品編號',
      dataIndex: ['warehouseInventory', 'sku'],
      key: 'sku',
      width: 120,
      render: (_, r) => r.warehouseInventory?.sku || '-',
    },
    {
      title: '貨品名稱',
      dataIndex: ['warehouseInventory', 'itemName'],
      key: 'itemName',
      width: 160,
      render: (_, r) => r.warehouseInventory?.itemName || '-',
    },
    {
      title: '倉庫',
      dataIndex: ['warehouseInventory', 'warehouse'],
      key: 'warehouse',
      width: 80,
      render: (_, r) => r.warehouseInventory?.warehouse || '-',
    },
    {
      title: '變動',
      dataIndex: 'quantityChange',
      key: 'quantityChange',
      width: 80,
      render: (v) => (v != null ? v : '-'),
    },
    {
      title: '前→後',
      key: 'beforeAfter',
      width: 110,
      render: (_, r) =>
        `${r.quantityBefore != null ? r.quantityBefore : '-'} → ${r.quantityAfter != null ? r.quantityAfter : '-'}`,
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '備註',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: '操作人',
      dataIndex: ['createdBy', 'name'],
      key: 'createdBy',
      width: 100,
      render: (_, r) => r.createdBy?.name || '-',
    },
  ];

  return (
    <div>
      <h2>庫存記錄</h2>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1200 }}
      />
    </div>
  );
};

export default InventoryRecordList;
