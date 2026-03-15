import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Space,
  Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import request from '@/request/request';

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'User' },
];

export default function AccountSettings() {
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [passwordUserId, setPasswordUserId] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadList = async () => {
    setLoading(true);
    const data = await request.adminList();
    if (data?.success && Array.isArray(data.result)) {
      setList(data.result);
    } else {
      setList([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadList();
  }, []);

  const openModal = (record = null) => {
    if (record) {
      form.setFieldsValue({
        email: record.email,
        name: record.name,
        surname: record.surname || '',
        role: record.role,
        enabled: record.enabled !== false,
      });
      setEditingId(record._id);
    } else {
      form.resetFields();
      setEditingId(null);
    }
    setModalVisible(true);
  };

  const openPasswordModal = (record) => {
    passwordForm.resetFields();
    setPasswordUserId(record._id);
    setPasswordModalVisible(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editingId) {
        const res = await request.adminUpdate(editingId, {
          email: values.email,
          name: values.name,
          surname: values.surname || '',
          role: values.role,
          enabled: values.enabled,
        });
        if (res?.success) {
          message.success('已更新');
          setModalVisible(false);
          loadList();
        }
      } else {
        const res = await request.adminCreate({
          email: values.email,
          name: values.name,
          surname: values.surname || '',
          role: values.role || 'user',
          password: values.password,
        });
        if (res?.success) {
          message.success('帳號已建立');
          setModalVisible(false);
          loadList();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async () => {
    const values = await passwordForm.validateFields();
    if (values.password !== values.passwordConfirm) {
      message.error('兩次輸入的密碼不一致');
      return;
    }
    setSaving(true);
    try {
      const res = await request.adminUpdatePassword(passwordUserId, values.password);
      if (res?.success) {
        message.success('密碼已更新');
        setPasswordModalVisible(false);
        setPasswordUserId(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const res = await request.adminDelete(id);
    if (res?.success) {
      message.success('帳號已刪除');
      loadList();
    }
  };

  const columns = [
    { title: 'Email', dataIndex: 'email', key: 'email', width: 200 },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 120 },
    { title: '姓氏', dataIndex: 'surname', key: 'surname', width: 100 },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (r) => ROLE_OPTIONS.find((o) => o.value === r)?.label || r,
    },
    {
      title: '啟用',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (v) => (v === false ? '否' : '是'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openModal(record)}>
            編輯
          </Button>
          <Button
            type="text"
            icon={<KeyOutlined />}
            size="small"
            onClick={() => openPasswordModal(record)}
          >
            重設密碼
          </Button>
          <Popconfirm
            title="確定要刪除此帳號嗎？刪除後該用戶將無法登入。"
            onConfirm={() => handleDelete(record._id)}
            okText="確定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small">
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="登入帳號"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          新增帳號
        </Button>
      }
    >
      <p style={{ marginBottom: 16, color: '#666' }}>
        在此建立與管理系統登入帳號。新增帳號時請設定密碼（至少 8 個字元）；日後可透過「重設密碼」修改。角色：Owner / Admin 具較高權限，User 為一般使用者。
      </p>
      <Table
        dataSource={list}
        columns={columns}
        rowKey="_id"
        loading={loading}
        pagination={false}
        size="small"
      />

      <Modal
        title={editingId ? '編輯帳號' : '新增帳號'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={saving}
        okText="儲存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: '請輸入 Email' },
              { type: 'email', message: '請輸入有效的 Email' },
            ]}
          >
            <Input placeholder="登入用 Email" disabled={!!editingId} />
          </Form.Item>
          <Form.Item label="姓名" name="name" rules={[{ required: true, message: '請輸入姓名' }]}>
            <Input placeholder="姓名" />
          </Form.Item>
          <Form.Item label="姓氏" name="surname">
            <Input placeholder="姓氏" />
          </Form.Item>
          <Form.Item label="角色" name="role" initialValue="user">
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
          {editingId ? (
            <Form.Item label="啟用" name="enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
          ) : (
            <>
              <Form.Item
                label="密碼"
                name="password"
                rules={[
                  { required: true, message: '請輸入密碼' },
                  { min: 8, message: '密碼至少 8 個字元' },
                ]}
              >
                <Input.Password placeholder="至少 8 個字元" />
              </Form.Item>
              <Form.Item
                label="確認密碼"
                name="passwordConfirm"
                dependencies={['password']}
                rules={[
                  { required: true, message: '請再輸入一次密碼' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) return Promise.resolve();
                      return Promise.reject(new Error('兩次輸入的密碼不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="再輸入一次密碼" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      <Modal
        title="重設密碼"
        open={passwordModalVisible}
        onOk={handlePasswordSubmit}
        onCancel={() => {
          setPasswordModalVisible(false);
          setPasswordUserId(null);
        }}
        confirmLoading={saving}
        okText="儲存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={passwordForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="新密碼"
            name="password"
            rules={[
              { required: true, message: '請輸入新密碼' },
              { min: 8, message: '密碼至少 8 個字元' },
            ]}
          >
            <Input.Password placeholder="至少 8 個字元" />
          </Form.Item>
          <Form.Item
            label="確認新密碼"
            name="passwordConfirm"
            dependencies={['password']}
            rules={[
              { required: true, message: '請再輸入一次' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('兩次輸入的密碼不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="再輸入一次" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
