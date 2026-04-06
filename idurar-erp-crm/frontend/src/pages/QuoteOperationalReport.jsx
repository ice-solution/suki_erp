import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  DatePicker,
  Table,
  message,
  Space,
  Statistic,
  Typography,
  Divider,
  Tag,
  Tabs,
} from 'antd';
import { FileTextOutlined, CalendarOutlined, DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { ErpLayout } from '@/layout';
import { useMoney, useDate } from '@/settings';
import { request } from '@/request';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const formatQuoteNo = (r) =>
  r && r.numberPrefix != null && r.number != null ? `${r.numberPrefix}-${r.number}/${r.year || ''}` : '—';

const formatInvoiceNo = (r) =>
  r && r.numberPrefix != null && r.number != null ? `${r.numberPrefix}-${r.number}/${r.year || ''}` : '—';

const clientNames = (record) => {
  if (record.clients && Array.isArray(record.clients) && record.clients.length > 0) {
    return record.clients.map((c) => c.name).filter(Boolean).join('、');
  }
  if (record.client?.name) return record.client.name;
  return '—';
};

const QuoteOperationalReport = () => {
  const { moneyFormatter } = useMoney();
  const { dateFormat } = useDate();
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  const generateReport = async () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      message.warning('請選擇開始日期和結束日期');
      return;
    }

    setLoading(true);
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      const response = await request.get({
        entity: 'quote/operational-report',
        params: { startDate, endDate },
      });

      if (response.success) {
        setReportData(response.result);
        message.success('報告生成成功');
      } else {
        message.error('生成報告失敗: ' + (response.message || '未知錯誤'));
      }
    } catch (error) {
      console.error(error);
      message.error('生成報告失敗: ' + (error.message || '未知錯誤'));
    } finally {
      setLoading(false);
    }
  };

  const quoteColumns = [
    {
      title: '報價編號',
      key: 'qno',
      render: (_, r) => (
        <Link to={`/quote/read/${r._id}`}>{formatQuoteNo(r)}</Link>
      ),
    },
    {
      title: 'Quote Number',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (v) => v || '—',
    },
    {
      title: '客戶',
      key: 'clients',
      render: (_, r) => clientNames(r),
    },
    {
      title: '總計',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (t, r) => moneyFormatter({ amount: t, currency_code: r.currency }),
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '—'),
    },
    {
      title: '已完成',
      dataIndex: 'isCompleted',
      key: 'isCompleted',
      render: (v) => (v ? <Tag color="success">是</Tag> : <Tag>否</Tag>),
    },
  ];

  const invoiceColumns = [
    {
      title: '發票編號',
      key: 'ino',
      render: (_, r) => (
        <Link to={`/invoice/read/${r._id}`}>{formatInvoiceNo(r)}</Link>
      ),
    },
    {
      title: 'Quote Number',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      render: (v) => v || '—',
    },
    {
      title: '客戶',
      key: 'clients',
      render: (_, r) => clientNames(r),
    },
    {
      title: '總計',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (t, r) => moneyFormatter({ amount: t, currency_code: r.currency }),
    },
    {
      title: '部份付款',
      dataIndex: 'credit',
      key: 'credit',
      align: 'right',
      render: (c, r) => moneyFormatter({ amount: c ?? 0, currency_code: r.currency }),
    },
    {
      title: '付款狀態',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (s) => {
        const map = { unpaid: { c: 'red', t: '未付' }, paid: { c: 'green', t: '已付款' } };
        const x = map[s] || { c: 'default', t: s || '—' };
        return <Tag color={x.c}>{x.t}</Tag>;
      },
    },
    {
      title: 'Full paid',
      dataIndex: 'fullPaid',
      key: 'fullPaid',
      render: (v) => (v === true ? <Tag color="blue">Y</Tag> : <Tag>—</Tag>),
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '—'),
    },
  ];

  const rangeText = reportData
    ? `${dayjs(reportData.startDate).format('YYYY-MM-DD')} 至 ${dayjs(reportData.endDate).format('YYYY-MM-DD')}`
    : '';

  const tabItems = [
    {
      key: 'tab1',
      label: '已接受 · 未轉 Invoice',
      children: (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Statistic title="筆數" value={reportData?.summary?.acceptedNotInvoiced ?? 0} prefix={<FileTextOutlined />} />
            </Col>
          </Row>
          <Table
            dataSource={reportData?.acceptedNotInvoiced || []}
            columns={quoteColumns}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </>
      ),
    },
    {
      key: 'tab2',
      label: '已接受 · 未完成',
      children: (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Statistic title="筆數" value={reportData?.summary?.acceptedNotCompleted ?? 0} prefix={<FileTextOutlined />} />
            </Col>
          </Row>
          <Table
            dataSource={reportData?.acceptedNotCompleted || []}
            columns={quoteColumns}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </>
      ),
    },
    {
      key: 'tab3',
      label: 'Invoice 付款',
      children: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card size="small" title="1) 付款狀態 = 未付">
            <Row gutter={16} style={{ marginBottom: 8 }}>
              <Col>
                <Text type="secondary">筆數：{reportData?.summary?.invoicesUnpaid ?? 0}</Text>
              </Col>
            </Row>
            <Table
              dataSource={reportData?.invoicesUnpaid || []}
              columns={invoiceColumns}
              rowKey="_id"
              pagination={{ pageSize: 8 }}
              size="small"
            />
          </Card>
          <Card size="small" title="2) 已付款 · 部份付款 ≠ 0 · 未勾 Full paid">
            <Row gutter={16} style={{ marginBottom: 8 }}>
              <Col>
                <Text type="secondary">筆數：{reportData?.summary?.invoicesPaidPartial ?? 0}</Text>
              </Col>
            </Row>
            <Table
              dataSource={reportData?.invoicesPaidPartial || []}
              columns={invoiceColumns}
              rowKey="_id"
              pagination={{ pageSize: 8 }}
              size="small"
            />
          </Card>
          <Card size="small" title="3) 已付款 · 已勾 Full paid">
            <Row gutter={16} style={{ marginBottom: 8 }}>
              <Col>
                <Text type="secondary">筆數：{reportData?.summary?.invoicesPaidFullPaid ?? 0}</Text>
              </Col>
            </Row>
            <Table
              dataSource={reportData?.invoicesPaidFullPaid || []}
              columns={invoiceColumns}
              rowKey="_id"
              pagination={{ pageSize: 8 }}
              size="small"
            />
          </Card>
        </Space>
      ),
    },
  ];

  return (
    <ErpLayout>
      <div style={{ padding: '24px' }}>
        <Card>
          <div style={{ marginBottom: '24px' }}>
            <Title level={2}>
              <FileTextOutlined style={{ marginRight: 8 }} />
              報價／發票營運報告
            </Title>

            <Row gutter={16} style={{ marginTop: '16px' }}>
              <Col span={8}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>選擇時間範圍（Quote／Invoice 的日期）</Text>
                  <RangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    style={{ width: '100%' }}
                    format={dateFormat}
                  />
                </Space>
              </Col>
              <Col span={8}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>操作</Text>
                  <Space>
                    <Button type="primary" icon={<CalendarOutlined />} onClick={generateReport} loading={loading}>
                      生成報告
                    </Button>
                    {reportData && (
                      <>
                        <Button icon={<DownloadOutlined />} disabled>
                          下載
                        </Button>
                        <Button icon={<PrinterOutlined />} disabled>
                          列印
                        </Button>
                      </>
                    )}
                  </Space>
                </Space>
              </Col>
            </Row>
          </div>

          {reportData && (
            <>
              <Card style={{ marginBottom: '24px' }}>
                <Row gutter={16}>
                  <Col span={24}>
                    <Text type="secondary">報告時間範圍: {rangeText}</Text>
                  </Col>
                </Row>
                <Divider />
                <Row gutter={16}>
                  <Col xs={12} md={4}>
                    <Statistic title="Tab1 筆數" value={reportData.summary.acceptedNotInvoiced} />
                  </Col>
                  <Col xs={12} md={4}>
                    <Statistic title="Tab2 筆數" value={reportData.summary.acceptedNotCompleted} />
                  </Col>
                  <Col xs={12} md={4}>
                    <Statistic title="未付" value={reportData.summary.invoicesUnpaid} />
                  </Col>
                  <Col xs={12} md={4}>
                    <Statistic title="已付(部份≠0)" value={reportData.summary.invoicesPaidPartial} />
                  </Col>
                  <Col xs={12} md={4}>
                    <Statistic title="Full paid" value={reportData.summary.invoicesPaidFullPaid} />
                  </Col>
                </Row>
              </Card>

              <Tabs defaultActiveKey="tab1" items={tabItems} />
            </>
          )}
        </Card>
      </div>
    </ErpLayout>
  );
};

export default QuoteOperationalReport;
