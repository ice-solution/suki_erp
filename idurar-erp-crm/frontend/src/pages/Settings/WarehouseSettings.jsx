import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { settingsAction } from '@/redux/settings/actions';
import { selectWarehouseSettings } from '@/redux/settings/selectors';

const DEFAULT_WAREHOUSE_LIST = [
  { value: 'A', name: '倉A', location: '' },
  { value: 'B', name: '倉B', location: '' },
  { value: 'C', name: '倉C', location: '' },
  { value: 'D', name: '倉D', location: '' },
];

export default function WarehouseSettings() {
  const dispatch = useDispatch();
  const warehouseSettings = useSelector(selectWarehouseSettings);
  const [form] = Form.useForm();
  const [warehouseList, setWarehouseList] = useState(DEFAULT_WAREHOUSE_LIST);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const list = warehouseSettings?.warehouse_list;
    if (list && Array.isArray(list) && list.length > 0) {
      setWarehouseList(list);
    }
  }, [warehouseSettings]);

  const openModal = (index = null) => {
    if (index !== null) {
      const item = warehouseList[index];
      form.setFieldsValue({ value: item.value, name: item.name, location: item.location || '' });
      setEditingIndex(index);
    } else {
      form.resetFields();
      setEditingIndex(null);
    }
    setModalVisible(true);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const newList = [...warehouseList];
      const exists = newList.some((w, i) => w.value === values.value && i !== editingIndex);
      if (exists) {
        message.error('倉庫代碼已存在');
        return;
      }
      const warehouseItem = {
        value: values.value,
        name: values.name || `倉${values.value}`,
        location: values.location || '',
      };
      if (editingIndex !== null) {
        newList[editingIndex] = warehouseItem;
      } else {
        newList.push(warehouseItem);
      }
      saveWarehouseList(newList);
      setModalVisible(false);
    });
  };

  const handleDelete = (index) => {
    const newList = warehouseList.filter((_, i) => i !== index);
    saveWarehouseList(newList);
  };

  const saveWarehouseList = async (newList) => {
    setSaving(true);
    try {
      dispatch(
        settingsAction.updateMany({
          entity: 'setting',
          jsonData: {
            settings: [{ settingKey: 'warehouse_list', settingValue: newList }],
          },
        })
      );
      setWarehouseList(newList);
      message.success('倉庫設定已儲存');
    } catch (error) {
      message.error('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: '倉庫代碼', dataIndex: 'value', key: 'value', width: 120 },
    { title: '倉庫名稱', dataIndex: 'name', key: 'name', width: 150 },
    { title: 'Location', dataIndex: 'location', key: 'location', render: (v) => v || '-' },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, __, index) => (
        <Space size="small">
          <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openModal(index)} />
          <Popconfirm
            title="確定要刪除此倉庫嗎？"
            onConfirm={() => handleDelete(index)}
            okText="確定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="倉庫設定"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          新增倉庫
        </Button>
      }
    >
      <p style={{ marginBottom: 16, color: '#666' }}>
        在此設定存倉管理中使用的倉庫列表，可自訂倉庫代碼、名稱及 Location。存倉管理、Supplier Quote 等頁面的倉庫下拉選單將使用此設定。
      </p>
      <Table
        dataSource={warehouseList}
        columns={columns}
        rowKey="value"
        pagination={false}
        size="small"
      />

      <Modal
        title={editingIndex !== null ? '編輯倉庫' : '新增倉庫'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={saving}
        okText="儲存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="倉庫代碼"
            name="value"
            rules={[{ required: true, message: '請輸入倉庫代碼' }]}
          >
            <Input
              placeholder="例如：A、B、C"
              maxLength={10}
              disabled={editingIndex !== null}
            />
          </Form.Item>
          <Form.Item
            label="倉庫名稱"
            name="name"
            rules={[{ required: true, message: '請輸入倉庫名稱' }]}
          >
            <Input placeholder="例如：倉A、主倉、分倉" />
          </Form.Item>
          <Form.Item label="Location" name="location">
            <Input placeholder="例如：香港、深圳、九龍倉" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
