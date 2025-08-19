import React, { useState } from 'react';
import { Form, Input, Button, DatePicker, Table, Space, InputNumber, message } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';

const InventoryInbound = () => {
  const [form] = Form.useForm();
  const [items, setItems] = useState([
    { key: 0, sku: '', name: '', unit: '', cost: 0, quantity: 1 }
  ]);
  const [loading, setLoading] = useState(false);

  const addItem = () => {
    setItems([...items, { key: Date.now(), sku: '', name: '', unit: '', cost: 0, quantity: 1 }]);
  };

  const removeItem = (key) => {
    setItems(items.filter(item => item.key !== key));
  };

  const handleItemChange = (key, field, value) => {
    setItems(items.map(item => item.key === key ? { ...item, [field]: value } : item));
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = {
        billNumber: values.billNumber,
        date: values.date.format('YYYY-MM-DD'),
        items: items.map(({ key, ...rest }) => rest)
      };
      await axios.post('/inventory/inbound', payload);
      message.success('入庫成功！');
      form.resetFields();
      setItems([{ key: 0, sku: '', name: '', unit: '', cost: 0, quantity: 1 }]);
    } catch (err) {
      message.error('入庫失敗，請檢查資料或權限');
    }
    setLoading(false);
  };

  const columns = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      render: (text, record) => (
        <Input value={text} onChange={e => handleItemChange(record.key, 'sku', e.target.value)} />
      ),
    },
    {
      title: '名稱',
      dataIndex: 'name',
      render: (text, record) => (
        <Input value={text} onChange={e => handleItemChange(record.key, 'name', e.target.value)} />
      ),
    },
    {
      title: '單位',
      dataIndex: 'unit',
      render: (text, record) => (
        <Input value={text} onChange={e => handleItemChange(record.key, 'unit', e.target.value)} />
      ),
    },
    {
      title: '成本',
      dataIndex: 'cost',
      render: (text, record) => (
        <InputNumber min={0} value={text} onChange={v => handleItemChange(record.key, 'cost', v)} />
      ),
    },
    {
      title: '數量',
      dataIndex: 'quantity',
      render: (text, record) => (
        <InputNumber min={1} value={text} onChange={v => handleItemChange(record.key, 'quantity', v)} />
      ),
    },
    {
      title: '操作',
      dataIndex: 'action',
      render: (_, record) => (
        <Button danger onClick={() => removeItem(record.key)} disabled={items.length === 1}>刪除</Button>
      ),
    },
  ];

  return (
    <div>
      <h2>入庫作業</h2>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item label="帳單號碼" name="billNumber" rules={[{ required: true, message: '請輸入帳單號碼' }]}> 
          <Input />
        </Form.Item>
        <Form.Item label="日期" name="date" rules={[{ required: true, message: '請選擇日期' }]}> 
          <DatePicker format="YYYY-MM-DD" />
        </Form.Item>
        <Table
          columns={columns}
          dataSource={items}
          pagination={false}
          rowKey="key"
          footer={() => <Button onClick={addItem} type="dashed" block>+ 新增明細</Button>}
        />
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} style={{ marginTop: 16 }}>入庫</Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default InventoryInbound; 