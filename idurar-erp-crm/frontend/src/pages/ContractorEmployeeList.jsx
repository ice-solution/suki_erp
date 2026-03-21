import React, { useEffect, useState } from 'react';
import { Table, Button, Popconfirm, message, Modal, Form, Input, Select, Space, Tag } from 'antd';
import axios from 'axios';

const ContractorEmployeeList = () => {
  const [data, setData] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchAccountCode, setSearchAccountCode] = useState('');
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
        contractor: item.contractor?._id || item.contractor,
        employmentStatus: item.employmentStatus || '在職',
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ employmentStatus: '在職' });
    }
    setModalVisible(true);
  };

  const resolveContractor = (record) => {
    const c = record.contractor;
    if (c && typeof c === 'object' && c.name != null) return c;
    const id = c?._id || c;
    if (!id) return null;
    return contractors.find(
      (x) => x._id === id || String(x._id) === String(id)
    );
  };

  const filteredData = data.filter((item) => {
    const contractor = resolveContractor(item);
    const employeeName = (item?.name || '').toString();
    const contractorName = (contractor?.name || '').toString();
    const accountCode = (contractor?.accountCode || '').toString();

    const nameQ = searchName.trim().toLowerCase();
    const codeQ = searchAccountCode.trim().toLowerCase();

    if (nameQ) {
      const matchName =
        employeeName.toLowerCase().includes(nameQ) ||
        contractorName.toLowerCase().includes(nameQ);
      if (!matchName) return false;
    }
    if (codeQ) {
      if (!accountCode.toLowerCase().includes(codeQ)) return false;
    }
    return true;
  });

  const columns = [
    { title: '員工姓名', dataIndex: 'name', key: 'name' },
    { 
      title: '承辦商', 
      dataIndex: 'contractor', 
      key: 'contractor',
      render: (contractor) => contractor?.name || contractor
    },
    {
      title: '在職狀態',
      dataIndex: 'employmentStatus',
      key: 'employmentStatus',
      render: (v) => {
        const active = (v || '在職') === '在職';
        return <Tag color={active ? 'green' : 'red'}>{active ? '在職' : '離職'}</Tag>;
      },
    },
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
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="搜尋名字（員工姓名或承辦商名稱）"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          allowClear
          style={{ width: 280 }}
        />
        <Input
          placeholder="搜尋承辦商 Account Code"
          value={searchAccountCode}
          onChange={(e) => setSearchAccountCode(e.target.value)}
          allowClear
          style={{ width: 220 }}
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
                  {contractor.accountCode ? `${contractor.name} (${contractor.accountCode})` : contractor.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="職位" name="position"> 
            <Input />
          </Form.Item>
          <Form.Item
            label="在職狀態"
            name="employmentStatus"
            rules={[{ required: true, message: '請選擇在職狀態' }]}
          >
            <Select
              placeholder="請選擇"
              options={[
                { value: '在職', label: '在職' },
                { value: '離職', label: '離職' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="電話"
            name="phone"
            rules={[
              {
                validator: (_, value) => {
                  const v = value != null ? String(value).trim() : '';
                  if (!v) return Promise.resolve();
                  const ok = /^(\+852|852)?[5-9]\d{7}$|^(\+886|886)?09\d{8}$|^09\d{8}$|^[5-9]\d{7}$/.test(v);
                  return ok
                    ? Promise.resolve()
                    : Promise.reject(new Error('請輸入有效的手機號碼'));
                },
              },
            ]}
          >
            <Input placeholder="選填，例如：98765432 或 +85298765432" />
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