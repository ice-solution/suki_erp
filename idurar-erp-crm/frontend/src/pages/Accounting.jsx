import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  DatePicker,
  Select,
  Button,
  Space,
  Tag,
  Divider,
  Typography,
  message,
  Spin
} from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;

const Accounting = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    summary: {},
    clientStats: [],
    invoices: []
  });
  const [clients, setClients] = useState([]);
  const [filters, setFilters] = useState({
    dateRange: [dayjs().startOf('month'), dayjs().endOf('month')],
    clientId: null
  });

  useEffect(() => {
    fetchClients();
    fetchData();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get('/client');
      setClients(response.data.result.docs || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        startDate: filters.dateRange[0]?.format('YYYY-MM-DD'),
        endDate: filters.dateRange[1]?.format('YYYY-MM-DD')
      };
      
      if (filters.clientId) {
        params.clientId = filters.clientId;
      }

      const response = await axios.get('/accounting/member-invoices', { params });
      setData(response.data.result);
    } catch (error) {
      message.error('載入資料失敗: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSearch = () => {
    fetchData();
  };

  const handleReset = () => {
    setFilters({
      dateRange: [dayjs().startOf('month'), dayjs().endOf('month')],
      clientId: null
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD'
    }).format(amount || 0);
  };

  const getStatusTag = (status) => {
    const statusMap = {
      'paid': { color: 'green', text: '已付款' },
      'partially': { color: 'orange', text: '部分付款' },
      'unpaid': { color: 'red', text: '未付款' }
    };
    const statusInfo = statusMap[status] || { color: 'default', text: status };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };

  const clientColumns = [
    {
      title: '會員資料',
      dataIndex: 'client',
      key: 'client',
      render: (client) => (
        <div>
          <div><strong>{client.name}</strong></div>
          <div><Text type="secondary">{client.email}</Text></div>
          <div><Text type="secondary">{client.phone}</Text></div>
        </div>
      )
    },
    {
      title: '發票數量',
      dataIndex: 'totalInvoices',
      key: 'totalInvoices',
      align: 'center',
      render: (count) => (
        <div>
          <FileTextOutlined style={{ marginRight: 4 }} />
          {count}
        </div>
      )
    },
    {
      title: '總金額',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      render: (amount) => (
        <Text strong style={{ color: '#1890ff' }}>
          {formatCurrency(amount)}
        </Text>
      )
    },
    {
      title: '已付款',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      align: 'right',
      render: (amount) => (
        <Text strong style={{ color: '#52c41a' }}>
          {formatCurrency(amount)}
        </Text>
      )
    },
    {
      title: '未付款',
      dataIndex: 'unpaidAmount',
      key: 'unpaidAmount',
      align: 'right',
      render: (amount) => (
        <Text strong style={{ color: '#ff4d4f' }}>
          {formatCurrency(amount)}
        </Text>
      )
    },
    {
      title: '付款率',
      key: 'paymentRate',
      align: 'center',
      render: (_, record) => {
        const rate = record.totalAmount > 0 ? (record.paidAmount / record.totalAmount * 100) : 0;
        return (
          <Tag color={rate >= 100 ? 'green' : rate >= 50 ? 'orange' : 'red'}>
            {rate.toFixed(1)}%
          </Tag>
        );
      }
    }
  ];

  const invoiceColumns = [
    {
      title: '發票編號',
      dataIndex: 'number',
      key: 'number',
      render: (number, record) => `${number}/${record.year}`
    },
    {
      title: '會員',
      dataIndex: ['client', 'name'],
      key: 'clientName'
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (date) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '總金額',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (amount) => formatCurrency(amount)
    },
    {
      title: '已付款',
      dataIndex: 'credit',
      key: 'credit',
      align: 'right',
      render: (amount) => formatCurrency(amount)
    },
    {
      title: '狀態',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (status) => getStatusTag(status)
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={2}>會計管理 - 會員發票統計</Title>
        
        {/* 篩選器 */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={16} align="middle">
            <Col>
              <Text strong>日期範圍：</Text>
            </Col>
            <Col>
              <RangePicker
                value={filters.dateRange}
                onChange={(dates) => handleFilterChange('dateRange', dates)}
                format="YYYY-MM-DD"
              />
            </Col>
            <Col>
              <Text strong>會員：</Text>
            </Col>
            <Col>
              <Select
                placeholder="選擇會員"
                value={filters.clientId}
                onChange={(value) => handleFilterChange('clientId', value)}
                style={{ width: 200 }}
                allowClear
              >
                {clients.map(client => (
                  <Option key={client._id} value={client._id}>
                    {client.name}
                  </Option>
                ))}
              </Select>
            </Col>
            <Col>
              <Space>
                <Button type="primary" onClick={handleSearch} loading={loading}>
                  查詢
                </Button>
                <Button onClick={handleReset}>
                  重置
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        <Spin spinning={loading}>
          {/* 統計卡片 */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="總發票數"
                  value={data.summary.totalInvoices || 0}
                  prefix={<FileTextOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="總金額"
                  value={data.summary.totalAmount || 0}
                  prefix={<DollarOutlined />}
                  formatter={(value) => formatCurrency(value)}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="已付款發票"
                  value={data.summary.paidInvoices || 0}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="已付款金額"
                  value={data.summary.paidAmount || 0}
                  prefix={<DollarOutlined />}
                  formatter={(value) => formatCurrency(value)}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>

          {/* 會員統計表格 */}
          <Card title="會員發票統計" style={{ marginBottom: 24 }}>
            <Table
              columns={clientColumns}
              dataSource={data.clientStats}
              rowKey={(record) => record.client._id}
              pagination={false}
              size="middle"
            />
          </Card>

          {/* 發票明細表格 */}
          <Card title="發票明細">
            <Table
              columns={invoiceColumns}
              dataSource={data.invoices}
              rowKey="_id"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 項，共 ${total} 項`
              }}
              size="middle"
            />
          </Card>
        </Spin>
      </Card>
    </div>
  );
};

export default Accounting;
