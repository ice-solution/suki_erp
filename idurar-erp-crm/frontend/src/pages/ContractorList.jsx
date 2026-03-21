import React, { useEffect, useState } from 'react';
import { Table, Button, Popconfirm, message, Modal, Form, Input, Tag, Space } from 'antd';
import { KeyOutlined } from '@ant-design/icons';
import axios from 'axios';

const ContractorList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchAccountCode, setSearchAccountCode] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [loginForm] = Form.useForm();

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

  const handleSetLoginCredentials = (contractor) => {
    setSelectedContractor(contractor);
    loginForm.setFieldsValue({
      username: contractor.username || ''
    });
    setLoginModalVisible(true);
  };

  const handleSaveLoginCredentials = async () => {
    try {
      const values = await loginForm.validateFields();
      const response = await axios.post(
        `/contractor/${selectedContractor._id}/set-login-credentials`,
        {
          username: values.username,
          password: values.password
        }
      );
      
      if (response.data.success) {
        message.success('登入憑證設置成功');
        setLoginModalVisible(false);
        loginForm.resetFields();
        fetchData(); // 重新載入數據以顯示更新後的 username
      } else {
        message.error(response.data.message || '設置失敗');
      }
    } catch (error) {
      console.error('設置登入憑證失敗:', error);
      message.error(error.response?.data?.message || '設置登入憑證失敗');
    }
  };

  const columns = [
    { title: '承辦商名稱', dataIndex: 'name', key: 'name' },
    { title: 'Account Code', dataIndex: 'accountCode', key: 'accountCode' },
    { 
      title: '登入用戶名', 
      dataIndex: 'username', 
      key: 'username',
      render: (username) => username ? <Tag color="green">{username}</Tag> : <Tag color="default">未設置</Tag>
    },
    { title: '電話', dataIndex: 'phone', key: 'phone' },
    { title: '電郵', dataIndex: 'email', key: 'email' },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <div>
          <Button 
            type="link" 
            icon={<KeyOutlined />}
            onClick={() => handleSetLoginCredentials(record)}
            size="small"
          >
            設置登入
          </Button>
          <Button type="link" onClick={() => showModal(record)} size="small">編輯</Button>
          <Popconfirm title="確定要刪除嗎？" onConfirm={() => handleDelete(record._id)}>
            <Button type="link" danger size="small">刪除</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const filteredData = data.filter((item) => {
    const name = (item?.name || '').toString();
    const accountCode = (item?.accountCode || '').toString();
    const nameOk = !searchName || name.toLowerCase().includes(searchName.trim().toLowerCase());
    const codeOk = !searchAccountCode || accountCode.toLowerCase().includes(searchAccountCode.trim().toLowerCase());
    return nameOk && codeOk;
  });

  return (
    <div>
      <h2>承辦商列表</h2>
      <Button type="primary" style={{ marginBottom: 16 }} onClick={() => showModal()}>
        新增承辦商
      </Button>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜尋承辦商名稱"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          allowClear
          style={{ width: 240 }}
        />
        <Input
          placeholder="搜尋 Account Code"
          value={searchAccountCode}
          onChange={(e) => setSearchAccountCode(e.target.value)}
          allowClear
          style={{ width: 200 }}
        />
        <Button
          onClick={() => {
            setSearchName('');
            setSearchAccountCode('');
          }}
        >
          清除
        </Button>
      </Space>
      <Table
        columns={columns}
        dataSource={filteredData}
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
          <Form.Item label="Account Code" name="accountCode"> 
            <Input placeholder="帳戶代碼" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 設置登入憑證 Modal */}
      <Modal
        title={`設置登入憑證 - ${selectedContractor?.name || ''}`}
        open={loginModalVisible}
        onCancel={() => {
          setLoginModalVisible(false);
          loginForm.resetFields();
          setSelectedContractor(null);
        }}
        onOk={handleSaveLoginCredentials}
        okText="設置"
        cancelText="取消"
      >
        <Form form={loginForm} layout="vertical">
          <Form.Item 
            label="用戶名" 
            name="username" 
            rules={[{ required: true, message: '請輸入用戶名' }]}
          > 
            <Input placeholder="請輸入登入用戶名" />
          </Form.Item>
          <Form.Item 
            label="密碼" 
            name="password" 
            rules={[
              { required: true, message: '請輸入密碼' },
              { min: 6, message: '密碼長度至少需要6位' }
            ]}
          > 
            <Input.Password placeholder="請輸入密碼（至少6位）" />
          </Form.Item>
          <Form.Item 
            label="確認密碼" 
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '請確認密碼' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('兩次輸入的密碼不一致'));
                },
              }),
            ]}
          > 
            <Input.Password placeholder="請再次輸入密碼" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ContractorList; 