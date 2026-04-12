import { useEffect, useMemo, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { settingsAction } from '@/redux/settings/actions';
import { selectWarehouseItemCategories } from '@/redux/settings/selectors';

export default function WarehouseItemCategorySettings() {
  const dispatch = useDispatch();
  const categoriesFromStore = useSelector(selectWarehouseItemCategories);
  const [form] = Form.useForm();

  const [categoryList, setCategoryList] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCategoryList(Array.isArray(categoriesFromStore) ? categoriesFromStore : []);
  }, [categoriesFromStore]);

  const openModal = (index = null) => {
    if (index !== null) {
      const cat = categoryList[index];
      form.setFieldsValue({ category: cat });
      setEditingIndex(index);
    } else {
      form.resetFields();
      setEditingIndex(null);
    }
    setModalVisible(true);
  };

  const saveCategoryList = async (newList) => {
    setSaving(true);
    try {
      dispatch(
        settingsAction.updateMany({
          entity: 'setting',
          jsonData: {
            settings: [{ settingKey: 'warehouse_item_categories', settingValue: newList }],
          },
        })
      );
      setCategoryList(newList);
      message.success('倉存類別已儲存');
    } catch (error) {
      message.error('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const raw = values.category == null ? '' : String(values.category).trim();
      if (!raw) {
        message.error('請輸入類別');
        return;
      }
      const newList = [...categoryList];
      const exists = newList.some((c, i) => String(c).trim() === raw && i !== editingIndex);
      if (exists) {
        message.error('類別已存在');
        return;
      }
      if (editingIndex !== null) {
        newList[editingIndex] = raw;
      } else {
        newList.push(raw);
      }
      const cleaned = Array.from(
        new Set(newList.map((c) => (c == null ? '' : String(c).trim())).filter((c) => c))
      );
      saveCategoryList(cleaned);
      setModalVisible(false);
    });
  };

  const handleDelete = (index) => {
    const newList = categoryList.filter((_, i) => i !== index);
    saveCategoryList(newList);
  };

  const dataSource = useMemo(
    () =>
      categoryList.map((c, i) => ({
        key: `${c}-${i}`,
        category: c,
        index: i,
      })),
    [categoryList]
  );

  const columns = [
    { title: '類別', dataIndex: 'category', key: 'category' },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => openModal(record.index)}
          />
          <Popconfirm
            title="確定要刪除此類別嗎？"
            onConfirm={() => handleDelete(record.index)}
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
      title="倉存類別設定"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          新增類別
        </Button>
      }
    >
      <p style={{ marginBottom: 16, color: '#666' }}>
        在此管理倉存管理貨品的「類別」清單。新增／編輯存倉記錄時的類別下拉選單會使用此設定。
      </p>
      <Table dataSource={dataSource} columns={columns} pagination={false} size="small" />

      <Modal
        title={editingIndex !== null ? '編輯類別' : '新增類別'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={saving}
        okText="儲存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="類別"
            name="category"
            rules={[{ required: true, message: '請輸入類別' }]}
          >
            <Input placeholder="例如：原材料、成品" maxLength={40} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
