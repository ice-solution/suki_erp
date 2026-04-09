import { useEffect, useMemo, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { settingsAction } from '@/redux/settings/actions';
import { selectItemUnits } from '@/redux/settings/selectors';

export default function ItemUnitSettings() {
  const dispatch = useDispatch();
  const itemUnits = useSelector(selectItemUnits);
  const [form] = Form.useForm();

  const [unitList, setUnitList] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUnitList(Array.isArray(itemUnits) ? itemUnits : []);
  }, [itemUnits]);

  const openModal = (index = null) => {
    if (index !== null) {
      const unit = unitList[index];
      form.setFieldsValue({ unit });
      setEditingIndex(index);
    } else {
      form.resetFields();
      setEditingIndex(null);
    }
    setModalVisible(true);
  };

  const saveUnitList = async (newList) => {
    setSaving(true);
    try {
      dispatch(
        settingsAction.updateMany({
          entity: 'setting',
          jsonData: {
            settings: [{ settingKey: 'item_units', settingValue: newList }],
          },
        })
      );
      setUnitList(newList);
      message.success('Items 單位已儲存');
    } catch (error) {
      message.error('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const raw = values.unit == null ? '' : String(values.unit).trim();
      if (!raw) {
        message.error('請輸入單位');
        return;
      }
      const upper = raw; // 保留使用者輸入（例如 ㎡、工）
      const newList = [...unitList];
      const exists = newList.some((u, i) => String(u).trim() === upper && i !== editingIndex);
      if (exists) {
        message.error('單位已存在');
        return;
      }
      if (editingIndex !== null) {
        newList[editingIndex] = upper;
      } else {
        newList.push(upper);
      }
      // 清理空白 + 去重
      const cleaned = Array.from(
        new Set(newList.map((u) => (u == null ? '' : String(u).trim())).filter((u) => u))
      );
      saveUnitList(cleaned);
      setModalVisible(false);
    });
  };

  const handleDelete = (index) => {
    const newList = unitList.filter((_, i) => i !== index);
    saveUnitList(newList);
  };

  const dataSource = useMemo(
    () =>
      unitList.map((u, i) => ({
        key: `${u}-${i}`,
        unit: u,
        index: i,
      })),
    [unitList]
  );

  const columns = [
    { title: '單位', dataIndex: 'unit', key: 'unit' },
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
            title="確定要刪除此單位嗎？"
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
      title="Items 單位設定"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          新增單位
        </Button>
      }
    >
      <p style={{ marginBottom: 16, color: '#666' }}>
        在此管理報價/發票/吊船報價/S 單 items 的「單位」清單。各單據新增 item 時的單位下拉選單會使用此設定。
      </p>
      <Table dataSource={dataSource} columns={columns} pagination={false} size="small" />

      <Modal
        title={editingIndex !== null ? '編輯單位' : '新增單位'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        confirmLoading={saving}
        okText="儲存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="單位"
            name="unit"
            rules={[{ required: true, message: '請輸入單位' }]}
          >
            <Input placeholder="例如：KG、PCS、㎡、工" maxLength={20} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

