import React, { useEffect, useState } from 'react';
import { Table, Button, Popconfirm, message, Modal, Form, Input, Select } from 'antd';
import axios from 'axios';

const AdminUserList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/admin');
      setData(res.data);
    } catch (err) {
      message.error('載入失敗');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/admin/${id}`);
      message.success('刪除成功');
      fetchData();
    } catch (err) {
      message.error('刪除失敗');
    }
  };

  const handleCreate = () => {
    form.validateFields().then(async (values) => {
      try {
        await axios.post('/admin', values);
        message.success('新增成功');
        setModalVisible(false);
        form.resetFields();
        fetchData();
      } catch (err) {
        message.error('新增失敗');
      }
    });
  };

  const columns = [
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '角色', dataIndex: 'role', key: 'role' },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Popconfirm title="確定要刪除嗎？" onConfirm={() => handleDelete(record._id)}>
          <Button danger size="small">刪除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <h2>管理員用戶列表</h2>
      <Button type="primary" style={{ marginBottom: 16 }} onClick={() => setModalVisible(true)}>
        新增管理員
      </Button>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />
      <Modal
        title="新增管理員"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleCreate}
        okText="新增"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Email" name="email" rules={[{ required: true, message: '請輸入Email' }]}> 
            <Input />
          </Form.Item>
          <Form.Item label="姓名" name="name" rules={[{ required: true, message: '請輸入姓名' }]}> 
            <Input />
          </Form.Item>
          <Form.Item label="角色" name="role" rules={[{ required: true, message: '請輸入角色' }]}> 
            <Select options={[
              { value: 'owner', label: 'owner' },
              { value: 'admin', label: 'admin' },
              { value: 'user', label: 'user' }
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminUserList; 