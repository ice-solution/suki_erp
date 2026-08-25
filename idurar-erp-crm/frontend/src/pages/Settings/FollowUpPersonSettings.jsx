import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { settingsAction } from '@/redux/settings/actions';
import { selectFollowUpPersonList } from '@/redux/settings/selectors';
import { request } from '@/request';
import { adminDisplayName } from '@/utils/adminDisplayName';
import { useCanDeleteRecords } from '@/hooks/useCanDeleteRecords';

export default function FollowUpPersonSettings() {
  const showDelete = useCanDeleteRecords();
  const dispatch = useDispatch();
  const savedList = useSelector(selectFollowUpPersonList);
  const [form] = Form.useForm();
  const [personList, setPersonList] = useState([]);
  const [adminOptions, setAdminOptions] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPersonList(Array.isArray(savedList) ? savedList : []);
  }, [savedList]);

  const loadAdmins = async () => {
    setAdminLoading(true);
    try {
      const res = await request.get({ entity: 'admin' });
      const rows = (res?.result || [])
        .filter((a) => a && a.enabled !== false)
        .map((a) => ({
          value: String(a._id),
          label: `${adminDisplayName(a) || a.email || a._id}${a.email ? `（${a.email}）` : ''}`,
          accountName: adminDisplayName(a) || a.email || '',
        }));
      setAdminOptions(rows);
    } catch (e) {
      console.error(e);
      setAdminOptions([]);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const adminLabelById = (adminId) => {
    const opt = adminOptions.find((o) => o.value === String(adminId));
    return opt?.label || String(adminId || '-');
  };

  const openModal = (index = null) => {
    if (index !== null) {
      const item = personList[index];
      form.setFieldsValue({
        adminId: item.adminId,
        displayName: item.displayName || '',
      });
      setEditingIndex(index);
    } else {
      form.resetFields();
      setEditingIndex(null);
    }
    setModalVisible(true);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const adminId = String(values.adminId);
      const displayName = String(values.displayName || '').trim();
      if (!displayName) {
        message.error('請輸入自訂顯示名稱');
        return;
      }
      const exists = personList.some((p, i) => String(p.adminId) === adminId && i !== editingIndex);
      if (exists) {
        message.error('此登入帳號已在跟單人列表中');
        return;
      }
      const row = { adminId, displayName };
      const newList = [...personList];
      if (editingIndex !== null) {
        newList[editingIndex] = row;
      } else {
        newList.push(row);
      }
      saveList(newList);
      setModalVisible(false);
    });
  };

  const handleDelete = (index) => {
    const newList = personList.filter((_, i) => i !== index);
    saveList(newList);
  };

  const saveList = async (newList) => {
    setSaving(true);
    try {
      dispatch(
        settingsAction.updateMany({
          entity: 'setting',
          jsonData: {
            settings: [{ settingKey: 'follow_up_person_list', settingValue: newList }],
          },
        })
      );
      setPersonList(newList);
      message.success('跟單人列表已儲存');
    } catch (error) {
      message.error('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: '登入帳號',
      dataIndex: 'adminId',
      key: 'adminId',
      render: (adminId) => adminLabelById(adminId),
    },
    {
      title: '自訂顯示名稱',
      dataIndex: 'displayName',
      key: 'displayName',
      width: 200,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, __, index) => (
        <Space size="small">
          <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openModal(index)} />
          {showDelete ? (
            <Popconfirm
              title="確定要移除此跟單人嗎？"
              onConfirm={() => handleDelete(index)}
              okText="確定"
              cancelText="取消"
            >
              <Button type="text" danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <span>
          <TeamOutlined style={{ marginRight: 8 }} />
          跟單人列表
        </span>
      }
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} loading={saving}>
          從登入帳號新增
        </Button>
      }
    >
      <p style={{ color: '#666', marginBottom: 16 }}>
        從登入帳號加入跟單人，並設定自訂顯示名稱。單據上的「跟單人」會顯示此名稱。
      </p>
      <Table
        rowKey={(r) => r.adminId}
        dataSource={personList}
        columns={columns}
        pagination={false}
        locale={{ emptyText: '尚未加入跟單人，請按右上角新增' }}
      />

      <Modal
        title={editingIndex !== null ? '編輯跟單人' : '新增跟單人'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="adminId"
            label="登入帳號"
            rules={[{ required: true, message: '請選擇登入帳號' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="選擇登入帳號"
              loading={adminLoading}
              options={adminOptions}
              disabled={editingIndex !== null}
              onChange={(adminId) => {
                const opt = adminOptions.find((o) => o.value === adminId);
                if (opt?.accountName && !form.getFieldValue('displayName')) {
                  form.setFieldsValue({ displayName: opt.accountName });
                }
              }}
            />
          </Form.Item>
          <Form.Item
            name="displayName"
            label="自訂顯示名稱"
            rules={[{ required: true, message: '請輸入自訂顯示名稱' }]}
          >
            <Input placeholder="例如：阿明" maxLength={50} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
