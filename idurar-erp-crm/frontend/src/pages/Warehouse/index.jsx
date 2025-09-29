import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  Select, 
  Space,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  message,
  Popconfirm,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SwapOutlined,
  SettingOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { request } from '@/request';

const { Option } = Select;
const { TextArea } = Input;

export default function Warehouse() {
  const [loading, setLoading] = useState(false);
  const [inventoryList, setInventoryList] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form] = Form.useForm();
  const [adjustForm] = Form.useForm();
  const [transferForm] = Form.useForm();

  // 倉庫選項
  const warehouseOptions = [
    { value: 'A', label: '倉A' },
    { value: 'B', label: '倉B' },
    { value: 'C', label: '倉C' },
    { value: 'D', label: '倉D' }
  ];

  // 狀態選項
  const statusOptions = [
    { value: 'available', label: '可用' },
    { value: 'reserved', label: '已預留' },
    { value: 'out_of_stock', label: '缺貨' },
    { value: 'damaged', label: '損壞' }
  ];

  useEffect(() => {
    fetchInventoryList();
    fetchSuppliers();
    fetchProjects();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchInventoryList = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters
      };
      const response = await request.get({ entity: 'warehouse' });
      
      if (response.success) {
        setInventoryList(response.result);
        setPagination(prev => ({
          ...prev,
          total: response.pagination.totalItems
        }));
      }
    } catch (error) {
      message.error('獲取存倉列表失敗');
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await request.get({ entity: 'client/listAll' });
      if (response.success) {
        setSuppliers(response.result || []);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await request.get({ entity: 'project/listAll' });
      if (response.success) {
        setProjects(response.result || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingItem(record);
    form.setFieldsValue({
      ...record,
      supplier: record.supplier?._id,
      project: record.project?._id
    });
    setModalVisible(true);
  };

  const handleSave = async (values) => {
    try {
      if (editingItem) {
        await request.patch({ entity: `warehouse/${editingItem._id}`, jsonData: values });
        message.success('存倉記錄更新成功');
      } else {
        await request.post({ entity: 'warehouse', jsonData: values });
        message.success('存倉記錄建立成功');
      }
      setModalVisible(false);
      fetchInventoryList();
    } catch (error) {
      message.error(editingItem ? '更新失敗' : '建立失敗');
      console.error('Error saving inventory:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await request.delete({ entity: 'warehouse', id: id });
      message.success('存倉記錄刪除成功');
      fetchInventoryList();
    } catch (error) {
      message.error('刪除失敗');
      console.error('Error deleting inventory:', error);
    }
  };

  const handleAdjust = (record) => {
    setEditingItem(record);
    adjustForm.resetFields();
    setAdjustModalVisible(true);
  };

  const handleAdjustSave = async (values) => {
    try {
      await request.post({ entity: `warehouse/${editingItem._id}/adjust`, jsonData: values });
      message.success('庫存調整成功');
      setAdjustModalVisible(false);
      fetchInventoryList();
    } catch (error) {
      message.error('庫存調整失敗');
      console.error('Error adjusting inventory:', error);
    }
  };

  const handleTransfer = (record) => {
    setEditingItem(record);
    transferForm.resetFields();
    setTransferModalVisible(true);
  };

  const handleTransferSave = async (values) => {
    try {
      await request.post({ entity: `warehouse/${editingItem._id}/transfer`, jsonData: values });
      message.success('倉庫轉移成功');
      setTransferModalVisible(false);
      fetchInventoryList();
    } catch (error) {
      message.error('倉庫轉移失敗');
      console.error('Error transferring inventory:', error);
    }
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'available': 'green',
      'reserved': 'orange',
      'out_of_stock': 'red',
      'damaged': 'volcano'
    };
    return colorMap[status] || 'default';
  };

  const columns = [
    {
      title: '貨品名稱',
      dataIndex: 'itemName',
      key: 'itemName',
      width: 150,
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 120,
    },
    {
      title: '數量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      render: (quantity, record) => (
        <span style={{ 
          color: quantity <= record.minStockLevel ? '#ff4d4f' : 'inherit',
          fontWeight: quantity <= record.minStockLevel ? 'bold' : 'normal'
        }}>
          {quantity}
          {quantity <= record.minStockLevel && (
            <Tooltip title="庫存不足">
              <WarningOutlined style={{ color: '#ff4d4f', marginLeft: 4 }} />
            </Tooltip>
          )}
        </span>
      ),
    },
    {
      title: '倉庫',
      dataIndex: 'warehouse',
      key: 'warehouse',
      width: 80,
      render: (warehouse) => `倉${warehouse}`,
      filters: warehouseOptions.map(opt => ({ text: opt.label, value: opt.value })),
    },
    {
      title: '單價',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      render: (price) => price ? `$${price.toFixed(2)}` : '-',
    },
    {
      title: '總價值',
      dataIndex: 'totalValue',
      key: 'totalValue',
      width: 100,
      render: (value) => value ? `$${value.toFixed(2)}` : '-',
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {statusOptions.find(opt => opt.value === status)?.label || status}
        </Tag>
      ),
      filters: statusOptions.map(opt => ({ text: opt.label, value: opt.value })),
    },
    {
      title: '供應商',
      dataIndex: ['supplier', 'name'],
      key: 'supplier',
      width: 120,
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Tooltip title="編輯">
            <Button 
              type="link" 
              icon={<EditOutlined />} 
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="調整庫存">
            <Button 
              type="link" 
              icon={<SettingOutlined />} 
              onClick={() => handleAdjust(record)}
            />
          </Tooltip>
          <Tooltip title="倉庫轉移">
            <Button 
              type="link" 
              icon={<SwapOutlined />} 
              onClick={() => handleTransfer(record)}
            />
          </Tooltip>
          <Popconfirm
            title="確定要刪除這個存倉記錄嗎？"
            onConfirm={() => handleDelete(record._id)}
            okText="確定"
            cancelText="取消"
          >
            <Tooltip title="刪除">
              <Button 
                type="link" 
                danger 
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic 
              title="總存貨項目" 
              value={pagination.total} 
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="倉A項目" 
              value={inventoryList.filter(item => item.warehouse === 'A').length} 
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="倉B項目" 
              value={inventoryList.filter(item => item.warehouse === 'B').length} 
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="低庫存警告" 
              value={inventoryList.filter(item => item.quantity <= item.minStockLevel).length}
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
        </Row>

        <div style={{ marginBottom: 16 }}>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleCreate}
          >
            新增存倉記錄
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={inventoryList}
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 項，共 ${total} 項`,
          }}
          onChange={(pag, filters) => {
            setPagination(pag);
            setFilters(filters);
          }}
          rowKey="_id"
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 新增/編輯模態框 */}
      <Modal
        title={editingItem ? '編輯存倉記錄' : '新增存倉記錄'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="itemName"
                label="貨品名稱"
                rules={[{ required: true, message: '請輸入貨品名稱' }]}
              >
                <Input placeholder="請輸入貨品名稱" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="sku"
                label="SKU"
              >
                <Input placeholder="請輸入SKU" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="quantity"
                label="數量"
                rules={[{ required: true, message: '請輸入數量' }]}
              >
                <InputNumber 
                  min={0} 
                  style={{ width: '100%' }} 
                  placeholder="請輸入數量"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="warehouse"
                label="倉庫"
                rules={[{ required: true, message: '請選擇倉庫' }]}
              >
                <Select placeholder="請選擇倉庫">
                  {warehouseOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="unitPrice"
                label="單價"
              >
                <InputNumber 
                  min={0} 
                  precision={2}
                  style={{ width: '100%' }} 
                  placeholder="請輸入單價"
                  addonBefore="$"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="狀態"
              >
                <Select placeholder="請選擇狀態">
                  {statusOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="supplier"
                label="供應商"
              >
                <Select 
                  placeholder="請選擇供應商"
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {suppliers.map(supplier => (
                    <Option key={supplier._id} value={supplier._id}>
                      {supplier.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="project"
                label="項目"
              >
                <Select 
                  placeholder="請選擇項目"
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {projects.map(project => (
                    <Option key={project._id} value={project._id}>
                      {project.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="minStockLevel"
                label="最低庫存警告"
              >
                <InputNumber 
                  min={0} 
                  style={{ width: '100%' }} 
                  placeholder="請輸入最低庫存數量"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="location"
                label="位置"
              >
                <Input placeholder="請輸入具體位置" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={3} placeholder="請輸入貨品描述" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="備註"
          >
            <TextArea rows={2} placeholder="請輸入備註" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingItem ? '更新' : '建立'}
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 庫存調整模態框 */}
      <Modal
        title="庫存調整"
        open={adjustModalVisible}
        onCancel={() => setAdjustModalVisible(false)}
        footer={null}
      >
        <Form
          form={adjustForm}
          layout="vertical"
          onFinish={handleAdjustSave}
        >
          <Form.Item label="當前庫存">
            <span style={{ fontSize: 16, fontWeight: 'bold' }}>
              {editingItem?.quantity || 0}
            </span>
          </Form.Item>

          <Form.Item
            name="quantityChange"
            label="數量變動"
            rules={[{ required: true, message: '請輸入數量變動' }]}
          >
            <InputNumber 
              style={{ width: '100%' }} 
              placeholder="正數為入庫，負數為出庫"
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="調整原因"
          >
            <Input placeholder="請輸入調整原因" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="備註"
          >
            <TextArea rows={3} placeholder="請輸入備註" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                確認調整
              </Button>
              <Button onClick={() => setAdjustModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 倉庫轉移模態框 */}
      <Modal
        title="倉庫轉移"
        open={transferModalVisible}
        onCancel={() => setTransferModalVisible(false)}
        footer={null}
      >
        <Form
          form={transferForm}
          layout="vertical"
          onFinish={handleTransferSave}
        >
          <Form.Item label="源倉庫">
            <span style={{ fontSize: 16, fontWeight: 'bold' }}>
              倉{editingItem?.warehouse}
            </span>
          </Form.Item>

          <Form.Item label="當前庫存">
            <span style={{ fontSize: 16, fontWeight: 'bold' }}>
              {editingItem?.quantity || 0}
            </span>
          </Form.Item>

          <Form.Item
            name="toWarehouse"
            label="目標倉庫"
            rules={[{ required: true, message: '請選擇目標倉庫' }]}
          >
            <Select placeholder="請選擇目標倉庫">
              {warehouseOptions
                .filter(option => option.value !== editingItem?.warehouse)
                .map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="quantity"
            label="轉移數量"
            rules={[{ required: true, message: '請輸入轉移數量' }]}
          >
            <InputNumber 
              min={1}
              max={editingItem?.quantity || 0}
              style={{ width: '100%' }} 
              placeholder="請輸入轉移數量"
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="轉移原因"
          >
            <Input placeholder="請輸入轉移原因" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="備註"
          >
            <TextArea rows={3} placeholder="請輸入備註" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                確認轉移
              </Button>
              <Button onClick={() => setTransferModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
