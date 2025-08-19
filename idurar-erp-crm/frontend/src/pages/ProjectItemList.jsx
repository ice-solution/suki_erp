import React, { useEffect, useState } from 'react';
import { Table, Button, Popconfirm, message, Modal, Form, Input, InputNumber } from 'antd';
import axios from 'axios';

const ProjectItemList = () => {
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
      const res = await axios.get('/project-item');
      setData(res.data);
    } catch (err) {
      message.error('載入失敗');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/project-item/${id}`);
      message.success('刪除成功');
      fetchData();
    } catch (err) {
      message.error('刪除失敗');
    }
  };

  const handleCreate = () => {
    form.validateFields().then(async (values) => {
      try {
        await axios.post('/project-item', values);
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
        await axios.put(`/project-item/${editingItem._id}`, values);
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
    { title: '項目名稱', dataIndex: 'item_name', key: 'item_name' },
    { 
      title: '價格', 
      dataIndex: 'price', 
      key: 'price',
      render: (price) => price?.toLocaleString()
    },
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
      <h2>工程項目列表</h2>
      <Button type="primary" style={{ marginBottom: 16 }} onClick={() => showModal()}>
        新增項目
      </Button>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 20 }}
      />
      <Modal
        title={editingItem ? '編輯項目' : '新增項目'}
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
          <Form.Item label="項目名稱" name="item_name" rules={[{ required: true, message: '請輸入項目名稱' }]}> 
            <Input />
          </Form.Item>
          <Form.Item label="價格" name="price" rules={[{ required: true, message: '請輸入價格' }]}> 
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectItemList; 