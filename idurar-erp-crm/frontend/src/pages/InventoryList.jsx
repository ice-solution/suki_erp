import React, { useEffect, useState } from 'react';
import { Table, Button, Space } from 'antd';
import axios from 'axios';

const InventoryList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/inventory');
      setData(res.data);
    } catch (err) {
      // 可加提示
    }
    setLoading(false);
  };

  const columns = [
    {
      title: '倉存名稱',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '單位',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: '成本',
      dataIndex: 'cost',
      key: 'cost',
      render: (cost) => cost?.toLocaleString(),
    },
    {
      title: '建立時間',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => text ? new Date(text).toLocaleString() : '',
    },
    {
      title: '修改時間',
      dataIndex: 'modified_at',
      key: 'modified_at',
      render: (text) => text ? new Date(text).toLocaleString() : '',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link">編輯</Button>
          <Button type="link" danger>刪除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h2>存倉列表</h2>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />
    </div>
  );
};

export default InventoryList; 