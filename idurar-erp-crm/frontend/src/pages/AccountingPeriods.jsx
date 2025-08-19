import React, { useEffect, useState } from 'react';
import { 
  Table, 
  Button, 
  message, 
  Modal, 
  Form, 
  Input, 
  InputNumber, 
  DatePicker, 
  Select, 
  Tag, 
  Space,
  Card,
  Row,
  Col,
  Statistic
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  LockOutlined, 
  UnlockOutlined,
  CalendarOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

const AccountingPeriods = () => {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      // 模擬會計期間數據
      const currentYear = new Date().getFullYear();
      const mockPeriods = Array.from({ length: 12 }, (_, i) => ({
        _id: `period-${currentYear}-${i + 1}`,
        periodName: `${currentYear}年${(i + 1).toString().padStart(2, '0')}月`,
        fiscalYear: currentYear,
        periodNumber: i + 1,
        periodType: 'monthly',
        startDate: new Date(currentYear, i, 1),
        endDate: new Date(currentYear, i + 1, 0),
        status: i < new Date().getMonth() ? 'closed' : i === new Date().getMonth() ? 'open' : 'open',
        isCurrent: i === new Date().getMonth(),
        statistics: {
          totalEntries: Math.floor(Math.random() * 50) + 10,
          totalDebitAmount: Math.floor(Math.random() * 1000000) + 500000,
          totalCreditAmount: Math.floor(Math.random() * 1000000) + 500000,
        }
      }));
      setPeriods(mockPeriods);
    } catch (err) {
      message.error('載入會計期間失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPeriod(null);
    setModalVisible(true);
    form.resetFields();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    form.setFieldsValue({
      fiscalYear: nextMonth.getFullYear(),
      periodNumber: nextMonth.getMonth() + 1,
      periodType: 'monthly',
      status: 'open',
      startDate: dayjs(nextMonth).startOf('month'),
      endDate: dayjs(nextMonth).endOf('month'),
    });
  };

  const handleEdit = (period) => {
    setEditingPeriod(period);
    setModalVisible(true);
    form.setFieldsValue({
      ...period,
      startDate: dayjs(period.startDate),
      endDate: dayjs(period.endDate),
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const submitData = {
        ...values,
        startDate: values.startDate.toDate(),
        endDate: values.endDate.toDate(),
        periodName: `${values.fiscalYear}年${values.periodNumber.toString().padStart(2, '0')}月`,
      };
      
      message.success(editingPeriod ? '期間更新成功' : '期間創建成功');
      setModalVisible(false);
      fetchPeriods();
    } catch (err) {
      message.error('操作失敗: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleClose = async (id) => {
    try {
      message.success('期間關閉成功');
      fetchPeriods();
    } catch (err) {
      message.error('關閉失敗: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleLock = async (id) => {
    try {
      message.success('期間鎖定成功');
      fetchPeriods();
    } catch (err) {
      message.error('鎖定失敗: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCreateYearPeriods = async () => {
    Modal.confirm({
      title: '創建年度期間',
      content: (
        <div>
          <p>選擇要創建期間的年度：</p>
          <InputNumber 
            min={2020} 
            max={2030} 
            defaultValue={new Date().getFullYear() + 1}
            onChange={(value) => {
              Modal.destroyAll();
              Modal.confirm({
                title: '確認創建',
                content: `確定要創建 ${value} 年度的12個月期間嗎？`,
                onOk: async () => {
                  try {
                    message.success(`${value} 年度期間創建成功`);
                    fetchPeriods();
                  } catch (err) {
                    message.error('創建失敗: ' + (err.response?.data?.message || err.message));
                  }
                }
              });
            }}
          />
        </div>
      ),
    });
  };

  const statusMap = {
    open: { text: '開放', color: 'green' },
    closed: { text: '關閉', color: 'orange' },
    locked: { text: '鎖定', color: 'red' }
  };

  const periodTypeMap = {
    monthly: '月度',
    quarterly: '季度',
    annually: '年度'
  };

  const columns = [
    {
      title: '期間名稱',
      dataIndex: 'periodName',
      key: 'periodName',
      width: 150,
    },
    {
      title: '會計年度',
      dataIndex: 'fiscalYear',
      key: 'fiscalYear',
      width: 100,
      align: 'center',
    },
    {
      title: '期間編號',
      dataIndex: 'periodNumber',
      key: 'periodNumber',
      width: 100,
      align: 'center',
    },
    {
      title: '期間類型',
      dataIndex: 'periodType',
      key: 'periodType',
      width: 100,
      render: (type) => periodTypeMap[type] || type,
    },
    {
      title: '開始日期',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120,
      render: (date) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '結束日期',
      dataIndex: 'endDate',
      key: 'endDate',
      width: 120,
      render: (date) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status, record) => (
        <Space>
          <Tag color={statusMap[status]?.color}>{statusMap[status]?.text}</Tag>
          {record.isCurrent && <Tag color="blue">當前</Tag>}
        </Space>
      ),
    },
    {
      title: '分錄數量',
      dataIndex: ['statistics', 'totalEntries'],
      key: 'totalEntries',
      width: 100,
      align: 'center',
      render: (count) => count || 0,
    },
    {
      title: '總金額',
      dataIndex: ['statistics', 'totalDebitAmount'],
      key: 'totalAmount',
      width: 120,
      align: 'right',
      render: (amount) => amount?.toLocaleString() || '0',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編輯
          </Button>
          {record.status === 'open' && (
            <Button 
              type="link" 
              size="small" 
              icon={<CheckCircleOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: '確認關閉',
                  content: `確定要關閉期間「${record.periodName}」嗎？關閉後將無法新增分錄。`,
                  onOk: () => handleClose(record._id),
                });
              }}
            >
              關閉
            </Button>
          )}
          {record.status === 'closed' && (
            <Button 
              type="link" 
              size="small" 
              icon={<LockOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: '確認鎖定',
                  content: `確定要鎖定期間「${record.periodName}」嗎？鎖定後將無法修改任何數據。`,
                  onOk: () => handleLock(record._id),
                });
              }}
            >
              鎖定
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 計算統計信息
  const totalPeriods = periods.length;
  const openPeriods = periods.filter(p => p.status === 'open').length;
  const closedPeriods = periods.filter(p => p.status === 'closed').length;
  const lockedPeriods = periods.filter(p => p.status === 'locked').length;

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>會計期間管理</h2>
          <Space>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleCreate}
            >
              新增期間
            </Button>
            <Button 
              icon={<CalendarOutlined />} 
              onClick={handleCreateYearPeriods}
            >
              創建年度期間
            </Button>
          </Space>
        </div>

        {/* 統計卡片 */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="期間總數"
                value={totalPeriods}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="開放期間"
                value={openPeriods}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="關閉期間"
                value={closedPeriods}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="鎖定期間"
                value={lockedPeriods}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={periods}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 項，共 ${total} 項`,
          }}
        />
      </Card>

      {/* 創建/編輯Modal */}
      <Modal
        title={editingPeriod ? '編輯期間' : '新增期間'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={600}
        okText="確定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                label="會計年度" 
                name="fiscalYear" 
                rules={[{ required: true, message: '請輸入會計年度' }]}
              >
                <InputNumber min={2020} max={2030} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="期間編號" 
                name="periodNumber" 
                rules={[{ required: true, message: '請輸入期間編號' }]}
              >
                <InputNumber min={1} max={12} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                label="期間類型" 
                name="periodType" 
                rules={[{ required: true, message: '請選擇期間類型' }]}
              >
                <Select>
                  <Option value="monthly">月度</Option>
                  <Option value="quarterly">季度</Option>
                  <Option value="annually">年度</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="狀態" 
                name="status" 
                rules={[{ required: true, message: '請選擇狀態' }]}
              >
                <Select>
                  <Option value="open">開放</Option>
                  <Option value="closed">關閉</Option>
                  <Option value="locked">鎖定</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                label="開始日期" 
                name="startDate" 
                rules={[{ required: true, message: '請選擇開始日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label="結束日期" 
                name="endDate" 
                rules={[{ required: true, message: '請選擇結束日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="備註" name="notes">
            <Input.TextArea rows={2} placeholder="期間備註" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AccountingPeriods;
