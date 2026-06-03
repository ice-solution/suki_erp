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
  Tag,
  message,
  Popconfirm,
  Tooltip
} from 'antd';
import dayjs from 'dayjs';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SwapOutlined,
  SettingOutlined,
  WarningOutlined,
  SearchOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { request } from '@/request';
import { useSelector } from 'react-redux';
import { selectWarehouseOptions, selectWarehouseItemCategories } from '@/redux/settings/selectors';

const { Option } = Select;
const { TextArea } = Input;

const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return `$${n.toFixed(2)}`;
};

const computeDisplayTotal = (quantity, unitPrice) => {
  const qty = Math.max(0, Number(quantity) || 0);
  const price = Math.max(0, Number(unitPrice) || 0);
  return Math.round((qty * price + Number.EPSILON) * 100) / 100;
};

export default function Warehouse() {
  const [loading, setLoading] = useState(false);
  const [inventoryList, setInventoryList] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({});
  /** 已套用的搜尋關鍵字（貨品名稱、編號、報價單等；僅在按搜尋／Enter 時更新） */
  const [listSearch, setListSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [exporting, setExporting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [transactionList, setTransactionList] = useState([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [recordModalVisible, setRecordModalVisible] = useState(false);
  const [recordItem, setRecordItem] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form] = Form.useForm();
  const [adjustForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [transferSkuHint, setTransferSkuHint] = useState('');
  const [transferSkuHintType, setTransferSkuHintType] = useState('info');
  const [transferSkuChecking, setTransferSkuChecking] = useState(false);
  const warehouseOptions = useSelector(selectWarehouseOptions);
  const warehouseItemCategories = useSelector(selectWarehouseItemCategories);

  const fetchTransactions = async (inventoryId) => {
    if (!inventoryId) {
      setTransactionList([]);
      return;
    }
    setTransactionLoading(true);
    try {
      // 注意：warehouse API 走獨立 router（RESTful），read endpoint 是 GET /warehouse/:id（不是 /warehouse/read/:id）
      const res = await request.get({ entity: `warehouse/${inventoryId}` });
      setTransactionList(res?.result?.transactions || []);
    } catch (e) {
      setTransactionList([]);
    } finally {
      setTransactionLoading(false);
    }
  };

  const openRecordModal = async (record) => {
    setRecordItem(record || null);
    setRecordModalVisible(true);
    await fetchTransactions(record?._id);
  };

  // 狀態選項
  const statusOptions = [
    { value: 'available', label: '可用' },
    { value: 'reserved', label: '已預留' },
    { value: 'out_of_stock', label: '缺貨' },
    { value: 'damaged', label: '損壞' }
  ];

  useEffect(() => {
    fetchInventoryList();
  }, [pagination.current, pagination.pageSize, filters, listSearch]);

  useEffect(() => {
    fetchSuppliers();
    fetchProjects();
  }, []);

  const fetchInventoryList = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
      };
      const searchQ = listSearch.trim();
      if (searchQ) {
        params.search = searchQ;
      }
      if (filters.warehouse && filters.warehouse.length) {
        params.warehouse = filters.warehouse[0];
      }
      if (filters.status && filters.status.length) {
        params.status = filters.status[0];
      }
      if (filters.category && filters.category.length) {
        params.category = filters.category[0];
      }
      const response = await request.get({ entity: 'warehouse', params });

      if (response.success) {
        setInventoryList(response.result);
        setPagination((prev) => ({
          ...prev,
          total: response.pagination?.totalItems ?? prev.total,
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
      const response = await request.listAll({ entity: 'supplier' });
      if (response.success) {
        setSuppliers(Array.isArray(response.result) ? response.result : []);
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
    adjustForm.setFieldsValue({
      unitPrice: record?.unitPrice != null ? Number(record.unitPrice) : 0,
    });
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
    transferForm.setFieldsValue({
      unitPrice: record?.unitPrice != null ? Number(record.unitPrice) : 0,
    });
    setTransferSkuHint('');
    setTransferSkuHintType('info');
    setTransferModalVisible(true);
  };

  const checkTransferTargetSku = async () => {
    const targetSku = transferForm.getFieldValue('targetSku');
    const toWarehouse = transferForm.getFieldValue('toWarehouse');
    const sku = targetSku != null ? String(targetSku).trim() : '';
    if (!sku || !toWarehouse || !editingItem?._id) {
      setTransferSkuHint('');
      return;
    }
    if (sku === editingItem.sku) {
      setTransferSkuHint('目標貨品編號不可與源貨品編號相同');
      setTransferSkuHintType('error');
      return;
    }
    setTransferSkuChecking(true);
    try {
      const res = await request.get({
        entity: 'warehouse/transfer/sku-check',
        params: {
          sku,
          toWarehouse,
          excludeId: editingItem._id,
        },
      });
      if (res?.success && res.result) {
        setTransferSkuHint(res.result.message || '');
        if (res.result.willMerge) {
          setTransferSkuHintType('success');
        } else if (res.result.exists && !res.result.sameWarehouse) {
          setTransferSkuHintType('error');
        } else if (res.result.willCreate) {
          setTransferSkuHintType('info');
        } else {
          setTransferSkuHintType('info');
        }
      } else {
        setTransferSkuHint(res?.message || '無法檢查貨品編號');
        setTransferSkuHintType('error');
      }
    } catch (error) {
      console.error('檢查轉倉貨品編號失敗:', error);
    } finally {
      setTransferSkuChecking(false);
    }
  };

  const handleTransferSave = async (values) => {
    try {
      const res = await request.post({
        entity: `warehouse/${editingItem._id}/transfer`,
        jsonData: values,
      });
      if (res?.success) {
        message.success(res.message || '倉庫轉移成功');
        setTransferModalVisible(false);
        setTransferSkuHint('');
        fetchInventoryList();
      } else {
        message.error(res?.message || '倉庫轉移失敗');
      }
    } catch (error) {
      message.error(error?.message || '倉庫轉移失敗');
      console.error('Error transferring inventory:', error);
    }
  };

  const getQuoteNumber = (record) => {
    const p = record?.project;
    if (!p) return '';
    return p.invoiceNumber || p.quoteNumber || '';
  };

  const getWarehouseLabel = (warehouse) => {
    const opt = warehouseOptions.find((o) => o.value === warehouse);
    return opt ? opt.label : warehouse || '';
  };

  const getStatusLabel = (status) =>
    statusOptions.find((opt) => opt.value === status)?.label || status || '';

  const buildListParams = (page = 1, limit = 10000) => {
    const params = { page, limit };
    const searchQ = listSearch.trim();
    if (searchQ) params.search = searchQ;
    if (filters.warehouse && filters.warehouse.length) {
      params.warehouse = filters.warehouse[0];
    }
    if (filters.status && filters.status.length) {
      params.status = filters.status[0];
    }
    if (filters.category && filters.category.length) {
      params.category = filters.category[0];
    }
    return params;
  };

  const exportXlsx = async () => {
    setExporting(true);
    try {
      const response = await request.get({ entity: 'warehouse', params: buildListParams(1, 10000) });
      const rows = (response?.success ? response.result : []) || [];
      if (!rows.length) {
        message.warning('沒有可匯出的資料');
        return;
      }
      const sheetRows = rows.map((r) => ({
        貨品編號: r.sku || '',
        貨品名稱: r.itemName || '',
        類別: r.category || '',
        數量: r.quantity != null ? r.quantity : '',
        倉庫: getWarehouseLabel(r.warehouse),
        單價: r.unitPrice != null ? r.unitPrice : '',
        總價值:
          r.totalValue != null
            ? r.totalValue
            : computeDisplayTotal(r.quantity, r.unitPrice),
        狀態: getStatusLabel(r.status),
        供應商: r.supplier?.name || '',
        重量_KG: r.weight != null && r.weight !== '' ? Number(r.weight) : '',
        報價單編號: getQuoteNumber(r) || '',
        位置: r.location || '',
        備註: r.notes || '',
      }));
      const ws = XLSX.utils.json_to_sheet(sheetRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '存倉管理');
      const filename = `存倉管理_${dayjs().format('YYYY-MM-DD')}.xlsx`;
      XLSX.writeFile(wb, filename);
      message.success('已匯出 Excel');
    } catch (error) {
      message.error('匯出失敗');
      console.error('Error exporting warehouse:', error);
    } finally {
      setExporting(false);
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
      title: '貨品編號',
      dataIndex: 'sku',
      key: 'sku',
      width: 120,
      render: (sku, record) => (
        <Button
          type="link"
          style={{ padding: 0, height: 'auto' }}
          onClick={() => openRecordModal(record)}
        >
          {sku || '-'}
        </Button>
      ),
    },
    {
      title: '貨品名稱',
      dataIndex: 'itemName',
      key: 'itemName',
      width: 150,
    },
    {
      title: '類別',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (cat) => (cat ? cat : '-'),
      filters: warehouseItemCategories.map((c) => ({ text: c, value: c })),
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
      width: 200,
      ellipsis: false,
      render: (warehouse, record) => {
        const opt = warehouseOptions.find((o) => o.value === warehouse);
        const text = opt ? opt.label : (warehouse ? `${warehouse} / -` : '-');
        return <span style={{ whiteSpace: 'nowrap' }}>{text}</span>;
      },
      filters: warehouseOptions.map(opt => ({ text: opt.label, value: opt.value })),
    },
    {
      title: '單價',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 100,
      render: (price) => formatMoney(price),
    },
    {
      title: '總價值',
      dataIndex: 'totalValue',
      key: 'totalValue',
      width: 100,
      render: (value, record) => {
        const display =
          value != null && Number.isFinite(Number(value))
            ? Number(value)
            : computeDisplayTotal(record.quantity, record.unitPrice);
        return formatMoney(display);
      },
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
      title: '重量 (KG)',
      dataIndex: 'weight',
      key: 'weight',
      width: 100,
      render: (weight) =>
        weight != null && weight !== '' && Number(weight) > 0
          ? `${Number(weight)} KG`
          : '-',
    },
    {
      title: '報價單編號',
      dataIndex: 'project',
      key: 'quoteNumber',
      width: 140,
      ellipsis: true,
      render: (_, record) => {
        const qn = getQuoteNumber(record);
        return qn ? qn : '-';
      },
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
        <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            新增存倉記錄
          </Button>
          <Button
            icon={<FileExcelOutlined />}
            loading={exporting}
            onClick={exportXlsx}
          >
            匯出 Excel
          </Button>
          <Input.Search
            allowClear
            placeholder="搜尋貨品名稱、編號、報價單編號"
            prefix={<SearchOutlined style={{ color: 'rgba(0,0,0,.45)' }} />}
            style={{ width: 320 }}
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onSearch={(value) => {
              setSearchDraft(value);
              setListSearch((value || '').trim());
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
            enterButton="搜尋"
          />
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
          onChange={(pag, tableFilters) => {
            setPagination((prev) => ({
              ...prev,
              current: pag.current,
              pageSize: pag.pageSize,
              total: prev.total,
            }));
            setFilters(tableFilters || {});
          }}
          rowKey="_id"
          scroll={{ x: 1710 }}
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
                extra={
                  editingItem
                    ? '修改名稱後，已綁定此存倉貨品 ID 的 S 單仍會正確扣帳；畫面上顯示的舊名稱可於各 S 單重新選貨後更新。'
                    : undefined
                }
              >
                <Input placeholder="請輸入貨品名稱" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="sku"
                label="貨品編號"
              >
                <Input placeholder="請輸入貨品編號" disabled={!!editingItem} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="類別">
                <Select placeholder="請選擇類別" allowClear showSearch optionFilterProp="children">
                  {warehouseItemCategories.map((c) => (
                    <Option key={c} value={c}>
                      {c}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="quantity"
                label="數量"
                rules={[{ required: true, message: '請輸入數量' }]}
              >
                <InputNumber
                  min={0}
                  disabled={!!editingItem}
                  style={{ width: '100%' }}
                  placeholder="請輸入數量"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="weight" label="重量 (KG)">
                <InputNumber
                  min={0}
                  precision={2}
                  style={{ width: '100%' }}
                  placeholder="請輸入重量"
                  addonAfter="KG"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="warehouse"
                label="倉庫"
                rules={[{ required: true, message: '請選擇倉庫' }]}
              >
                <Select placeholder="請選擇倉庫" disabled={!!editingItem}>
                  {warehouseOptions.map((option) => (
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
              <Form.Item
                noStyle
                shouldUpdate={(prev, cur) =>
                  prev.unitPrice !== cur.unitPrice || prev.quantity !== cur.quantity
                }
              >
                {({ getFieldValue }) => {
                  const qty = editingItem
                    ? editingItem.quantity
                    : getFieldValue('quantity');
                  const unitPrice = getFieldValue('unitPrice');
                  const total = computeDisplayTotal(qty, unitPrice);
                  return (
                    <div style={{ marginTop: -8, marginBottom: 8, color: '#666', fontSize: 12 }}>
                      總價值（數量 × 單價）：{formatMoney(total)}
                    </div>
                  );
                }}
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="狀態"
              >
                <Select placeholder="請選擇狀態">
                  {statusOptions.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
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
          </Row>

          <Row gutter={16}>
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
                  {projects.map((project) => (
                    <Option key={project._id} value={project._id}>
                      {project.invoiceNumber ? String(project.invoiceNumber) : project.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item shouldUpdate={(prev, cur) => prev.project !== cur.project} noStyle>
                {({ getFieldValue }) => {
                  const pid = getFieldValue('project');
                  if (!pid) return null;
                  const p = projects.find((x) => String(x._id) === String(pid));
                  const qn = p?.invoiceNumber || p?.quoteNumber || '';
                  if (!qn) return null;
                  return (
                    <div style={{ marginTop: -8, color: '#666', fontSize: 12 }}>
                      Quote Number：{qn}
                    </div>
                  );
                }}
              </Form.Item>
            </Col>
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
          </Row>

          <Form.Item
            name="location"
            label="位置"
          >
            <Input placeholder="請輸入具體位置" />
          </Form.Item>

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

      {/* 調整/轉移記錄（按貨品編號點擊開啟） */}
      <Modal
        title={`調整/轉移記錄${recordItem?.sku ? `（${recordItem.sku}）` : ''}`}
        open={recordModalVisible}
        onCancel={() => {
          setRecordModalVisible(false);
          setRecordItem(null);
        }}
        footer={null}
        width={1000}
      >
        <Table
          size="small"
          loading={transactionLoading}
          dataSource={Array.isArray(transactionList) ? transactionList : []}
          rowKey={(r) => r._id}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 960 }}
          columns={[
            {
              title: '日期',
              dataIndex: 'transactionDate',
              key: 'transactionDate',
              width: 160,
              render: (v) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'),
            },
            {
              title: '類型',
              dataIndex: 'transactionTypeDisplay',
              key: 'transactionTypeDisplay',
              width: 90,
              render: (_, r) => r.transactionTypeDisplay || r.transactionType || '-',
            },
            {
              title: '變動',
              dataIndex: 'quantityChange',
              key: 'quantityChange',
              width: 80,
              render: (v) => (v != null ? v : '-'),
            },
            {
              title: '前→後',
              key: 'beforeAfter',
              width: 110,
              render: (_, r) =>
                `${r.quantityBefore != null ? r.quantityBefore : '-'} → ${r.quantityAfter != null ? r.quantityAfter : '-'}`,
            },
            {
              title: '單價',
              dataIndex: 'unitPrice',
              key: 'unitPrice',
              width: 90,
              render: (v) => formatMoney(v),
            },
            {
              title: '總金額',
              dataIndex: 'totalValue',
              key: 'totalValue',
              width: 100,
              render: (v, r) =>
                formatMoney(
                  v != null && Number.isFinite(Number(v))
                    ? v
                    : computeDisplayTotal(Math.abs(r.quantityChange || 0), r.unitPrice)
                ),
            },
            {
              title: '原因',
              dataIndex: 'reason',
              key: 'reason',
              width: 160,
              ellipsis: true,
              render: (v) => v || '-',
            },
            {
              title: '備註',
              dataIndex: 'notes',
              key: 'notes',
              ellipsis: true,
              render: (v) => v || '-',
            },
            {
              title: '操作人',
              dataIndex: ['createdBy', 'name'],
              key: 'createdBy',
              width: 110,
              render: (_, r) => r.createdBy?.name || '-',
            },
          ]}
        />
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
            noStyle
            shouldUpdate={(prev, cur) => prev.quantityChange !== cur.quantityChange}
          >
            {({ getFieldValue }) => {
              const change = Number(getFieldValue('quantityChange'));
              if (!Number.isFinite(change) || change === 0) return null;
              const isInbound = change > 0;
              return (
                <Form.Item
                  name="unitPrice"
                  label={isInbound ? '本次入庫單價' : '本次出庫單價'}
                  rules={[{ required: true, message: '請填寫單價' }]}
                  extra={
                    isInbound
                      ? editingItem
                        ? `入庫後將與現有平均單價（${formatMoney(editingItem.unitPrice)}）依件數計算加權平均，小數點後 2 位`
                        : '入庫單價將與現有庫存加權平均'
                      : '出庫僅記錄於交易明細，存倉平均單價不變'
                  }
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    placeholder={isInbound ? '請輸入本次入庫單價' : '請輸入本次出庫單價'}
                    addonBefore="$"
                  />
                </Form.Item>
              );
            }}
          </Form.Item>

          <Form.Item
            name="reason"
            label="調整原因"
            rules={[{ required: true, message: '請輸入調整原因' }]}
          >
            <Input placeholder="請輸入調整原因" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="備註"
            rules={[{ required: true, message: '請輸入備註' }]}
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
        onCancel={() => {
          setTransferModalVisible(false);
          setTransferSkuHint('');
        }}
        footer={null}
      >
        <Form
          form={transferForm}
          layout="vertical"
          onFinish={handleTransferSave}
          onValuesChange={(changed) => {
            if (changed.targetSku !== undefined || changed.toWarehouse !== undefined) {
              checkTransferTargetSku();
            }
          }}
        >
          <Form.Item label="源倉庫">
            <span style={{ fontSize: 16, fontWeight: 'bold' }}>
              {warehouseOptions.find((o) => o.value === editingItem?.warehouse)?.label || (editingItem?.warehouse ? `${editingItem.warehouse}` : '-')}
            </span>
          </Form.Item>

          <Form.Item label="源貨品編號">
            <span style={{ fontSize: 16, fontWeight: 'bold' }}>
              {editingItem?.sku || '-'}
            </span>
          </Form.Item>

          <Form.Item label="當前庫存">
            <span style={{ fontSize: 16, fontWeight: 'bold' }}>
              {editingItem?.quantity || 0}
            </span>
          </Form.Item>

          <Form.Item
            name="targetSku"
            label="目標貨品編號"
            rules={[
              { required: true, message: '請輸入目標倉庫的貨品編號' },
              {
                validator: (_, value) => {
                  const v = value != null ? String(value).trim() : '';
                  if (!v) return Promise.resolve();
                  if (v === editingItem?.sku) {
                    return Promise.reject(new Error('目標貨品編號不可與源貨品編號相同'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
            extra={
              transferSkuChecking
                ? '正在檢查貨品編號…'
                : transferSkuHint || '輸入後系統會檢查：編號已存在則併入該筆庫存，否則於目標倉建立新貨品'
            }
            validateStatus={
              transferSkuHintType === 'error' ? 'error' : transferSkuHintType === 'success' ? 'success' : undefined
            }
          >
            <Input placeholder="請輸入目標倉庫貨品編號" onBlur={checkTransferTargetSku} />
          </Form.Item>

          <Form.Item
            name="toWarehouse"
            label="目標倉庫"
            rules={[{ required: true, message: '請選擇目標倉庫' }]}
          >
            <Select placeholder="請選擇目標倉庫" onChange={() => setTimeout(checkTransferTargetSku, 0)}>
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
            name="unitPrice"
            label="轉移單價"
            rules={[{ required: true, message: '請填寫轉移單價' }]}
            extra={
              editingItem
                ? `預設為源倉平均單價（${formatMoney(editingItem.unitPrice)}）；併入目標倉時將依此單價加權平均`
                : '併入目標倉時將依此單價加權平均'
            }
          >
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              placeholder="請輸入轉移單價"
              addonBefore="$"
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) =>
              prev.quantity !== cur.quantity || prev.unitPrice !== cur.unitPrice
            }
          >
            {({ getFieldValue }) => {
              const qty = Number(getFieldValue('quantity'));
              const price = getFieldValue('unitPrice');
              if (!Number.isFinite(qty) || qty <= 0) return null;
              return (
                <div style={{ marginBottom: 16, color: '#666', fontSize: 12 }}>
                  轉移總金額：{formatMoney(computeDisplayTotal(qty, price))}
                </div>
              );
            }}
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

          {transferSkuHint && transferSkuHintType === 'error' && (
            <p style={{ color: '#ff4d4f', marginBottom: 12, fontSize: 13 }}>{transferSkuHint}</p>
          )}

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                disabled={transferSkuHintType === 'error' || transferSkuChecking}
              >
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
