import React, { useEffect, useState } from 'react';
import { Table, Button, Popconfirm, message, Modal, Form, Input, Select, DatePicker, InputNumber, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import { request } from '@/request';

const ProjectList = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [projectItems, setProjectItems] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
    fetchContractors();
    fetchProjectItems();
    fetchProjectTypes();
    fetchClients();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/project');
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



  const fetchProjectItems = async () => {
    try {
      const res = await axios.get('/project-item');
      setProjectItems(res.data);
    } catch (err) {
      message.error('載入工程項目失敗');
    }
  };

  const fetchProjectTypes = async () => {
    try {
      const res = await request.listAll({ entity: 'projecttype' });
      setProjectTypes(res.result || []);
    } catch (err) {
      console.error('獲取項目類型失敗:', err);
      message.error('載入項目類型失敗');
    }
  };

  const fetchClients = async () => {
    try {
      const res = await request.listAll({ entity: 'client' });
      setClients(res.result || []);
    } catch (err) {
      message.error('載入客戶失敗');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/project/${id}`);
      message.success('刪除成功');
      fetchData();
    } catch (err) {
      message.error('刪除失敗');
    }
  };

  const handleCreate = () => {
    form.validateFields().then(async (values) => {
      try {
        const formData = {
          ...values,
          startDate: values.startDate?.toDate(),
          endDate: values.endDate?.toDate(),
        };
        // createdBy 會由後端自動設置為當前登入用戶
        await axios.post('/project', formData);
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
        const formData = {
          ...values,
          startDate: values.startDate?.toDate(),
          endDate: values.endDate?.toDate(),
        };
        await axios.put(`/project/${editingItem._id}`, formData);
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
        client: item.client?._id || item.client, // 處理客戶ID
        startDate: item.startDate ? dayjs(item.startDate) : null,
        endDate: item.endDate ? dayjs(item.endDate) : null,
        contractor: item.contractor?._id || item.contractor,
        invoice: item.invoice?._id || item.invoice,
        quotation: item.quotation?._id || item.quotation,
      });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'orange';
      case 'in_progress': return 'blue';
      case 'completed': return 'green';
      case 'cancelled': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '待處理';
      case 'in_progress': return '進行中';
      case 'completed': return '已完成';
      case 'cancelled': return '已取消';
      default: return status;
    }
  };

  const columns = [
    { title: '訂單編號', dataIndex: 'orderNumber', key: 'orderNumber' },
    { title: '類型', dataIndex: 'type', key: 'type' },
    { 
      title: '客戶', 
      dataIndex: 'client', 
      key: 'client',
      render: (client) => client?.name || '-'
    },

    { 
      title: '開始日期', 
      dataIndex: 'startDate', 
      key: 'startDate',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    { 
      title: '結束日期', 
      dataIndex: 'endDate', 
      key: 'endDate',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    { 
      title: '成本', 
      dataIndex: 'cost', 
      key: 'cost',
      render: (cost) => cost?.toLocaleString()
    },
    { 
      title: '承辦商', 
      dataIndex: 'contractor', 
      key: 'contractor',
      render: (contractor) => contractor?.name || contractor
    },
    { 
      title: '承辦商成本', 
      dataIndex: 'contractorCost', 
      key: 'contractorCost',
      render: (cost) => cost?.toLocaleString()
    },
    { 
      title: '創建者', 
      dataIndex: 'createdBy', 
      key: 'createdBy',
      render: (createdBy) => createdBy?.name || createdBy
    },
    { 
      title: '狀態', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
    },
    { title: 'P.O.編號', dataIndex: 'poNumber', key: 'poNumber' },
    { 
      title: '實際成本', 
      dataIndex: 'actualCost', 
      key: 'actualCost',
      render: (cost) => cost?.toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <div>
          <Button type="link" onClick={() => navigate(`/project/detail/${record._id}`)}>詳情</Button>
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
      <h2>項目列表</h2>
      <Button type="primary" style={{ marginBottom: 16 }} onClick={() => showModal()}>
        新增項目
      </Button>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 20 }}
        scroll={{ x: 1500 }}
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
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="訂單編號" name="orderNumber" rules={[{ required: true, message: '請輸入訂單編號' }]}> 
            <Input />
          </Form.Item>
          <Form.Item label="類型" name="type" rules={[{ required: true, message: '請選擇類型' }]}> 
            <Select placeholder="請選擇項目類型">
              {projectTypes.map(type => (
                <Select.Option key={type._id} value={type.name}>
                  {type.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="客戶" name="client" rules={[{ required: true, message: '請選擇客戶' }]}> 
            <Select placeholder="請選擇客戶" showSearch optionFilterProp="children">
              {clients.map(client => (
                <Select.Option key={client._id} value={client._id}>
                  {client.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="開始日期" name="startDate" rules={[{ required: true, message: '請選擇開始日期' }]}> 
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="結束日期" name="endDate" rules={[{ required: true, message: '請選擇結束日期' }]}> 
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="成本" name="cost" rules={[{ required: true, message: '請輸入成本' }]}> 
            <InputNumber min={0} style={{ width: '100%' }} />
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
          <Form.Item label="承辦商成本" name="contractorCost" rules={[{ required: true, message: '請輸入承辦商成本' }]}> 
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="狀態" name="status"> 
            <Select placeholder="請選擇狀態">
              <Select.Option value="pending">待處理</Select.Option>
              <Select.Option value="in_progress">進行中</Select.Option>
              <Select.Option value="completed">已完成</Select.Option>
              <Select.Option value="cancelled">已取消</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="P.O.編號" name="poNumber"> 
            <Input />
          </Form.Item>
          <Form.Item label="實際成本" name="actualCost"> 
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="工程項目" name="projectItems"> 
            <Select mode="multiple" placeholder="請選擇工程項目" allowClear>
              {projectItems.map(item => (
                <Select.Option key={item._id} value={item._id}>
                  {item.item_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectList; 