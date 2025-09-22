import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Switch, message, Space, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

import { request } from '@/request';
import { useMoney } from '@/settings';

const { TextArea } = Input;

export default function ProjectItemSettings() {
  const { moneyFormatter } = useMoney();
  const [form] = Form.useForm();
  
  const [projectItems, setProjectItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchProjectItems();
  }, []);

  const fetchProjectItems = async () => {
    try {
      setLoading(true);
      const response = await request.list({ 
        entity: 'projectitem',
        options: { 
          items: 100
        }
      });
      
      if (response.success && response.result?.items) {
        setProjectItems(response.result.items);
      } else {
        console.error('Failed to fetch ProjectItems:', response.message);
      }
    } catch (error) {
      console.error('Error fetching ProjectItems:', error);
      message.error('載入工程項目失敗');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (item = null) => {
    setEditingItem(item);
    setModalVisible(true);
    
    if (item) {
      form.setFieldsValue({
        itemName: item.itemName,
        description: item.description,
        price: item.price,
        unit: item.unit,
        category: item.category,
        isFrequent: item.isFrequent,
        notes: item.notes,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        unit: '個',
        category: '建材',
        isFrequent: false,
      });
    }
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      
      let response;
      if (editingItem) {
        response = await request.update({
          entity: 'projectitem',
          id: editingItem._id,
          jsonData: values
        });
      } else {
        response = await request.create({
          entity: 'projectitem',
          jsonData: values
        });
      }

      if (response.success) {
        message.success(editingItem ? '項目更新成功！' : '項目創建成功！');
        setModalVisible(false);
        fetchProjectItems();
      } else {
        message.error('操作失敗：' + (response.message || '未知錯誤'));
      }
    } catch (error) {
      console.error('Submit error:', error);
      message.error('操作過程中發生錯誤');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await request.delete({
        entity: 'projectitem',
        id
      });

      if (response.success) {
        message.success('項目刪除成功！');
        fetchProjectItems();
      } else {
        message.error('刪除失敗：' + (response.message || '未知錯誤'));
      }
    } catch (error) {
      console.error('Delete error:', error);
      message.error('刪除過程中發生錯誤');
    }
  };

  // 導入默認數據
  const importDefaultData = async () => {
    try {
      setImporting(true);
      
      const defaultItems = [
        { itemName: '水泥', price: 500, description: '高級水泥', category: '建材', unit: '包', isFrequent: true },
        { itemName: '鋼筋', price: 800, description: '建築用鋼筋', category: '建材', unit: '噸', isFrequent: true },
        { itemName: '磚塊', price: 200, description: '紅磚', category: '建材', unit: '塊', isFrequent: true },
        { itemName: '玻璃', price: 300, description: '建築玻璃', category: '建材', unit: '平方米', isFrequent: true },
        { itemName: '木材', price: 600, description: '建築木材', category: '建材', unit: '立方米', isFrequent: true },
        { itemName: '油漆', price: 150, description: '內牆油漆', category: '建材', unit: '桶', isFrequent: true },
        { itemName: '電線', price: 100, description: '電力線材', category: '設備', unit: '米', isFrequent: true },
        { itemName: '管道', price: 250, description: '水管', category: '設備', unit: '米', isFrequent: true },
      ];

      let successCount = 0;
      let errorCount = 0;

      for (const item of defaultItems) {
        try {
          const response = await request.create({
            entity: 'projectitem',
            jsonData: item
          });

          if (response.success) {
            successCount++;
            console.log(`✅ Created: ${item.itemName}`);
          } else {
            errorCount++;
            console.log(`❌ Failed to create ${item.itemName}:`, response.message);
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Error creating ${item.itemName}:`, error);
        }
      }

      if (successCount > 0) {
        message.success(`成功導入 ${successCount} 個項目！`);
        fetchProjectItems(); // 重新載入列表
      }
      
      if (errorCount > 0) {
        message.warning(`${errorCount} 個項目導入失敗（可能已存在）`);
      }

    } catch (error) {
      console.error('Import error:', error);
      message.error('導入過程中發生錯誤');
    } finally {
      setImporting(false);
    }
  };

  const columns = [
    {
      title: '項目名稱',
      dataIndex: 'itemName',
      key: 'itemName',
      width: 150,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '價格',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (price) => moneyFormatter({ amount: price }),
    },
    {
      title: '單位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
    },
    {
      title: '分類',
      dataIndex: 'category',
      key: 'category',
      width: 80,
      render: (category) => {
        const colors = {
          '建材': 'blue',
          '人工': 'green', 
          '服務': 'orange',
          '設備': 'purple',
          '其他': 'default'
        };
        return <Tag color={colors[category]}>{category}</Tag>;
      },
    },
    {
      title: '常用',
      dataIndex: 'isFrequent',
      key: 'isFrequent',
      width: 60,
      render: (isFrequent) => isFrequent ? '⭐' : '',
    },
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
            onClick={() => openModal(record)}
            title="編輯"
          />
          <Popconfirm
            title="確認刪除"
            description="確定要刪除這個工程項目嗎？"
            onConfirm={() => handleDelete(record._id)}
            okText="確認"
            cancelText="取消"
          >
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              size="small"
              title="刪除"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card 
      title="工程項目管理" 
      extra={
        <Space>
          <Button 
            onClick={importDefaultData}
            loading={importing}
            disabled={importing}
          >
            導入默認數據
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => openModal()}
          >
            添加項目
          </Button>
        </Space>
      }
    >
      <Table
        dataSource={projectItems}
        columns={columns}
        rowKey="_id"
        loading={loading}
        size="small"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `總共 ${total} 個項目`,
        }}
      />

      <Modal
        title={editingItem ? '編輯工程項目' : '添加工程項目'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="項目名稱"
            name="itemName"
            rules={[{ required: true, message: '請輸入項目名稱' }]}
          >
            <Input placeholder="輸入項目名稱" />
          </Form.Item>

          <Form.Item
            label="描述"
            name="description"
          >
            <TextArea rows={2} placeholder="輸入項目描述" />
          </Form.Item>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Form.Item
              label="價格"
              name="price"
              rules={[{ required: true, message: '請輸入價格' }]}
              style={{ flex: 1 }}
            >
              <InputNumber
                min={0}
                step={0.01}
                style={{ width: '100%' }}
                placeholder="0.00"
                formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>

            <Form.Item
              label="單位"
              name="unit"
              style={{ flex: 1 }}
            >
              <Select placeholder="選擇單位">
                <Select.Option value="個">個</Select.Option>
                <Select.Option value="件">件</Select.Option>
                <Select.Option value="套">套</Select.Option>
                <Select.Option value="米">米</Select.Option>
                <Select.Option value="平方米">平方米</Select.Option>
                <Select.Option value="立方米">立方米</Select.Option>
                <Select.Option value="公斤">公斤</Select.Option>
                <Select.Option value="噸">噸</Select.Option>
                <Select.Option value="小時">小時</Select.Option>
                <Select.Option value="天">天</Select.Option>
                <Select.Option value="包">包</Select.Option>
                <Select.Option value="桶">桶</Select.Option>
                <Select.Option value="塊">塊</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Form.Item
              label="分類"
              name="category"
              style={{ flex: 1 }}
            >
              <Select placeholder="選擇分類">
                <Select.Option value="建材">建材</Select.Option>
                <Select.Option value="人工">人工</Select.Option>
                <Select.Option value="服務">服務</Select.Option>
                <Select.Option value="設備">設備</Select.Option>
                <Select.Option value="其他">其他</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="常用項目"
              name="isFrequent"
              valuePropName="checked"
              style={{ flex: 1 }}
            >
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
          </div>

          <Form.Item
            label="備註"
            name="notes"
          >
            <TextArea rows={2} placeholder="輸入備註信息" />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingItem ? '更新' : '創建'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </Card>
  );
}
