import React, { useEffect, useState } from 'react';
import { Table, Button, Popconfirm, message, Modal, Form, Input, Select } from 'antd';
import axios from 'axios';

const ContractorEmployeeList = () => {
  const [data, setData] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
    fetchContractors();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/contractor-employee');
      setData(res.data);
    } catch (err) {
      message.error('載入失敗');
    }
    setLoading(false);
  };

  const fetchContractors = async () => {
    try {
      const res = await axios.get('/contractor');
      setContractors(res.data);
    } catch (err) {
      message.error('載入承辦商失敗');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/contractor-employee/${id}`);
      message.success('刪除成功');
      fetchData();
    } catch (err) {
      message.error('刪除失敗');
    }
  };

  const handleCreate = () => {
    form.validateFields().then(async (values) => {
      try {
        await axios.post('/contractor-employee', values);
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
        await axios.put(`/contractor-employee/${editingItem._id}`, values);
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
      form.setFieldsValue({
        ...item,
        contractor: item.contractor?._id || item.contractor
      });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const columns = [
    { title: '員工姓名', dataIndex: 'name', key: 'name' },
    { 
      title: '承辦商', 
      dataIndex: 'contractor', 
      key: 'contractor',
      render: (contractor) => contractor?.name || contractor
    },
    { title: '職位', dataIndex: 'position', key: 'position' },
    { title: '電話', dataIndex: 'phone', key: 'phone' },
    { title: '電郵', dataIndex: 'email', key: 'email' },
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
      <h2>承辦商員工列表</h2>
      <Button type="primary" style={{ marginBottom: 16 }} onClick={() => showModal()}>
        新增員工
      </Button>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />
      <Modal
        title={editingItem ? '編輯員工' : '新增員工'}
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
          <Form.Item label="員工姓名" name="name" rules={[{ required: true, message: '請輸入員工姓名' }]}> 
            <Input />
          </Form.Item>
          <Form.Item label="承辦商" name="contractor" rules={[{ required: true, message: '請選擇承辦商' }]}> 
            <Select placeholder="請選擇承辦商">
              {contractors.map(contractor => (
                <Select.Option key={contractor._id} value={contractor._id}>
                  {contractor.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="職位" name="position"> 
            <Input />
          </Form.Item>
          <Form.Item 
            label="電話" 
            name="phone" 
            rules={[
              { required: true, message: '請輸入電話號碼' },
              { 
                pattern: /^(\+852|852)?[5-9]\d{7}$|^(\+886|886)?09\d{8}$|^09\d{8}$|^[5-9]\d{7}$/,
                message: '請輸入有效的手機號碼'
              }
            ]}
          > 
            <Input placeholder="例如：98765432 或 +85298765432" />
          </Form.Item>
          <Form.Item label="電郵" name="email"> 
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ContractorEmployeeList; 