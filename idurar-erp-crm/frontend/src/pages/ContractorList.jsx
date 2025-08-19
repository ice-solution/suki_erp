import React, { useEffect, useState } from 'react';
import { Table, Button, Popconfirm, message, Modal, Form, Input } from 'antd';
import axios from 'axios';

const ContractorList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/contractor');
      setData(res.data);
    } catch (err) {
      message.error('載入失敗');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/contractor/${id}`);
      message.success('刪除成功');
      fetchData();
    } catch (err) {
      message.error('刪除失敗');
    }
  };

  const handleCreate = () => {
    form.validateFields().then(async (values) => {
      try {
        await axios.post('/contractor', values);
        message.success('新增成功');
        setModalVisible(false);
        form.resetFields();
        fetchData();
      } catch (err) {
        message.error('新增失敗');
      }
    });
  };

  const handleEdit = () => {
    form.validateFields().then(async (values) => {
      try {
        await axios.put(`/contractor/${editingItem._id}`, values);
        message.success('編輯成功');
        setModalVisible(false);
        setEditingItem(null);
        form.resetFields();
        fetchData();
      } catch (err) {
        message.error('編輯失敗');
      }
    });
  };

  const showModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      form.setFieldsValue(item);
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const columns = [
    { title: '承辦商名稱', dataIndex: 'name', key: 'name' },
    { title: '電話', dataIndex: 'phone', key: 'phone' },
    { title: '電郵', dataIndex: 'email', key: 'email' },
    { title: '地址', dataIndex: 'address', key: 'address' },
    { title: '國家', dataIndex: 'country', key: 'country' },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <div>
          <Button type="link" onClick={() => showModal(record)}>編輯</Button>
          <Popconfirm title="確定要刪除嗎？" onConfirm={() => handleDelete(record._id)}>
            <Button type="link" danger>刪除</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <h2>承辦商列表</h2>
      <Button type="primary" style={{ marginBottom: 16 }} onClick={() => showModal()}>
        新增承辦商
      </Button>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />
      <Modal
        title={editingItem ? '編輯承辦商' : '新增承辦商'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingItem(null);
          form.resetFields();
        }}
        onOk={editingItem ? handleEdit : handleCreate}
        okText={editingItem ? '更新' : '新增'}
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="承辦商名稱" name="name" rules={[{ required: true, message: '請輸入承辦商名稱' }]}> 
            <Input />
          </Form.Item>
          <Form.Item label="電話" name="phone"> 
            <Input />
          </Form.Item>
          <Form.Item label="電郵" name="email"> 
            <Input />
          </Form.Item>
          <Form.Item label="地址" name="address"> 
            <Input />
          </Form.Item>
          <Form.Item label="國家" name="country"> 
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ContractorList; 