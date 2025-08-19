import React, { useEffect, useState } from 'react';
import { Table } from 'antd';
import axios from 'axios';

const InventoryRecordList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/inventory/record');
      setData(res.data);
    } catch (err) {
      // 可加提示
    }
    setLoading(false);
  };

  const columns = [
    {
      title: '入庫單號',
      dataIndex: 'billNumber',
      key: 'billNumber',
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (text) => text ? new Date(text).toLocaleDateString() : '',
    },
    {
      title: '操作人員',
      dataIndex: ['owner', 'surname'],
      key: 'owner',
      render: (_, record) => record.owner?.surname || record.owner?.lastName || record.owner?._id || '',
    },
  ];

  const expandedRowRender = (record) => (
    <Table
      columns={[
        { title: '物品名稱', dataIndex: ['item', 'name'], key: 'name', render: (_, r) => r.item?.name },
        { title: 'SKU', dataIndex: ['item', 'sku'], key: 'sku', render: (_, r) => r.item?.sku },
        { title: '數量', dataIndex: 'unit', key: 'unit' },
        { title: '類型', dataIndex: 'type', key: 'type', render: (t) => t === 'in' ? '入庫' : '出庫' },
      ]}
      dataSource={record.items}
      rowKey={(r) => r.item?._id + '-' + r.type}
      pagination={false}
      size="small"
    />
  );

  return (
    <div>
      <h2>入庫記錄</h2>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 20 }}
        expandable={{ expandedRowRender }}
      />
    </div>
  );
};

export default InventoryRecordList;
