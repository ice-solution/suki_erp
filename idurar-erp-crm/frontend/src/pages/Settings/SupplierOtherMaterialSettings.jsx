import { useEffect, useMemo, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { settingsAction } from '@/redux/settings/actions';
import { selectSupplierOtherMaterialOptions } from '@/redux/settings/selectors';
import { useCanDeleteRecords } from '@/hooks/useCanDeleteRecords';

export default function SupplierOtherMaterialSettings() {
  const showDelete = useCanDeleteRecords();
  const dispatch = useDispatch();
  const optionsFromStore = useSelector(selectSupplierOtherMaterialOptions);
  const [form] = Form.useForm();

  const [optionList, setOptionList] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOptionList(Array.isArray(optionsFromStore) ? optionsFromStore : []);
  }, [optionsFromStore]);

  const openModal = (index = null) => {
    if (index !== null) {
      form.setFieldsValue({ name: optionList[index] });
      setEditingIndex(index);
    } else {
      form.resetFields();
      setEditingIndex(null);
    }
    setModalVisible(true);
  };

  const saveOptionList = async (newList) => {
    setSaving(true);
    try {
      dispatch(
        settingsAction.updateMany({
          entity: 'setting',
          jsonData: {
            settings: [{ settingKey: 'supplier_other_material_options', settingValue: newList }],
          },
        })
      );
      setOptionList(newList);
      message.success('「其他」材料選項已儲存');
    } catch (error) {
      message.error('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const raw = values.name == null ? '' : String(values.name).trim();
      if (!raw) {
        message.error('請輸入選項名稱');
        return;
      }
      const newList = [...optionList];
      const exists = newList.some((u, i) => String(u).trim() === raw && i !== editingIndex);
      if (exists) {
        message.error('選項已存在');
        return;
      }
      if (editingIndex !== null) {
        newList[editingIndex] = raw;
      } else {
        newList.push(raw);
      }
      const cleaned = Array.from(
        new Set(newList.map((u) => (u == null ? '' : String(u).trim())).filter((u) => u))
      );
      saveOptionList(cleaned);
      setModalVisible(false);
    });
  };

  const handleDelete = (index) => {
    const newList = optionList.filter((_, i) => i !== index);
    saveOptionList(newList);
  };

  const dataSource = useMemo(
    () =>
      optionList.map((name, i) => ({
        key: `${name}-${i}`,
        name,
        index: i,
      })),
    [optionList]
  );

  const columns = [
    { title: '選項名稱', dataIndex: 'name', key: 'name' },
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
          {showDelete ? (
            <Popconfirm
              title="確定要刪除此選項嗎？"
              onConfirm={() => handleDelete(record.index)}
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
      title="S 單材料「其他」選項"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          新增選項
        </Button>
      }
    >
      <p style={{ marginBottom: 16, color: '#666' }}>
        管理 S 單添加材料時，倉庫選「其他」後的名稱下拉清單。更改後會即時套用到新增／編輯 S 單表單。
        （「加工費」若仍保留在清單中，會計邏輯會繼續視為加工費。）
      </p>
      <Table dataSource={dataSource} columns={columns} pagination={false} size="small" />

      <Modal
        title={editingIndex !== null ? '編輯選項' : '新增選項'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={saving}
        okText="儲存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="選項名稱"
            name="name"
            rules={[{ required: true, message: '請輸入選項名稱' }]}
          >
            <Input placeholder="例如：加工費、運費、保險" maxLength={40} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
